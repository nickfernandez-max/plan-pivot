import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { differenceInDays, addDays } from 'date-fns';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';
import { toast } from '@/hooks/use-toast';

interface DragData {
  projectId: string;
  originalMemberId: string;
  originalStartDate: string;
  originalEndDate: string;
  originalAllocation: number;
}

interface TimelineBounds {
  start: Date;
  end: Date;
}

interface UseDragAndDropProps {
  timelineBounds: TimelineBounds;
  totalDays: number;
  assignments: ProjectAssignment[];
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
}

export function useDragAndDrop({
  timelineBounds,
  totalDays,
  assignments,
  onUpdateProject,
  onUpdateProjectAssignees,
  onUpdateProjectAssignments
}: UseDragAndDropProps) {
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [dragOverData, setDragOverData] = useState<{
    memberId: string | null;
    newStartDate: Date | null;
    isValidDrop: boolean;
  }>({ memberId: null, newStartDate: null, isValidDrop: false });
  
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [clickTimeoutId, setClickTimeoutId] = useState<number | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (!active.data.current) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // If this is a potential double-click (within 300ms), don't start drag
    if (timeSinceLastClick < 300) {
      return;
    }
    
    setLastClickTime(now);

    const assignment = assignments.find(a => 
      a.project_id === active.data.current.projectId && 
      a.team_member_id === active.data.current.memberId
    );
    
    setActiveDrag({
      projectId: active.data.current.projectId,
      originalMemberId: active.data.current.memberId,
      originalStartDate: active.data.current.startDate,
      originalEndDate: active.data.current.endDate,
      originalAllocation: assignment?.percent_allocation || 25,
    });
  }, [assignments, lastClickTime]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over || !activeDrag) return;

    let newMemberId: string | null = null;
    let isValidDrop = false;

    // Handle member reassignment
    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
      isValidDrop = true;
    }

    setDragOverData({ memberId: newMemberId, newStartDate: null, isValidDrop });
  }, [activeDrag]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta, active } = event;
    
    if (!activeDrag) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Handle clicks with delay to allow for double-clicks
    const isDragAction = Math.abs(delta.x) > 10 || Math.abs(delta.y) > 10;
    if (!isDragAction && active.data.current?.onClick) {
      // Clear any existing timeout
      if (clickTimeoutId) {
        clearTimeout(clickTimeoutId);
        setClickTimeoutId(null);
      }
      
      // Set a timeout to handle single clicks after double-click window
      const timeoutId = window.setTimeout(() => {
        active.data.current?.onClick();
        setClickTimeoutId(null);
      }, 250);
      
      setClickTimeoutId(timeoutId);
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    if (!over || !isDragAction) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    try {
      const originalStart = new Date(activeDrag.originalStartDate);
      const originalEnd = new Date(activeDrag.originalEndDate);
      const projectDuration = differenceInDays(originalEnd, originalStart);
      
      let newMemberId = activeDrag.originalMemberId;
      let newStartDate = originalStart;
      let newEndDate = originalEnd;

      // Handle member reassignment
      if (over.data.current?.type === 'member-row' && 
          over.data.current.memberId !== activeDrag.originalMemberId) {
        newMemberId = over.data.current.memberId;
      }

      // Calculate new dates based on horizontal drag distance
      if (Math.abs(delta.x) > 10) {
        // Get timeline container to calculate pixel-to-day ratio
        const container = document.querySelector('.timeline-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const timelineWidth = containerRect.width - 192; // Subtract sidebar width
          const pixelsPerDay = timelineWidth / totalDays;
          
          if (pixelsPerDay > 0) {
            const dayOffset = Math.round(delta.x / pixelsPerDay);
            newStartDate = addDays(originalStart, dayOffset);
            newEndDate = addDays(newStartDate, projectDuration);
            
            // Constrain to timeline bounds
            if (newStartDate < timelineBounds.start) {
              newStartDate = new Date(timelineBounds.start);
              newEndDate = addDays(newStartDate, projectDuration);
            }
            if (newEndDate > timelineBounds.end) {
              newEndDate = new Date(timelineBounds.end);
              newStartDate = addDays(newEndDate, -projectDuration);
            }
          }
        }
      }

      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;
      
      const memberChanged = newMemberId !== activeDrag.originalMemberId;

      if (datesChanged || memberChanged) {
        const currentAssignments = assignments.filter(a => a.project_id === activeDrag.projectId);
        
        let updatedAssignments;
        if (memberChanged) {
          // Move to new member
          updatedAssignments = [
            ...currentAssignments
              .filter(a => a.team_member_id !== activeDrag.originalMemberId)
              .map(a => ({ 
                teamMemberId: a.team_member_id, 
                percentAllocation: a.percent_allocation,
                startDate: newStartDate.toISOString().split('T')[0],
                endDate: newEndDate.toISOString().split('T')[0]
              })),
            { 
              teamMemberId: newMemberId, 
              percentAllocation: activeDrag.originalAllocation,
              startDate: newStartDate.toISOString().split('T')[0],
              endDate: newEndDate.toISOString().split('T')[0]
            }
          ];
        } else {
          // Just update dates
          updatedAssignments = currentAssignments.map(a => ({
            teamMemberId: a.team_member_id,
            percentAllocation: a.percent_allocation,
            startDate: newStartDate.toISOString().split('T')[0],
            endDate: newEndDate.toISOString().split('T')[0]
          }));
        }

        // Update project dates
        if (datesChanged) {
          await onUpdateProject(activeDrag.projectId, {
            start_date: newStartDate.toISOString().split('T')[0],
            end_date: newEndDate.toISOString().split('T')[0],
          });
        }

        // Update assignments
        await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments);
        
        const actionText = memberChanged ? 'Project reassigned' : 'Timeline updated';
        toast({ 
          title: "Success", 
          description: `${actionText} successfully!` 
        });
      }
    } catch (error) {
      console.error('Drag and drop error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update project. Please try again.", 
        variant: "destructive" 
      });
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
  }, [activeDrag, timelineBounds, totalDays, assignments, onUpdateProject, onUpdateProjectAssignments, clickTimeoutId]);

  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    if (!activeDrag || project.id !== activeDrag.projectId) {
      return null;
    }

    const container = document.querySelector('.timeline-container');
    if (!container) return null;

    const containerRect = container.getBoundingClientRect();
    const timelineWidth = containerRect.width - 192;
    const pixelsPerDay = timelineWidth / totalDays;
    
    if (pixelsPerDay <= 0) return null;

    const dayOffset = Math.round(delta.x / pixelsPerDay);
    const originalStart = new Date(activeDrag.originalStartDate);
    const newStartDate = addDays(originalStart, dayOffset);
    
    const daysFromStart = differenceInDays(newStartDate, timelineBounds.start);
    const leftPercentage = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));

    return {
      left: leftPercentage,
      opacity: 0.8,
    };
  }, [activeDrag, totalDays, timelineBounds]);

  return {
    activeDrag,
    dragOverData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculatePreviewPosition,
  };
}
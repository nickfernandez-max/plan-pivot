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
  
  // Cache for performance
  const [timelinePixelsPerDay, setTimelinePixelsPerDay] = useState(0);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (!active.data.current) return;

    // Cache timeline dimensions for smooth calculations
    const container = document.querySelector('.timeline-container');
    if (container) {
      const containerWidth = container.clientWidth;
      const sidebarWidth = 192; // Adjust based on your sidebar width
      const timelineWidth = containerWidth - sidebarWidth;
      setTimelinePixelsPerDay(timelineWidth / totalDays);
    }

    // Find the current assignment
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
  }, [assignments, totalDays]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, delta, active } = event;
    
    if (!over || !activeDrag || timelinePixelsPerDay === 0) return;

    let newMemberId: string | null = null;
    let newStartDate: Date | null = null;
    let isValidDrop = false;

    // Handle member reassignment
    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
      isValidDrop = true;
    }

    // Calculate date position using actual mouse position relative to timeline
    const container = document.querySelector('.timeline-container');
    if (container && active.rect.current.translated) {
      const containerRect = container.getBoundingClientRect();
      const timelineStart = containerRect.left + 192; // sidebar width
      const mouseX = active.rect.current.translated.left + (active.rect.current.translated.width / 2);
      const relativeX = mouseX - timelineStart;
      
      if (relativeX >= 0) {
        const dayPosition = Math.round((relativeX / (containerRect.width - 192)) * totalDays);
        newStartDate = addDays(timelineBounds.start, dayPosition);
        
        // Constrain to timeline bounds
        if (newStartDate < timelineBounds.start) {
          newStartDate = new Date(timelineBounds.start);
        } else if (newStartDate > timelineBounds.end) {
          newStartDate = new Date(timelineBounds.end);
        }
        
        isValidDrop = true;
      }
    }

    setDragOverData({ memberId: newMemberId, newStartDate, isValidDrop });
  }, [activeDrag, timelineBounds, timelinePixelsPerDay, totalDays]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta, active } = event;
    
    if (!activeDrag) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Detect clicks vs drags (more reliable threshold)
    const isDragAction = Math.abs(delta.x) > 10 || Math.abs(delta.y) > 10;
    
    if (!isDragAction && active.data.current?.onClick) {
      active.data.current.onClick();
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

      // Handle date changes using actual drop position
      if (dragOverData.newStartDate && Math.abs(delta.x) > 10) {
        newStartDate = new Date(dragOverData.newStartDate);
        newEndDate = addDays(newStartDate, projectDuration);
        
        // Constrain end date to timeline bounds
        if (newEndDate > timelineBounds.end) {
          newEndDate = new Date(timelineBounds.end);
          newStartDate = addDays(newEndDate, -projectDuration);
        }
        // Ensure start date is not before timeline start
        if (newStartDate < timelineBounds.start) {
          newStartDate = new Date(timelineBounds.start);
          newEndDate = addDays(newStartDate, projectDuration);
        }
      }

      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;
      
      const memberChanged = newMemberId !== activeDrag.originalMemberId;

      // Single operation approach - reduces complexity and database calls
      if (datesChanged || memberChanged) {
        const currentAssignments = assignments.filter(a => a.project_id === activeDrag.projectId);
        
        let updatedAssignments;
        if (memberChanged) {
          // Remove from old member, add to new member
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
          // Just update dates for existing assignments
          updatedAssignments = currentAssignments.map(a => ({
            teamMemberId: a.team_member_id,
            percentAllocation: a.percent_allocation,
            startDate: newStartDate.toISOString().split('T')[0],
            endDate: newEndDate.toISOString().split('T')[0]
          }));
        }

        // Update project dates first (if changed)
        if (datesChanged) {
          await onUpdateProject(activeDrag.projectId, {
            start_date: newStartDate.toISOString().split('T')[0],
            end_date: newEndDate.toISOString().split('T')[0],
          });
        }

        // Update assignments
        await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments);
        
        const actionText = memberChanged ? 'Project reassigned' : 'Timeline updated';
        toast({ title: "Success", description: `${actionText} successfully!` });
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
  }, [activeDrag, timelineBounds, timelinePixelsPerDay, assignments, onUpdateProject, onUpdateProjectAssignments]);

  // Simplified preview position calculation
  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    if (!activeDrag || project.id !== activeDrag.projectId || timelinePixelsPerDay === 0) {
      return null;
    }

    const dayOffset = Math.round(delta.x / timelinePixelsPerDay);
    const originalStart = new Date(activeDrag.originalStartDate);
    const newStartDate = addDays(originalStart, dayOffset);
    
    const daysFromStart = differenceInDays(newStartDate, timelineBounds.start);
    const leftPercentage = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));

    return {
      left: leftPercentage,
      opacity: dragOverData.isValidDrop ? 0.8 : 0.4,
    };
  }, [activeDrag, totalDays, timelineBounds, timelinePixelsPerDay, dragOverData.isValidDrop]);

  return {
    activeDrag,
    dragOverData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculatePreviewPosition,
  };
}
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
  resizeHandle?: 'left' | 'right';
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
  onShowResizeDialog?: (projectId: string, memberId: string, newDates: { startDate: string; endDate: string }, resizeHandle: 'left' | 'right') => void;
}

export function useDragAndDrop({
  timelineBounds,
  totalDays,
  assignments,
  onUpdateProject,
  onUpdateProjectAssignees,
  onUpdateProjectAssignments,
  onShowResizeDialog
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

    console.log('🚀 DRAG START:', {
      projectId: active.data.current.projectId,
      memberId: active.data.current.memberId,
      startDate: active.data.current.startDate,
      endDate: active.data.current.endDate
    });

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
      resizeHandle: active.data.current.resizeHandle || undefined,
    });
  }, [assignments]);

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
    
    console.log('🎯 DRAG END:', { 
      activeDrag: !!activeDrag, 
      delta, 
      over: over?.id 
    });

    if (!activeDrag) {
      console.log('❌ No active drag, returning');
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Check if this is actually a drag movement
    const isDragAction = Math.abs(delta.x) > 5 || Math.abs(delta.y) > 5;
    
    if (!isDragAction) {
      console.log('👆 Click detected, not drag');
      if (active.data.current?.onClick) {
        active.data.current.onClick();
      }
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

      console.log('🎯 Processing drag end with deltas:', { x: delta.x, y: delta.y });

      // Handle member reassignment
      if (over && over.data.current?.type === 'member-row' && 
          over.data.current.memberId !== activeDrag.originalMemberId) {
        newMemberId = over.data.current.memberId;
        console.log('👤 Member reassignment:', newMemberId);
      }

      // Calculate new dates based on horizontal drag distance
      console.log('📏 Calculating date changes:', { deltaX: delta.x, totalDays });
      
      // Get timeline container to calculate pixel-to-day ratio
      const container = document.querySelector('.timeline-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const timelineWidth = containerRect.width - 200; // Account for sidebar
        const pixelsPerDay = timelineWidth / totalDays;
        
        console.log('📐 Timeline calculations:', {
          containerWidth: containerRect.width,
          timelineWidth,
          pixelsPerDay,
          totalDays
        });
        
        if (pixelsPerDay > 0) {
          const dayOffset = Math.round(delta.x / pixelsPerDay);
          console.log('📅 Day offset calculated:', dayOffset);
          
          if (activeDrag.resizeHandle) {
            console.log('🔄 Resize operation:', activeDrag.resizeHandle);
            // Handle resizing
            if (activeDrag.resizeHandle === 'left') {
              newStartDate = addDays(originalStart, dayOffset);
              newEndDate = originalEnd;
              
              if (newStartDate >= newEndDate) {
                newStartDate = addDays(newEndDate, -1);
              }
            } else if (activeDrag.resizeHandle === 'right') {
              newStartDate = originalStart;
              newEndDate = addDays(originalEnd, dayOffset);
              
              if (newEndDate <= newStartDate) {
                newEndDate = addDays(newStartDate, 1);
              }
            }
          } else {
            console.log('↔️ Move operation');
            // Handle moving
            newStartDate = addDays(originalStart, dayOffset);
            newEndDate = addDays(newStartDate, projectDuration);
          }
          
          console.log('📅 New dates calculated:', {
            original: { start: originalStart, end: originalEnd },
            new: { start: newStartDate, end: newEndDate }
          });
        }
      }

      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;
      
      const memberChanged = newMemberId !== activeDrag.originalMemberId;

      console.log('🔄 Changes detected:', { datesChanged, memberChanged });

      if (datesChanged || memberChanged) {
        // If this is a resize operation, show dialog to ask about scope
        if (activeDrag.resizeHandle && datesChanged && onShowResizeDialog) {
          console.log('📊 Showing resize dialog');
          
          onShowResizeDialog(
            activeDrag.projectId,
            activeDrag.originalMemberId,
            {
              startDate: newStartDate.toISOString().split('T')[0],
              endDate: newEndDate.toISOString().split('T')[0]
            },
            activeDrag.resizeHandle
          );
        } else {
          console.log('💾 Updating project data');
          
          // Handle regular move operations
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

          // Update project dates first
          if (datesChanged) {
            console.log('📅 Updating project dates');
            await onUpdateProject(activeDrag.projectId, {
              start_date: newStartDate.toISOString().split('T')[0],
              end_date: newEndDate.toISOString().split('T')[0],
            });
          }

          // Update assignments
          console.log('👥 Updating project assignments');
          await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments);
          
          const actionText = memberChanged ? 'Project reassigned' : 'Timeline updated';
          toast({ 
            title: "Success", 
            description: `${actionText} successfully!` 
          });
        }
      }
    } catch (error) {
      console.error('❌ Drag and drop error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update project. Please try again.", 
        variant: "destructive" 
      });
    }

    // Clean up resize handle attribute
    if (activeDrag?.resizeHandle) {
      const dragElement = document.querySelector(`[data-project-id="${activeDrag.projectId}"]`) as HTMLElement;
      if (dragElement) {
        dragElement.removeAttribute('data-resize-handle');
      }
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
  }, [activeDrag, timelineBounds, totalDays, assignments, onUpdateProject, onUpdateProjectAssignments, clickTimeoutId, onShowResizeDialog]);

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
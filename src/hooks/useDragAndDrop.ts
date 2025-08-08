import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { differenceInDays, addDays } from 'date-fns';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';

interface DragData {
  projectId: string;
  originalMemberId: string;
  originalStartDate: string;
  originalEndDate: string;
  originalAllocation: number;
  originalWidth?: number;
  originalHeight?: number;
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
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number }[]) => Promise<void>;
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
    targetSlot: number | null;
  }>({ memberId: null, newStartDate: null, targetSlot: null });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      // Find the current allocation for this project and member
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
        originalWidth: active.data.current.width,
        originalHeight: active.data.current.height,
      });
    }
  }, [assignments]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, delta } = event;
    
    if (!over || !activeDrag) return;

    // Calculate new position based on drag offset
    let newMemberId: string | null = null;
    let newStartDate: Date | null = null;
    let targetSlot: number | null = null;

    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
      
      // Calculate target slot based on vertical position
      const SLOT_HEIGHT = 32;
      if (delta.y !== 0) {
        const slotIndex = Math.floor(Math.abs(delta.y) / SLOT_HEIGHT);
        targetSlot = Math.max(0, Math.min(3, slotIndex)); // Clamp to 0-3 slots
      }
    }

    // Calculate horizontal position change
    if (delta.x !== 0) {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const pixelsPerDay = containerWidth / totalDays;
      const dayOffset = Math.round(delta.x / pixelsPerDay);
      
      const originalStart = new Date(activeDrag.originalStartDate);
      newStartDate = addDays(originalStart, dayOffset);
      
      // Constrain to timeline bounds
      if (newStartDate < timelineBounds.start) {
        newStartDate = timelineBounds.start;
      } else if (newStartDate > timelineBounds.end) {
        newStartDate = timelineBounds.end;
      }
    }

    setDragOverData({ memberId: newMemberId, newStartDate, targetSlot });
  }, [activeDrag, totalDays, timelineBounds]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta } = event;
    
    if (!over || !activeDrag) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, targetSlot: null });
      return;
    }

    try {
      let newMemberId = activeDrag.originalMemberId;
      let newStartDate = new Date(activeDrag.originalStartDate);
      let newEndDate = new Date(activeDrag.originalEndDate);

      // Handle member reassignment
      if (over.data.current?.type === 'member-row') {
        newMemberId = over.data.current.memberId;
      }

      // Handle date changes
      if (delta.x !== 0) {
        const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
        const pixelsPerDay = containerWidth / totalDays;
        const dayOffset = Math.round(delta.x / pixelsPerDay);
        
        const projectDuration = differenceInDays(newEndDate, newStartDate);
        newStartDate = addDays(new Date(activeDrag.originalStartDate), dayOffset);
        newEndDate = addDays(newStartDate, projectDuration);
        
        // Constrain to timeline bounds
        if (newStartDate < timelineBounds.start) {
          const adjustment = differenceInDays(timelineBounds.start, newStartDate);
          newStartDate = timelineBounds.start;
          newEndDate = addDays(newEndDate, adjustment);
        } else if (newEndDate > timelineBounds.end) {
          const adjustment = differenceInDays(newEndDate, timelineBounds.end);
          newStartDate = addDays(newStartDate, -adjustment);
          newEndDate = timelineBounds.end;
        }
      }

      // Update project dates if they changed
      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;

      if (datesChanged) {
        await onUpdateProject(activeDrag.projectId, {
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
        });
      }

      // Update project assignees and allocations if member changed
      if (newMemberId !== activeDrag.originalMemberId) {
        // Check if target member has capacity for this allocation
        const targetMemberAssignments = assignments.filter(a => a.team_member_id === newMemberId);
        const targetMemberTotalAllocation = targetMemberAssignments.reduce((sum, a) => sum + a.percent_allocation, 0);
        
        if (targetMemberTotalAllocation + activeDrag.originalAllocation <= 100) {
          // Remove from original member and add to new member
          await onUpdateProjectAssignments(activeDrag.projectId, [
            { teamMemberId: newMemberId, percentAllocation: activeDrag.originalAllocation }
          ]);
        } else {
          console.warn('Cannot assign project: target member would be over-allocated');
          // Could show a toast notification here
        }
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, targetSlot: null });
  }, [activeDrag, totalDays, timelineBounds, assignments, onUpdateProject, onUpdateProjectAssignees, onUpdateProjectAssignments]);

  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    if (!activeDrag || project.id !== activeDrag.projectId) return null;

    const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
    const pixelsPerDay = containerWidth / totalDays;
    const dayOffset = Math.round(delta.x / pixelsPerDay);
    
    const originalStart = new Date(activeDrag.originalStartDate);
    const newStartDate = addDays(originalStart, dayOffset);
    const daysFromTimelineStart = differenceInDays(newStartDate, timelineBounds.start);
    const newLeftPercentage = Math.max(0, Math.min(100, (daysFromTimelineStart / totalDays) * 100));

    return {
      left: newLeftPercentage,
      opacity: 0.7,
      transform: `translateY(${delta.y}px)`,
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
import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { differenceInDays, addDays } from 'date-fns';
import { Project, TeamMember } from '@/types/roadmap';

interface DragData {
  projectId: string;
  originalMemberId: string;
  originalStartDate: string;
  originalEndDate: string;
}

interface TimelineBounds {
  start: Date;
  end: Date;
}

interface UseDragAndDropProps {
  timelineBounds: TimelineBounds;
  totalDays: number;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
}

export function useDragAndDrop({
  timelineBounds,
  totalDays,
  onUpdateProject,
  onUpdateProjectAssignees
}: UseDragAndDropProps) {
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [dragOverData, setDragOverData] = useState<{
    memberId: string | null;
    newStartDate: Date | null;
  }>({ memberId: null, newStartDate: null });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      setActiveDrag({
        projectId: active.data.current.projectId,
        originalMemberId: active.data.current.memberId,
        originalStartDate: active.data.current.startDate,
        originalEndDate: active.data.current.endDate,
      });
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, delta } = event;
    
    if (!over || !activeDrag) return;

    // Calculate new position based on drag offset
    let newMemberId: string | null = null;
    let newStartDate: Date | null = null;

    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
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

    setDragOverData({ memberId: newMemberId, newStartDate });
  }, [activeDrag, totalDays, timelineBounds]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta } = event;
    
    if (!over || !activeDrag) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null });
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

      // Update project assignees if member changed
      if (newMemberId !== activeDrag.originalMemberId) {
        await onUpdateProjectAssignees(activeDrag.projectId, [newMemberId]);
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null });
  }, [activeDrag, totalDays, timelineBounds, onUpdateProject, onUpdateProjectAssignees]);

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
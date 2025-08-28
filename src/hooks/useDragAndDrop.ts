import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { differenceInDays, addDays, startOfWeek, addWeeks, differenceInWeeks } from 'date-fns';
import { Project, TeamMember, ProjectAssignment } from '@/types/roadmap';
import { toast } from 'sonner';

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
      const SLOT_HEIGHT = 22; // Updated to match new compact size
      if (delta.y !== 0) {
        const slotIndex = Math.floor(Math.abs(delta.y) / SLOT_HEIGHT);
        targetSlot = Math.max(0, Math.min(3, slotIndex)); // Clamp to 0-3 slots
      }
    }

    // Calculate horizontal position change with weekly snapping
    if (delta.x !== 0) {
      const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
      const pixelsPerWeek = (containerWidth * 7) / totalDays; // 7 days per week
      const weekOffset = Math.round(delta.x / pixelsPerWeek);
      
      const originalStart = new Date(activeDrag.originalStartDate);
      const weekStartOfOriginal = startOfWeek(originalStart, { weekStartsOn: 1 }); // Monday start
      newStartDate = addWeeks(weekStartOfOriginal, weekOffset);
      
      // Constrain to timeline bounds
      if (newStartDate < timelineBounds.start) {
        newStartDate = startOfWeek(timelineBounds.start, { weekStartsOn: 1 });
      } else if (newStartDate > timelineBounds.end) {
        // Find the last week that fits within timeline
        const weeksInTimeline = Math.floor(differenceInDays(timelineBounds.end, timelineBounds.start) / 7);
        newStartDate = addWeeks(startOfWeek(timelineBounds.start, { weekStartsOn: 1 }), weeksInTimeline);
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

      // Handle date changes with weekly snapping
      if (delta.x !== 0) {
        const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
        const pixelsPerWeek = (containerWidth * 7) / totalDays; // 7 days per week
        const weekOffset = Math.round(delta.x / pixelsPerWeek);
        
        const originalStart = new Date(activeDrag.originalStartDate);
        const originalEnd = new Date(activeDrag.originalEndDate);
        const projectDuration = differenceInDays(originalEnd, originalStart);
        
        // Snap to week boundaries
        const weekStartOfOriginal = startOfWeek(originalStart, { weekStartsOn: 1 });
        newStartDate = addWeeks(weekStartOfOriginal, weekOffset);
        newEndDate = addDays(newStartDate, projectDuration);
        
        // Constrain to timeline bounds
        if (newStartDate < timelineBounds.start) {
          newStartDate = startOfWeek(timelineBounds.start, { weekStartsOn: 1 });
          newEndDate = addDays(newStartDate, projectDuration);
        } else if (newEndDate > timelineBounds.end) {
          // Move both dates back to fit within timeline
          const overflow = differenceInDays(newEndDate, timelineBounds.end);
          newStartDate = addDays(newStartDate, -overflow);
          newEndDate = addDays(newEndDate, -overflow);
          
          // Ensure start is still on week boundary
          newStartDate = startOfWeek(newStartDate, { weekStartsOn: 1 });
          newEndDate = addDays(newStartDate, projectDuration);
        }
      }

      // Update project dates if they changed
      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;

      if (datesChanged) {
        console.log('Updating project dates:', {
          projectId: activeDrag.projectId,
          oldStart: activeDrag.originalStartDate,
          newStart: newStartDate.toISOString().split('T')[0],
          oldEnd: activeDrag.originalEndDate,
          newEnd: newEndDate.toISOString().split('T')[0]
        });
        await onUpdateProject(activeDrag.projectId, {
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
        });
        console.log('Project dates updated successfully');
      }

      // Update project assignees and allocations if member changed
      if (newMemberId !== activeDrag.originalMemberId) {
        console.log('Reassigning project:', {
          projectId: activeDrag.projectId,
          fromMember: activeDrag.originalMemberId,
          toMember: newMemberId,
          allocation: activeDrag.originalAllocation
        });
        
        // Get all current assignments for this project
        const currentProjectAssignments = assignments.filter(a => a.project_id === activeDrag.projectId);
        
        // Create new assignments list:
        // 1. Keep all assignments except the one being moved
        // 2. Add the assignment to the new member
        const updatedAssignments = [
          // Keep other members' assignments
          ...currentProjectAssignments
            .filter(a => a.team_member_id !== activeDrag.originalMemberId)
            .map(a => ({ teamMemberId: a.team_member_id, percentAllocation: a.percent_allocation })),
          // Add assignment to new member
          { teamMemberId: newMemberId, percentAllocation: activeDrag.originalAllocation }
        ];
        
        console.log('New assignment structure:', updatedAssignments);
        await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments.map(a => ({
          teamMemberId: a.teamMemberId,
          percentAllocation: a.percentAllocation,
          startDate: newStartDate.toISOString().split('T')[0],
          endDate: newEndDate.toISOString().split('T')[0]
        })));
        console.log('Project reassignment completed successfully');
        toast.success(`Project reassigned successfully!`);
      }
    } catch (error) {
      console.error('Error during drag and drop:', error);
      toast.error('Failed to update project assignment');
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, targetSlot: null });
  }, [activeDrag, totalDays, timelineBounds, assignments, onUpdateProject, onUpdateProjectAssignees, onUpdateProjectAssignments]);

  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    if (!activeDrag || project.id !== activeDrag.projectId) return null;

    const containerWidth = document.querySelector('.timeline-container')?.clientWidth || 1;
    const pixelsPerWeek = (containerWidth * 7) / totalDays; // 7 days per week
    const weekOffset = Math.round(delta.x / pixelsPerWeek);
    
    const originalStart = new Date(activeDrag.originalStartDate);
    const weekStartOfOriginal = startOfWeek(originalStart, { weekStartsOn: 1 });
    const newStartDate = addWeeks(weekStartOfOriginal, weekOffset);
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
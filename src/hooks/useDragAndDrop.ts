import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { differenceInDays, addDays, startOfWeek, addWeeks, differenceInWeeks } from 'date-fns';
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
  
  // Cache timeline dimensions for performance
  const [timelineDimensions, setTimelineDimensions] = useState({ width: 0, pixelsPerDay: 0 });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current) {
      // Cache timeline dimensions at drag start for performance
      const containerElement = document.querySelector('.timeline-container');
      const containerWidth = containerElement?.clientWidth || 1200;
      const sidebarWidth = 192;
      const effectiveWidth = containerWidth - sidebarWidth;
      const pixelsPerDay = effectiveWidth / totalDays;
      
      setTimelineDimensions({ width: effectiveWidth, pixelsPerDay });
      
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
  }, [assignments, totalDays]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, delta } = event;
    
    if (!over || !activeDrag || timelineDimensions.pixelsPerDay === 0) return;

    // Calculate new position with better precision
    let newMemberId: string | null = null;
    let newStartDate: Date | null = null;
    let isValidDrop = false;

    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
      isValidDrop = true;
    }

    // More precise horizontal calculation with week-level snapping for better UX
    if (delta.x !== 0) {
      // Calculate which week we're hovering over
      const pixelsPerWeek = timelineDimensions.pixelsPerDay * 7;
      const weekOffset = Math.round(delta.x / pixelsPerWeek);
      
      const originalStart = new Date(activeDrag.originalStartDate);
      const weekStart = startOfWeek(originalStart, { weekStartsOn: 1 });
      newStartDate = addWeeks(weekStart, weekOffset);
      
      // Constrain to timeline bounds
      if (newStartDate < timelineBounds.start) {
        newStartDate = startOfWeek(timelineBounds.start, { weekStartsOn: 1 });
      } else if (newStartDate > timelineBounds.end) {
        const weeksInTimeline = Math.floor(differenceInDays(timelineBounds.end, timelineBounds.start) / 7);
        newStartDate = addWeeks(startOfWeek(timelineBounds.start, { weekStartsOn: 1 }), weeksInTimeline);
      }
    }

    setDragOverData({ memberId: newMemberId, newStartDate, isValidDrop });
  }, [activeDrag, timelineBounds, timelineDimensions]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta, active } = event;
    
    if (!activeDrag) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Check if this was a click rather than a drag (minimal movement)
    const isClick = Math.abs(delta.x) < 5 && Math.abs(delta.y) < 5;
    
    if (isClick && active.data.current?.onClick) {
      // Trigger the click handler
      active.data.current.onClick();
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    if (!over) {
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    try {
      let newMemberId = activeDrag.originalMemberId;
      let newStartDate = new Date(activeDrag.originalStartDate);
      let newEndDate = new Date(activeDrag.originalEndDate);

      // Handle member reassignment - only if dropped on a different member row
      if (over.data.current?.type === 'member-row' && over.data.current.memberId !== activeDrag.originalMemberId) {
        newMemberId = over.data.current.memberId;
      }

      // Handle date changes with week-level precision for better alignment
      if (delta.x !== 0 && timelineDimensions.pixelsPerDay > 0) {
        const pixelsPerWeek = timelineDimensions.pixelsPerDay * 7;
        const weekOffset = Math.round(delta.x / pixelsPerWeek);
        
        const originalStart = new Date(activeDrag.originalStartDate);
        const originalEnd = new Date(activeDrag.originalEndDate);
        const projectDuration = differenceInDays(originalEnd, originalStart);
        
        // Snap to week boundaries for predictable alignment
        const weekStart = startOfWeek(originalStart, { weekStartsOn: 1 });
        newStartDate = addWeeks(weekStart, weekOffset);
        newEndDate = addDays(newStartDate, projectDuration);
        
        // Constrain to timeline bounds
        if (newStartDate < timelineBounds.start) {
          newStartDate = startOfWeek(timelineBounds.start, { weekStartsOn: 1 });
          newEndDate = addDays(newStartDate, projectDuration);
        } else if (newEndDate > timelineBounds.end) {
          newEndDate = new Date(timelineBounds.end);
          newStartDate = addDays(newEndDate, -projectDuration);
          // Snap back to week boundary if possible
          const snappedStart = startOfWeek(newStartDate, { weekStartsOn: 1 });
          if (addDays(snappedStart, projectDuration) <= timelineBounds.end) {
            newStartDate = snappedStart;
            newEndDate = addDays(newStartDate, projectDuration);
          }
        }
      }

      // Determine what changed
      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;
      
      const memberChanged = newMemberId !== activeDrag.originalMemberId;

      console.log('Drag end analysis:', {
        projectId: activeDrag.projectId,
        datesChanged,
        memberChanged,
        originalStart: activeDrag.originalStartDate,
        newStart: newStartDate.toISOString().split('T')[0],
        originalEnd: activeDrag.originalEndDate,
        newEnd: newEndDate.toISOString().split('T')[0],
        originalMember: activeDrag.originalMemberId,
        newMember: newMemberId
      });

      // If only dates changed (same member), update both project and assignment dates
      if (datesChanged && !memberChanged) {
        console.log('Updating project and assignment dates:', {
          projectId: activeDrag.projectId,
          oldStart: activeDrag.originalStartDate,
          newStart: newStartDate.toISOString().split('T')[0],
          oldEnd: activeDrag.originalEndDate,
          newEnd: newEndDate.toISOString().split('T')[0]
        });
        
        // Update project dates
        await onUpdateProject(activeDrag.projectId, {
          start_date: newStartDate.toISOString().split('T')[0],
          end_date: newEndDate.toISOString().split('T')[0],
        });
        
        // Get current assignments for this project and update their dates
        const currentProjectAssignments = assignments.filter(a => a.project_id === activeDrag.projectId);
        const updatedAssignments = currentProjectAssignments.map(a => ({
          teamMemberId: a.team_member_id,
          percentAllocation: a.percent_allocation,
          startDate: newStartDate.toISOString().split('T')[0],
          endDate: newEndDate.toISOString().split('T')[0]
        }));
        
        // Update assignment dates to match project dates
        await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments);
        
        console.log('Project and assignment dates updated successfully');
        toast({ title: "Success", description: "Project timeline updated!" });
      }
      
      // If member changed (with or without date changes), update assignments
      else if (memberChanged) {
        console.log('Reassigning project:', {
          projectId: activeDrag.projectId,
          fromMember: activeDrag.originalMemberId,
          toMember: newMemberId,
          allocation: activeDrag.originalAllocation,
          newDates: datesChanged ? {
            start: newStartDate.toISOString().split('T')[0],
            end: newEndDate.toISOString().split('T')[0]
          } : null
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
        
        // Update both project dates and assignments if dates changed
        if (datesChanged) {
          await onUpdateProject(activeDrag.projectId, {
            start_date: newStartDate.toISOString().split('T')[0],
            end_date: newEndDate.toISOString().split('T')[0],
          });
        }
        
        await onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments.map(a => ({
          teamMemberId: a.teamMemberId,
          percentAllocation: a.percentAllocation,
          startDate: newStartDate.toISOString().split('T')[0],
          endDate: newEndDate.toISOString().split('T')[0]
        })));
        console.log('Project reassignment completed successfully');
        toast({ title: "Success", description: "Project reassigned successfully!" });
      }
    } catch (error) {
      console.error('Error during drag and drop:', error);
      toast({ title: "Error", description: "Failed to update project assignment", variant: "destructive" });
    }

    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
  }, [activeDrag, totalDays, timelineBounds, assignments, onUpdateProject, onUpdateProjectAssignees, onUpdateProjectAssignments]);

  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    if (!activeDrag || project.id !== activeDrag.projectId || timelineDimensions.pixelsPerDay === 0) {
      return null;
    }

    const dayOffset = Math.round(delta.x / timelineDimensions.pixelsPerDay);
    const originalStart = new Date(activeDrag.originalStartDate);
    const newStartDate = addDays(originalStart, dayOffset);
    
    // Calculate position as percentage of timeline
    const daysFromTimelineStart = differenceInDays(newStartDate, timelineBounds.start);
    const newLeftPercentage = Math.max(0, Math.min(100, (daysFromTimelineStart / totalDays) * 100));

    return {
      left: newLeftPercentage,
      opacity: dragOverData.isValidDrop ? 0.9 : 0.5,
      transform: `scale(1.02)`,
    };
  }, [activeDrag, totalDays, timelineBounds, timelineDimensions, dragOverData.isValidDrop]);

  return {
    activeDrag,
    dragOverData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculatePreviewPosition,
  };
}
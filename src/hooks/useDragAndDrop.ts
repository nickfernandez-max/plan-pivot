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
  
  // Robust timeline calculations with validation
  const getTimelineMetrics = useCallback(() => {
    const container = document.querySelector('.timeline-container');
    if (!container) {
      console.warn('⚠️ Timeline container not found, using fallback calculations');
      return { pixelsPerDay: 20, isValid: false }; // Fallback value
    }

    const containerWidth = container.clientWidth;
    const sidebarWidth = 192;
    const timelineWidth = containerWidth - sidebarWidth;
    
    if (timelineWidth <= 0 || totalDays <= 0) {
      console.warn('⚠️ Invalid timeline dimensions:', { containerWidth, timelineWidth, totalDays });
      return { pixelsPerDay: 20, isValid: false };
    }

    const pixelsPerDay = timelineWidth / totalDays;
    console.log('📏 Timeline metrics:', { containerWidth, timelineWidth, totalDays, pixelsPerDay });
    
    return { pixelsPerDay, isValid: true };
  }, [totalDays]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    console.log('🚀 DRAG START:', { active: active.data.current });
    if (!active.data.current) return;

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
  }, [assignments]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, delta, active } = event;
    const timelineMetrics = getTimelineMetrics();
    
    console.log('🔄 DRAG OVER:', { 
      overId: over?.id, 
      overType: over?.data.current?.type, 
      delta, 
      activeDrag: !!activeDrag,
      timelineMetrics
    });
    
    if (!over || !activeDrag || !timelineMetrics.isValid) return;

    let newMemberId: string | null = null;
    let newStartDate: Date | null = null;
    let isValidDrop = false;

    // Handle member reassignment
    if (over.data.current?.type === 'member-row') {
      newMemberId = over.data.current.memberId;
      isValidDrop = true;
    }

    // Calculate new date position with validation
    if (Math.abs(delta.x) > 5) {
      const dayOffset = Math.round(delta.x / timelineMetrics.pixelsPerDay);
      const originalStart = new Date(activeDrag.originalStartDate);
      newStartDate = addDays(originalStart, dayOffset);
      
      // Robust bounds checking
      if (newStartDate < timelineBounds.start) {
        newStartDate = new Date(timelineBounds.start);
        console.log('📍 Constrained to timeline start');
      } else if (newStartDate > timelineBounds.end) {
        newStartDate = new Date(timelineBounds.end);
        console.log('📍 Constrained to timeline end');
      }
      
      // Validate the calculated date is reasonable
      if (newStartDate >= timelineBounds.start && newStartDate <= timelineBounds.end) {
        isValidDrop = true;
        console.log('📅 NEW DATE CALCULATED:', newStartDate.toISOString().split('T')[0]);
      } else {
        console.warn('⚠️ Invalid date calculated, rejecting drop');
        newStartDate = null;
      }
    }

    setDragOverData({ memberId: newMemberId, newStartDate, isValidDrop });
  }, [activeDrag, timelineBounds, getTimelineMetrics]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over, delta, active } = event;
    
    console.log('🎯 DRAG END:', { 
      overId: over?.id, 
      overType: over?.data.current?.type,
      delta, 
      activeDrag,
      dragOverData
    });
    
    if (!activeDrag) {
      console.log('❌ No active drag');
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Detect clicks vs drags (more reliable threshold)
    const isDragAction = Math.abs(delta.x) > 10 || Math.abs(delta.y) > 10;
    
    if (!isDragAction && active.data.current?.onClick) {
      console.log('🖱️ Processing click action');
      active.data.current.onClick();
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    if (!over || !isDragAction) {
      console.log('🚫 Invalid drop or no drag action');
      setActiveDrag(null);
      setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
      return;
    }

    // Validate drop is actually valid
    if (!dragOverData.isValidDrop) {
      console.log('🚫 Drop rejected - invalid drop zone');
      toast({ 
        title: "Invalid Drop", 
        description: "Cannot drop project in this location.", 
        variant: "destructive" 
      });
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

      // Handle member reassignment with validation
      if (over.data.current?.type === 'member-row' && 
          over.data.current.memberId !== activeDrag.originalMemberId) {
        newMemberId = over.data.current.memberId;
        console.log('👤 Member reassignment:', { from: activeDrag.originalMemberId, to: newMemberId });
      } else if (dragOverData.memberId && dragOverData.memberId !== activeDrag.originalMemberId) {
        newMemberId = dragOverData.memberId;
        console.log('👤 Member reassignment via dragOver:', { from: activeDrag.originalMemberId, to: newMemberId });
      }

      // Handle date changes with robust validation
      if (dragOverData.newStartDate) {
        newStartDate = new Date(dragOverData.newStartDate);
        newEndDate = addDays(newStartDate, projectDuration);
        
        // Robust bounds checking with fallback
        if (newEndDate > timelineBounds.end) {
          newEndDate = new Date(timelineBounds.end);
          newStartDate = addDays(newEndDate, -projectDuration);
          console.log('📅 Adjusted dates due to end bound constraint');
        }
        
        if (newStartDate < timelineBounds.start) {
          newStartDate = new Date(timelineBounds.start);
          newEndDate = addDays(newStartDate, projectDuration);
          console.log('📅 Adjusted dates due to start bound constraint');
        }

        // Final validation - ensure dates are still reasonable
        if (newStartDate >= timelineBounds.end || newEndDate <= timelineBounds.start) {
          throw new Error('Calculated dates are outside timeline bounds');
        }
      }

      const datesChanged = 
        newStartDate.toISOString().split('T')[0] !== activeDrag.originalStartDate ||
        newEndDate.toISOString().split('T')[0] !== activeDrag.originalEndDate;
      
      const memberChanged = newMemberId !== activeDrag.originalMemberId;

      console.log('📊 FINAL CHANGES:', { 
        datesChanged, 
        memberChanged, 
        newStartDate: newStartDate.toISOString().split('T')[0],
        newEndDate: newEndDate.toISOString().split('T')[0],
        newMemberId,
        projectDuration
      });

      // Atomic operation approach - combined updates for consistency
      if (datesChanged || memberChanged) {
        const currentAssignments = assignments.filter(a => a.project_id === activeDrag.projectId);
        
        if (currentAssignments.length === 0) {
          throw new Error('No existing assignments found for project');
        }

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

        console.log('💾 Updating database with:', { updatedAssignments });

        // Perform updates with better error handling
        const updatePromises = [];
        
        if (datesChanged) {
          updatePromises.push(
            onUpdateProject(activeDrag.projectId, {
              start_date: newStartDate.toISOString().split('T')[0],
              end_date: newEndDate.toISOString().split('T')[0],
            })
          );
        }
        
        updatePromises.push(
          onUpdateProjectAssignments(activeDrag.projectId, updatedAssignments)
        );

        // Execute all updates concurrently for better performance
        await Promise.all(updatePromises);
        
        const actionText = memberChanged ? 'Project reassigned' : 'Timeline updated';
        toast({ 
          title: "Success", 
          description: `${actionText} successfully!`,
          duration: 3000
        });
        
        console.log('✅ Drag and drop completed successfully');
      } else {
        console.log('ℹ️ No changes detected, skipping update');
      }
    } catch (error) {
      console.error('💥 Drag and drop error:', error);
      
      // More specific error messages
      let errorMessage = "Failed to update project. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('timeline bounds')) {
          errorMessage = "Project dates are outside the visible timeline. Please adjust the timeline view.";
        } else if (error.message.includes('assignments')) {
          errorMessage = "Failed to update project assignments. Please check the project configuration.";
        }
      }
      
      toast({ 
        title: "Update Failed", 
        description: errorMessage, 
        variant: "destructive",
        duration: 5000
      });
    }

    // Always clean up state
    setActiveDrag(null);
    setDragOverData({ memberId: null, newStartDate: null, isValidDrop: false });
  }, [activeDrag, timelineBounds, dragOverData, assignments, onUpdateProject, onUpdateProjectAssignments]);

  // Robust preview position calculation with validation
  const calculatePreviewPosition = useCallback((project: Project, delta: { x: number; y: number }) => {
    const timelineMetrics = getTimelineMetrics();
    
    if (!activeDrag || project.id !== activeDrag.projectId || !timelineMetrics.isValid) {
      return null;
    }

    const dayOffset = Math.round(delta.x / timelineMetrics.pixelsPerDay);
    const originalStart = new Date(activeDrag.originalStartDate);
    const newStartDate = addDays(originalStart, dayOffset);
    
    // Constrain to bounds
    const boundedStartDate = new Date(Math.max(
      timelineBounds.start.getTime(),
      Math.min(timelineBounds.end.getTime(), newStartDate.getTime())
    ));
    
    const daysFromStart = differenceInDays(boundedStartDate, timelineBounds.start);
    const leftPercentage = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));

    return {
      left: leftPercentage,
      opacity: dragOverData.isValidDrop ? 0.8 : 0.4,
    };
  }, [activeDrag, totalDays, timelineBounds, getTimelineMetrics, dragOverData.isValidDrop]);

  return {
    activeDrag,
    dragOverData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculatePreviewPosition,
  };
}
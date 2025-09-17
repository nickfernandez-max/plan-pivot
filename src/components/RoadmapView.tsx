import { useMemo, Fragment, useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, TeamMember, Team, Product, ProjectAssignment, WorkAssignment, TeamMembership } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addWeeks, differenceInWeeks } from 'date-fns';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableProject } from '@/components/DraggableProject';
import { DroppableMemberRow } from '@/components/DroppableMemberRow';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { SmoothDragOverlay } from '@/components/SmoothDragOverlay';
import { Users, ChevronLeft, ChevronRight, Calendar, UserPlus, Plus } from 'lucide-react';
import { AddProjectAssignmentDialog } from '@/components/AddProjectAssignmentDialog';
import { AddWorkAssignmentDialog } from '@/components/AddWorkAssignmentDialog';
import { AddProjectDialog } from '@/components/AddProjectDialog';
import { DateConflictDialog } from '@/components/DateConflictDialog';
import { ProjectResizeDialog } from '@/components/ProjectResizeDialog';
import { useDateValidation } from '@/hooks/useDateValidation';
import { toast } from '@/hooks/use-toast';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  assignments: ProjectAssignment[];
  workAssignments: WorkAssignment[];
  memberships: TeamMembership[];
  selectedTeam?: string;
  selectedProduct?: string;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onAddWorkAssignment: (assignment: Omit<WorkAssignment, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateWorkAssignment: (id: string, updates: Partial<WorkAssignment>) => Promise<any>;
  onDeleteWorkAssignment: (id: string) => Promise<void>;
  isFuturePlanning?: boolean;
  onPublishProject?: (projectId: string) => Promise<void>;
}

interface ProjectWithPosition extends Project {
  left: number;
  width: number;
  topOffset: number;
  itemHeight: number;
  allocation: number;
  start_date: string;
  end_date: string;
}

interface WorkAssignmentWithPosition extends WorkAssignment {
  left: number;
  width: number;
  topOffset: number;
  itemHeight: number;
  allocation: number;
}

interface MemberRow {
  member: TeamMember;
  team: Team;
  projects: ProjectWithPosition[];
  workAssignments: WorkAssignmentWithPosition[];
  allocatedPercentage: number;
  rowHeight: number;
}

// Function to assign flexible allocation positions to projects and work assignments based on temporal scheduling and percentage
const assignAllocationPositions = (
  projects: Array<Project & { left: number; width: number }>,
  workAssignments: Array<WorkAssignment & { left: number; width: number }>,
  assignments: ProjectAssignment[],
  memberId: string,
  rowHeight: number
): { projects: ProjectWithPosition[]; workAssignments: WorkAssignmentWithPosition[] } => {
  if (projects.length === 0 && workAssignments.length === 0) return { projects: [], workAssignments: [] };

  const ROW_PADDING = 4; // Padding at top and bottom of row
  const ITEM_SPACING = 2; // Spacing between overlapping items
  const AVAILABLE_HEIGHT = rowHeight - (ROW_PADDING * 2);

  // Prepare projects with temporal and allocation data
  const projectsWithData = projects.map(project => {
    const assignment = assignments.find(a => 
      a.project_id === project.id && a.team_member_id === memberId
    );
    
    const allocation = assignment?.percent_allocation || 25;
    // Use assignment dates if available, otherwise fall back to project dates
    const startDate = assignment?.start_date ? new Date(assignment.start_date) : new Date(project.start_date);
    const endDate = assignment?.end_date ? new Date(assignment.end_date) : new Date(project.end_date);
    
    // Calculate height proportional to allocation (minimum 20px for visibility)
    // For tentative projects, use a minimum of 30px to ensure visibility
    const minHeight = project.status_visibility === 'tentative' ? 30 : 20;
    const itemHeight = Math.max(Math.round((allocation / 100) * AVAILABLE_HEIGHT), minHeight);
    
    return {
      ...project,
      allocation,
      startDate,
      endDate,
      itemHeight,
      topOffset: 0, // Will be calculated during positioning
      assigned: false
    };
  });

  // Prepare work assignments with temporal and allocation data
  const workAssignmentsWithData = workAssignments.map(workAssignment => {
    const allocation = workAssignment.percent_allocation;
    const startDate = new Date(workAssignment.start_date);
    const endDate = new Date(workAssignment.end_date);
    
    // Calculate height proportional to allocation (minimum 20px for visibility)
    const itemHeight = Math.max(Math.round((allocation / 100) * AVAILABLE_HEIGHT), 20);
    
    return {
      ...workAssignment,
      allocation,
      startDate,
      endDate,
      itemHeight,
      topOffset: 0, // Will be calculated during positioning
      assigned: false
    };
  });

  // Combine all items for unified positioning
  const allItems = [...projectsWithData, ...workAssignmentsWithData];

  // Sort all items by start date, then by allocation (higher allocation first)
  allItems.sort((a, b) => {
    const dateCompare = a.startDate.getTime() - b.startDate.getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.allocation - a.allocation; // Higher allocation gets priority
  });

  // Track vertical position occupancy with time intervals
  const positionOccupancy: Array<{ startDate: Date; endDate: Date; itemId: string; topOffset: number; bottomOffset: number }> = [];

  // Function to find the best vertical position for an item
  const findBestPosition = (startDate: Date, endDate: Date, itemHeight: number): number => {
    let bestPosition = ROW_PADDING;
    
    // Check for temporal overlaps and find a free vertical space
    const overlappingItems = positionOccupancy.filter(occupation => 
      !(endDate <= occupation.startDate || startDate >= occupation.endDate)
    );
    
    if (overlappingItems.length > 0) {
      // Sort overlapping items by top offset
      overlappingItems.sort((a, b) => a.topOffset - b.topOffset);
      
      // Try to fit between existing items or stack below them
      for (let i = 0; i < overlappingItems.length; i++) {
        const currentItem = overlappingItems[i];
        const nextItem = overlappingItems[i + 1];
        
        // Check if we can fit between current and next item
        if (nextItem) {
          const availableSpace = nextItem.topOffset - currentItem.bottomOffset - ITEM_SPACING;
          if (availableSpace >= itemHeight) {
            bestPosition = currentItem.bottomOffset + ITEM_SPACING;
            break;
          }
        } else {
          // No next item, place below current item
          bestPosition = currentItem.bottomOffset + ITEM_SPACING;
          break;
        }
      }
      
      // If no space found between items, place at the bottom
      if (bestPosition === ROW_PADDING && overlappingItems.length > 0) {
        const lastItem = overlappingItems[overlappingItems.length - 1];
        bestPosition = lastItem.bottomOffset + ITEM_SPACING;
      }
    }
    
    // Ensure the item fits within the available height
    const maxTop = AVAILABLE_HEIGHT - itemHeight + ROW_PADDING;
    return Math.min(bestPosition, maxTop);
  };

  // Assign vertical positions using a stacking algorithm
  for (const item of allItems) {
    const topOffset = findBestPosition(item.startDate, item.endDate, item.itemHeight);
    item.topOffset = topOffset;
    item.assigned = true;
    
    // Reserve the vertical space
    positionOccupancy.push({
      startDate: item.startDate,
      endDate: item.endDate,
      itemId: item.id,
      topOffset: topOffset,
      bottomOffset: topOffset + item.itemHeight
    });
  }

  // Separate projects and work assignments with their assigned positions
  const assignedProjects = projectsWithData.map(project => ({
    ...project,
    topOffset: project.topOffset,
    allocation: project.allocation,
    itemHeight: project.itemHeight,
    // Preserve the calculated assignment dates for tooltip display
    start_date: project.startDate.toISOString().split('T')[0],
    end_date: project.endDate.toISOString().split('T')[0]
  }));

  const assignedWorkAssignments = workAssignmentsWithData.map(workAssignment => {
    const { startDate: _startDate, endDate: _endDate, assigned: _assigned, ...rest } = workAssignment;
    return {
      ...rest,
      topOffset: workAssignment.topOffset,
      allocation: workAssignment.allocation,
      itemHeight: workAssignment.itemHeight
    };
  });

  return { projects: assignedProjects, workAssignments: assignedWorkAssignments };
};

export function RoadmapView({ 
  projects, 
  teamMembers, 
  teams, 
  products,
  assignments,
  workAssignments,
  memberships,
  selectedTeam = 'all',
  selectedProduct = 'all',
  onUpdateProject, 
  onUpdateProjectAssignees,
  onUpdateProjectProducts,
  onUpdateProjectAssignments,
  onAddProject,
  onAddWorkAssignment,
  onUpdateWorkAssignment,
  onDeleteWorkAssignment,
  isFuturePlanning = false,
  onPublishProject
}: RoadmapViewProps) {
  
  // Initialize date validation hook
  const { conflictDialog, closeConflictDialog } = useDateValidation({
    onUpdateProject,
    onUpdateProjectAssignments
  });
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // State for resize dialog
  const [resizeDialog, setResizeDialog] = useState<{
    open: boolean;
    projectId: string;
    memberId: string;
    memberName: string;
    projectName: string;
    newDates: { startDate: string; endDate: string };
    resizeHandle: 'left' | 'right';
  }>({
    open: false,
    projectId: '',
    memberId: '',
    memberName: '',
    projectName: '',
    newDates: { startDate: '', endDate: '' },
    resizeHandle: 'left'
  });
  
  // Debug: Track editingProject state changes
  useEffect(() => {
    console.log('🔧 editingProject state changed:', editingProject?.name || 'null');
  }, [editingProject]);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isWorkAssignmentDialogOpen, setIsWorkAssignmentDialogOpen] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [frontProject, setFrontProject] = useState<string | null>(null);
  const [preSelectedMember, setPreSelectedMember] = useState<{ id: string; startDate: string } | null>(null);
  
  // State for number of months to display
  const [monthsToShow, setMonthsToShow] = useState<number>(9);
  
  const handleOpenWorkAssignmentDialog = (memberId: string, memberName: string) => {
    setSelectedMember({ id: memberId, name: memberName });
    setIsWorkAssignmentDialogOpen(true);
  };

  // Handle resize dialog
  const handleShowResizeDialog = useCallback((
    projectId: string,
    memberId: string,
    newDates: { startDate: string; endDate: string },
    resizeHandle: 'left' | 'right'
  ) => {
    const project = projects.find(p => p.id === projectId);
    const member = teamMembers.find(m => m.id === memberId);
    
    if (project && member) {
      setResizeDialog({
        open: true,
        projectId,
        memberId,
        memberName: member.name,
        projectName: project.name,
        newDates,
        resizeHandle
      });
    }
  }, [projects, teamMembers]);

  const handleResizeUpdateAll = useCallback(async () => {
    try {
      // Update project dates (affects all assignments)
      await onUpdateProject(resizeDialog.projectId, {
        start_date: resizeDialog.newDates.startDate,
        end_date: resizeDialog.newDates.endDate,
      });

      // Update all assignments to use new dates
      const currentAssignments = assignments.filter(a => a.project_id === resizeDialog.projectId);
      const updatedAssignments = currentAssignments.map(a => ({
        teamMemberId: a.team_member_id,
        percentAllocation: a.percent_allocation,
        startDate: resizeDialog.newDates.startDate,
        endDate: resizeDialog.newDates.endDate
      }));

      await onUpdateProjectAssignments(resizeDialog.projectId, updatedAssignments);
      
      setResizeDialog(prev => ({ ...prev, open: false }));
      
      toast({ 
        title: "Success", 
        description: "Project dates updated for all team members!" 
      });
    } catch (error) {
      console.error('Error updating all assignments:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update project dates. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [resizeDialog, onUpdateProject, onUpdateProjectAssignments, assignments]);

  const handleResizeUpdateIndividual = useCallback(async () => {
    try {
      // Update only the specific member's assignment
      const currentAssignments = assignments.filter(a => a.project_id === resizeDialog.projectId);
      const updatedAssignments = currentAssignments.map(a => ({
        teamMemberId: a.team_member_id,
        percentAllocation: a.percent_allocation,
        startDate: a.team_member_id === resizeDialog.memberId ? resizeDialog.newDates.startDate : a.start_date,
        endDate: a.team_member_id === resizeDialog.memberId ? resizeDialog.newDates.endDate : a.end_date
      }));

      await onUpdateProjectAssignments(resizeDialog.projectId, updatedAssignments);
      
      setResizeDialog(prev => ({ ...prev, open: false }));
      
      toast({ 
        title: "Success", 
        description: `Assignment dates updated for ${resizeDialog.memberName}!` 
      });
    } catch (error) {
      console.error('Error updating individual assignment:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update assignment dates. Please try again.", 
        variant: "destructive" 
      });
    }
  }, [resizeDialog, onUpdateProjectAssignments, assignments]);

  const handleCloseWorkAssignmentDialog = () => {
    setIsWorkAssignmentDialogOpen(false);
    setSelectedMember(null);
  };
  
  const handleCloseResizeDialog = useCallback(() => {
    setResizeDialog(prev => ({ ...prev, open: false }));
  }, []);

  // Calculate the full timeline bounds to determine navigation limits
  const fullTimelineBounds = useMemo(() => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    
    // Always extend at least 2 years into the future for continuous scrolling
    const futureEnd = endOfMonth(addMonths(now, 24));
    
    if (projects.length === 0) {
      return {
        start: currentMonth,
        end: futureEnd
      };
    }

    const allDates = projects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    // Always include current month in the bounds
    allDates.push(currentMonth);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    return {
      start: startOfMonth(minDate),
      // Ensure timeline extends at least 2 years into future, or project end date, whichever is later
      end: endOfMonth(maxDate > futureEnd ? maxDate : futureEnd)
    };
  }, [projects]);

  // State for current viewport - default to today
  const [viewportStart, setViewportStart] = useState<Date>(() => startOfMonth(new Date()));

  // Calculate visible timeline bounds based on selected months
  const timelineBounds = useMemo(() => {
    const start = startOfMonth(viewportStart);
    const end = endOfMonth(addMonths(start, monthsToShow - 1));
    
    return { start, end };
  }, [viewportStart, monthsToShow]);

  const totalDays = differenceInDays(timelineBounds.end, timelineBounds.start);

  // Navigation functions
  const canNavigateLeft = useMemo(() => {
    return viewportStart > fullTimelineBounds.start;
  }, [viewportStart, fullTimelineBounds.start]);

  const canNavigateRight = useMemo(() => {
    const viewportEnd = endOfMonth(addMonths(viewportStart, monthsToShow - 1));
    return viewportEnd < fullTimelineBounds.end;
  }, [viewportStart, monthsToShow, fullTimelineBounds.end]);

  const navigateLeft = () => {
    if (canNavigateLeft) {
      const moveAmount = Math.min(3, monthsToShow); // Move by 3 months or the display width, whichever is smaller
      setViewportStart(prev => startOfMonth(subMonths(prev, moveAmount)));
    }
  };

  const navigateRight = () => {
    if (canNavigateRight) {
      const moveAmount = Math.min(3, monthsToShow);
      setViewportStart(prev => startOfMonth(addMonths(prev, moveAmount)));
    }
  };

  // Filter projects to only include those that intersect with the visible timeline
  const visibleProjects = useMemo(() => {
    return projects.filter(project => {
      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);
      
      // STRICT: Project must actually overlap with timeline bounds
      // Project ends AFTER timeline starts AND project starts BEFORE timeline ends
      const actuallyOverlaps = projectEnd >= timelineBounds.start && projectStart <= timelineBounds.end;
      
      // For main roadmap, only show published projects  
      const isPublished = isFuturePlanning ? true : project.status_visibility === 'published';
      
      return actuallyOverlaps && isPublished;
    });
  }, [projects, timelineBounds, isFuturePlanning]);

  // Filter work assignments to only include those that intersect with the visible timeline
  const visibleWorkAssignments = useMemo(() => {
    return workAssignments.filter(workAssignment => {
      const assignmentStart = new Date(workAssignment.start_date);
      const assignmentEnd = new Date(workAssignment.end_date);
      
      // Work assignment intersects if it starts before timeline ends and ends after timeline starts
      return assignmentStart <= timelineBounds.end && assignmentEnd >= timelineBounds.start;
    });
  }, [workAssignments, timelineBounds]);

  // Ref for timeline container to handle scrolling
  const timelineRef = useRef<HTMLDivElement>(null);

  // Handle wheel events for horizontal scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only handle horizontal scroll or when holding shift
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      
      const scrollSensitivity = 0.5; // Adjust scroll sensitivity
      const monthsToMove = Math.max(1, Math.round(Math.abs(e.deltaX) * scrollSensitivity / 100));
      
      if (e.deltaX > 0) {
        // Scroll right
        if (canNavigateRight) {
          setViewportStart(prev => startOfMonth(addMonths(prev, monthsToMove)));
        }
      } else {
        // Scroll left
        if (canNavigateLeft) {
          setViewportStart(prev => startOfMonth(subMonths(prev, monthsToMove)));
        }
      }
    }
  }, [canNavigateLeft, canNavigateRight]);

  // Initialize drag and drop functionality
  const {
    activeDrag,
    dragOverData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculatePreviewPosition,
  } = useDragAndDrop({
    timelineBounds,
    totalDays,
    assignments,
    onUpdateProject,
    onUpdateProjectAssignees,
    onUpdateProjectAssignments,
    onShowResizeDialog: handleShowResizeDialog,
  });

  // Generate month headers
  const monthHeaders = useMemo(() => {
    const months = [];
    let current = new Date(timelineBounds.start);
    
    while (current <= timelineBounds.end) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const daysFromStart = differenceInDays(monthStart, timelineBounds.start);
      const monthDays = differenceInDays(monthEnd, monthStart) + 1;
      
      months.push({
        date: monthStart,
        label: format(monthStart, 'MMM yyyy'),
        left: (daysFromStart / totalDays) * 100,
        width: (monthDays / totalDays) * 100
      });
      
      current = addDays(monthEnd, 1);
    }
    
    return months;
  }, [timelineBounds, totalDays]);

  // Generate weekly grid lines and backgrounds
  const weeklyGrid = useMemo(() => {
    const weeks = [];
    const weekBackgrounds = [];
    // Start from the beginning of the week that contains timeline start
    let current = startOfWeek(timelineBounds.start, { weekStartsOn: 1 }); // Monday as start of week
    let weekIndex = 0;
    
    while (current <= timelineBounds.end) {
      const daysFromStart = differenceInDays(current, timelineBounds.start);
      const leftPosition = (daysFromStart / totalDays) * 100;
      
      // Calculate week width
      const weekEnd = addWeeks(current, 1);
      const weekEndFromStart = differenceInDays(weekEnd, timelineBounds.start);
      const rightPosition = (weekEndFromStart / totalDays) * 100;
      const weekWidth = rightPosition - leftPosition;
      
      // Only add if the week intersects with our visible timeline
      if (leftPosition < 100 && rightPosition > 0) {
        // Week grid line
        weeks.push({
          date: current,
          left: Math.max(0, leftPosition),
          label: format(current, 'MMM d'),
          weekNumber: format(current, 'w')
        });
        
        // Week background for alternating colors
        weekBackgrounds.push({
          left: Math.max(0, leftPosition),
          width: Math.min(weekWidth, 100 - Math.max(0, leftPosition)),
          isEven: weekIndex % 2 === 0,
          weekLabel: `Week ${format(current, 'w')} - ${format(current, 'MMM d')}`
        });
      }
      
      current = addWeeks(current, 1);
      weekIndex++;
    }
    
    return { weeks, weekBackgrounds };
  }, [timelineBounds, totalDays]);

  // Handle double-click on member row to add assignment
  const handleMemberRowDoubleClick = (memberId: string, clickedDate: Date) => {
    console.log('🎯 RoadmapView handleMemberRowDoubleClick called:', {
      memberId,
      clickedDate,
      clickedDateString: clickedDate.toISOString(),
      dateOnly: clickedDate.toISOString().split('T')[0]
    });
    
    setPreSelectedMember({
      id: memberId,
      startDate: clickedDate.toISOString().split('T')[0]
    });
    
    console.log('🎯 Setting dialog state to open and pre-selected member');
    setIsAssignmentDialogOpen(true);
  };

  // Handle close of assignment dialog
  const handleAssignmentDialogClose = (open: boolean) => {
    setIsAssignmentDialogOpen(open);
    if (!open) {
      setPreSelectedMember(null);
    }
  };

  // Group teams by product and calculate member rows with allocation slots
  const productGroups = useMemo(() => {
    const FIXED_ROW_HEIGHT = 100; // Increased to accommodate all 4 allocation slots (4 * 24px + padding)
    const ALLOCATION_SLOTS = 4;
    
    // Group teams by product
    const productsWithTeams = products.map(product => ({
      product,
      teams: teams.filter(team => team.product_id === product.id)
    })).filter(group => group.teams.length > 0);

    // Calculate rows for each group
    const calculateTeamRows = (teamsToProcess: Team[]) => {
      const teamGroups: Array<{ team: Team; memberRows: MemberRow[]; totalHeight: number }> = [];
      
         teamsToProcess.forEach(team => {
           // Get all memberships for this team
           const teamMemberships = memberships.filter(membership => 
             membership.team_id === team.id
           );
           
           const membersInTeam = teamMembers.filter(member => {
             // Check if member has active membership in this team during timeline
             const hasActiveMembership = teamMemberships.some(membership => {
               if (membership.team_member_id !== member.id) return false;
               
               const membershipStart = new Date(membership.start_month);
               const membershipEnd = membership.end_month ? new Date(membership.end_month) : new Date('9999-12-01');
               return membershipStart <= timelineBounds.end &&
                      membershipEnd >= timelineBounds.start;
             });
             
             // Debug logging for Bob Smith
             if (member.name === 'Bob Smith' && hasActiveMembership) {
               console.log(`✅ Bob Smith correctly assigned to team: ${team.name} (Product: ${team.product?.name || 'None'})`);
             }
             
             return hasActiveMembership;
           })
           .sort((a, b) => {
             // Primary sort by role (ascending)
             const roleCompare = (a.role?.display_name || a.role?.name || '').localeCompare(b.role?.display_name || b.role?.name || '');
             if (roleCompare !== 0) return roleCompare;
             
             // Secondary sort by name (ascending)
             return a.name.localeCompare(b.name);
            });
        const memberRows: MemberRow[] = [];
        
        membersInTeam.forEach(member => {
          // STRICT filtering: Only show projects that are actually assigned to this specific member
          const memberProjects = visibleProjects
            .filter(project => {
              // Must be explicitly assigned to this member
              const isDirectlyAssigned = project.assignees?.some(assignee => assignee.id === member.id);
              
              if (!isDirectlyAssigned) {
                return false;
              }
              
              // Must be in the team during the project timeline
              const projectStart = new Date(project.start_date);
              const projectEnd = new Date(project.end_date);
              
              const membership = teamMemberships.find(m => m.team_member_id === member.id);
              if (!membership) return false;
              
              const membershipStart = new Date(membership.start_month);
              const membershipEnd = membership.end_month ? new Date(membership.end_month) : new Date('9999-12-31');
              
              // Member must overlap with project timeline
              const memberOverlapsProject = membershipEnd >= projectStart && membershipStart <= projectEnd;
              
              return memberOverlapsProject;
             })
            .map(project => {
              // Get the assignment for this specific member to use their dates
              const assignment = assignments.find(a => 
                a.project_id === project.id && a.team_member_id === member.id
              );
              
              // Use assignment dates if available, otherwise fall back to project dates
              const startDate = assignment?.start_date ? new Date(assignment.start_date) : new Date(project.start_date);
              const endDate = assignment?.end_date ? new Date(assignment.end_date) : new Date(project.end_date);
              
              // Clamp dates to visible timeline bounds
              const clampedStart = startDate < timelineBounds.start ? timelineBounds.start : startDate;
              const clampedEnd = endDate > timelineBounds.end ? timelineBounds.end : endDate;
              
              const daysFromStart = differenceInDays(clampedStart, timelineBounds.start);
              const duration = differenceInDays(clampedEnd, clampedStart) + 1;
              
              return {
                ...project,
                left: (daysFromStart / totalDays) * 100,
                width: Math.max((duration / totalDays) * 100, 2) // Minimum width for visibility
              };
            });

          // Find visible work assignments for this member
          const memberWorkAssignments = visibleWorkAssignments
            .filter(workAssignment => workAssignment.team_member_id === member.id)
            .map(workAssignment => {
              const startDate = new Date(workAssignment.start_date);
              const endDate = new Date(workAssignment.end_date);
              
              // Clamp dates to visible timeline bounds
              const clampedStart = startDate < timelineBounds.start ? timelineBounds.start : startDate;
              const clampedEnd = endDate > timelineBounds.end ? timelineBounds.end : endDate;
              
              const daysFromStart = differenceInDays(clampedStart, timelineBounds.start);
              const duration = differenceInDays(clampedEnd, clampedStart) + 1;
              
              return {
                ...workAssignment,
                left: (daysFromStart / totalDays) * 100,
                width: Math.max((duration / totalDays) * 100, 2) // Minimum width for visibility
              };
            });

          // Assign flexible allocation positions based on percentage
          const { projects: projectsWithSlots, workAssignments: workAssignmentsWithSlots } = 
            assignAllocationPositions(memberProjects, memberWorkAssignments, assignments, member.id, FIXED_ROW_HEIGHT);
          
          // Calculate total allocated percentage for this member
          const allocatedPercentage = 
            projectsWithSlots.reduce((sum, p) => sum + p.allocation, 0) +
            workAssignmentsWithSlots.reduce((sum, w) => sum + w.allocation, 0);

          memberRows.push({
            member,
            team,
            projects: projectsWithSlots,
            workAssignments: workAssignmentsWithSlots,
            allocatedPercentage,
            rowHeight: FIXED_ROW_HEIGHT
          });
        });

        if (memberRows.length > 0) {
          const totalHeight = memberRows.reduce((sum, row) => sum + row.rowHeight, 0);
          teamGroups.push({
            team,
            memberRows,
            totalHeight
          });
        }
      });
      
      return teamGroups;
    };

    const processedProductGroups = productsWithTeams.map(({ product, teams: productTeams }) => ({
      product,
      teamGroups: calculateTeamRows(productTeams)
    }));

    return { processedProductGroups };
  }, [teams, teamMembers, visibleProjects, products, timelineBounds, totalDays, memberships]);

  const allTeamGroups = useMemo(() => {
    const allGroups = [
      ...productGroups.processedProductGroups.flatMap(pg => pg.teamGroups)
    ];
    return allGroups;
  }, [productGroups]);

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No team members to display in roadmap</p>
        </CardContent>
      </Card>
    );
  }

  const TEAM_HEADER_HEIGHT = 32; // Increased from 24px for better visual hierarchy
  const PRODUCT_HEADER_HEIGHT = 30; // Reduced from 40px
  
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4" />
              Team Roadmap Timeline
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              {/* Action buttons group */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddProjectDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAssignmentDialogOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
              </div>
              
              {/* Month selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={monthsToShow.toString()} onValueChange={(value) => setMonthsToShow(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="9">9 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Navigation controls */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateLeft}
                  disabled={!canNavigateLeft}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                  {format(timelineBounds.start, 'MMM yyyy')} - {format(timelineBounds.end, 'MMM yyyy')}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateRight}
                  disabled={!canNavigateRight}
                  className="flex-shrink-0"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use two-finger scroll or shift+scroll to navigate the timeline horizontally. Drag projects between team members to reassign them.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Scrollable roadmap container with fixed height */}
          <div className="h-[70vh] overflow-auto">
            <div 
              ref={timelineRef}
              className="relative timeline-container select-none"
              onWheel={handleWheel}
            >
              {/* Sticky header container */}
              <div className="sticky top-0 z-30 bg-background border-b border-border">
                {/* Month headers - sticky */}
                <div className="relative h-6 mb-2 ml-48 bg-background">
                  {monthHeaders.map((month, index) => (
                    <div
                      key={index}
                      className="absolute text-xs font-medium text-muted-foreground"
                      style={{
                        left: `${month.left}%`,
                        width: `${month.width}%`
                      }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>

                {/* Week headers with date numbers only - sticky */}
                <div className="relative h-6 mb-1 ml-48 border-b border-border/50 bg-background">
                  {weeklyGrid.weeks.map((week, index) => (
                    <div
                      key={index}
                      className="absolute text-sm font-medium text-muted-foreground flex items-center justify-center"
                      style={{
                        left: `${week.left}%`,
                        height: '100%',
                        minWidth: '24px'
                      }}
                      title={`Week of ${week.label}`}
                    >
                      {format(week.date, 'd')}
                    </div>
                  ))}
                </div>
              </div>

          {/* Team sections and member rows grouped by product */}
          <div className="flex">
            {/* Left sidebar with names */}
            <div className="w-48 flex-shrink-0">
              {/* Products with teams */}
              {productGroups.processedProductGroups.map(({ product, teamGroups }) => (
                <div key={product.id}>
                  {/* Product header */}
                  <div 
                    className="flex items-center px-4 py-1 font-bold text-sm border-b-2 border-border"
                    style={{ 
                      height: `${PRODUCT_HEADER_HEIGHT}px`,
                      backgroundColor: product.color ? `${product.color}20` : 'hsl(var(--accent))',
                      borderLeftColor: product.color || 'hsl(var(--primary))',
                      borderLeftWidth: '6px'
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    <span className="truncate text-sm">{product.name}</span>
                  </div>
                  
                  {/* Teams within this product */}
                  {teamGroups.map(({ team, memberRows: teamMemberRows }) => (
                    <div key={team.id}>
                      {/* Team header */}
                      <div 
                        className="flex items-center px-6 py-2 font-bold text-sm border-b-2 border-border/30 bg-muted/80 shadow-sm"
                        style={{ 
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          borderLeftColor: team.color || 'hsl(var(--primary))',
                          borderLeftWidth: '6px',
                          borderLeftStyle: 'solid'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-white/50"
                            style={{ backgroundColor: team.color || 'hsl(var(--primary))' }}
                          />
                          <span className="truncate text-foreground/90">{team.name}</span>
                        </div>
                      </div>
                      
                      {/* Team members with allocation display */}
                      {teamMemberRows.map(({ member, rowHeight, allocatedPercentage }) => (
                        <div
                          key={member.id}
                          className="flex items-center px-8 py-1 text-xs border-b border-border/40 bg-background/50 cursor-pointer hover:bg-muted/30 transition-colors"
                          style={{ height: `${rowHeight}px` }}
                          onClick={() => handleOpenWorkAssignmentDialog(member.id, member.name)}
                          title="Click to add work assignment"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role?.display_name || member.role?.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

            </div>

            {/* Right timeline area */}
            <div className="flex-1 relative border-l border-border">
              {/* Calculate positions for products and teams */}
              {(() => {
                let currentTop = 0;
                const elements = [];

                // Products with teams
                productGroups.processedProductGroups.forEach(({ product, teamGroups }) => {
                  // Product header background
                  elements.push(
                    <div
                      key={`${product.id}-header`}
                      className="absolute w-full border-b-2 border-border"
                      style={{
                        top: `${currentTop}px`,
                        height: `${PRODUCT_HEADER_HEIGHT}px`,
                        backgroundColor: product.color ? `${product.color}10` : 'hsl(var(--accent/50))'
                      }}
                    />
                  );
                  currentTop += PRODUCT_HEADER_HEIGHT;

                  // Teams within this product
                  teamGroups.forEach(({ team, memberRows: teamMemberRows, totalHeight }) => {
                    // Team header background
                    elements.push(
                      <div
                        key={`${team.id}-header`}
                        className="absolute w-full border-b border-border"
                        style={{
                          top: `${currentTop}px`,
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          backgroundColor: 'hsl(var(--muted/50))'
                        }}
                      />
                    );
                    currentTop += TEAM_HEADER_HEIGHT + totalHeight;
                  });
                });


                // Calculate overall container height for week backgrounds and grid lines
                const containerHeight = currentTop;

                // Add alternating week backgrounds for better visibility
                weeklyGrid.weekBackgrounds.forEach((weekBg, index) => {
                  elements.push(
                    <div
                      key={`week-bg-${index}`}
                      className={`absolute pointer-events-none ${weekBg.isEven ? 'bg-muted/5' : 'bg-background'}`}
                      style={{
                        left: `${weekBg.left}%`,
                        width: `${weekBg.width}%`,
                        top: '0px',
                        height: `${containerHeight}px`,
                      }}
                      title={weekBg.weekLabel}
                    />
                  );
                });

                // Add weekly grid lines that span the full height
                weeklyGrid.weeks.forEach((week, index) => {
                  elements.push(
                    <div
                      key={`week-line-${index}`}
                      className="absolute border-l border-border/40 pointer-events-none"
                      style={{
                        left: `${week.left}%`,
                        top: '0px',
                        height: `${containerHeight}px`
                      }}
                    />
                  );
                });

                return elements;
              })()}

              {/* Member rows with projects */}
              {(() => {
                let memberTopOffset = 0;
                const memberElements = [];

                // Products with teams
                productGroups.processedProductGroups.forEach(({ product, teamGroups }) => {
                  memberTopOffset += PRODUCT_HEADER_HEIGHT; // Skip product header

                  teamGroups.forEach(({ team, memberRows: teamMemberRows }) => {
                    memberTopOffset += TEAM_HEADER_HEIGHT; // Skip team header
                    
                    teamMemberRows.forEach(({ member, projects, workAssignments, rowHeight }) => {
                      const currentMemberTop = memberTopOffset;
                      memberTopOffset += rowHeight;
                      
                      const ROW_PADDING = 4; // Padding for the row
                      
                      const isDropTarget = dragOverData.memberId === member.id;
                      
                      memberElements.push(
                        <DroppableMemberRow
                          key={member.id}
                          member={member}
                          rowHeight={rowHeight}
                          top={currentMemberTop}
                          isOver={isDropTarget}
                          timelineBounds={timelineBounds}
                          totalDays={totalDays}
                          onDoubleClick={handleMemberRowDoubleClick}
                        >
                          {/* Week grid lines for better alignment during drag */}
                          {activeDrag && dragOverData.memberId === member.id && (
                            <div className="absolute inset-0 pointer-events-none">
                              {Array.from({ length: Math.ceil(totalDays / 7) }, (_, weekIndex) => (
                                <div
                                  key={weekIndex}
                                  className="absolute top-0 bottom-0 w-px bg-primary/30 z-50"
                                  style={{ left: `${(weekIndex * 7 / totalDays) * 100}%` }}
                                />
                              ))}
                            </div>
                          )}

                          
                          {/* Projects with flexible positioning */}
                          {projects.map(project => {
                            return (
                              <DraggableProject
                                key={`${member.id}-${project.id}`}
                                project={project}
                                team={team}
                                memberId={member.id}
                                onEdit={() => {
                                  console.log('🔧 Setting editing project:', project.name, project.id);
                                  setEditingProject(project);
                                }}
                                onClick={() => setFrontProject(project.id)}
                                isFront={frontProject === project.id}
                                style={{
                                  left: `${project.left}%`,
                                  width: `${project.width}%`,
                                  top: `${project.topOffset}px`,
                                  height: `${project.itemHeight}px`,
                                }}
                              />
                            );
                          })}
                          
                          {/* Work assignments with flexible positioning */}
                          {workAssignments.map(workAssignment => {
                            return (
                              <div
                                key={`work-${member.id}-${workAssignment.id}`}
                                className="absolute border border-secondary/50 bg-secondary/20 rounded px-1 text-xs font-medium truncate cursor-pointer hover:bg-secondary/30 transition-colors"
                                style={{
                                  left: `${workAssignment.left}%`,
                                  width: `${workAssignment.width}%`,
                                  top: `${workAssignment.topOffset}px`,
                                  height: `${workAssignment.itemHeight}px`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderColor: workAssignment.color || 'hsl(var(--secondary))',
                                  backgroundColor: workAssignment.color ? `${workAssignment.color}20` : 'hsl(var(--secondary/20))',
                                }}
                                title={`${workAssignment.name} (${workAssignment.type}) - ${workAssignment.percent_allocation}%`}
                              >
                                <span className="truncate text-secondary-foreground">
                                  {workAssignment.name} ({workAssignment.percent_allocation}%)
                                </span>
                              </div>
                            );
                          })}

                          {/* Smooth drop zone indicator */}
                          {activeDrag && dragOverData.memberId === member.id && dragOverData.isValidDrop && (
                            <div className="absolute inset-0 bg-primary/10 border-2 border-primary/40 rounded-lg pointer-events-none animate-pulse" />
                          )}
                        </DroppableMemberRow>
                      );
                    });
                  });
                });

                return memberElements;
              })()}
            </div>
            </div>
            </div>
          </div>
        </CardContent>
    </Card>

    {/* Edit Project Dialog */}
    <EditProjectDialog
      project={editingProject}
      teams={teams}
      products={products}
      teamMembers={teamMembers}
      assignments={assignments}
      isOpen={!!editingProject}
      onClose={() => {
        console.log('🔧 Closing EditProjectDialog');
        setEditingProject(null);
      }}
      onUpdateProject={onUpdateProject}
      onUpdateProjectProducts={onUpdateProjectProducts}
      onUpdateProjectAssignments={onUpdateProjectAssignments}
    />

    <DragOverlay 
      dropAnimation={null}
      style={{ zIndex: 9999 }}
      className="z-[9999]"
    >
      {activeDrag && (() => {
        const draggedProject = visibleProjects.find(p => p.id === activeDrag.projectId);
        if (!draggedProject) return null;

        return (
          <div className="pointer-events-none transform-gpu z-[9999] opacity-100">
            <SmoothDragOverlay project={draggedProject} />
          </div>
        );
      })()}
    </DragOverlay>

    {/* Add Project Assignment Dialog */}
    <AddProjectAssignmentDialog
      projects={projects}
      teamMembers={teamMembers}  
      teams={teams}
      products={products}
      selectedTeam={selectedTeam}
      selectedProduct={selectedProduct}
      preSelectedMemberId={preSelectedMember?.id}
      preSelectedStartDate={preSelectedMember?.startDate}
      open={isAssignmentDialogOpen}
      onOpenChange={handleAssignmentDialogClose}
      onAddProject={onAddProject}
      onUpdateProjectAssignments={onUpdateProjectAssignments}
      onUpdateProjectProducts={onUpdateProjectProducts}
    />

    {/* Add Work Assignment Dialog */}
    {selectedMember && (
      <AddWorkAssignmentDialog
        isOpen={isWorkAssignmentDialogOpen}
        onClose={handleCloseWorkAssignmentDialog}
        teamMemberId={selectedMember.id}
        memberName={selectedMember.name}
        onAddWorkAssignment={onAddWorkAssignment}
      />
    )}

    {/* Add Project Dialog */}
    <AddProjectDialog
      teams={teams}
      products={products}
      selectedTeam={selectedTeam}
      selectedProduct={selectedProduct}
      open={isAddProjectDialogOpen}
      onOpenChange={setIsAddProjectDialogOpen}
      onAddProject={onAddProject}
    />

    {/* Project Resize Dialog */}
    <ProjectResizeDialog
      open={resizeDialog.open}
      onClose={handleCloseResizeDialog}
      onUpdateAll={handleResizeUpdateAll}
      onUpdateIndividual={handleResizeUpdateIndividual}
      projectName={resizeDialog.projectName}
      memberName={resizeDialog.memberName}
    />

    {/* Date Conflict Dialog - Only render if conflict exists */}
    {conflictDialog.open && conflictDialog.conflict && (
      <DateConflictDialog
        open={conflictDialog.open}
        onOpenChange={closeConflictDialog}
        conflict={conflictDialog.conflict}
        actions={conflictDialog.actions}
        onAction={conflictDialog.onAction}
      />
    )}
  </DndContext>
);
}
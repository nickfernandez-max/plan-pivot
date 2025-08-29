import { useMemo, Fragment, useState, useCallback, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Project, TeamMember, Team, Product, ProjectAssignment, WorkAssignment } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addWeeks, differenceInWeeks } from 'date-fns';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableProject } from '@/components/DraggableProject';
import { DroppableMemberRow } from '@/components/DroppableMemberRow';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { ProportionalDragOverlay } from '@/components/ProportionalDragOverlay';
import { Users, ChevronLeft, ChevronRight, Calendar, UserPlus } from 'lucide-react';
import { AddProjectAssignmentDialog } from '@/components/AddProjectAssignmentDialog';
import { AddWorkAssignmentDialog } from '@/components/AddWorkAssignmentDialog';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  assignments: ProjectAssignment[];
  workAssignments: WorkAssignment[];
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onAddWorkAssignment: (assignment: Omit<WorkAssignment, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateWorkAssignment: (id: string, updates: Partial<WorkAssignment>) => Promise<any>;
  onDeleteWorkAssignment: (id: string) => Promise<void>;
}

interface ProjectWithPosition extends Project {
  left: number;
  width: number;
  slot: number;
  allocation: number;
  slotHeight: number;
}

interface MemberRow {
  member: TeamMember;
  team: Team;
  projects: ProjectWithPosition[];
  allocatedPercentage: number;
  rowHeight: number;
}

// Function to assign allocation slots to projects based on temporal scheduling and percentage
const assignAllocationSlots = (
  projects: Array<Project & { left: number; width: number }>,
  assignments: ProjectAssignment[],
  memberId: string
): ProjectWithPosition[] => {
  if (projects.length === 0) return [];

  const SLOTS_PER_MEMBER = 4;
  const SLOT_PERCENTAGE = 25;
  const BASE_SLOT_HEIGHT = 18; // Reduced from 22px for more compact view

  // Prepare projects with temporal and allocation data
  const projectsWithData = projects.map(project => {
    const assignment = assignments.find(a => 
      a.project_id === project.id && a.team_member_id === memberId
    );
    
    const allocation = assignment?.percent_allocation || 25;
    // Use assignment dates if available, otherwise fall back to project dates
    const startDate = assignment?.start_date ? new Date(assignment.start_date) : new Date(project.start_date);
    const endDate = assignment?.end_date ? new Date(assignment.end_date) : new Date(project.end_date);
    
    return {
      ...project,
      allocation,
      startDate,
      endDate,
      slotsNeeded: Math.ceil(allocation / SLOT_PERCENTAGE),
      assigned: false,
      slot: -1,
      slotHeight: BASE_SLOT_HEIGHT * Math.ceil(allocation / SLOT_PERCENTAGE)
    };
  });

  // Sort projects by start date, then by allocation (higher allocation first)
  projectsWithData.sort((a, b) => {
    const dateCompare = a.startDate.getTime() - b.startDate.getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.allocation - a.allocation; // Higher allocation gets priority
  });

  // Track slot occupancy with time intervals
  const slotOccupancy: Array<Array<{ startDate: Date; endDate: Date; projectId: string }>> = 
    Array.from({ length: SLOTS_PER_MEMBER }, () => []);

  // Function to check if a project can fit in a slot during its time period
  const canFitInSlot = (slotIndex: number, slotsNeeded: number, startDate: Date, endDate: Date): boolean => {
    // Check if we have enough consecutive slots available
    if (slotIndex + slotsNeeded > SLOTS_PER_MEMBER) return false;
    
    // Check temporal overlap for all required slots
    for (let i = 0; i < slotsNeeded; i++) {
      const currentSlot = slotIndex + i;
      const overlaps = slotOccupancy[currentSlot].some(occupation => 
        !(endDate <= occupation.startDate || startDate >= occupation.endDate)
      );
      if (overlaps) return false;
    }
    
    return true;
  };

  // Function to reserve slots for a project
  const reserveSlots = (slotIndex: number, slotsNeeded: number, startDate: Date, endDate: Date, projectId: string) => {
    for (let i = 0; i < slotsNeeded; i++) {
      const currentSlot = slotIndex + i;
      slotOccupancy[currentSlot].push({ startDate, endDate, projectId });
    }
  };

  // Assign slots using a scheduling algorithm
  for (const project of projectsWithData) {
    let assigned = false;
    
    // Try to find the best slot for this project
    for (let slot = 0; slot <= SLOTS_PER_MEMBER - project.slotsNeeded; slot++) {
      if (canFitInSlot(slot, project.slotsNeeded, project.startDate, project.endDate)) {
        project.slot = slot;
        project.assigned = true;
        reserveSlots(slot, project.slotsNeeded, project.startDate, project.endDate, project.id);
        assigned = true;
        break;
      }
    }
    
    // If no slot found, assign to the last available slot (overflow handling)
    if (!assigned) {
      const lastSlot = Math.max(0, SLOTS_PER_MEMBER - project.slotsNeeded);
      project.slot = lastSlot;
      project.assigned = true;
      // Still reserve the slot to track the overflow
      reserveSlots(lastSlot, project.slotsNeeded, project.startDate, project.endDate, project.id);
    }
  }

  // Return the projects with their assigned slots
  return projectsWithData.map(project => ({
    ...project,
    slot: project.slot,
    allocation: project.allocation,
    slotHeight: project.slotHeight
  }));
};

export function RoadmapView({ 
  projects, 
  teamMembers, 
  teams, 
  products,
  assignments,
  workAssignments,
  onUpdateProject, 
  onUpdateProjectAssignees,
  onUpdateProjectProducts,
  onUpdateProjectAssignments,
  onAddProject,
  onAddWorkAssignment,
  onUpdateWorkAssignment,
  onDeleteWorkAssignment
}: RoadmapViewProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isWorkAssignmentDialogOpen, setIsWorkAssignmentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  
  // State for number of months to display
  const [monthsToShow, setMonthsToShow] = useState<number>(9);
  
  const handleOpenWorkAssignmentDialog = (memberId: string, memberName: string) => {
    setSelectedMember({ id: memberId, name: memberName });
    setIsWorkAssignmentDialogOpen(true);
  };

  const handleCloseWorkAssignmentDialog = () => {
    setIsWorkAssignmentDialogOpen(false);
    setSelectedMember(null);
  };
  
  // Calculate the full timeline bounds to determine navigation limits
  const fullTimelineBounds = useMemo(() => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    
    if (projects.length === 0) {
      return {
        start: currentMonth,
        end: endOfMonth(addDays(now, 365))
      };
    }

    const allDates = projects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    // Always include current month in the bounds
    allDates.push(currentMonth);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate)
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
      
      // Project intersects if it starts before timeline ends and ends after timeline starts
      return projectStart <= timelineBounds.end && projectEnd >= timelineBounds.start;
    });
  }, [projects, timelineBounds]);

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

  // Group teams by product and calculate member rows with allocation slots
  const productGroups = useMemo(() => {
    const FIXED_ROW_HEIGHT = 80; // Reduced from 100px for more compact view
    const ALLOCATION_SLOTS = 4;
    
    // Group teams by product
    const productsWithTeams = products.map(product => ({
      product,
      teams: teams.filter(team => team.product_id === product.id)
    })).filter(group => group.teams.length > 0);

    const teamsWithoutProduct = teams.filter(team => !team.product_id);

    // Calculate rows for each group
    const calculateTeamRows = (teamsToProcess: Team[]) => {
      const teamGroups: Array<{ team: Team; memberRows: MemberRow[]; totalHeight: number }> = [];
      
      teamsToProcess.forEach(team => {
        const membersInTeam = teamMembers.filter(member => member.team_id === team.id);
        const memberRows: MemberRow[] = [];
        
        membersInTeam.forEach(member => {
          // Find visible projects assigned to this member
          const memberProjects = visibleProjects
            .filter(project => project.assignees?.some(assignee => assignee.id === member.id))
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

          // Assign allocation slots based on percentage
          const projectsWithSlots = assignAllocationSlots(memberProjects, assignments, member.id);
          
          // Calculate total allocated percentage for this member
          const allocatedPercentage = projectsWithSlots.reduce((sum, p) => sum + p.allocation, 0);

          memberRows.push({
            member,
            team,
            projects: projectsWithSlots,
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

    const unassignedTeamGroups = calculateTeamRows(teamsWithoutProduct);

    return { processedProductGroups, unassignedTeamGroups };
  }, [teams, teamMembers, visibleProjects, products, timelineBounds, totalDays]);

  const allTeamGroups = useMemo(() => {
    const allGroups = [
      ...productGroups.processedProductGroups.flatMap(pg => pg.teamGroups),
      ...productGroups.unassignedTeamGroups
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

  const TEAM_HEADER_HEIGHT = 24; // Reduced from 32px
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
            <div className="flex items-center gap-4">
              {/* Add Project Assignment Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAssignmentDialogOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Assignment
              </Button>
              
              {/* Month selector */}
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateLeft}
                  disabled={!canNavigateLeft}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2 min-w-fit">
                  {format(timelineBounds.start, 'MMM yyyy')} - {format(timelineBounds.end, 'MMM yyyy')}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateRight}
                  disabled={!canNavigateRight}
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
        <CardContent>
          <div 
            ref={timelineRef}
            className="relative timeline-container select-none"
            onWheel={handleWheel}
          >
          {/* Month headers */}
          <div className="relative h-6 mb-2 border-b border-border ml-48">
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

          {/* Week headers with date numbers only */}
          <div className="relative h-6 mb-1 ml-48 border-b border-border/50">
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
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {teamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0)} member{teamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {/* Teams within this product */}
                  {teamGroups.map(({ team, memberRows: teamMemberRows }) => (
                    <div key={team.id}>
                      {/* Team header */}
                      <div 
                        className="flex items-center px-6 py-1 font-semibold text-xs border-b border-border"
                        style={{ 
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          backgroundColor: 'hsl(var(--muted))',
                          borderLeftColor: 'hsl(var(--primary))',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <span className="truncate">{team.name}</span>
                      </div>
                      
                      {/* Team members with allocation display */}
                      {teamMemberRows.map(({ member, rowHeight, allocatedPercentage }) => (
                        <div
                          key={member.id}
                          className="flex items-center px-8 py-1 text-xs border-b border-border/50 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                          style={{ height: `${rowHeight}px` }}
                          onClick={() => handleOpenWorkAssignmentDialog(member.id, member.name)}
                          title="Click to add work assignment"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role?.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* Teams without products */}
              {productGroups.unassignedTeamGroups.length > 0 && (
                <div>
                  <div 
                    className="flex items-center px-4 py-1 font-bold text-sm border-b-2 border-border"
                    style={{ 
                      height: `${PRODUCT_HEADER_HEIGHT}px`,
                      backgroundColor: 'hsl(var(--accent))'
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    <span className="truncate text-sm">Unassigned Teams</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {productGroups.unassignedTeamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0)} member{productGroups.unassignedTeamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {productGroups.unassignedTeamGroups.map(({ team, memberRows: teamMemberRows }) => (
                    <div key={team.id}>
                      {/* Team header */}
                      <div 
                        className="flex items-center px-6 py-1 font-semibold text-xs border-b border-border"
                        style={{ 
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          backgroundColor: 'hsl(var(--muted))',
                          borderLeftColor: 'hsl(var(--primary))',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <span className="truncate">{team.name}</span>
                      </div>
                      
                      {/* Team members with allocation display */}
                      {teamMemberRows.map(({ member, rowHeight, allocatedPercentage }) => (
                        <div
                          key={member.id}
                          className="flex items-center px-8 py-1 text-xs border-b border-border/50 bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                          style={{ height: `${rowHeight}px` }}
                          onClick={() => handleOpenWorkAssignmentDialog(member.id, member.name)}
                          title="Click to add work assignment"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role?.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
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

                // Unassigned teams
                if (productGroups.unassignedTeamGroups.length > 0) {
                  // Unassigned header
                  elements.push(
                    <div
                      key="unassigned-header"
                      className="absolute w-full border-b-2 border-border"
                      style={{
                        top: `${currentTop}px`,
                        height: `${PRODUCT_HEADER_HEIGHT}px`,
                        backgroundColor: 'hsl(var(--accent/50))'
                      }}
                    />
                  );
                  currentTop += PRODUCT_HEADER_HEIGHT;

                  productGroups.unassignedTeamGroups.forEach(({ team, memberRows: teamMemberRows, totalHeight }) => {
                    elements.push(
                      <div
                        key={`${team.id}-header-unassigned`}
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
                }

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
                    
                    teamMemberRows.forEach(({ member, projects, rowHeight }) => {
                      const currentMemberTop = memberTopOffset;
                      memberTopOffset += rowHeight;
                      
                      const SLOT_HEIGHT = 18; // Reduced from 22px for more compact view
                      const SLOT_PADDING = 1; // Reduced padding
                      
                      const isDropTarget = dragOverData.memberId === member.id;
                      
                      memberElements.push(
                        <DroppableMemberRow
                          key={member.id}
                          member={member}
                          rowHeight={rowHeight}
                          top={currentMemberTop}
                          isOver={isDropTarget}
                        >
                          {/* Allocation slot guides */}
                          {[0, 1, 2, 3].map(slotIndex => (
                            <div
                              key={`slot-${slotIndex}`}
                              className="absolute border-t border-border/30"
                              style={{
                                left: '0',
                                right: '0',
                                top: `${slotIndex * SLOT_HEIGHT + SLOT_PADDING}px`,
                                height: `${SLOT_HEIGHT - SLOT_PADDING * 2}px`,
                              }}
                            />
                          ))}
                          
                          {/* Projects in their assigned slots */}
                          {projects.map(project => {
                            const slotTop = project.slot * SLOT_HEIGHT + SLOT_PADDING;
                            const projectHeight = project.slotHeight - (SLOT_PADDING * 2);
                            
                            return (
                              <DraggableProject
                                key={`${member.id}-${project.id}`}
                                project={project}
                                team={team}
                                memberId={member.id}
                                onEdit={() => setEditingProject(project)}
                                style={{
                                  left: `${project.left}%`,
                                  width: `${project.width}%`,
                                  top: `${slotTop}px`,
                                  height: `${projectHeight}px`,
                                }}
                              />
                            );
                          })}
                        </DroppableMemberRow>
                      );
                    });
                  });
                });

                // Unassigned teams
                if (productGroups.unassignedTeamGroups.length > 0) {
                  memberTopOffset += PRODUCT_HEADER_HEIGHT; // Skip unassigned header

                  productGroups.unassignedTeamGroups.forEach(({ team, memberRows: teamMemberRows }) => {
                    memberTopOffset += TEAM_HEADER_HEIGHT; // Skip team header
                    
                    teamMemberRows.forEach(({ member, projects, rowHeight }) => {
                      const currentMemberTop = memberTopOffset;
                      memberTopOffset += rowHeight;
                      
                      const SLOT_HEIGHT = 18; // Reduced from 22px for more compact view
                      const SLOT_PADDING = 1; // Reduced padding
                      
                      const isDropTarget = dragOverData.memberId === member.id;
                      
                      memberElements.push(
                        <DroppableMemberRow
                          key={member.id}
                          member={member}
                          rowHeight={rowHeight}
                          top={currentMemberTop}
                          isOver={isDropTarget}
                        >
                          {/* Allocation slot guides */}
                          {[0, 1, 2, 3].map(slotIndex => (
                            <div
                              key={`slot-${slotIndex}`}
                              className="absolute border-t border-border/30"
                              style={{
                                left: '0',
                                right: '0',
                                top: `${slotIndex * SLOT_HEIGHT + SLOT_PADDING}px`,
                                height: `${SLOT_HEIGHT - SLOT_PADDING * 2}px`,
                              }}
                            />
                          ))}
                          
                          {/* Projects in their assigned slots */}
                          {projects.map(project => {
                            const slotTop = project.slot * SLOT_HEIGHT + SLOT_PADDING;
                            const projectHeight = project.slotHeight - (SLOT_PADDING * 2);
                            
                             return (
                               <DraggableProject
                                 key={`${member.id}-${project.id}`}
                                 project={project}
                                 team={team}
                                 memberId={member.id}
                                 onEdit={() => setEditingProject(project)}
                                 style={{
                                   left: `${project.left}%`,
                                   width: `${project.width}%`,
                                   top: `${slotTop}px`,
                                   height: `${projectHeight}px`,
                                 }}
                               />
                             );
                          })}
                        </DroppableMemberRow>
                      );
                    });
                  });
                }

                return memberElements;
              })()}
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
      onClose={() => setEditingProject(null)}
      onUpdateProject={onUpdateProject}
      onUpdateProjectProducts={onUpdateProjectProducts}
      onUpdateProjectAssignments={onUpdateProjectAssignments}
    />

    <DragOverlay>
      {activeDrag && (() => {
        const draggedProject = visibleProjects.find(p => p.id === activeDrag.projectId);
        if (!draggedProject) return null;

        // Estimate timeline width (full container minus 192px sidebar width)
        const timelineWidth = Math.max(800, window.innerWidth - 240);

        return (
          <ProportionalDragOverlay 
            project={draggedProject} 
            timelineBounds={timelineBounds}
            totalDays={totalDays}
            timelineWidth={timelineWidth}
          />
        );
      })()}
    </DragOverlay>

    {/* Add Project Assignment Dialog */}
    <AddProjectAssignmentDialog
      projects={projects}
      teamMembers={teamMembers}  
      teams={teams}
      products={products}
      open={isAssignmentDialogOpen}
      onOpenChange={setIsAssignmentDialogOpen}
      onAddProject={onAddProject}
      onUpdateProjectAssignments={onUpdateProjectAssignments}
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
  </DndContext>
  );
}
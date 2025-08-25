import { useMemo, Fragment, useState } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, TeamMember, Team, Product, ProjectAssignment } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableProject } from '@/components/DraggableProject';
import { DroppableMemberRow } from '@/components/DroppableMemberRow';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { ProportionalDragOverlay } from '@/components/ProportionalDragOverlay';
import { Users } from 'lucide-react';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  assignments: ProjectAssignment[];
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number }[]) => Promise<void>;
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
  const BASE_SLOT_HEIGHT = 32;

  // Prepare projects with temporal and allocation data
  const projectsWithData = projects.map(project => {
    const assignment = assignments.find(a => 
      a.project_id === project.id && a.team_member_id === memberId
    );
    
    const allocation = assignment?.percent_allocation || 25;
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    
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
  onUpdateProject, 
  onUpdateProjectAssignees,
  onUpdateProjectProducts,
  onUpdateProjectAssignments
}: RoadmapViewProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (projects.length === 0) {
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(addDays(now, 365))
      };
    }

    const allDates = projects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    return {
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate)
    };
  }, [projects]);

  const totalDays = differenceInDays(timelineBounds.end, timelineBounds.start);

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

  // Group teams by product and calculate member rows with allocation slots
  const productGroups = useMemo(() => {
    const FIXED_ROW_HEIGHT = 140; // Height for 4 allocation slots (4 * 32px + padding)
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
          // Find projects assigned to this member
          const memberProjects = projects
            .filter(project => project.assignees?.some(assignee => assignee.id === member.id))
            .map(project => {
              const startDate = new Date(project.start_date);
              const endDate = new Date(project.end_date);
              const daysFromStart = differenceInDays(startDate, timelineBounds.start);
              const duration = differenceInDays(endDate, startDate) + 1;
              
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
  }, [teams, teamMembers, projects, products, timelineBounds, totalDays]);

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

  const TEAM_HEADER_HEIGHT = 40;
  const PRODUCT_HEADER_HEIGHT = 50;
  
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Card>
        <CardHeader>
          <CardTitle>Team Roadmap Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative timeline-container">
          {/* Month headers */}
          <div className="relative h-8 mb-4 border-b border-border ml-48">
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

          {/* Team sections and member rows grouped by product */}
          <div className="flex">
            {/* Left sidebar with names */}
            <div className="w-48 flex-shrink-0">
              {/* Products with teams */}
              {productGroups.processedProductGroups.map(({ product, teamGroups }) => (
                <div key={product.id}>
                  {/* Product header */}
                  <div 
                    className="flex items-center px-4 py-3 font-bold text-base border-b-2 border-border"
                    style={{ 
                      height: `${PRODUCT_HEADER_HEIGHT}px`,
                      backgroundColor: product.color ? `${product.color}20` : 'hsl(var(--accent))',
                      borderLeftColor: product.color || 'hsl(var(--primary))',
                      borderLeftWidth: '6px'
                    }}
                  >
                    <Users className="w-5 h-5 mr-2" />
                    <span className="truncate">{product.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {teamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0)} member{teamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {/* Teams within this product */}
                  {teamGroups.map(({ team, memberRows: teamMemberRows }) => (
                    <div key={team.id}>
                      {/* Team header */}
                      <div 
                        className="flex items-center px-6 py-2 font-semibold text-sm border-b border-border"
                        style={{ 
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          backgroundColor: team.color ? `${team.color}15` : 'hsl(var(--muted))',
                          borderLeftColor: team.color || 'hsl(var(--primary))',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <span className="truncate">{team.name}</span>
                      </div>
                      
                      {/* Team members with allocation display */}
                      {teamMemberRows.map(({ member, rowHeight, allocatedPercentage }) => (
                        <div
                          key={member.id}
                          className="flex items-center px-8 py-2 text-sm border-b border-border/50 bg-background"
                          style={{ height: `${rowHeight}px` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role}</div>
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
                    className="flex items-center px-4 py-3 font-bold text-base border-b-2 border-border"
                    style={{ 
                      height: `${PRODUCT_HEADER_HEIGHT}px`,
                      backgroundColor: 'hsl(var(--accent))'
                    }}
                  >
                    <Users className="w-5 h-5 mr-2" />
                    <span className="truncate">Unassigned Teams</span>
                    <Badge variant="secondary" className="ml-2">
                      {productGroups.unassignedTeamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0)} member{productGroups.unassignedTeamGroups.reduce((sum, tg) => sum + tg.memberRows.length, 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {productGroups.unassignedTeamGroups.map(({ team, memberRows: teamMemberRows }) => (
                    <div key={team.id}>
                      {/* Team header */}
                      <div 
                        className="flex items-center px-6 py-2 font-semibold text-sm border-b border-border"
                        style={{ 
                          height: `${TEAM_HEADER_HEIGHT}px`,
                          backgroundColor: team.color ? `${team.color}15` : 'hsl(var(--muted))',
                          borderLeftColor: team.color || 'hsl(var(--primary))',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <span className="truncate">{team.name}</span>
                      </div>
                      
                      {/* Team members with allocation display */}
                      {teamMemberRows.map(({ member, rowHeight, allocatedPercentage }) => (
                        <div
                          key={member.id}
                          className="flex items-center px-8 py-2 text-sm border-b border-border/50 bg-background"
                          style={{ height: `${rowHeight}px` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{member.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{member.role}</div>
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
                          backgroundColor: team.color ? `${team.color}10` : 'hsl(var(--muted/50))'
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
                          backgroundColor: team.color ? `${team.color}10` : 'hsl(var(--muted/50))'
                        }}
                      />
                    );
                    currentTop += TEAM_HEADER_HEIGHT + totalHeight;
                  });
                }

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
                      
                      const SLOT_HEIGHT = 32;
                      const SLOT_PADDING = 2;
                      
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
                      
                      const SLOT_HEIGHT = 32;
                      const SLOT_PADDING = 2;
                      
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
        const draggedProject = projects.find(p => p.id === activeDrag.projectId);
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
  </DndContext>
  );
}
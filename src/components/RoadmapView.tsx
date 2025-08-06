import { useMemo, Fragment } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, TeamMember, Team, Product } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableProject } from '@/components/DraggableProject';
import { DroppableMemberRow } from '@/components/DroppableMemberRow';
import { Users } from 'lucide-react';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
}

interface ProjectWithPosition extends Project {
  left: number;
  width: number;
  lane: number;
}

interface MemberRow {
  member: TeamMember;
  team: Team;
  projects: ProjectWithPosition[];
  laneCount: number;
  rowHeight: number;
}

// Function to detect overlapping date ranges
const projectsOverlap = (p1: Project, p2: Project): boolean => {
  const start1 = new Date(p1.start_date);
  const end1 = new Date(p1.end_date);
  const start2 = new Date(p2.start_date);
  const end2 = new Date(p2.end_date);
  
  return start1 <= end2 && start2 <= end1;
};

// Function to assign lanes to projects to avoid overlaps
const assignLanes = (projects: Array<Project & { left: number; width: number }>): ProjectWithPosition[] => {
  if (projects.length === 0) return [];
  
  // Sort projects by start date
  const sortedProjects = [...projects].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  
  const lanes: ProjectWithPosition[][] = [];
  
  sortedProjects.forEach(project => {
    // Find the first lane where this project doesn't overlap with existing projects
    let assignedLane = -1;
    
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const lane = lanes[laneIndex];
      const hasOverlap = lane.some(existingProject => projectsOverlap(project, existingProject));
      
      if (!hasOverlap) {
        assignedLane = laneIndex;
        break;
      }
    }
    
    // If no existing lane works, create a new one
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push([]);
    }
    
    const projectWithLane: ProjectWithPosition = { ...project, lane: assignedLane };
    lanes[assignedLane].push(projectWithLane);
  });
  
  return lanes.flat();
};

export function RoadmapView({ 
  projects, 
  teamMembers, 
  teams, 
  products,
  onUpdateProject, 
  onUpdateProjectAssignees 
}: RoadmapViewProps) {
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
    onUpdateProject,
    onUpdateProjectAssignees,
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

  // Group teams by product and calculate member rows with dynamic heights
  const productGroups = useMemo(() => {
    const BASE_ROW_HEIGHT = 60;
    const LANE_HEIGHT = 36;
    const MIN_LANES = 1;
    
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

          // Assign lanes to avoid overlaps
          const projectsWithLanes = assignLanes(memberProjects);
          const laneCount = Math.max(MIN_LANES, Math.max(0, ...projectsWithLanes.map(p => p.lane + 1)));
          const rowHeight = BASE_ROW_HEIGHT + (Math.max(0, laneCount - 1) * LANE_HEIGHT);

          memberRows.push({
            member,
            team,
            projects: projectsWithLanes,
            laneCount,
            rowHeight
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
                <Fragment key={product.id}>
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
                      
                      {/* Team members with dynamic heights */}
                      {teamMemberRows.map(({ member, rowHeight }) => (
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
                </Fragment>
              ))}

              {/* Teams without products */}
              {productGroups.unassignedTeamGroups.length > 0 && (
                <Fragment>
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
                      
                      {/* Team members with dynamic heights */}
                      {teamMemberRows.map(({ member, rowHeight }) => (
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
                </Fragment>
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
                    
                    teamMemberRows.forEach(({ member, projects, rowHeight, laneCount }) => {
                      const currentMemberTop = memberTopOffset;
                      memberTopOffset += rowHeight;
                      
                      const LANE_HEIGHT = 36;
                      const LANE_PADDING = 4;
                      
                      const isDropTarget = dragOverData.memberId === member.id;
                      
                      memberElements.push(
                        <DroppableMemberRow
                          key={member.id}
                          member={member}
                          rowHeight={rowHeight}
                          top={currentMemberTop}
                          isOver={isDropTarget}
                        >
                          {/* Projects in their assigned lanes */}
                          {projects.map(project => {
                            const laneTop = currentMemberTop + LANE_PADDING + (project.lane * LANE_HEIGHT);
                            const projectHeight = LANE_HEIGHT - (LANE_PADDING * 2);
                            
                            return (
                              <DraggableProject
                                key={`${member.id}-${project.id}`}
                                project={project}
                                team={team}
                                memberId={member.id}
                                style={{
                                  left: `${project.left}%`,
                                  width: `${project.width}%`,
                                  top: `${laneTop - currentMemberTop}px`,
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
                    
                    teamMemberRows.forEach(({ member, projects, rowHeight, laneCount }) => {
                      const currentMemberTop = memberTopOffset;
                      memberTopOffset += rowHeight;
                      
                      const LANE_HEIGHT = 36;
                      const LANE_PADDING = 4;
                      
                      const isDropTarget = dragOverData.memberId === member.id;
                      
                      memberElements.push(
                        <DroppableMemberRow
                          key={member.id}
                          member={member}
                          rowHeight={rowHeight}
                          top={currentMemberTop}
                          isOver={isDropTarget}
                        >
                          {/* Projects in their assigned lanes */}
                          {projects.map(project => {
                            const laneTop = currentMemberTop + LANE_PADDING + (project.lane * LANE_HEIGHT);
                            const projectHeight = LANE_HEIGHT - (LANE_PADDING * 2);
                            
                            return (
                              <DraggableProject
                                key={`${member.id}-${project.id}`}
                                project={project}
                                team={team}
                                memberId={member.id}
                                style={{
                                  left: `${project.left}%`,
                                  width: `${project.width}%`,
                                  top: `${laneTop - currentMemberTop}px`,
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

    <DragOverlay>
      {activeDrag && (
        <div className="opacity-80 pointer-events-none">
          <div
            className="rounded-md shadow-lg border-2 border-primary"
            style={{
              width: '200px',
              height: '28px',
              backgroundColor: 'hsl(var(--primary))',
              borderColor: 'hsl(var(--primary))',
            }}
          >
            <div className="h-full flex items-center px-2 overflow-hidden">
              <div className="text-white text-xs font-medium">
                Dragging project...
              </div>
            </div>
          </div>
        </div>
      )}
    </DragOverlay>
  </DndContext>
  );
}
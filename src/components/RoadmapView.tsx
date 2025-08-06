import { useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, TeamMember, Team } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { DraggableProject } from '@/components/DraggableProject';
import { DroppableMemberRow } from '@/components/DroppableMemberRow';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
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

  // Calculate member rows with dynamic heights based on overlapping projects
  const memberRows = useMemo(() => {
    const BASE_ROW_HEIGHT = 60;
    const LANE_HEIGHT = 36;
    const MIN_LANES = 1;
    
    const rows: MemberRow[] = [];

    teams.forEach(team => {
      const membersInTeam = teamMembers.filter(member => member.team_id === team.id);
      
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

        rows.push({
          member,
          team,
          projects: projectsWithLanes,
          laneCount,
          rowHeight
        });
      });
    });

    return rows;
  }, [teams, teamMembers, projects, timelineBounds, totalDays]);

  // Group rows by team for layout calculations
  const teamGroups = useMemo(() => {
    const groups: Array<{ team: Team; memberRows: MemberRow[]; totalHeight: number }> = [];
    
    teams.forEach(team => {
      const teamMemberRows = memberRows.filter(row => row.team.id === team.id);
      const totalHeight = teamMemberRows.reduce((sum, row) => sum + row.rowHeight, 0);
      
      if (teamMemberRows.length > 0) {
        groups.push({
          team,
          memberRows: teamMemberRows,
          totalHeight
        });
      }
    });
    
    return groups;
  }, [teams, memberRows]);

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

          {/* Team sections and member rows */}
          <div className="flex">
            {/* Left sidebar with names */}
            <div className="w-48 flex-shrink-0">
              {teamGroups.map(({ team, memberRows: teamMemberRows }) => (
                <div key={team.id}>
                  {/* Team header */}
                  <div 
                    className="flex items-center px-4 py-2 font-semibold text-sm border-b border-border"
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
                      className="flex items-center px-4 py-2 text-sm border-b border-border/50 bg-background"
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

            {/* Right timeline area */}
            <div className="flex-1 relative border-l border-border">
              {/* Team headers for timeline */}
              {teamGroups.map(({ team, totalHeight }, teamIndex) => {
                const topOffset = teamGroups.slice(0, teamIndex).reduce((acc, g) => acc + TEAM_HEADER_HEIGHT + g.totalHeight, 0);
                return (
                  <div
                    key={`${team.id}-header`}
                    className="absolute w-full border-b border-border"
                    style={{
                      top: `${topOffset}px`,
                      height: `${TEAM_HEADER_HEIGHT}px`,
                      backgroundColor: team.color ? `${team.color}10` : 'hsl(var(--muted/50))'
                    }}
                  />
                );
              })}

              {/* Member rows with projects in lanes */}
              {teamGroups.map(({ team, memberRows: teamMemberRows }, teamIndex) => {
                let memberTopOffset = teamGroups.slice(0, teamIndex).reduce((acc, g) => acc + TEAM_HEADER_HEIGHT + g.totalHeight, 0) + TEAM_HEADER_HEIGHT;
                
                return teamMemberRows.map(({ member, projects, rowHeight, laneCount }) => {
                  const currentMemberTop = memberTopOffset;
                  memberTopOffset += rowHeight;
                  
                  const LANE_HEIGHT = 36;
                  const LANE_PADDING = 4;
                  
                    const isDropTarget = dragOverData.memberId === member.id;
                    
                    return (
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
              })}
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
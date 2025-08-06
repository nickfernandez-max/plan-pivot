import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project, TeamMember, Team } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
}

export function RoadmapView({ projects, teamMembers, teams }: RoadmapViewProps) {
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

  // Group team members by team and create rows
  const teamGroupsWithRows = useMemo(() => {
    const teamGroups = teams.map(team => ({
      team,
      members: teamMembers.filter(member => member.team_id === team.id)
    }));

    let currentRowIndex = 0;
    return teamGroups.map(group => ({
      ...group,
      startRow: currentRowIndex,
      rowCount: group.members.length,
      endRow: (currentRowIndex += group.members.length)
    }));
  }, [teams, teamMembers]);

  // Map each team member to their assigned projects with positioning
  const memberProjectRows = useMemo(() => {
    const rows: Array<{
      member: TeamMember;
      team: Team;
      rowIndex: number;
      projects: Array<Project & { left: number; width: number }>;
    }> = [];

    let currentRowIndex = 0;

    teamGroupsWithRows.forEach(({ team, members }) => {
      members.forEach(member => {
        // Find projects assigned to this member
        const memberProjects = projects.filter(project => 
          project.assignees?.some(assignee => assignee.id === member.id)
        ).map(project => {
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

        rows.push({
          member,
          team,
          rowIndex: currentRowIndex++,
          projects: memberProjects
        });
      });
    });

    return rows;
  }, [teamGroupsWithRows, projects, timelineBounds, totalDays]);

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No team members to display in roadmap</p>
        </CardContent>
      </Card>
    );
  }

  const ROW_HEIGHT = 60;
  const TEAM_HEADER_HEIGHT = 40;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roadmap Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
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
              {teamGroupsWithRows.map(({ team, members }) => (
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
                  
                  {/* Team members */}
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center px-4 py-2 text-sm border-b border-border/50 bg-background"
                      style={{ height: `${ROW_HEIGHT}px` }}
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
              {teamGroupsWithRows.map(({ team, rowCount }, teamIndex) => {
                const topOffset = teamGroupsWithRows.slice(0, teamIndex).reduce((acc, g) => acc + TEAM_HEADER_HEIGHT + (g.rowCount * ROW_HEIGHT), 0);
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

              {/* Member rows with projects */}
              {memberProjectRows.map(({ member, team, rowIndex, projects }) => {
                const teamIndex = teamGroupsWithRows.findIndex(g => g.team.id === team.id);
                const memberIndexInTeam = teamGroupsWithRows[teamIndex].members.findIndex(m => m.id === member.id);
                const topOffset = teamGroupsWithRows.slice(0, teamIndex).reduce((acc, g) => acc + TEAM_HEADER_HEIGHT + (g.rowCount * ROW_HEIGHT), 0) 
                  + TEAM_HEADER_HEIGHT + (memberIndexInTeam * ROW_HEIGHT);

                return (
                  <div key={member.id}>
                    {/* Row background */}
                    <div
                      className="absolute w-full border-b border-border/50"
                      style={{
                        top: `${topOffset}px`,
                        height: `${ROW_HEIGHT}px`
                      }}
                    />
                    
                    {/* Projects for this member */}
                    {projects.map(project => (
                      <div
                        key={`${member.id}-${project.id}`}
                        className="absolute rounded-md shadow-sm border transition-all hover:shadow-md cursor-pointer group"
                        style={{
                          left: `${project.left}%`,
                          width: `${project.width}%`,
                          top: `${topOffset + 8}px`,
                          height: `${ROW_HEIGHT - 16}px`,
                          backgroundColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))',
                          borderColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))'
                        }}
                      >
                        <div className="h-full flex items-center px-2 overflow-hidden">
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-medium truncate">
                              {project.name}
                            </div>
                            {project.is_rd && (
                              <div className="text-white/80 text-xs">R&D</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <div className="text-sm font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(project.start_date), 'MMM d, yyyy')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
                          </div>
                          {project.description && (
                            <div className="text-xs mt-1 max-w-xs">{project.description}</div>
                          )}
                          <div className="text-xs mt-1">
                            Value Score: {project.value_score}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
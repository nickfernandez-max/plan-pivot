import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/roadmap';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface RoadmapViewProps {
  projects: Project[];
}

export function RoadmapView({ projects }: RoadmapViewProps) {
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

  // Position projects on timeline
  const positionedProjects = useMemo(() => {
    return projects.map((project, index) => {
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      const daysFromStart = differenceInDays(startDate, timelineBounds.start);
      const duration = differenceInDays(endDate, startDate) + 1;
      
      return {
        ...project,
        left: (daysFromStart / totalDays) * 100,
        width: (duration / totalDays) * 100,
        top: index * 60 // Stack projects vertically
      };
    });
  }, [projects, timelineBounds, totalDays]);

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No projects to display in roadmap</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Roadmap Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Month headers */}
          <div className="relative h-8 mb-4 border-b border-border">
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

          {/* Projects timeline */}
          <div 
            className="relative"
            style={{ height: `${positionedProjects.length * 60 + 20}px` }}
          >
            {positionedProjects.map((project) => (
              <div
                key={project.id}
                className="absolute rounded-lg shadow-sm border transition-all hover:shadow-md cursor-pointer group"
                style={{
                  left: `${project.left}%`,
                  width: `${Math.max(project.width, 2)}%`, // Minimum width for visibility
                  top: `${project.top}px`,
                  height: '48px',
                  backgroundColor: project.team?.color || project.color || 'hsl(var(--primary))',
                  borderColor: project.team?.color || project.color || 'hsl(var(--primary))'
                }}
              >
                <div className="h-full flex items-center px-2 overflow-hidden">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {project.name}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {project.team && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-white/20 text-white border-white/30"
                        >
                          {project.team.name}
                        </Badge>
                      )}
                      {project.is_rd && (
                        <Badge 
                          variant="secondary"
                          className="text-xs bg-white/20 text-white border-white/30"
                        >
                          R&D
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Tooltip on hover */}
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
        </div>
      </CardContent>
    </Card>
  );
}
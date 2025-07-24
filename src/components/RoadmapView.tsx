import { useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/roadmap';
import { addDays, differenceInDays, format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { useState } from 'react';

interface RoadmapViewProps {
  projects: Project[];
  onUpdateProject: (id: string, project: Partial<Project>) => void;
}

interface DraggableProjectProps {
  project: Project;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  timelineStart: Date;
}

function DraggableProject({ project, startDate, endDate, totalDays, timelineStart }: DraggableProjectProps) {
  const daysBetween = differenceInDays(startDate, timelineStart);
  const projectDuration = differenceInDays(endDate, startDate) + 1;
  const leftPosition = (daysBetween / totalDays) * 100;
  const width = (projectDuration / totalDays) * 100;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: project.id,
  });

  const style = {
    left: `${leftPosition}%`,
    width: `${width}%`,
    minWidth: '60px',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute h-8 bg-primary text-primary-foreground rounded-md border border-primary-glow shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing z-10"
    >
      <div className="flex items-center justify-between h-full px-2 text-xs font-medium">
        <span className="truncate flex-1">{project.name}</span>
        {project.isRD && (
          <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
            R&D
          </Badge>
        )}
      </div>
    </div>
  );
}

export function RoadmapView({ projects, onUpdateProject }: RoadmapViewProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get all unique assignees
  const assignees = useMemo(() => {
    const allAssignees = projects.flatMap(p => p.assignees);
    return [...new Set(allAssignees)].sort();
  }, [projects]);

  // Calculate timeline range
  const { timelineStart, timelineEnd, totalDays, months } = useMemo(() => {
    if (projects.length === 0) {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(addDays(now, 180));
      return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: differenceInDays(end, start) + 1,
        months: eachMonthOfInterval({ start, end })
      };
    }

    const allDates = projects.flatMap(p => [parseISO(p.startDate), parseISO(p.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfMonth(addDays(minDate, -30));
    const end = endOfMonth(addDays(maxDate, 30));
    
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInDays(end, start) + 1,
      months: eachMonthOfInterval({ start, end })
    };
  }, [projects]);

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find(p => p.id === event.active.id);
    setActiveProject(project || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const newAssignee = over.id as string;
    
    // Update project assignee
    const project = projects.find(p => p.id === projectId);
    if (project && !project.assignees.includes(newAssignee)) {
      onUpdateProject(projectId, {
        assignees: [newAssignee]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Roadmap</h2>
        <div className="text-sm text-muted-foreground">
          {format(timelineStart, 'MMM yyyy')} - {format(timelineEnd, 'MMM yyyy')}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Card className="shadow-lg bg-roadmap-bg">
          <CardHeader className="pb-4">
            <CardTitle>Team Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Timeline Header */}
            <div className="sticky top-0 bg-card border-b border-border z-20">
              <div className="flex">
                <div className="w-48 p-4 border-r border-border bg-muted/30 font-semibold">
                  Team Member
                </div>
                <div className="flex-1 relative">
                  <div className="flex h-12">
                    {months.map((month, index) => {
                      const monthDays = differenceInDays(
                        endOfMonth(month),
                        startOfMonth(month)
                      ) + 1;
                      const monthWidth = (monthDays / totalDays) * 100;
                      
                      return (
                        <div
                          key={index}
                          className="border-r border-border bg-muted/20 flex items-center justify-center font-medium text-sm"
                          style={{ width: `${monthWidth}%` }}
                        >
                          {format(month, 'MMM yyyy')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Swimlanes */}
            <div className="max-h-96 overflow-y-auto">
              {assignees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No team members assigned to projects yet.
                </div>
              ) : (
                assignees.map((assignee) => {
                  const assigneeProjects = projects.filter(p => 
                    p.assignees.includes(assignee)
                  );

                  const DroppableRow = ({ assignee, assigneeProjects }: { assignee: string, assigneeProjects: Project[] }) => {
                    const { setNodeRef } = useDroppable({
                      id: assignee,
                    });

                    return (
                      <div
                        key={assignee}
                        ref={setNodeRef}
                        className="flex border-b border-swimlane-border hover:bg-muted/20 transition-colors min-h-[80px]"
                      >
                        <div className="w-48 p-4 border-r border-border bg-swimlane-bg flex items-center">
                          <div>
                            <div className="font-medium">{assignee}</div>
                            <div className="text-xs text-muted-foreground">
                              {assigneeProjects.length} project{assigneeProjects.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 relative p-2 bg-swimlane-bg">
                        {assigneeProjects.map((project) => {
                          const startDate = parseISO(project.startDate);
                          const endDate = parseISO(project.endDate);
                          
                          return (
                            <DraggableProject
                              key={project.id}
                              project={project}
                              startDate={startDate}
                              endDate={endDate}
                              totalDays={totalDays}
                              timelineStart={timelineStart}
                            />
                          );
                        })}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <DroppableRow
                      key={assignee}
                      assignee={assignee}
                      assigneeProjects={assigneeProjects}
                    />
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <DragOverlay>
          {activeProject && (
            <div className="h-8 bg-primary text-primary-foreground rounded-md border border-primary-glow shadow-lg px-2 flex items-center">
              <span className="text-xs font-medium">{activeProject.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
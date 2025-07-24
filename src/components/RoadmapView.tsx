import { useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Project, TeamMember } from '@/types/roadmap';
import { addDays, differenceInDays, format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';

interface RoadmapViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  onUpdateProject: (id: string, project: Partial<Project>) => void;
  onAddTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
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

export function RoadmapView({ projects, teamMembers, onUpdateProject, onAddTeamMember, onUpdateTeamMember }: RoadmapViewProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    team: '',
    role: '',
    startDate: ''
  });
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Use all team members, not just those with projects assigned
  const allTeamMembers = useMemo(() => {
    return teamMembers.sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers]);

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
    const { active, over, delta } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const project = projects.find(p => p.id === projectId);
    
    if (!project) return;

    // Calculate days moved based on horizontal drag distance
    const timelineElement = document.querySelector('[data-timeline]');
    if (timelineElement && delta.x !== 0) {
      const timelineWidth = timelineElement.getBoundingClientRect().width;
      const daysPerPixel = totalDays / timelineWidth;
      const daysMoved = Math.round(delta.x * daysPerPixel);
      
      if (daysMoved !== 0) {
        const currentStart = parseISO(project.startDate);
        const currentEnd = parseISO(project.endDate);
        const newStart = addDays(currentStart, daysMoved);
        const newEnd = addDays(currentEnd, daysMoved);
        
        onUpdateProject(projectId, {
          startDate: format(newStart, 'yyyy-MM-dd'),
          endDate: format(newEnd, 'yyyy-MM-dd')
        });
      }
    }

    // Update assignee if dropped on different row
    const newAssignee = over.id as string;
    const targetMember = teamMembers.find(m => m.name === newAssignee);
    if (targetMember && !project.assignees.includes(newAssignee)) {
      onUpdateProject(projectId, {
        assignees: [newAssignee]
      });
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.team || !newMember.role || !newMember.startDate) return;
    
    onAddTeamMember(newMember);
    setNewMember({ name: '', team: '', role: '', startDate: '' });
    setIsAddMemberDialogOpen(false);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember({ ...member });
  };

  const handleSaveMember = () => {
    if (!editingMember) return;
    onUpdateTeamMember(editingMember.id, editingMember);
    setEditingMember(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Roadmap</h2>
        <div className="flex items-center gap-4">
          <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <Label htmlFor="memberName">Name</Label>
                  <Input
                    id="memberName"
                    value={newMember.name}
                    onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="memberTeam">Team</Label>
                  <Input
                    id="memberTeam"
                    value={newMember.team}
                    onChange={(e) => setNewMember(prev => ({ ...prev, team: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="memberRole">Role</Label>
                  <Input
                    id="memberRole"
                    value={newMember.role}
                    onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="memberStartDate">Start Date</Label>
                  <Input
                    id="memberStartDate"
                    type="date"
                    value={newMember.startDate}
                    onChange={(e) => setNewMember(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Add Member</Button>
              </form>
            </DialogContent>
          </Dialog>
          <div className="text-sm text-muted-foreground">
            {format(timelineStart, 'MMM yyyy')} - {format(timelineEnd, 'MMM yyyy')}
          </div>
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
                <div className="flex-1 relative" data-timeline>
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
              {allTeamMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No team members yet. Add your first team member to get started!
                </div>
              ) : (
                allTeamMembers.map((member) => {
                  const memberProjects = projects.filter(p => 
                    p.assignees.includes(member.name)
                  );

                  const DroppableRow = ({ member, memberProjects }: { member: TeamMember, memberProjects: Project[] }) => {
                    const { setNodeRef } = useDroppable({
                      id: member.name,
                    });

                    return (
                      <div
                        key={member.id}
                        ref={setNodeRef}
                        className="flex border-b border-swimlane-border hover:bg-muted/20 transition-colors min-h-[80px]"
                      >
                        <div className="w-48 p-4 border-r border-border bg-swimlane-bg flex items-center justify-between">
                          <div>
                            {editingMember?.id === member.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingMember.name}
                                  onChange={(e) => setEditingMember(prev => prev ? {...prev, name: e.target.value} : null)}
                                  className="text-sm"
                                />
                                <Input
                                  value={editingMember.team}
                                  onChange={(e) => setEditingMember(prev => prev ? {...prev, team: e.target.value} : null)}
                                  className="text-xs"
                                />
                                <Input
                                  value={editingMember.role}
                                  onChange={(e) => setEditingMember(prev => prev ? {...prev, role: e.target.value} : null)}
                                  className="text-xs"
                                />
                                <Input
                                  type="date"
                                  value={editingMember.startDate}
                                  onChange={(e) => setEditingMember(prev => prev ? {...prev, startDate: e.target.value} : null)}
                                  className="text-xs"
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={handleSaveMember}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-muted-foreground">{member.role}</div>
                                <div className="text-xs text-muted-foreground">{member.team}</div>
                                <div className="text-xs text-muted-foreground">
                                  {memberProjects.length} project{memberProjects.length !== 1 ? 's' : ''}
                                </div>
                              </>
                            )}
                          </div>
                          {editingMember?.id !== member.id && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditMember(member)}
                              className="opacity-50 hover:opacity-100"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex-1 relative p-2 bg-swimlane-bg">
                        {memberProjects.map((project) => {
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
                      key={member.id}
                      member={member}
                      memberProjects={memberProjects}
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
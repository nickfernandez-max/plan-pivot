import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Project, SortField, SortDirection } from '@/types/roadmap';

interface ProjectListProps {
  projects: Project[];
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (id: string, project: Partial<Project>) => void;
}

export function ProjectList({ projects, onAddProject, onUpdateProject }: ProjectListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Project | null>(null);
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [newProject, setNewProject] = useState({
    name: '',
    team: '',
    startDate: '',
    endDate: '',
    valueScore: 5,
    isRD: false,
    assignees: ['']
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.team || !newProject.startDate || !newProject.endDate) return;
    
    onAddProject({
      ...newProject,
      assignees: newProject.assignees.filter(a => a.trim() !== '')
    });
    
    setNewProject({
      name: '',
      team: '',
      startDate: '',
      endDate: '',
      valueScore: 5,
      isRD: false,
      assignees: ['']
    });
    setIsDialogOpen(false);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project.id);
    setEditForm({ ...project });
  };

  const handleSaveEdit = () => {
    if (!editForm || !editingProject) return;
    
    onUpdateProject(editingProject, {
      name: editForm.name,
      team: editForm.team,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      valueScore: editForm.valueScore,
      isRD: editForm.isRD,
      assignees: editForm.assignees
    });
    
    setEditingProject(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditForm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Projects</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md hover:shadow-lg transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="team">Team</Label>
                <Input
                  id="team"
                  value={newProject.team}
                  onChange={(e) => setNewProject(prev => ({ ...prev, team: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="valueScore">Value Score ({newProject.valueScore}/10)</Label>
                <div className="pt-2">
                  <Slider
                    value={[newProject.valueScore]}
                    onValueChange={(value) => setNewProject(prev => ({ ...prev, valueScore: value[0] }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRD"
                  checked={newProject.isRD}
                  onCheckedChange={(checked) => setNewProject(prev => ({ ...prev, isRD: checked }))}
                />
                <Label htmlFor="isRD">R&D Project</Label>
              </div>
              <div>
                <Label htmlFor="assignees">Assignees (comma-separated)</Label>
                <Input
                  id="assignees"
                  value={newProject.assignees.join(', ')}
                  onChange={(e) => setNewProject(prev => ({ 
                    ...prev, 
                    assignees: e.target.value.split(',').map(a => a.trim())
                  }))}
                  placeholder="John Doe, Jane Smith"
                />
              </div>
              <Button type="submit" className="w-full">Add Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Project List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="font-semibold"
                    >
                      Project Name {getSortIcon('name')}
                    </Button>
                  </th>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('team')}
                      className="font-semibold"
                    >
                      Team {getSortIcon('team')}
                    </Button>
                  </th>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('startDate')}
                      className="font-semibold"
                    >
                      Start Date {getSortIcon('startDate')}
                    </Button>
                  </th>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('endDate')}
                      className="font-semibold"
                    >
                      End Date {getSortIcon('endDate')}
                    </Button>
                  </th>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('valueScore')}
                      className="font-semibold"
                    >
                      Value Score {getSortIcon('valueScore')}
                    </Button>
                  </th>
                  <th className="text-left p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('isRD')}
                      className="font-semibold"
                    >
                      R&D {getSortIcon('isRD')}
                    </Button>
                  </th>
                  <th className="text-left p-4 font-semibold">Assignees</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => {
                  const isEditing = editingProject === project.id;
                  
                  return (
                    <tr 
                      key={project.id} 
                      className="border-b hover:bg-muted/25 transition-colors cursor-pointer"
                      onClick={() => !isEditing && handleEditProject(project)}
                    >
                      <td className="p-4 font-medium">
                        {isEditing ? (
                          <Input
                            value={editForm?.name || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                        ) : (
                          project.name
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <Input
                            value={editForm?.team || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, team: e.target.value } : null)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        ) : (
                          project.team
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editForm?.startDate || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        ) : (
                          new Date(project.startDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editForm?.endDate || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        ) : (
                          new Date(project.endDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <div className="w-24" onClick={(e) => e.stopPropagation()}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {editForm?.valueScore || 1}/10
                            </div>
                            <Slider
                              value={[editForm?.valueScore || 1]}
                              onValueChange={(value) => setEditForm(prev => prev ? { ...prev, valueScore: value[0] } : null)}
                              max={10}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-primary/10">
                            {project.valueScore}/10
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <Switch
                            checked={editForm?.isRD || false}
                            onCheckedChange={(checked) => setEditForm(prev => prev ? { ...prev, isRD: checked } : null)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          project.isRD ? (
                            <Badge className="bg-primary text-primary-foreground">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <Input
                            value={editForm?.assignees.join(', ') || ''}
                            onChange={(e) => setEditForm(prev => prev ? { 
                              ...prev, 
                              assignees: e.target.value.split(',').map(a => a.trim()).filter(a => a !== '')
                            } : null)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            placeholder="John Doe, Jane Smith"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {project.assignees.map((assignee, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {assignee}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      {isEditing && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit();
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {projects.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No projects yet. Add your first project to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
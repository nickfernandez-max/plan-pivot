import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Save, X, ChevronUp, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Project, Team, Product, SortField, SortDirection } from "@/types/roadmap";

interface ProjectListProps {
  projects: Project[];
  teams: Team[];
  products: Product[];
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  onUpdateProject: (id: string, project: Partial<Project>) => void;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => void;
}

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  value_score: z.number().min(1).max(10),
  is_rd: z.boolean(),
  description: z.string().optional(),
  link: z.string().optional(),
  color: z.string().optional(),
  product_ids: z.array(z.string()).optional(),
});

export function ProjectList({ projects, teams, products, onAddProject, onUpdateProject, onUpdateProjectProducts }: ProjectListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      team_id: "",
      start_date: "",
      end_date: "",
      value_score: 5,
      is_rd: false,
      description: "",
      link: "",
      color: "",
      product_ids: [],
    },
  });

  const editForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
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
    let aValue: any;
    let bValue: any;
    
    // Handle special case for team sorting
    if (sortField === 'team') {
      aValue = a.team?.name || '';
      bValue = b.team?.name || '';
    } else {
      aValue = a[sortField as keyof Project];
      bValue = b[sortField as keyof Project];
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return sortDirection === 'asc' 
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : aValue ? -1 : 1);
    }
    
    return 0;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      team_id: project.team_id,
      start_date: project.start_date,
      end_date: project.end_date,
      value_score: project.value_score,
      is_rd: project.is_rd,
      description: project.description || "",
      link: project.link || "",
      color: project.color || "",
    });
  };

  const handleSaveEdit = (values: z.infer<typeof projectSchema>) => {
    if (editingProject) {
      onUpdateProject(editingProject.id, values);
      setEditingProject(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    try {
      const { product_ids, ...projectData } = values;
      const project = await onAddProject(projectData as Omit<Project, 'id' | 'created_at' | 'updated_at'>);
      
      // If products were selected, update the project-product relationships
      if (product_ids && product_ids.length > 0 && project && project.id) {
        await onUpdateProjectProducts(project.id, product_ids);
      }
      
      form.reset();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const onEditSubmit = (values: z.infer<typeof projectSchema>) => {
    handleSaveEdit(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Manage your project portfolio</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
              <DialogDescription>
                Create a new project and assign it to a team.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="value_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value Score (1-10)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_rd"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>R&D Project</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Mark this as a research and development project
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter project description"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter project link or URL"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="color"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="product_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Products (Optional)</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                          {products.map((product) => (
                            <label key={product.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={field.value?.includes(product.id) || false}
                                onChange={(e) => {
                                  const currentIds = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentIds, product.id]);
                                  } else {
                                    field.onChange(currentIds.filter(id => id !== product.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{product.name}</span>
                            </label>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Project</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
          <CardDescription>
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No projects found</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Project
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('team')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Team</span>
                      {getSortIcon('team')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('start_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Start Date</span>
                      {getSortIcon('start_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('end_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>End Date</span>
                      {getSortIcon('end_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('value_score')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Value Score</span>
                      {getSortIcon('value_score')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('is_rd')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>R&D</span>
                      {getSortIcon('is_rd')}
                    </div>
                  </TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects.map((project) => (
                  <TableRow key={project.id}>
                    {editingProject?.id === project.id ? (
                      <>
                        <TableCell colSpan={10}>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={editForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Project Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="team_id"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Team</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                              {team.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="start_date"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Start Date</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="end_date"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>End Date</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="value_score"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Value Score</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="1"
                                          max="10"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="is_rd"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                      <FormLabel>R&D Project</FormLabel>
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={editForm.control}
                                  name="link"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Link</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="color"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Color</FormLabel>
                                      <FormControl>
                                        <Input type="color" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                                <Button type="submit">
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" style={{ backgroundColor: project.team?.color + '20', color: project.team?.color }}>
                            {project.team?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(project.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={project.value_score >= 8 ? "default" : project.value_score >= 6 ? "secondary" : "outline"}>
                            {project.value_score}/10
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.is_rd ? (
                            <Badge variant="default">R&D</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project.link ? (
                            <a 
                              href={project.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Link
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {project.products && project.products.length > 0 ? (
                              project.products.map((product) => (
                                <Badge key={product.id} variant="outline" style={{ borderColor: product.color, color: product.color }}>
                                  {product.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No products</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {project.assignees && project.assignees.length > 0 ? (
                              project.assignees.map((assignee) => (
                                <Badge key={assignee.id} variant="outline" className="text-xs">
                                  {assignee.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No assignees</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
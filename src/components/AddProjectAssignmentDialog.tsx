import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { Project, TeamMember, Team, Product } from '@/types/roadmap';

interface Assignment {
  memberId: string;
  allocation: number;
  startDate?: string;
  endDate?: string;
}

const assignmentSchema = z.object({
  projectType: z.enum(['existing', 'new']),
  existingProjectId: z.string().optional(),
  newProjectName: z.string().optional(),
  newProjectTeamId: z.string().optional(), 
  newProjectStartDate: z.string().optional(),
  newProjectEndDate: z.string().optional(),
  newProjectValueScore: z.number().min(1).max(10).optional(),
  newProjectIsRD: z.boolean().optional(),
  assignments: z.array(z.object({
    memberId: z.string(),
    allocation: z.number().min(1).max(100),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).min(1),
}).refine((data) => {
  if (data.projectType === 'existing') {
    return !!data.existingProjectId;
  } else {
    return !!(data.newProjectName && data.newProjectTeamId && data.newProjectStartDate && data.newProjectEndDate && data.newProjectValueScore !== undefined);
  }
}, {
  message: "Please fill in all required fields",
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AddProjectAssignmentDialogProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
}

export function AddProjectAssignmentDialog({
  projects,
  teamMembers,
  teams,
  products,
  open,
  onOpenChange,
  onAddProject,
  onUpdateProjectAssignments,
}: AddProjectAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      projectType: 'existing',
      newProjectValueScore: 5,
      newProjectIsRD: false,
      assignments: [],
    },
  });

  const projectType = form.watch('projectType');
  const selectedProjectId = form.watch('existingProjectId');

  useEffect(() => {
    form.setValue('assignments', assignments);
  }, [assignments, form]);

  // Get project dates for assignment defaults
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const defaultStartDate = selectedProject?.start_date || form.watch('newProjectStartDate');
  const defaultEndDate = selectedProject?.end_date || form.watch('newProjectEndDate');

  const addAssignment = () => {
    const newAssignment: Assignment = {
      memberId: '',
      allocation: 25,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    };
    setAssignments([...assignments, newAssignment]);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: keyof Assignment, value: any) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

  // Get currently selected team member's product for project sorting
  const getSelectedMemberProduct = () => {
    const selectedMember = assignments.find(a => a.memberId)?.memberId;
    if (!selectedMember) return null;
    
    const member = teamMembers.find(tm => tm.id === selectedMember);
    if (!member?.team) return null;
    
    return member.team.product_id;
  };

  // Sort projects to prioritize those matching the selected member's product
  const getSortedProjects = () => {
    const selectedProductId = getSelectedMemberProduct();
    if (!selectedProductId) return projects;

    const projectsWithProduct = projects.filter(p => 
      p.products?.some(prod => prod.id === selectedProductId)
    );
    const projectsWithoutProduct = projects.filter(p => 
      !p.products?.some(prod => prod.id === selectedProductId)
    );

    return [
      ...projectsWithProduct.sort((a, b) => a.name.localeCompare(b.name)),
      ...projectsWithoutProduct.sort((a, b) => a.name.localeCompare(b.name))
    ];
  };

  // Get product name for a project to show in dropdown
  const getProjectProductNames = (project: Project) => {
    return project.products?.map(p => p.name).join(', ') || '';
  };

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      let projectId: string;

      if (data.projectType === 'new') {
        // Create new project first
        const newProject = {
          name: data.newProjectName!,
          team_id: data.newProjectTeamId!,
          start_date: data.newProjectStartDate!,
          end_date: data.newProjectEndDate!,
          value_score: data.newProjectValueScore!,
          is_rd: data.newProjectIsRD || false,
        };
        
        await onAddProject(newProject);
        
        // Since we can't get the ID from the promise, we'll need to find it by name
        // This is a limitation - ideally onAddProject would return the created project
        const createdProject = projects.find(p => p.name === newProject.name && p.team_id === newProject.team_id);
        if (!createdProject) {
          throw new Error('Failed to find created project');
        }
        projectId = createdProject.id;
      } else {
        projectId = data.existingProjectId!;
      }

      // Add assignments
      const assignmentData = assignments.map(assignment => ({
        teamMemberId: assignment.memberId,
        percentAllocation: assignment.allocation,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      }));

      await onUpdateProjectAssignments(projectId, assignmentData);

      // Reset form and close dialog
      form.reset();
      setAssignments([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project assignment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Project Assignment</DialogTitle>
          <DialogDescription>
            Assign team members to an existing project or create a new project with assignments.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection */}
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="existing">Assign to Existing Project</SelectItem>
                      <SelectItem value="new">Create New Project & Assign</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {projectType === 'existing' && (
              <FormField
                control={form.control}
                name="existingProjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getSortedProjects().map((project) => {
                          const selectedProductId = getSelectedMemberProduct();
                          const hasMatchingProduct = selectedProductId && 
                            project.products?.some(p => p.id === selectedProductId);
                          const productNames = getProjectProductNames(project);
                          
                          return (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-2">
                                    {project.name} ({project.team?.name})
                                    {hasMatchingProduct && (
                                      <Badge variant="secondary" className="text-xs">
                                        Related
                                      </Badge>
                                    )}
                                  </span>
                                  {productNames && (
                                    <span className="text-xs text-muted-foreground">
                                      Products: {productNames}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {projectType === 'new' && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium">New Project Details</h3>
                
                <FormField
                  control={form.control}
                  name="newProjectName"
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
                  name="newProjectTeamId"
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
                    name="newProjectStartDate"
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
                    name="newProjectEndDate"
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
                  name="newProjectValueScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value Score (1-10)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={10} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Assignments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Team Member Assignments</h3>
                <Button type="button" variant="outline" size="sm" onClick={addAssignment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
              </div>

              {assignments.map((assignment, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Assignment {index + 1}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeAssignment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Team Member</label>
                      <Select 
                        value={assignment.memberId} 
                        onValueChange={(value) => updateAssignment(index, 'memberId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.team?.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Allocation %</label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={100} 
                        value={assignment.allocation}
                        onChange={(e) => updateAssignment(index, 'allocation', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input 
                        type="date" 
                        value={assignment.startDate || ''}
                        onChange={(e) => updateAssignment(index, 'startDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Input 
                        type="date" 
                        value={assignment.endDate || ''}
                        onChange={(e) => updateAssignment(index, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {assignments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments added. Click "Add Assignment" to get started.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignments.length === 0}>
                Create Assignment{assignments.length > 1 ? 's' : ''}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
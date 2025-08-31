import React, { useState, useEffect, useMemo } from 'react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, TeamMember, Team, Product } from '@/types/roadmap';

interface Assignment {
  memberId: string;
  allocation: number;
  startDate?: string;
  endDate?: string;
}

const assignmentSchema = z.object({
  memberId: z.string().min(1, "Please select a team member"),
  projectType: z.enum(['existing', 'new']),
  existingProjectId: z.string().optional(),
  newProjectName: z.string().optional(),
  newProjectTeamId: z.string().optional(), 
  newProjectStartDate: z.string().optional(),
  newProjectEndDate: z.string().optional(),
  newProjectValueScore: z.number().min(1).max(10).optional(),
  newProjectIsRD: z.boolean().optional(),
  allocation: z.number().min(1).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  
  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      projectType: 'existing',
      newProjectValueScore: 5,
      newProjectIsRD: false,
      allocation: 25,
    },
  });

  const projectType = form.watch('projectType');
  const selectedProjectId = form.watch('existingProjectId');
  const selectedMemberId = form.watch('memberId');

  // Sort projects based on selected team member's relevance
  const sortedProjects = useMemo(() => {
    if (!selectedMemberId) return projects;
    
    const selectedMember = teamMembers.find(m => m.id === selectedMemberId);
    if (!selectedMember) return projects;

    const memberTeam = teams.find(t => t.id === selectedMember.team_id);
    const memberProductId = memberTeam?.product_id;

    // Categorize projects
    const generalProjects = projects.filter(p => 
      p.name.toLowerCase().includes('support') || 
      p.name.toLowerCase().includes('queue') ||
      p.name.toLowerCase().includes('maintenance') ||
      p.name.toLowerCase().includes('ops')
    );
    
    const sameProductProjects = memberProductId 
      ? projects.filter(p => 
          !generalProjects.includes(p) && 
          (p.team?.product_id === memberProductId || 
           p.products?.some(prod => prod.id === memberProductId))
        )
      : [];
    
    const otherProjects = projects.filter(p => 
      !generalProjects.includes(p) && !sameProductProjects.includes(p)
    );

    // Sort each category alphabetically
    const sortAlphabetically = (a: Project, b: Project) => a.name.localeCompare(b.name);
    
    return [
      ...generalProjects.sort(sortAlphabetically),
      ...sameProductProjects.sort(sortAlphabetically), 
      ...otherProjects.sort(sortAlphabetically)
    ];
  }, [projects, selectedMemberId, teamMembers, teams]);

  // Get project dates for assignment defaults
  const selectedProject = sortedProjects.find(p => p.id === selectedProjectId);
  const defaultStartDate = selectedProject?.start_date || form.watch('newProjectStartDate');
  const defaultEndDate = selectedProject?.end_date || form.watch('newProjectEndDate');

  // Auto-fill dates when member or project changes
  useEffect(() => {
    if (defaultStartDate && !form.getValues('startDate')) {
      form.setValue('startDate', defaultStartDate);
    }
    if (defaultEndDate && !form.getValues('endDate')) {
      form.setValue('endDate', defaultEndDate);
    }
  }, [defaultStartDate, defaultEndDate, form]);

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

      // Create single assignment
      const assignmentData = [{
        teamMemberId: data.memberId!,
        percentAllocation: data.allocation,
        startDate: data.startDate,
        endDate: data.endDate,
      }];

      await onUpdateProjectAssignments(projectId, assignmentData);

      // Reset form and close dialog
      form.reset();
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
            {/* Team Member Selection - First Step */}
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Team Member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a team member to assign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.team?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMemberId && (
              <>
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
              </>
            )}

            {selectedMemberId && projectType === 'existing' && (
              <FormField
                control={form.control}
                name="existingProjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Project</FormLabel>
                    <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={projectSearchOpen}
                            className="w-full justify-between"
                          >
                            {field.value
                              ? sortedProjects.find((project) => project.id === field.value)?.name
                              : "Search and select a project..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-popover border border-border shadow-md" align="start">
                        <Command>
                          <CommandInput placeholder="Search projects..." className="h-9" />
                          <CommandEmpty>No projects found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {sortedProjects.map((project) => {
                              const isGeneral = project.name.toLowerCase().includes('support') || 
                                              project.name.toLowerCase().includes('queue') ||
                                              project.name.toLowerCase().includes('maintenance') ||
                                              project.name.toLowerCase().includes('ops');
                              
                              const selectedMember = teamMembers.find(m => m.id === selectedMemberId);
                              const memberTeam = teams.find(t => t.id === selectedMember?.team_id);
                              const isSameProduct = memberTeam?.product_id && 
                                (project.team?.product_id === memberTeam.product_id || 
                                 project.products?.some(p => p.id === memberTeam.product_id));

                              return (
                                <CommandItem
                                  key={project.id}
                                  value={`${project.name} ${project.team?.name}`}
                                  onSelect={() => {
                                    field.onChange(project.id);
                                    setProjectSearchOpen(false);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === project.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="flex-1">{project.name} ({project.team?.name})</span>
                                    {isGeneral && <Badge variant="secondary" className="text-xs">General</Badge>}
                                    {isSameProduct && !isGeneral && <Badge variant="outline" className="text-xs">Same Product</Badge>}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedMemberId && projectType === 'new' && (
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

            {/* Assignment Details */}
            {selectedMemberId && (projectType === 'existing' ? selectedProjectId : (projectType === 'new' && form.watch('newProjectName'))) && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium">Assignment Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="allocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allocation %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={100} 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
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
                    name="endDate"
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
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!selectedMemberId || (projectType === 'existing' ? !selectedProjectId : !form.watch('newProjectName'))}
              >
                Create Assignment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
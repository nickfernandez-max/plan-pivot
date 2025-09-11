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
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, TeamMember, Team, Product, ProjectStatus } from '@/types/roadmap';

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
  selectedTeam?: string;
  selectedProduct?: string;
  preSelectedMemberId?: string;
  preSelectedStartDate?: string;
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
  selectedTeam = 'all',
  selectedProduct = 'all',
  preSelectedMemberId,
  preSelectedStartDate,
  open,
  onOpenChange,
  onAddProject,
  onUpdateProjectAssignments,
}: AddProjectAssignmentDialogProps) {
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  
  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      projectType: 'existing',
      newProjectValueScore: 5,
      newProjectIsRD: false,
      allocation: 25,
      memberId: preSelectedMemberId || '',
      startDate: preSelectedStartDate || '',
    },
  });

  const projectType = form.watch('projectType');
  const selectedProjectId = form.watch('existingProjectId');
  const selectedMemberId = form.watch('memberId');

  // Handle pre-selected values when dialog opens
  useEffect(() => {
    if (open && preSelectedMemberId) {
      form.setValue('memberId', preSelectedMemberId);
    }
    if (open && preSelectedStartDate) {
      form.setValue('startDate', preSelectedStartDate);
    }
  }, [open, preSelectedMemberId, preSelectedStartDate, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        projectType: 'existing',
        newProjectValueScore: 5,
        newProjectIsRD: false,
        allocation: 25,
        memberId: '',
        startDate: '',
      });
      setProjectSearchTerm('');
      setMemberSearchTerm('');
    }
  }, [open, form]);

  // Filter team members based on page filters and search term
  const filteredTeamMembers = useMemo(() => {
    let filtered = teamMembers.filter(member => {
      const memberTeam = teams.find(t => t.id === member.team_id);
      if (!memberTeam) return false;
      
      const teamMatches = selectedTeam === 'all' || memberTeam.name === selectedTeam;
      const productMatches = selectedProduct === 'all' || memberTeam.product?.name === selectedProduct;
      
      return teamMatches && productMatches;
    });

    // Apply search filter
    if (memberSearchTerm.trim()) {
      const searchLower = memberSearchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchLower) ||
        member.team?.name?.toLowerCase().includes(searchLower) ||
        member.role?.name?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [teamMembers, teams, selectedTeam, selectedProduct, memberSearchTerm]);

  // Filter teams based on page filters (for new project creation)
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const teamMatches = selectedTeam === 'all' || team.name === selectedTeam;
      const productMatches = selectedProduct === 'all' || team.product?.name === selectedProduct;
      
      return teamMatches && productMatches;
    });
  }, [teams, selectedTeam, selectedProduct]);

  // Sort and filter projects based on selected team member's relevance and search term
  const filteredAndSortedProjects = useMemo(() => {
    console.log('🔍 Project filtering debug:', { 
      projectsCount: projects?.length, 
      selectedMemberId, 
      projectSearchTerm,
      filteredTeamMembersCount: filteredTeamMembers?.length 
    });
    
    // Add defensive checks for all dependencies
    if (!projects || !Array.isArray(projects)) {
      console.log('❌ No projects available');
      return [];
    }
    if (!selectedMemberId) {
      console.log('ℹ️ No member selected, returning all projects');
      // If no member selected, just apply search filter
      if (!projectSearchTerm.trim()) return projects;
      
      const searchLower = projectSearchTerm.toLowerCase();
      return projects.filter(project => 
        project && project.name && 
        (project.name.toLowerCase().includes(searchLower) || 
         project.team?.name?.toLowerCase().includes(searchLower) ||
         project.description?.toLowerCase().includes(searchLower))
      );
    }
    
    const selectedMember = filteredTeamMembers.find(m => m.id === selectedMemberId);
    if (!selectedMember) {
      console.log('❌ Selected member not found in filtered list');
      return [];
    }

    const memberTeam = teams.find(t => t.id === selectedMember.team_id);
    const memberProductId = memberTeam?.product_id;

    console.log('👤 Member info:', { 
      memberName: selectedMember.name, 
      teamName: memberTeam?.name, 
      productId: memberProductId 
    });

    // Categorize projects with null checks
    const generalProjects = projects.filter(p => 
      p && p.name && (
        p.name.toLowerCase().includes('support') || 
        p.name.toLowerCase().includes('queue') ||
        p.name.toLowerCase().includes('maintenance') ||
        p.name.toLowerCase().includes('ops')
      )
    );
    
    const sameProductProjects = memberProductId 
      ? projects.filter(p => 
          p && !generalProjects.includes(p) && 
          (p.team?.product_id === memberProductId || 
           (p.products && Array.isArray(p.products) && p.products.some(prod => prod && prod.id === memberProductId)))
        )
      : [];
    
    const otherProjects = projects.filter(p => 
      p && !generalProjects.includes(p) && !sameProductProjects.includes(p)
    );

    // Sort each category alphabetically with null checks
    const sortAlphabetically = (a: Project, b: Project) => {
      if (!a?.name || !b?.name) return 0;
      return a.name.localeCompare(b.name);
    };
    
    const sortedProjects = [
      ...generalProjects.sort(sortAlphabetically),
      ...sameProductProjects.sort(sortAlphabetically), 
      ...otherProjects.sort(sortAlphabetically)
    ];

    console.log('📊 Project categories:', {
      general: generalProjects.length,
      sameProduct: sameProductProjects.length,
      other: otherProjects.length,
      total: sortedProjects.length
    });

    // Filter by search term - enhanced search
    if (!projectSearchTerm.trim()) {
      console.log('✅ Returning sorted projects without search filter');
      return sortedProjects;
    }
    
    const searchLower = projectSearchTerm.toLowerCase();
    const searchFiltered = sortedProjects.filter(project => 
      project && project.name && 
      (project.name.toLowerCase().includes(searchLower) || 
       project.team?.name?.toLowerCase().includes(searchLower) ||
       project.description?.toLowerCase().includes(searchLower))
    );
    
    console.log('🔍 Search results:', {
      searchTerm: projectSearchTerm,
      matchedProjects: searchFiltered.length,
      matchedNames: searchFiltered.map(p => p.name)
    });
    
    return searchFiltered;
  }, [projects, selectedMemberId, filteredTeamMembers, teams, projectSearchTerm]);

  // Get project dates for assignment defaults
  const selectedProject = filteredAndSortedProjects.find(p => p.id === selectedProjectId);
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
          status: 'Logged' as ProjectStatus,
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
                  <div className="space-y-2">
                    <Input
                      placeholder="Search team members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a team member to assign" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-64">
                        {filteredTeamMembers && filteredTeamMembers.length > 0 ? (
                          filteredTeamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2 w-full">
                                <span className="flex-1">{member.name}</span>
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-xs">{member.team?.name}</Badge>
                                  {member.role?.name && (
                                    <Badge variant="secondary" className="text-xs">{member.role.name}</Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-members" disabled>
                            {memberSearchTerm ? 'No team members match your search' : 'No team members available'}  
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <div className="space-y-2">
                      <Input
                        placeholder="Search projects..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        className="w-full"
                      />
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-64">
                          {filteredAndSortedProjects && filteredAndSortedProjects.length > 0 ? (
                            filteredAndSortedProjects.map((project) => {
                              if (!project || !project.id || !project.name) return null;
                              
                              const isGeneral = project.name.toLowerCase().includes('support') || 
                                              project.name.toLowerCase().includes('queue') ||
                                              project.name.toLowerCase().includes('maintenance') ||
                                              project.name.toLowerCase().includes('ops');
                              
                              const selectedMember = teamMembers?.find(m => m && m.id === selectedMemberId);
                              const memberTeam = teams?.find(t => t && t.id === selectedMember?.team_id);
                              const isSameProduct = memberTeam?.product_id && 
                                (project.team?.product_id === memberTeam.product_id || 
                                 (project.products && Array.isArray(project.products) && project.products.some(p => p && p.id === memberTeam.product_id)));

                              return (
                                <SelectItem key={project.id} value={project.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    <span className="flex-1">{project.name} ({project.team?.name || 'No Team'})</span>
                                    {isGeneral && <Badge variant="secondary" className="text-xs">General</Badge>}
                                    {isSameProduct && !isGeneral && <Badge variant="outline" className="text-xs">Same Product</Badge>}
                                  </div>
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="no-projects" disabled>
                              {projectSearchTerm ? 'No projects match your search' : 'No projects available'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
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
                          {filteredTeams.map((team) => (
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
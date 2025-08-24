import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Project, Team, Product, TeamMember, ProjectAssignment } from "@/types/roadmap";

interface EditProjectDialogProps {
  project: Project | null;
  teams: Team[];
  products: Product[];
  teamMembers: TeamMember[];
  assignments: ProjectAssignment[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number }[]) => Promise<void>;
}

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  value_score: z.number().min(1).max(10),
  is_rd: z.boolean(),
  description: z.string().optional(),
  product_ids: z.array(z.string()).optional(),
  assignments: z.array(z.object({
    teamMemberId: z.string(),
    percentAllocation: z.number().min(0).max(100)
  })).optional(),
});

export function EditProjectDialog({
  project,
  teams,
  products,
  teamMembers,
  assignments,
  isOpen,
  onClose,
  onUpdateProject,
  onUpdateProjectProducts,
  onUpdateProjectAssignments
}: EditProjectDialogProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      assignments: []
    }
  });

  useEffect(() => {
    if (project && isOpen) {
      const projectAssignments = assignments
        .filter(a => a.project_id === project.id)
        .map(a => ({
          teamMemberId: a.team_member_id,
          percentAllocation: a.percent_allocation
        }));

      const projectProducts = project.products?.map(p => p.id) || [];

      form.reset({
        name: project.name,
        team_id: project.team_id,
        start_date: project.start_date,
        end_date: project.end_date,
        value_score: project.value_score,
        is_rd: project.is_rd,
        description: project.description || "",
        product_ids: projectProducts,
        assignments: projectAssignments,
      });
      setSelectedTeamId(project.team_id);
    }
  }, [project, isOpen, assignments, form]);

  const selectedTeamMembers = teamMembers.filter(member => member.team_id === selectedTeamId);
  const currentAssignments = form.watch("assignments") || [];

  const addAssignment = (memberId: string) => {
    const currentAssignments = form.getValues("assignments") || [];
    if (!currentAssignments.some(a => a.teamMemberId === memberId)) {
      form.setValue("assignments", [
        ...currentAssignments,
        { teamMemberId: memberId, percentAllocation: 100 }
      ]);
    }
  };

  const removeAssignment = (memberId: string) => {
    const currentAssignments = form.getValues("assignments") || [];
    form.setValue("assignments", currentAssignments.filter(a => a.teamMemberId !== memberId));
  };

  const updateAssignmentAllocation = (memberId: string, allocation: number) => {
    const currentAssignments = form.getValues("assignments") || [];
    form.setValue("assignments", currentAssignments.map(a => 
      a.teamMemberId === memberId ? { ...a, percentAllocation: allocation } : a
    ));
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!project) return;

    try {
      const { product_ids, assignments: projectAssignments, ...projectData } = values;
      
      // Update project
      await onUpdateProject(project.id, projectData);
      
      // Update product relationships
      if (product_ids) {
        await onUpdateProjectProducts(project.id, product_ids);
      }
      
      // Update assignments with allocations
      if (projectAssignments) {
        const validAssignments = projectAssignments.filter((a): a is { teamMemberId: string; percentAllocation: number } => 
          Boolean(a.teamMemberId) && typeof a.percentAllocation === 'number'
        );
        await onUpdateProjectAssignments(project.id, validAssignments);
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details and manage team member assignments with allocation percentages.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Name Header */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl font-semibold">Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Three fields per row */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedTeamId(value);
                      // Clear assignments when team changes
                      form.setValue("assignments", []);
                    }} value={field.value}>
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

            <div className="grid grid-cols-3 gap-4">
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
                  <FormItem>
                    <FormLabel>R&D Project</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? "Yes" : "No"}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div></div>
            </div>

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

            <Separator />

            <div>
              <FormLabel className="text-base font-semibold">Team Member Assignments</FormLabel>
              <p className="text-sm text-muted-foreground mb-4">
                Assign team members to this project with specific allocation percentages.
              </p>

              {selectedTeamMembers.length > 0 ? (
                <div className="space-y-3">
                  {selectedTeamMembers.map((member) => {
                    const assignment = currentAssignments.find(a => a.teamMemberId === member.id);
                    const isAssigned = !!assignment;

                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addAssignment(member.id);
                              } else {
                                removeAssignment(member.id);
                              }
                            }}
                          />
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        
                        {isAssigned && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">Allocation:</span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={assignment.percentAllocation}
                              onChange={(e) => updateAssignmentAllocation(member.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a team to see available members.</p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Update Project</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
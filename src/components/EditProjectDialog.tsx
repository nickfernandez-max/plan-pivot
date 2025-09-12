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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Project, Team, Product, TeamMember, ProjectAssignment } from "@/types/roadmap";
import { Plus, X } from "lucide-react";

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
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
}

// Enhanced Zod schema with date cross-validation
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  value_score: z.number().min(1).max(10),
  is_rd: z.boolean(),
  color: z.string().optional(),
  description: z.string().optional(),
  product_ids: z.array(z.string()).optional(),
  assignments: z.array(z.object({
    teamMemberId: z.string(),
    percentAllocation: z.number().min(0).max(100),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })).optional(),
}).refine((data) => {
  // Validate that end date is after start date
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine((data) => {
  // Validate assignment dates against project dates
  if (data.assignments && data.start_date && data.end_date) {
    const projectStart = new Date(data.start_date);
    const projectEnd = new Date(data.end_date);
    
    return data.assignments.every(assignment => {
      if (!assignment.startDate || !assignment.endDate) return true;
      const assignStart = new Date(assignment.startDate);
      const assignEnd = new Date(assignment.endDate);
      return assignStart >= projectStart && assignEnd <= projectEnd;
    });
  }
  return true;
}, {
  message: "Assignment dates must be within project timeline",
  path: ["assignments"]
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
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);
  const [assignmentFilterTeam, setAssignmentFilterTeam] = useState<string>("all");

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
          percentAllocation: a.percent_allocation,
          startDate: a.start_date || project.start_date,
          endDate: a.end_date || project.end_date
        }));

      const projectProducts = project.products?.map(p => p.id) || [];

      form.reset({
        name: project.name,
        team_id: project.team_id,
        start_date: project.start_date,
        end_date: project.end_date,
        value_score: project.value_score,
        is_rd: project.is_rd,
        color: project.color || "",
        description: project.description || "",
        product_ids: projectProducts,
        assignments: projectAssignments,
      });
    }
  }, [project, isOpen, assignments, form]);

  const currentAssignments = form.watch("assignments") || [];

  const addAssignment = (memberId: string) => {
    const currentAssignments = form.getValues("assignments") || [];
    if (!currentAssignments.some(a => a.teamMemberId === memberId)) {
      const projectDates = form.getValues();
      form.setValue("assignments", [
        ...currentAssignments,
        { 
          teamMemberId: memberId, 
          percentAllocation: 100,
          startDate: projectDates.start_date,
          endDate: projectDates.end_date
        }
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

  const updateAssignmentDates = (memberId: string, startDate: string, endDate: string) => {
    const currentAssignments = form.getValues("assignments") || [];
    form.setValue("assignments", currentAssignments.map(a => 
      a.teamMemberId === memberId ? { ...a, startDate, endDate } : a
    ));
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!project) return;

    console.log('EditProjectDialog onSubmit called with values:', values);
    console.log('Original project data:', project);

    try {
      const { product_ids, assignments: projectAssignments, ...projectData } = values;
      
      console.log('Project data to update:', projectData);
      console.log('Product IDs to update:', product_ids);
      console.log('Assignments to update:', projectAssignments);
      
      // Update project
      console.log('Calling onUpdateProject...');
      await onUpdateProject(project.id, projectData);
      console.log('Project updated successfully');
      
      // Update product relationships
      if (product_ids) {
        console.log('Updating product relationships...');
        await onUpdateProjectProducts(project.id, product_ids);
        console.log('Product relationships updated');
      }
      
      // Update assignments with allocations and dates
      if (projectAssignments) {
        console.log('Updating project assignments...');
        const validAssignments = projectAssignments.filter((a): a is { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string } => 
          Boolean(a.teamMemberId) && typeof a.percentAllocation === 'number'
        );
        console.log('Valid assignments to update:', validAssignments);
        await onUpdateProjectAssignments(project.id, validAssignments);
        console.log('Assignments updated');
      }
      
      console.log('All updates completed, closing dialog');
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      // Don't close dialog on error so user can try again
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription className="text-xs">
            Update project details and manage team member assignments.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Project Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter project name" 
                      className="text-lg font-semibold"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Basic Details - Compact Grid */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select team" />
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
                    <FormLabel className="text-sm">Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9" {...field} />
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
                    <FormLabel className="text-sm">End Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Value Score and R&D in one row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="value_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Value Score (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        className="h-9"
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
                    <FormLabel className="text-sm">R&D Project</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2 pt-2">
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
            </div>

            {/* Description - Compact */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter project description"
                      className="resize-none h-12 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Project Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Blue', value: '#3B82F6' },
                        { name: 'Green', value: '#10B981' },
                        { name: 'Purple', value: '#8B5CF6' },
                        { name: 'Orange', value: '#F59E0B' },
                        { name: 'Red', value: '#EF4444' },
                        { name: 'Pink', value: '#EC4899' },
                        { name: 'Indigo', value: '#6366F1' },
                        { name: 'Cyan', value: '#06B6D4' },
                        { name: 'Emerald', value: '#059669' },
                        { name: 'Amber', value: '#D97706' },
                        { name: 'Rose', value: '#F43F5E' },
                        { name: 'Violet', value: '#7C3AED' }
                      ].map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 rounded-md border-2 transition-all ${
                            field.value === color.value 
                              ? 'border-foreground ring-2 ring-ring' 
                              : 'border-border hover:border-foreground'
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => field.onChange(color.value)}
                          title={color.name}
                        />
                      ))}
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-md border-2 bg-gradient-to-br from-gray-100 to-gray-200 transition-all ${
                          !field.value 
                            ? 'border-foreground ring-2 ring-ring' 
                            : 'border-border hover:border-foreground'
                        }`}
                        onClick={() => field.onChange("")}
                        title="Default"
                      >
                        <span className="text-xs text-gray-600">×</span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Products - More Compact */}
            <FormField
              control={form.control}
              name="product_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Products (Optional)</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-1 p-2 border rounded-md max-h-16 overflow-y-auto">
                      {products.map((product) => (
                        <label key={product.id} className="flex items-center space-x-1 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="rounded text-xs"
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
                          <span>{product.name}</span>
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-2" />

            {/* Team Member Assignments - Only show assigned members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel className="text-sm font-semibold">Team Assignments</FormLabel>
                <Popover open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Assignment
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-background border shadow-lg z-50" align="end">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Add Team Member</h4>
                      
                      {/* Team Filter */}
                      <div>
                        <FormLabel className="text-xs">Filter by Team</FormLabel>
                        <Select value={assignmentFilterTeam} onValueChange={setAssignmentFilterTeam}>
                          <SelectTrigger className="h-8 bg-background">
                            <SelectValue placeholder="All teams" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="all">All teams</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Available Members */}
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {teamMembers
                          .filter(member => 
                            !currentAssignments.some(a => a.teamMemberId === member.id) &&
                            (assignmentFilterTeam === "all" || member.team_id === assignmentFilterTeam)
                          )
                          .map((member) => {
                            const memberTeam = teams.find(t => t.id === member.team_id);
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  addAssignment(member.id);
                                  setAddAssignmentOpen(false);
                                }}
                                className="w-full text-left p-2 text-sm hover:bg-muted rounded border"
                              >
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {member.role?.display_name || member.role?.name} • {memberTeam?.name}
                                </div>
                              </button>
                            )
                          })}
                        {teamMembers
                          .filter(member => 
                            !currentAssignments.some(a => a.teamMemberId === member.id) &&
                            (assignmentFilterTeam === "all" || member.team_id === assignmentFilterTeam)
                          ).length === 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            {assignmentFilterTeam ? "No unassigned members in this team" : "All members are already assigned"}
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Show form errors for assignments */}
              {form.formState.errors.assignments && (
                <div className="text-xs text-destructive mb-1 p-1.5 bg-destructive/10 rounded">
                  {form.formState.errors.assignments.message}
                </div>
              )}

              {/* Currently Assigned Members */}
              {currentAssignments.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded p-2">
                  {currentAssignments.map((assignment) => {
                    const member = teamMembers.find(m => m.id === assignment.teamMemberId);
                    if (!member) return null;
                    
                    const memberTeam = teams.find(t => t.id === member.team_id);

                    return (
                      <div key={member.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-xs">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => removeAssignment(member.id)}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.role?.display_name || member.role?.name}
                              {memberTeam && (
                                <span className="ml-1 text-xs opacity-70">• {memberTeam.name}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 text-xs flex-shrink-0">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={assignment.percentAllocation}
                            onChange={(e) => updateAssignmentAllocation(member.id, parseInt(e.target.value) || 0)}
                            className="w-12 h-6 text-xs"
                          />
                          <span className="text-xs">%</span>
                          <Input
                            type="date"
                            value={assignment.startDate || form.getValues().start_date}
                            onChange={(e) => updateAssignmentDates(
                              member.id, 
                              e.target.value, 
                              assignment.endDate || form.getValues().end_date
                            )}
                            className="w-24 h-6 text-xs"
                          />
                          <Input
                            type="date"
                            value={assignment.endDate || form.getValues().end_date}
                            onChange={(e) => updateAssignmentDates(
                              member.id, 
                              assignment.startDate || form.getValues().start_date,
                              e.target.value
                            )}
                            className="w-24 h-6 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 text-muted-foreground border rounded">
                  <p className="text-xs">No team members assigned</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t mt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit"
                onClick={() => {
                  console.log('Update Project button clicked');
                  console.log('Form state:', form.formState);
                  console.log('Form errors:', form.formState.errors);
                  console.log('Form values:', form.getValues());
                  
                  // Check if form is valid
                  const isValid = form.formState.isValid;
                  console.log('Form is valid:', isValid);
                  
                  if (!isValid) {
                    console.log('Form validation failed, triggering validation...');
                    form.trigger(); // Trigger validation to show errors
                  }
                }}
              >
                Update Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
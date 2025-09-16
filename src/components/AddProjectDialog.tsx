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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon } from 'lucide-react';
import { Project, Team, Product, ProjectStatus } from '@/types/roadmap';
import { useToast } from '@/hooks/use-toast';

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  team_id: z.string().min(1, "Please select a team"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  value_score: z.number().min(1).max(10),
  is_rd: z.boolean(),
  status: z.enum(['Logged', 'Planned', 'In Progress', 'Blocked', 'On Hold', 'Complete']),
  color: z.string().optional(),
  link: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface AddProjectDialogProps {
  teams: Team[];
  products: Product[];
  selectedTeam?: string;
  selectedProduct?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'Logged', label: 'Logged' },
  { value: 'Planned', label: 'Planned' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Complete', label: 'Complete' },
];

const colorOptions = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#dc2626', label: 'Dark Red' },
  { value: '#7c3aed', label: 'Violet' },
];

export function AddProjectDialog({
  teams,
  products,
  selectedTeam = 'all',
  selectedProduct = 'all',
  open,
  onOpenChange,
  onAddProject,
}: AddProjectDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      team_id: '',
      start_date: '',
      end_date: '',
      value_score: 5,
      is_rd: false,
      status: 'Logged',
      color: '',
      link: '',
    },
  });

  // Filter teams based on page filters
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const teamMatches = selectedTeam === 'all' || team.name === selectedTeam;
      const productMatches = selectedProduct === 'all' || team.product?.name === selectedProduct;
      
      return teamMatches && productMatches;
    });
  }, [teams, selectedTeam, selectedProduct]);

  // Auto-select team if only one is available
  useEffect(() => {
    if (open && filteredTeams.length === 1 && !form.getValues('team_id')) {
      form.setValue('team_id', filteredTeams[0].id);
    }
  }, [open, filteredTeams, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        name: '',
        description: '',
        team_id: '',
        start_date: '',
        end_date: '',
        value_score: 5,
        is_rd: false,
        status: 'Logged',
        color: '',
        link: '',
      });
    }
  }, [open, form]);

  // Set default dates to current month
  useEffect(() => {
    if (open && !form.getValues('start_date')) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      form.setValue('start_date', startOfMonth.toISOString().split('T')[0]);
      form.setValue('end_date', endOfMonth.toISOString().split('T')[0]);
    }
  }, [open, form]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      // Ensure all required fields are present
      const projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
        name: data.name,
        team_id: data.team_id,
        start_date: data.start_date,
        end_date: data.end_date,
        value_score: data.value_score,
        is_rd: data.is_rd,
        status: data.status,
        status_visibility: 'published',
        description: data.description || undefined,
        color: data.color || undefined,
        link: data.link || undefined,
      };
      
      await onAddProject(projectData);
      
      toast({
        title: "Project created",
        description: `Project "${data.name}" has been created successfully.`,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Create a new project for the roadmap timeline.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Name */}
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter project description" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Selection */}
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
                      {filteredTeams.length > 0 ? (
                        filteredTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <span>{team.name}</span>
                              {team.product && (
                                <Badge variant="outline" className="text-xs">
                                  {team.product.name}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-teams" disabled>
                          No teams available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start and End Dates */}
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

            {/* Value Score and Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Score (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10} 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Color Picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color (Optional)</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          field.value === color.value
                            ? 'border-primary scale-110'
                            : 'border-border hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.onChange(field.value === color.value ? '' : color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* R&D Checkbox and Link */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_rd"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>R&D Project</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark this project as research and development
                      </div>
                    </div>
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
                        placeholder="https://..." 
                        type="url" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
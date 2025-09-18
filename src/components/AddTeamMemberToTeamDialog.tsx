import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { TeamMember, Team, Role } from '@/types/roadmap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/hooks/use-toast';

interface AddTeamMemberToTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  roles: Role[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onAddRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<Role>;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role_id: z.string().min(1, "Role is required"),
  start_date: z.string().min(1, "Start date is required"),
});

type FormData = z.infer<typeof teamMemberSchema>;

export function AddTeamMemberToTeamDialog({
  isOpen,
  onClose,
  team,
  roles,
  onAddTeamMember,
  onAddRole,
}: AddTeamMemberToTeamDialogProps) {
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role_id: "",
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      await onAddTeamMember({
        name: data.name,
        role_id: data.role_id,
        team_id: team.id,
        start_date: data.start_date,
      });
      
      toast({
        title: "Success",
        description: `${data.name} has been added to ${team.name}`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      const role = await onAddRole({
        name: newRoleName,
        description: newRoleDescription || undefined,
        display_name: newRoleName,
      });

      form.setValue('role_id', role.id);
      setNewRoleName('');
      setNewRoleDescription('');
      setIsAddingRole(false);

      toast({
        title: "Success",
        description: `Role "${newRoleName}" has been created`,
      });
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: "Failed to create role. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member to {team.name}</DialogTitle>
          <DialogDescription>
            Add a new team member to {team.name}. They will be automatically assigned to this team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter member name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div className="flex gap-2">
              <Select value={form.watch('role_id')} onValueChange={(value) => form.setValue('role_id', value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.display_name || role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Popover open={isAddingRole} onOpenChange={setIsAddingRole}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-role-name">Role Name</Label>
                      <Input
                        id="new-role-name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Enter role name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-role-description">Description (optional)</Label>
                      <Input
                        id="new-role-description"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Enter role description"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingRole(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddRole}
                        disabled={!newRoleName.trim()}
                      >
                        Add Role
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {form.formState.errors.role_id && (
              <p className="text-sm text-destructive">{form.formState.errors.role_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              {...form.register('start_date')}
            />
            {form.formState.errors.start_date && (
              <p className="text-sm text-destructive">{form.formState.errors.start_date.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
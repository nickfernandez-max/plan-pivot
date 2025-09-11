import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team, Role } from '@/types/roadmap';
import { Plus, X } from 'lucide-react';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPerson: (personData: { name: string; role_id: string; team_id: string; start_date: string }) => Promise<void>;
  onAddRole: (roleData: { name: string; description?: string }) => Promise<Role>;
  teams: Team[];
  roles: Role[];
}

export function AddPersonDialog({ open, onOpenChange, onAddPerson, onAddRole, teams, roles }: AddPersonDialogProps) {
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New role creation state
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roleId || !teamId) return;

    setIsSubmitting(true);
    try {
      await onAddPerson({
        name: name.trim(),
        role_id: roleId,
        team_id: teamId,
        start_date: startDate,
      });
      setName('');
      setRoleId('');
      setTeamId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding person:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    setIsCreatingRole(true);
    try {
      const createdRole = await onAddRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
      });
      setRoleId(createdRole.id);
      setNewRoleName('');
      setNewRoleDescription('');
      setShowNewRoleForm(false);
    } catch (error) {
      console.error('Error creating role:', error);
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setRoleId('');
    setTeamId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setShowNewRoleForm(false);
    setNewRoleName('');
    setNewRoleDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter person's name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {!showNewRoleForm ? (
              <div className="flex gap-2">
                <Select value={roleId} onValueChange={setRoleId} required>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-lg z-50">
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.display_name || role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewRoleForm(true)}
                  title="Add new role"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Create New Role</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewRoleForm(false);
                      setNewRoleName('');
                      setNewRoleDescription('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Role name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateRole}
                    disabled={!newRoleName.trim() || isCreatingRole}
                    size="sm"
                    className="w-full"
                  >
                    {isCreatingRole ? 'Creating...' : 'Create Role'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team</Label>
            <Select value={teamId} onValueChange={setTeamId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !roleId || !teamId}>
              {isSubmitting ? 'Adding...' : 'Add Person'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
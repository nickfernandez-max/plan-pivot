import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Team, TeamMember, TeamMembership, Role } from '@/types/roadmap';
import { format, startOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, ArrowRight, Trash2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditTeamMemberDialogProps {
  member: TeamMember | null;
  teams: Team[];
  roles: Role[];
  teamMembers: TeamMember[];
  memberships: TeamMembership[];
  isOpen: boolean;
  onClose: () => void;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
  onUpdateMember: (id: string, updates: Partial<TeamMember>) => Promise<any>;
  onAddRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<Role>;
}

export function EditTeamMemberDialog({
  member,
  teams,
  roles,
  teamMembers,
  memberships,
  isOpen,
  onClose,
  onAddMembership,
  onUpdateMembership,
  onDeleteMembership,
  onUpdateMember,
  onAddRole,
}: EditTeamMemberDialogProps) {
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [newTeamId, setNewTeamId] = useState<string>('');
  const [transitionMonth, setTransitionMonth] = useState<Date | undefined>(undefined);
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const memberMemberships = useMemo(() => {
    return memberships
      .filter(m => m.team_member_id === (member?.id || ''))
      .sort((a, b) => (a.start_month < b.start_month ? -1 : 1));
  }, [memberships, member?.id]);

  // Filter roles to only show ones that are currently assigned to team members
  const availableRoles = useMemo(() => {
    const assignedRoleIds = new Set(teamMembers.map(member => member.role_id));
    return roles.filter(role => assignedRoleIds.has(role.id));
  }, [roles, teamMembers]);

  // Get current/active memberships (no end date or end date in future)
  const activeMemberships = useMemo(() => {
    const currentMonth = startOfMonth(new Date()).toISOString();
    const active = memberMemberships.filter(m => {
      const isActive = !m.end_month || m.end_month >= currentMonth;
      console.log(`Membership for ${member?.name}:`, {
        startMonth: m.start_month,
        endMonth: m.end_month,
        currentMonth,
        isActive,
        comparison: m.end_month ? `${m.end_month} >= ${currentMonth} = ${m.end_month >= currentMonth}` : 'no end date'
      });
      return isActive;
    });
    console.log('Active memberships:', active, 'for member:', member?.name);
    return active;
  }, [memberMemberships, member?.name]);

  // Auto-select the most recent active membership when dialog opens
  useEffect(() => {
    if (isOpen && activeMemberships.length > 0 && !selectedMembershipId) {
      // Select the most recent active membership (latest start_month)
      const mostRecentMembership = activeMemberships.reduce((latest, current) => 
        current.start_month > latest.start_month ? current : latest
      );
      setSelectedMembershipId(mostRecentMembership.id);
    }
  }, [isOpen, activeMemberships, selectedMembershipId]);

  const resetForm = () => {
    setSelectedMembershipId('');
    setNewTeamId('');
    setTransitionMonth(undefined);
    setShowNewRoleForm(false);
    setNewRoleName('');
    setNewRoleDescription('');
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    
    setIsCreatingRole(true);
    try {
      const createdRole = await onAddRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
      });
      
      // Update member with new role
      if (member) {
        await onUpdateMember(member.id, { role_id: createdRole.id });
      }
      
      setNewRoleName('');
      setNewRoleDescription('');
      setShowNewRoleForm(false);
    } catch (error) {
      console.error('Error creating role:', error);
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleMoveTeam = async () => {
    if (!member || !selectedMembershipId || !transitionMonth) return;
    
    const membershipToEnd = memberMemberships.find(m => m.id === selectedMembershipId);
    if (!membershipToEnd) return;

    try {
      const transitionMonthStr = startOfMonth(transitionMonth).toISOString();
      
      // End the current membership in the month before transition
      // Since end_month is inclusive, this covers through the previous month
      const endMonth = startOfMonth(subMonths(transitionMonth, 1)).toISOString();
      
      await onUpdateMembership(membershipToEnd.id, { end_month: endMonth });
      
      // Create new membership if not "Left Company"
      if (newTeamId && newTeamId !== 'LEFT_COMPANY') {
        await onAddMembership({
          team_member_id: member.id,
          team_id: newTeamId,
          start_month: transitionMonthStr,
          end_month: null,
        } as any);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to move team assignment:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            {member ? `${member.name} — ${member.role?.display_name || member.role?.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Change Role */}
        <div className="space-y-3 border-b pb-4">
          <div className="text-sm font-medium">Change Role</div>
          {!showNewRoleForm ? (
            <div className="space-y-2">
              <Select 
                value={member?.role_id || ''} 
                onValueChange={async (roleId) => {
                  if (member && roleId) {
                    await onUpdateMember(member.id, { role_id: roleId });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
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
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Role
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

        {/* Move Team Assignment */}
        {activeMemberships.length > 0 ? (
          <div className="space-y-3 border-b pb-4">
            <div className="text-sm font-medium">Move Team Assignment</div>
            <div className="grid grid-cols-1 gap-3">
              <Select value={selectedMembershipId} onValueChange={setSelectedMembershipId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current assignment to move" />
                </SelectTrigger>
                <SelectContent>
                  {activeMemberships.map(m => {
                    const team = teams.find(t => t.id === m.team_id);
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {team?.name || 'Unknown team'} (since {format(new Date(m.start_month), 'MMM yyyy')})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Select value={newTeamId} onValueChange={setNewTeamId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Move to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEFT_COMPANY">Left Company</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transitionMonth ? format(transitionMonth, 'MMM yyyy') : 'Transition month'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <MonthYearPicker
                    value={transitionMonth}
                    onChange={(d) => setTransitionMonth(d ? startOfMonth(d) : undefined)}
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={handleMoveTeam} 
                disabled={!member || !selectedMembershipId || !newTeamId || !transitionMonth}
              >
                <ArrowRight className="mr-2 h-4 w-4" /> Move Assignment
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-b pb-4">
            <div className="text-sm font-medium">Add Initial Team Assignment</div>
            <div className="text-sm text-muted-foreground mb-3">
              This member has no active team assignments. Add their first assignment:
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Select value={newTeamId} onValueChange={setNewTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transitionMonth ? format(transitionMonth, 'MMM yyyy') : 'Start month'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <MonthYearPicker
                    value={transitionMonth}
                    onChange={(d) => setTransitionMonth(d ? startOfMonth(d) : undefined)}
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end">
              <Button 
                size="sm" 
                onClick={async () => {
                  if (!member || !newTeamId || !transitionMonth) return;
                  try {
                    await onAddMembership({
                      team_member_id: member.id,
                      team_id: newTeamId,
                      start_month: startOfMonth(transitionMonth).toISOString(),
                      end_month: null,
                    } as any);
                    resetForm();
                  } catch (error) {
                    console.error('Failed to add initial assignment:', error);
                  }
                }}
                disabled={!member || !newTeamId || !transitionMonth}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Assignment
              </Button>
            </div>
          </div>
        )}

        {/* Existing memberships */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Existing periods</div>
          {memberMemberships.length === 0 ? (
            <div className="text-sm text-muted-foreground">No memberships yet.</div>
          ) : (
            <div className="space-y-2">
              {memberMemberships.map((m) => {
                const team = teams.find(t => t.id === m.team_id);
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="font-medium">{team?.name || 'Unknown team'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(m.start_month), 'MMM yyyy')} — {m.end_month ? format(new Date(m.end_month), 'MMM yyyy') : 'Present'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">Set end</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4" align="end">
                          <MonthYearPicker
                            value={m.end_month ? new Date(m.end_month) : undefined}
                            onChange={async (d) => {
                              await onUpdateMembership(m.id, { end_month: d ? startOfMonth(d).toISOString() : null } as any);
                            }}
                            fromYear={2020}
                            toYear={2030}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button variant="destructive" size="sm" onClick={() => onDeleteMembership(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

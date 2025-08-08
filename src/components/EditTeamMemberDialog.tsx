import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Team, TeamMember, TeamMembership } from '@/types/roadmap';
import { format, startOfMonth } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';

interface EditTeamMemberDialogProps {
  member: TeamMember | null;
  teams: Team[];
  memberships: TeamMembership[];
  isOpen: boolean;
  onClose: () => void;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
}

export function EditTeamMemberDialog({
  member,
  teams,
  memberships,
  isOpen,
  onClose,
  onAddMembership,
  onUpdateMembership,
  onDeleteMembership,
}: EditTeamMemberDialogProps) {
  const [newTeamId, setNewTeamId] = useState<string>('');
  const [newStartMonth, setNewStartMonth] = useState<Date | undefined>(undefined);
  const [newEndMonth, setNewEndMonth] = useState<Date | undefined>(undefined);

  const memberMemberships = useMemo(() => {
    return memberships
      .filter(m => m.team_member_id === (member?.id || ''))
      .sort((a, b) => (a.start_month < b.start_month ? -1 : 1));
  }, [memberships, member?.id]);

  const resetForm = () => {
    setNewTeamId('');
    setNewStartMonth(undefined);
    setNewEndMonth(undefined);
  };

  const handleAdd = async () => {
    if (!member || !newTeamId || !newStartMonth) return;
    await onAddMembership({
      team_member_id: member.id,
      team_id: newTeamId,
      start_month: startOfMonth(newStartMonth).toISOString(),
      end_month: newEndMonth ? startOfMonth(newEndMonth).toISOString() : null,
    } as any);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            {member ? `${member.name} — ${member.role}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Add membership */}
        <div className="space-y-3 border-b pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  {newStartMonth ? format(newStartMonth, 'MMM yyyy') : 'Start month'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newStartMonth}
                  onSelect={(d) => setNewStartMonth(d ? startOfMonth(d) : undefined)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newEndMonth ? format(newEndMonth, 'MMM yyyy') : 'End month (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newEndMonth}
                  onSelect={(d) => setNewEndMonth(d ? startOfMonth(d) : undefined)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={!member || !newTeamId || !newStartMonth}>
              <Plus className="mr-2 h-4 w-4" /> Add period
            </Button>
          </div>
        </div>

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
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={m.end_month ? new Date(m.end_month) : undefined}
                            onSelect={async (d) => {
                              await onUpdateMembership(m.id, { end_month: d ? startOfMonth(d).toISOString() : null } as any);
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
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

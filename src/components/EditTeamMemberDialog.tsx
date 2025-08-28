import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Team, TeamMember, TeamMembership } from '@/types/roadmap';
import { format, startOfMonth, subMonths } from 'date-fns';
import { CalendarIcon, ArrowRight, Trash2 } from 'lucide-react';

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
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');
  const [newTeamId, setNewTeamId] = useState<string>('');
  const [transitionMonth, setTransitionMonth] = useState<Date | undefined>(undefined);

  const memberMemberships = useMemo(() => {
    return memberships
      .filter(m => m.team_member_id === (member?.id || ''))
      .sort((a, b) => (a.start_month < b.start_month ? -1 : 1));
  }, [memberships, member?.id]);

  // Get current/active memberships (no end date or end date in future)
  const activeMemberships = useMemo(() => {
    const currentMonth = startOfMonth(new Date()).toISOString();
    return memberMemberships.filter(m => !m.end_month || m.end_month >= currentMonth);
  }, [memberMemberships]);

  const resetForm = () => {
    setSelectedMembershipId('');
    setNewTeamId('');
    setTransitionMonth(undefined);
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
            {member ? `${member.name} — ${member.role}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Move Team Assignment */}
        {activeMemberships.length > 0 && (
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transitionMonth}
                    onSelect={(d) => setTransitionMonth(d ? startOfMonth(d) : undefined)}
                    initialFocus
                    className="p-3 pointer-events-auto [&_.rdp-day_picker]:hidden [&_.rdp-table]:hidden"
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={2030}
                    showOutsideDays={false}
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
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={m.end_month ? new Date(m.end_month) : undefined}
                            onSelect={async (d) => {
                              await onUpdateMembership(m.id, { end_month: d ? startOfMonth(d).toISOString() : null } as any);
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto [&_.rdp-day_picker]:hidden [&_.rdp-table]:hidden"
                            captionLayout="dropdown-buttons"
                            fromYear={2020}
                            toYear={2030}
                            showOutsideDays={false}
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

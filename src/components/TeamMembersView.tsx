import React, { useState, useMemo, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Edit2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths, startOfMonth, differenceInMonths } from 'date-fns';
import { TeamMember, Team, Product, TeamMembership } from '@/types/roadmap';
import { EditTeamMemberDialog } from '@/components/EditTeamMemberDialog';


interface TeamMembersViewProps {
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  memberships: TeamMembership[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddTeam: (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => void;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  product_id: z.string().optional(),
  ideal_size: z.number().min(1, "Ideal team size must be at least 1").optional(),
});

export function TeamMembersView({ 
  teamMembers, 
  teams, 
  products, 
  memberships,
  onAddTeamMember, 
  onUpdateTeamMember, 
  onAddProduct, 
  onUpdateProduct,
  onAddTeam,
  onUpdateTeam,
  onAddMembership,
  onUpdateMembership,
  onDeleteMembership,
}: TeamMembersViewProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      team_id: "",
      start_date: "",
    },
  });

  // Generate timeline (6 months from now)
  const timelineMonths = useMemo(() => {
    const months = [];
    const startDate = startOfMonth(new Date());
    
    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(startDate, i);
      months.push({
        date: monthDate,
        label: format(monthDate, 'MMM yyyy'),
        shortLabel: format(monthDate, 'MMM')
      });
    }
    
    return months;
  }, []);

  // Group teams by product, then team members by team based on timeline memberships
  const groupedData = useMemo(() => {
    const timelineStart = format(timelineMonths[0].date, 'yyyy-MM-01');
    const timelineEnd = format(timelineMonths[timelineMonths.length - 1].date, 'yyyy-MM-01');
    
    // Helper function to get members assigned to a team during the timeline period
    const getTimelineMembers = (teamId: string) => {
      return teamMembers.filter(member => {
        // Check if member has any membership for this team that overlaps with timeline
        return memberships.some(membership => {
          const membershipStart = membership.start_month;
          const membershipEnd = membership.end_month || '9999-12-01'; // Use far future if no end date
          
          return membership.team_member_id === member.id &&
            membership.team_id === teamId &&
            membershipStart <= timelineEnd &&
            membershipEnd >= timelineStart;
        });
      });
    };

    const productsWithTeams = products.map(product => ({
      product,
      teams: teams.filter(team => team.product_id === product.id).map(team => ({
        team,
        members: getTimelineMembers(team.id)
      })).filter(group => group.members.length > 0)
    })).filter(group => group.teams.length > 0);

    const teamsWithoutProduct = teams.filter(team => !team.product_id).map(team => ({
      team,
      members: getTimelineMembers(team.id)
    })).filter(group => group.members.length > 0);

    return { productsWithTeams, teamsWithoutProduct };
  }, [teams, teamMembers, products, memberships]);

  // Calculate actual member count for a team in a specific month using memberships data
  const getActualMemberCount = (teamId: string, monthDate: Date) => {
    const monthKey = format(monthDate, 'yyyy-MM-01');
    return memberships?.filter(membership => {
      const member = teamMembers.find(tm => tm.id === membership.team_member_id);
      if (!member) return false;
      
      // Find which team the member belongs to via their memberships
      const membershipForMonth = memberships.find(m => 
        m.team_member_id === membership.team_member_id &&
        m.team_id === teamId &&
        m.start_month <= monthKey &&
        (!m.end_month || m.end_month >= monthKey)
      );
      
      return !!membershipForMonth;
    }).length || 0;
  };

  // Get color class based on staffing level
  const getStaffingColorClass = (actual: number, ideal: number) => {
    if (actual < ideal) return "text-destructive"; // Red for understaffed
    if (actual > ideal) return "text-green-600"; // Green for overstaffed
    return "text-foreground"; // Neutral for perfectly staffed
  };

  // Calculate member involvement based on team memberships
  const getMemberInvolvement = (member: TeamMember, monthDate: Date, teamId: string) => {
    const monthString = monthDate.toISOString().split('T')[0].substring(0, 7) + '-01'; // Format as YYYY-MM-01
    
    // Find the membership for this member and team that covers this month
    const relevantMembership = memberships.find(m => 
      m.team_member_id === member.id && 
      m.team_id === teamId &&
      m.start_month <= monthString &&
      (!m.end_month || m.end_month >= monthString)
    );
    
    return relevantMembership ? 1 : 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No team members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-48">Name</TableHead>
                     <TableHead className="w-40">Role</TableHead>
                     <TableHead className="w-32">Start Date</TableHead>
                     {timelineMonths.map((month) => (
                       <TableHead key={month.label} className="text-center w-20">
                         <div className="text-xs">
                           <div>{month.shortLabel}</div>
                           <div className="text-muted-foreground">{format(month.date, 'yyyy')}</div>
                         </div>
                       </TableHead>
                     ))}
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {/* Teams grouped by products */}
                  {groupedData.productsWithTeams.map(({ product, teams: productTeams }) => (
                    <Fragment key={product.id}>
                      {/* Product header row */}
                      <TableRow className="bg-accent">
                         <TableCell 
                           colSpan={3 + timelineMonths.length}
                           className="font-bold text-lg"
                           style={{ 
                             borderLeftColor: product.color || 'hsl(var(--primary))',
                             borderLeftWidth: '6px'
                           }}
                         >
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {product.name}
                            <Badge variant="secondary">
                              {productTeams.reduce((sum, { members }) => sum + members.length, 0)} member{productTeams.reduce((sum, { members }) => sum + members.length, 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Teams within this product */}
                      {productTeams.map(({ team, members }) => (
                        <Fragment key={team.id}>
                           {/* Team header row */}
                           <TableRow className="bg-muted/50">
                             <TableCell 
                               className="font-semibold pl-8"
                               style={{ 
                                 borderLeftColor: team.color || 'hsl(var(--primary))',
                                 borderLeftWidth: '4px'
                               }}
                             >
                                <div className="flex items-center gap-3">
                                  <span>{team.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    Ideal: {team.ideal_size || 1}
                                  </Badge>
                                </div>
                             </TableCell>
                             <TableCell className="font-semibold text-muted-foreground">
                               <span className="text-xs">Actual →</span>
                             </TableCell>
                             <TableCell></TableCell>
                             {timelineMonths.map((month) => {
                               const actualCount = getActualMemberCount(team.id, month.date);
                               const idealCount = team.ideal_size || 1;
                               return (
                                 <TableCell key={month.label} className="text-center">
                                   <Badge 
                                     variant="outline" 
                                     className={`text-xs px-1 py-0 min-w-[20px] justify-center ${getStaffingColorClass(actualCount, idealCount)}`}
                                   >
                                     {actualCount}
                                   </Badge>
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                          
                          {/* Team member rows */}
                          {members.map((member) => (
                            <TableRow key={member.id}>
                               <TableCell className="font-medium pl-12">
                                 <div className="flex items-center justify-between gap-2">
                                   <span className="truncate">{member.name}</span>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-6 w-6 p-0"
                                     onClick={() => setEditingMember(member)}
                                     title="Edit memberships"
                                   >
                                     <Edit2 className="w-3 h-3" />
                                   </Button>
                                 </div>
                               </TableCell>
                               <TableCell className="text-muted-foreground">{member.role}</TableCell>
                              <TableCell>{format(new Date(member.start_date), 'MMM d, yyyy')}</TableCell>
                               {timelineMonths.map((month) => {
                                 const involvement = getMemberInvolvement(member, month.date, team.id);
                                 return (
                                  <TableCell key={month.label} className="text-center">
                                    <div 
                                      className="w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))') + '20'
                                          : 'transparent',
                                        color: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))')
                                          : 'hsl(var(--muted-foreground))',
                                        border: involvement > 0 
                                          ? `1px solid ${team.color || 'hsl(var(--primary))'}`
                                          : '1px solid hsl(var(--border))'
                                      }}
                                    >
                                      {involvement > 0 ? involvement : ''}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}

                  {/* Teams without products */}
                  {groupedData.teamsWithoutProduct.length > 0 && (
                    <Fragment>
                      <TableRow className="bg-accent">
                         <TableCell 
                           colSpan={3 + timelineMonths.length}
                           className="font-bold text-lg"
                         >
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Unassigned Teams
                            <Badge variant="secondary">
                              {groupedData.teamsWithoutProduct.reduce((sum, { members }) => sum + members.length, 0)} member{groupedData.teamsWithoutProduct.reduce((sum, { members }) => sum + members.length, 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {groupedData.teamsWithoutProduct.map(({ team, members }) => (
                        <Fragment key={team.id}>
                           {/* Team header row */}
                           <TableRow className="bg-muted/50">
                             <TableCell 
                               className="font-semibold pl-8"
                               style={{ 
                                 borderLeftColor: team.color || 'hsl(var(--primary))',
                                 borderLeftWidth: '4px'
                               }}
                             >
                                <div className="flex items-center gap-3">
                                  <span>{team.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    Ideal: {team.ideal_size || 1}
                                  </Badge>
                                </div>
                             </TableCell>
                             <TableCell className="font-semibold text-muted-foreground">
                               <span className="text-xs">Actual →</span>
                             </TableCell>
                             <TableCell></TableCell>
                             {timelineMonths.map((month) => {
                               const actualCount = getActualMemberCount(team.id, month.date);
                               const idealCount = team.ideal_size || 1;
                               return (
                                 <TableCell key={month.label} className="text-center">
                                   <Badge 
                                     variant="outline" 
                                     className={`text-xs px-1 py-0 min-w-[20px] justify-center ${getStaffingColorClass(actualCount, idealCount)}`}
                                   >
                                     {actualCount}
                                   </Badge>
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                          
                          {/* Team member rows */}
                          {members.map((member) => (
                             <TableRow key={member.id}>
                               <TableCell className="font-medium pl-12">
                                 <div className="flex items-center justify-between gap-2">
                                   <span className="truncate">{member.name}</span>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     className="h-6 w-6 p-0"
                                     onClick={() => setEditingMember(member)}
                                     title="Edit memberships"
                                   >
                                     <Edit2 className="w-3 h-3" />
                                   </Button>
                                 </div>
                               </TableCell>
                               <TableCell className="text-muted-foreground">{member.role}</TableCell>
                              <TableCell>{format(new Date(member.start_date), 'MMM d, yyyy')}</TableCell>
                               {timelineMonths.map((month) => {
                                 const involvement = getMemberInvolvement(member, month.date, team.id);
                                 return (
                                  <TableCell key={month.label} className="text-center">
                                    <div 
                                      className="w-8 h-8 mx-auto rounded flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))') + '20'
                                          : 'transparent',
                                        color: involvement > 0 
                                          ? (team.color || 'hsl(var(--primary))')
                                          : 'hsl(var(--muted-foreground))',
                                        border: involvement > 0 
                                          ? `1px solid ${team.color || 'hsl(var(--primary))'}`
                                          : '1px solid hsl(var(--border))'
                                      }}
                                    >
                                      {involvement > 0 ? involvement : ''}
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditTeamMemberDialog
        member={editingMember}
        teams={teams}
        memberships={memberships}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        onAddMembership={onAddMembership}
        onUpdateMembership={onUpdateMembership}
        onDeleteMembership={onDeleteMembership}
      />
    </div>
  );
}

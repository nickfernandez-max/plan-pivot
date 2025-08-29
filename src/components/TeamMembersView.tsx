import React, { useState, useMemo, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Edit2, Settings, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths, startOfMonth } from 'date-fns';
import { TeamMember, Team, Product, TeamMembership, Role } from '@/types/roadmap';
import { EditTeamMemberDialog } from '@/components/EditTeamMemberDialog';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { EditProductDialog } from '@/components/EditProductDialog';

interface TeamMembersViewProps {
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  roles: Role[];
  memberships: TeamMembership[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddTeam: (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
  onAddRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<Role>;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
});

export function TeamMembersView({ 
  teamMembers, 
  teams, 
  products, 
  roles,
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
  onAddRole,
}: TeamMembersViewProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      team_id: "",
      start_date: "",
    },
  });

  // Generate timeline (9 months from now)
  const timelineMonths = useMemo(() => {
    const months = [];
    const startDate = startOfMonth(new Date());
    
    for (let i = 0; i < 9; i++) {
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

  // Set default active tab
  React.useEffect(() => {
    if (!activeTab && groupedData.productsWithTeams.length > 0) {
      setActiveTab(groupedData.productsWithTeams[0].product.id);
    } else if (!activeTab && groupedData.teamsWithoutProduct.length > 0) {
      setActiveTab('unassigned');
    }
  }, [groupedData, activeTab]);

  // Calculate actual member count for a team in a specific month using memberships data
  const getActualMemberCount = (teamId: string, monthDate: Date) => {
    const monthKey = format(monthDate, 'yyyy-MM-01');
    
    // Get unique team members who have active memberships for this team in this month
    const activeMembers = new Set();
    
    memberships?.forEach(membership => {
      if (membership.team_id === teamId &&
          membership.start_month <= monthKey &&
          (!membership.end_month || membership.end_month >= monthKey)) {
        
        // Verify the member exists
        const member = teamMembers.find(tm => tm.id === membership.team_member_id);
        if (member) {
          activeMembers.add(membership.team_member_id);
        }
      }
    });
    
    return activeMembers.size;
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

  // Render table for a set of teams
  const renderTable = (teams: Array<{ team: Team; members: TeamMember[] }>) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="h-8">
            <TableHead className="w-36 text-xs">Team / Member</TableHead>
            <TableHead className="w-28 text-xs">Role</TableHead>
            <TableHead className="w-24 text-xs">Start Date</TableHead>
            {timelineMonths.map((month) => (
              <TableHead key={month.label} className="text-center w-8 px-0">
                <div className="text-xs leading-tight">
                  <div className="text-xs font-medium">{month.shortLabel}</div>
                  <div className="text-xs text-muted-foreground">{format(month.date, 'yy')}</div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map(({ team, members }) => (
            <Fragment key={team.id}>
              {/* Team header row */}
              <TableRow className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 border-l-4 border-l-blue-500 shadow-sm h-9">
                <TableCell 
                  className="font-semibold text-sm py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-900 dark:text-blue-100">{team.name}</span>
                      <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        Ideal: {team.ideal_size || 1}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                      onClick={() => setEditingTeam(team)}
                      title="Edit team"
                    >
                      <Settings className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-blue-700 dark:text-blue-300 py-2">
                  <span className="text-xs font-medium">Actual →</span>
                </TableCell>
                <TableCell className="py-2"></TableCell>
                {timelineMonths.map((month) => {
                  const actualCount = getActualMemberCount(team.id, month.date);
                  const idealCount = team.ideal_size || 1;
                  return (
                    <TableCell key={month.label} className="text-center py-1 px-0">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-0.5 py-0 min-w-[12px] justify-center h-4 ${getStaffingColorClass(actualCount, idealCount)}`}
                      >
                        {actualCount}
                      </Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
             
              {/* Team member rows */}
              {members.map((member) => {
                // Debug log to check role structure
                console.log('Member role object:', member.role);
                return (
                <TableRow key={member.id} className="h-8">
                  <TableCell className="font-medium text-sm py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <User className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                        <span className="truncate text-sm">{member.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => setEditingMember(member)}
                        title="Edit memberships"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm py-2">
                    {member.role?.name}
                  </TableCell>
                  <TableCell className="text-sm py-2">{format(new Date(member.start_date), 'MMM d, yy')}</TableCell>
                  {timelineMonths.map((month) => {
                    const involvement = getMemberInvolvement(member, month.date, team.id);
                    return (
                      <TableCell key={month.label} className="text-center py-1 px-0">
                         <div 
                           className="w-3 h-3 mx-auto rounded flex items-center justify-center text-xs font-medium"
                           style={{
                             backgroundColor: involvement > 0 
                               ? 'hsl(var(--primary/20))'
                               : 'transparent',
                             color: involvement > 0 
                               ? 'black'
                               : 'hsl(var(--muted-foreground))',
                             border: involvement > 0 
                               ? '1px solid hsl(var(--primary))'
                               : '1px solid hsl(var(--border))'
                           }}
                         >
                          {involvement > 0 ? involvement : ''}
                        </div>
                      </TableCell>
                     );
                   })}
                 </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3">
          {teamMembers.length === 0 ? (
            <div className="text-center py-4">
              <User className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">No team members found</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${groupedData.productsWithTeams.length + (groupedData.teamsWithoutProduct.length > 0 ? 1 : 0)}, 1fr)` }}>
                {groupedData.productsWithTeams.map(({ product }) => (
                  <TabsTrigger key={product.id} value={product.id} className="text-sm group">
                    <div className="flex items-center gap-2">
                      {product.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProduct(product);
                        }}
                        title="Edit product"
                      >
                        <Settings className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </TabsTrigger>
                ))}
                {groupedData.teamsWithoutProduct.length > 0 && (
                  <TabsTrigger value="unassigned" className="text-sm">
                    Unassigned Teams
                  </TabsTrigger>
                )}
              </TabsList>

              {groupedData.productsWithTeams.map(({ product, teams: productTeams }) => (
                <TabsContent key={product.id} value={product.id} className="space-y-0">
                  {renderTable(productTeams)}
                </TabsContent>
              ))}

              {/* Unassigned Teams Tab */}
              {groupedData.teamsWithoutProduct.length > 0 && (
                <TabsContent value="unassigned" className="space-y-0">
                  {renderTable(groupedData.teamsWithoutProduct)}
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>

        <EditTeamMemberDialog
          member={editingMember}
          teams={teams}
          roles={roles}
          teamMembers={teamMembers}
          memberships={memberships}
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          onAddMembership={onAddMembership}
          onUpdateMembership={onUpdateMembership}
          onDeleteMembership={onDeleteMembership}
          onUpdateMember={onUpdateTeamMember}
          onAddRole={onAddRole}
        />
      
      <EditTeamDialog
        team={editingTeam}
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        onUpdateTeam={onUpdateTeam}
        products={products}
      />
      
      <EditProductDialog
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onUpdateProduct={onUpdateProduct}
      />
    </div>
  );
}
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Edit2, Settings, Users, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { TimelineNavigation } from '@/components/TimelineNavigation';
import { TeamMember, Team, Product, TeamMembership, Role, TeamIdealSize } from '@/types/roadmap';
import { EditTeamMemberDialog } from '@/components/EditTeamMemberDialog';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { EditProductDialog } from '@/components/EditProductDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface TeamMembersViewProps {
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  roles: Role[];
  memberships: TeamMembership[];
  teamIdealSizes: TeamIdealSize[];
  timelineMonths: number;
  selectedProduct: string;
  selectedTeam: string;
  timelineStartDate: Date;
  onTimelineNavigateForward: () => void;
  onTimelineNavigateBackward: () => void;
  onTimelineResetToToday: () => void;
  onTimelineMonthsChange?: (months: number) => void;
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onAddTeam: (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  onArchiveTeam?: (id: string) => Promise<void>;
  onAddMembership: (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateMembership: (id: string, updates: Partial<TeamMembership>) => Promise<any>;
  onDeleteMembership: (id: string) => Promise<any> | void;
  onAddRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<Role>;
  currentUserId?: string;
}

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  team_id: z.string().min(1, "Team is required"),
  start_date: z.string().min(1, "Start date is required"),
});

type SortField = 'name' | 'role' | 'start_date';
type SortDirection = 'asc' | 'desc';

export function TeamMembersView({ 
  teamMembers, 
  teams, 
  products, 
  roles, 
  memberships, 
  teamIdealSizes,
  timelineMonths,
  selectedProduct,
  selectedTeam,
  timelineStartDate,
  onTimelineNavigateForward,
  onTimelineNavigateBackward,
  onTimelineResetToToday,
  onTimelineMonthsChange,
  onAddTeamMember, 
  onUpdateTeamMember,
  onAddProduct,
  onUpdateProduct,
  onAddTeam,
  onUpdateTeam,
  onArchiveTeam,
  onAddMembership,
  onUpdateMembership,
  onDeleteMembership,
  onAddRole,
  currentUserId,
}: TeamMembersViewProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  
  // Sorting state from user preferences
  const [primarySort, setPrimarySort] = useState<SortField>('role');
  const [primaryDirection, setPrimaryDirection] = useState<SortDirection>('asc');
  const [secondarySort, setSecondarySort] = useState<SortField>('name');
  const [secondaryDirection, setSecondaryDirection] = useState<SortDirection>('asc');

  // Load sorting preferences from user profile
  React.useEffect(() => {
    const loadSortingPreferences = async () => {
      if (currentUserId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('team_member_primary_sort, team_member_primary_direction, team_member_secondary_sort, team_member_secondary_direction')
            .eq('id', currentUserId)
            .single();

          if (error) throw error;

          if (data) {
            setPrimarySort((data.team_member_primary_sort as SortField) || 'role');
            setPrimaryDirection((data.team_member_primary_direction as SortDirection) || 'asc');
            setSecondarySort((data.team_member_secondary_sort as SortField) || 'name');
            setSecondaryDirection((data.team_member_secondary_direction as SortDirection) || 'asc');
          }
        } catch (error) {
          console.error('Error loading sorting preferences:', error);
        }
      }
    };

    loadSortingPreferences();
  }, [currentUserId]);

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      team_id: "",
      start_date: "",
    },
  });

  // Navigation functions - now use props
  const navigateForward = onTimelineNavigateForward;
  const navigateBackward = onTimelineNavigateBackward;
  const resetToToday = onTimelineResetToToday;

  // Sorting function
  const sortMembers = (members: TeamMember[]) => {
    return [...members].sort((a, b) => {
      // Primary sort
      let primaryCompare = 0;
      switch (primarySort) {
        case 'name':
          primaryCompare = a.name.localeCompare(b.name);
          break;
        case 'role':
          primaryCompare = (a.role?.display_name || a.role?.name || '').localeCompare(b.role?.display_name || b.role?.name || '');
          break;
        case 'start_date':
          primaryCompare = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
      }
      
      if (primaryDirection === 'desc') primaryCompare *= -1;
      if (primaryCompare !== 0) return primaryCompare;
      
      // Secondary sort
      let secondaryCompare = 0;
      switch (secondarySort) {
        case 'name':
          secondaryCompare = a.name.localeCompare(b.name);
          break;
        case 'role':
          secondaryCompare = (a.role?.display_name || a.role?.name || '').localeCompare(b.role?.display_name || b.role?.name || '');
          break;
        case 'start_date':
          secondaryCompare = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
      }
      
      if (secondaryDirection === 'desc') secondaryCompare *= -1;
      return secondaryCompare;
    });
  };

  // Generate timeline array based on timelineMonths prop
  const timelineMonthsArray = useMemo(() => {
    const months = [];
    
    for (let i = 0; i < timelineMonths; i++) {
      const monthDate = addMonths(timelineStartDate, i);
      months.push({
        date: monthDate,
        label: format(monthDate, 'MMM yyyy'),
        shortLabel: format(monthDate, 'MMM')
      });
    }
    
    return months;
  }, [timelineStartDate, timelineMonths]);

  // Function to get ideal member count for a team in a specific month
  const getIdealMemberCount = useMemo(() => {
    return (teamId: string, date: Date) => {
      const monthStr = format(date, 'yyyy-MM-01');
      
      // Find the ideal size that applies to this month
      const applicableIdeal = (teamIdealSizes || [])
        .filter(ideal => ideal.team_id === teamId)
        .filter(ideal => {
          const startMonth = ideal.start_month;
          const endMonth = ideal.end_month;
          
          return monthStr >= startMonth && (!endMonth || monthStr <= endMonth);
        })
        .sort((a, b) => b.start_month.localeCompare(a.start_month))[0]; // Get most recent
      
      return applicableIdeal?.ideal_size || 1; // Default to 1 if no ideal size is set
    };
  }, [teamIdealSizes]);

  // Function to get actual member count for a team in a specific month
  const groupedData = useMemo(() => {
    const timelineStart = format(timelineMonthsArray[0].date, 'yyyy-MM-01');
    const timelineEnd = format(timelineMonthsArray[timelineMonthsArray.length - 1].date, 'yyyy-MM-01');
    
    // Helper function to get members assigned to a team during the timeline period
    const getTimelineMembers = (teamId: string) => {
      // When a specific product is selected, first check if this team belongs to that product
      if (selectedProduct !== 'all') {
        const currentTeam = teams.find(t => t.id === teamId);
        if (!currentTeam) return [];
        
        const selectedProductObj = products.find(p => p.name === selectedProduct);
        if (!selectedProductObj || currentTeam.product_id !== selectedProductObj.id) {
          return []; // This team doesn't belong to the selected product, so return no members
        }
      }
      
      return teamMembers.filter(member => {
        // Check if member has any membership for this team that overlaps with timeline
        return (memberships || []).some(membership => {
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
      teams: teams.filter(team => 
        team.product_id === product.id && 
        (showArchived || !team.archived) &&
        (selectedTeam === 'all' || team.name === selectedTeam)
      ).map(team => ({
        team,
        members: sortMembers(getTimelineMembers(team.id))
      }))
    })); // Show all products, even if they have no teams

    const teamsWithoutProduct = teams.filter(team => 
      !team.product_id && 
      (showArchived || !team.archived) &&
      (selectedTeam === 'all' || team.name === selectedTeam)
    ).map(team => ({
      team,
      members: sortMembers(getTimelineMembers(team.id))
    }));

    return { productsWithTeams, teamsWithoutProduct };
  }, [teams, teamMembers, products, memberships, selectedTeam, primarySort, primaryDirection, secondarySort, secondaryDirection, showArchived]);


  // Set active tab based on selected product
  React.useEffect(() => {
    if (groupedData.productsWithTeams.length > 0 || groupedData.teamsWithoutProduct.length > 0) {
      const availableTabs = [
        ...groupedData.productsWithTeams.map(g => g.product.id),
        ...(groupedData.teamsWithoutProduct.length > 0 ? ['unassigned'] : [])
      ];
      
      if (selectedProduct !== 'all') {
        // Find the product ID that matches the selected product name
        const matchingProduct = groupedData.productsWithTeams.find(g => g.product.name === selectedProduct);
        if (matchingProduct && availableTabs.includes(matchingProduct.product.id)) {
          setActiveTab(matchingProduct.product.id);
          return;
        }
      }
      
      // Default to first available tab if no matching product or selectedProduct is 'all'
      if (!activeTab || !availableTabs.includes(activeTab)) {
        setActiveTab(availableTabs[0] || '');
      }
    }
  }, [groupedData, selectedProduct]);

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
  const renderTable = (teams: Array<{ team: Team; members: TeamMember[] }>) => {
    if (teams.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No teams assigned to this product yet</p>
          <p className="text-xs mt-1">Create teams and assign them to this product to see them here</p>
        </div>
      );
    }
    
    // Calculate grid columns: 3 fixed columns + timeline months
    const gridCols = `144px 112px 96px ${Array(timelineMonthsArray.length).fill('32px').join(' ')}`;

    return (
      <div className="relative">
        {/* Centered Container with max width */}
        <div className="w-full">
          <div className="h-[65vh] w-full overflow-auto rounded-lg border border-border bg-card shadow-sm">
            {/* CSS Grid Container */}
            <div 
              className="grid"
              style={{ 
                gridTemplateColumns: gridCols,
                minWidth: `${144 + 112 + 96 + (timelineMonthsArray.length * 32)}px`
              }}
            >
          {/* Header Row - spans all columns */}
          <div className="sticky top-0 left-0 z-40 bg-background border-r border-b px-4 py-2 text-xs font-medium flex items-center">
            Team / Member
          </div>
          <div className="sticky top-0 left-[144px] z-40 bg-background border-r border-b px-4 py-2 text-xs font-medium flex items-center">
            Role
          </div>
          <div className="sticky top-0 left-[256px] z-40 bg-background border-r border-b px-4 py-2 text-xs font-medium flex items-center">
            Start Date
          </div>
          {timelineMonthsArray.map((month) => (
            <div key={`header-${month.label}`} className="sticky top-0 z-30 bg-background border-r border-b px-0 py-2 text-xs font-medium text-center flex items-center justify-center">
              {format(month.date, 'MMM - yy')}
            </div>
          ))}

          {/* Data Rows */}
          {teams.map(({ team, members }) => (
            <Fragment key={team.id}>
              {/* Team Header Row */}
              <div className="sticky left-0 z-20 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 border-r border-b border-l-4 border-l-blue-500 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-900 dark:text-blue-100 font-semibold text-sm">{team.name}</span>
                  {team.archived && (
                    <Badge variant="outline" className="text-xs px-2 py-1 text-muted-foreground">
                      Archived
                    </Badge>
                  )}
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
              <div className="sticky left-[144px] z-20 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 border-r border-b px-4 py-2 flex items-center">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Count →</span>
              </div>
              <div className="sticky left-[256px] z-20 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-950 dark:to-blue-900 border-r border-b px-4 py-2"></div>
              {timelineMonthsArray.map((month) => {
                const actualCount = getActualMemberCount(team.id, month.date);
                const idealCount = getIdealMemberCount(team.id, month.date);
                return (
                  <div key={`team-${team.id}-${month.label}`} className="border-r border-b py-1 px-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-0.5 py-0 min-w-[16px] justify-center h-4 ${getStaffingColorClass(actualCount, idealCount)}`}
                      >
                        {actualCount}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        /{idealCount}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Team Member Rows */}
              {members.map((member) => {
                console.log('Member role object:', member.role);
                return (
                  <Fragment key={member.id}>
                    <div className="sticky left-0 z-10 bg-background border-r border-b px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-3.5 h-3.5 text-muted-foreground ml-2" />
                        <span className="truncate text-sm font-medium">
                          {member.name}
                        </span>
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
                    <div className="sticky left-[144px] z-10 bg-background border-r border-b px-4 py-2 text-muted-foreground text-sm flex items-center">
                      {member.role?.display_name || member.role?.name}
                    </div>
                    <div className="sticky left-[256px] z-10 bg-background border-r border-b px-4 py-2 text-sm flex items-center">
                      {format(new Date(member.start_date), 'MMM - yy')}
                    </div>
                    {timelineMonthsArray.map((month) => {
                      const involvement = getMemberInvolvement(member, month.date, team.id);
                      return (
                        <div key={`member-${member.id}-${month.label}`} className="border-r border-b py-1 px-0 flex items-center justify-center">
                          <div 
                            className="w-3 h-3 rounded flex items-center justify-center text-xs font-medium"
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
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get timeline range display
  const timelineRange = `${format(timelineMonthsArray[0].date, 'MMM yyyy')} - ${format(timelineMonthsArray[timelineMonthsArray.length - 1].date, 'MMM yyyy')}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Elegant Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">Manage your team members and their assignments across projects</p>
      </div>

      {/* Controls Card */}
      <Card className="shadow-sm border-muted">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-lg font-semibold">Timeline: {timelineRange}</h2>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show Archived
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Navigation */}
      <Card className="shadow-sm border-muted">
        <CardContent className="p-6">
          <TimelineNavigation
            title="Team Members"
            timelineStart={timelineStartDate}
            timelineEnd={endOfMonth(addMonths(timelineStartDate, timelineMonths - 1))}
            timelineMonths={timelineMonths}
            navigationIncrement={3}
            canNavigateLeft={true}
            canNavigateRight={true}
            onNavigateLeft={navigateBackward}
            onNavigateRight={navigateForward}
            onResetToToday={resetToToday}
            onTimelineMonthsChange={onTimelineMonthsChange || (() => {})}
          />
        </CardContent>
      </Card>

      {/* Main Content Card */}
      <Card className="shadow-lg border-muted">
        <CardContent className="p-0">
          <Tabs defaultValue={groupedData.productsWithTeams[0]?.product.id || "unassigned"} className="w-full">
            {/* Elegant Tabs Header */}
            <div className="px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Product Teams</h3>
              </div>
              <TabsList className="grid w-full max-w-2xl" style={{ gridTemplateColumns: `repeat(${Math.min([...groupedData.productsWithTeams, ...(groupedData.teamsWithoutProduct.length > 0 ? [1] : [])].length, 6)}, 1fr)` }}>
                {groupedData.productsWithTeams.map((group) => (
                  <TabsTrigger key={group.product.id} value={group.product.id} className="text-sm">
                    {group.product.name}
                  </TabsTrigger>
                ))}
                {groupedData.teamsWithoutProduct.length > 0 && (
                  <TabsTrigger value="unassigned" className="text-sm">
                    Unassigned
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            {/* Tab Contents with padding */}
            {groupedData.productsWithTeams.map((group) => (
              <TabsContent key={group.product.id} value={group.product.id} className="mt-0">
                <div className="p-6">
                  {renderTable(group.teams)}
                </div>
              </TabsContent>
            ))}
            
            {groupedData.teamsWithoutProduct.length > 0 && (
              <TabsContent value="unassigned" className="mt-0">
                <div className="p-6">
                  {renderTable(groupedData.teamsWithoutProduct)}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

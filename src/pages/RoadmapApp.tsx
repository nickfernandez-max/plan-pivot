import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectList } from '@/components/ProjectList';
import { RoadmapView } from '@/components/RoadmapView';
import { TeamMembersView } from '@/components/TeamMembersView';
import { ReportsView } from '@/components/ReportsView';
import { FinancialsView } from '@/components/FinancialsView';
import { UserMenu } from '@/components/UserMenu';
import { AddProductDialog } from '@/components/AddProductDialog';
import { AddTeamDialog } from '@/components/AddTeamDialog';
import { AddPersonDialog } from '@/components/AddPersonDialog';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, addMonths, format } from 'date-fns';

export default function RoadmapApp() {
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);
  const [userPreferencesLoaded, setUserPreferencesLoaded] = useState(false);
  const [timelineStartDate, setTimelineStartDate] = useState(() => startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Persist active tab in sessionStorage to survive data refetches
    return sessionStorage.getItem('roadmapActiveTab') || 'projects';
  });
  
  // Timeline navigation functions
  const navigateTimelineForward = () => {
    setTimelineStartDate(prev => addMonths(prev, 3));
  };

  const navigateTimelineBackward = () => {
    setTimelineStartDate(prev => addMonths(prev, -3));
  };

  const resetTimelineToToday = () => {
    setTimelineStartDate(startOfMonth(new Date()));
  };

  // Update sessionStorage when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    sessionStorage.setItem('roadmapActiveTab', value);
  };
  
  const { 
    projects, 
    teamMembers, 
    teams, 
    products,
    roles,
    assignments,
    memberships,
    workAssignments,
    loading, 
    error, 
    addProject, 
    updateProject, 
    addTeamMember, 
    updateTeamMember,
    addRole,
    addTeam,
    updateTeam,
    updateRole,
    updateProjectAssignees,
    updateProjectAssignments,
    addProduct,
    updateProduct,
    updateProjectProducts,
    addTeamMembership,
    updateTeamMembership,
    deleteTeamMembership,
    addWorkAssignment,
    updateWorkAssignment,
    deleteWorkAssignment,
  } = useSupabaseData();

  // Load user preferences for default filters
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !userPreferencesLoaded) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('default_team_filter, default_product_filter')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.default_team_filter) {
              setSelectedTeam(profile.default_team_filter);
            }
            if (profile.default_product_filter) {
              setSelectedProduct(profile.default_product_filter);
            }
          }
          setUserPreferencesLoaded(true);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
        setUserPreferencesLoaded(true);
      }
    };

    if (!loading && !userPreferencesLoaded) {
      loadUserPreferences();
    }
  }, [loading, userPreferencesLoaded]);

  // Reload preferences when they're updated
  const handlePreferencesUpdate = () => {
    setUserPreferencesLoaded(false);
  };

  // Generate filter options
  const productNames = useMemo(() => {
    return Array.from(new Set(products.map(product => product.name))).sort();
  }, [products]);

  // Filter teams based on selected product
  const filteredTeams = useMemo(() => {
    if (selectedProduct === 'all') {
      return teams;
    }
    return teams.filter(team => team.product?.name === selectedProduct);
  }, [teams, selectedProduct]);

  const teamNames = useMemo(() => {
    return Array.from(new Set(filteredTeams.map(team => team.name))).sort();
  }, [filteredTeams]);

  // Reset selected team when product changes and team is no longer available
  useMemo(() => {
    if (selectedTeam !== 'all' && !teamNames.includes(selectedTeam)) {
      setSelectedTeam('all');
    }
  }, [selectedTeam, teamNames]);

  // Filter data based on selected filters
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const teamMatches = selectedTeam === 'all' || project.team?.name === selectedTeam;
      const productMatches = selectedProduct === 'all' || 
        (selectedTeam === 'all' ? 
          project.products?.some(p => p.name === selectedProduct) || project.team?.product?.name === selectedProduct :
          project.team?.product?.name === selectedProduct);
      return teamMatches && productMatches;
    });
  }, [projects, selectedTeam, selectedProduct]);

  const filteredTeamMembers = useMemo(() => {
    // Calculate timeline range (9 months from timelineStartDate)
    const timelineStart = format(timelineStartDate, 'yyyy-MM-01');
    const timelineEnd = format(addMonths(timelineStartDate, 8), 'yyyy-MM-01');
    
    return teamMembers.filter(member => {
      // Get all active team memberships for this member during the timeline period
      const activeMemberships = memberships.filter(membership => {
        const membershipStart = membership.start_month;
        const membershipEnd = membership.end_month || '9999-12-01'; // Use far future if no end date
        
        return membership.team_member_id === member.id &&
               membershipStart <= timelineEnd &&
               membershipEnd >= timelineStart;
      });
      
      // Get teams this member is active in during the timeline
      const activeTeams = activeMemberships
        .map(membership => teams.find(t => t.id === membership.team_id))
        .filter(Boolean);
      
      // Check if any active team matches the selected team
      const teamMatches = selectedTeam === 'all' || 
        activeTeams.some(team => team?.name === selectedTeam);
      
      // Check if any active team is assigned to the selected product
      const productMatches = selectedProduct === 'all' || 
        activeTeams.some(team => team?.product?.name === selectedProduct);
      
      // Debug logging for Bob Smith
      if (member.name === 'Bob Smith') {
        console.log('Bob Smith filtering debug:', {
          selectedProduct,
          selectedTeam,
          timelineStart,
          timelineEnd,
          activeMemberships: activeMemberships.length,
          activeTeams: activeTeams.map(t => ({ name: t?.name, product: t?.product?.name })),
          teamMatches,
          productMatches,
          finalResult: teamMatches && productMatches
        });
      }
      
      return teamMatches && productMatches;
    });
  }, [teamMembers, teams, memberships, selectedTeam, selectedProduct, timelineStartDate]);

  // Event handlers for data manipulation
  const handleAddProject = async (projectData: any) => {
    try {
      const newProject = await addProject(projectData);
      toast({ title: "Success", description: "Project added successfully" });
      return newProject; // Return the created project for further processing
    } catch (error) {
      console.error('Error adding project:', error);
      toast({ title: "Error", description: "Failed to add project", variant: "destructive" });
      throw error;
    }
  };

  const handleUpdateProject = async (id: string, updates: any) => {
    try {
      await updateProject(id, updates);
      toast({ title: "Success", description: "Project updated successfully" });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({ title: "Error", description: "Failed to update project", variant: "destructive" });
    }
  };

  const handleAddTeamMember = async (memberData: any) => {
    try {
      await addTeamMember(memberData);
      toast({ title: "Success", description: "Team member added successfully" });
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({ title: "Error", description: "Failed to add team member", variant: "destructive" });
    }
  };

  const handleAddRole = async (roleData: any) => {
    try {
      const newRole = await addRole(roleData);
      toast({ title: "Success", description: "Role added successfully" });
      return newRole;
    } catch (error) {
      console.error('Error adding role:', error);
      toast({ title: "Error", description: "Failed to add role", variant: "destructive" });
      throw error;
    }
  };

  const handleUpdateTeamMember = async (id: string, updates: any) => {
    try {
      await updateTeamMember(id, updates);
      toast({ title: "Success", description: "Team member updated successfully" });
    } catch (error) {
      console.error('Error updating team member:', error);
      toast({ title: "Error", description: "Failed to update team member", variant: "destructive" });
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      await addProduct(productData);
      toast({ title: "Success", description: "Product added successfully" });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
    }
  };

  const handleAddTeam = async (teamData: any) => {
    try {
      await addTeam(teamData);
      toast({ title: "Success", description: "Team added successfully" });
    } catch (error) {
      console.error('Error adding team:', error);
      toast({ title: "Error", description: "Failed to add team", variant: "destructive" });
    }
  };

  const handleUpdateTeam = async (id: string, updates: any) => {
    try {
      await updateTeam(id, updates);
      toast({ title: "Success", description: "Team updated successfully" });
    } catch (error) {
      console.error('Error updating team:', error);
      toast({ title: "Error", description: "Failed to update team", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Error Loading Data</h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Project Roadmap
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-4">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {productNames.map((productName) => (
                  <SelectItem key={productName} value={productName}>
                    {productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamNames.map((teamName) => (
                  <SelectItem key={teamName} value={teamName}>
                    {teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <UserMenu 
              teams={teams} 
              products={products} 
              onPreferencesUpdate={handlePreferencesUpdate}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="projects" className="text-sm font-medium">
              Projects
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="text-sm font-medium">
              Roadmap
            </TabsTrigger>
            <TabsTrigger value="members" className="text-sm font-medium">
              Team Members
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-sm font-medium">
              Reports
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-sm font-medium">
              Financials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <ProjectList 
              projects={filteredProjects} 
              teams={teams}
              products={products}
              onAddProject={handleAddProject} 
              onUpdateProject={handleUpdateProject}
              onUpdateProjectProducts={updateProjectProducts}
            />
          </TabsContent>

          <TabsContent value="roadmap">
            <RoadmapView 
              projects={filteredProjects} 
              teamMembers={filteredTeamMembers} 
              teams={teams}
              products={products}
              assignments={assignments}
              workAssignments={workAssignments}
              selectedTeam={selectedTeam}
              selectedProduct={selectedProduct}
              onUpdateProject={handleUpdateProject}
              onUpdateProjectAssignees={async (projectId: string, assigneeIds: string[]) => {
                await updateProjectAssignees(projectId, assigneeIds);
              }}
              onUpdateProjectProducts={async (projectId: string, productIds: string[]) => {
                await updateProjectProducts(projectId, productIds);
              }}
              onUpdateProjectAssignments={updateProjectAssignments}
              onAddProject={handleAddProject}
              onAddWorkAssignment={addWorkAssignment}
              onUpdateWorkAssignment={updateWorkAssignment}
              onDeleteWorkAssignment={deleteWorkAssignment}
            />
          </TabsContent>

          <TabsContent value="members">
            <div className="flex gap-2 mb-6">
              <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
              <Button variant="outline" onClick={() => setIsAddTeamDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
              <Button variant="outline" onClick={() => setIsAddProductDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
            
            <TeamMembersView 
              teamMembers={filteredTeamMembers} 
              teams={teams}
              products={products}
              roles={roles}
              memberships={memberships}
              timelineStartDate={timelineStartDate}
              onTimelineNavigateForward={navigateTimelineForward}
              onTimelineNavigateBackward={navigateTimelineBackward}
              onTimelineResetToToday={resetTimelineToToday}
              onAddTeamMember={handleAddTeamMember} 
              onUpdateTeamMember={handleUpdateTeamMember}
              onAddProduct={handleAddProduct}
              onUpdateProduct={updateProduct}
              onAddTeam={handleAddTeam}
              onUpdateTeam={handleUpdateTeam}
              onAddMembership={addTeamMembership}
              onUpdateMembership={updateTeamMembership}
              onDeleteMembership={deleteTeamMembership}
              onAddRole={addRole}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsView 
              projects={projects} 
              teamMembers={teamMembers} 
              assignments={assignments}
            />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialsView 
              roles={roles} 
              onUpdateRole={updateRole}
            />
          </TabsContent>
        </Tabs>
        
        <AddProductDialog
          open={isAddProductDialogOpen}
          onOpenChange={setIsAddProductDialogOpen}
          onAddProduct={handleAddProduct}
        />
        
        <AddTeamDialog
          open={isAddTeamDialogOpen}
          onOpenChange={setIsAddTeamDialogOpen}
          onAddTeam={handleAddTeam}
          products={products}
        />
        
        <AddPersonDialog
          open={isAddMemberDialogOpen}
          onOpenChange={setIsAddMemberDialogOpen}
          onAddPerson={handleAddTeamMember}
          onAddRole={handleAddRole}
          teams={teams}
          roles={roles}
        />
      </div>
    </div>
  );
}
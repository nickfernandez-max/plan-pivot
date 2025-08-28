import { useState, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectList } from '@/components/ProjectList';
import { RoadmapView } from '@/components/RoadmapView';
import { TeamMembersView } from '@/components/TeamMembersView';
import { ReportsView } from '@/components/ReportsView';
import { AddProductDialog } from '@/components/AddProductDialog';
import { AddTeamDialog } from '@/components/AddTeamDialog';
import { toast } from 'sonner';

export default function RoadmapApp() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddTeamDialogOpen, setIsAddTeamDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('projects');
  
  const { 
    projects, 
    teamMembers, 
    teams, 
    products,
    assignments,
    memberships,
    loading, 
    error, 
    addProject, 
    updateProject, 
    addTeamMember, 
    updateTeamMember,
    addTeam,
    updateTeam,
    updateProjectAssignees,
    updateProjectAssignments,
    addProduct,
    updateProduct,
    updateProjectProducts,
    addTeamMembership,
    updateTeamMembership,
    deleteTeamMembership,
  } = useSupabaseData();

  // Generate filter options
  const teamNames = useMemo(() => {
    return Array.from(new Set(teams.map(team => team.name))).sort();
  }, [teams]);

  const productNames = useMemo(() => {
    return Array.from(new Set(products.map(product => product.name))).sort();
  }, [products]);

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
    return teamMembers.filter(member => {
      const teamMatches = selectedTeam === 'all' || teams.find(t => t.id === member.team_id)?.name === selectedTeam;
      const productMatches = selectedProduct === 'all' || 
        teams.find(t => t.id === member.team_id)?.product?.name === selectedProduct;
      return teamMatches && productMatches;
    });
  }, [teamMembers, teams, selectedTeam, selectedProduct]);

  // Event handlers for data manipulation
  const handleAddProject = async (projectData: any) => {
    try {
      const newProject = await addProject(projectData);
      toast.success('Project added successfully');
      return newProject; // Return the created project for further processing
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
      throw error;
    }
  };

  const handleUpdateProject = async (id: string, updates: any) => {
    try {
      await updateProject(id, updates);
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleAddTeamMember = async (memberData: any) => {
    try {
      await addTeamMember(memberData);
      toast.success('Team member added successfully');
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error('Failed to add team member');
    }
  };

  const handleUpdateTeamMember = async (id: string, updates: any) => {
    try {
      await updateTeamMember(id, updates);
      toast.success('Team member updated successfully');
    } catch (error) {
      console.error('Error updating team member:', error);
      toast.error('Failed to update team member');
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      await addProduct(productData);
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleAddTeam = async (teamData: any) => {
    try {
      await addTeam(teamData);
      toast.success('Team added successfully');
    } catch (error) {
      console.error('Error adding team:', error);
      toast.error('Failed to add team');
    }
  };

  const handleUpdateTeam = async (id: string, updates: any) => {
    try {
      await updateTeam(id, updates);
      toast.success('Team updated successfully');
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
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
          
          <div className="flex gap-4">
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
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
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
              onUpdateProject={handleUpdateProject}
              onUpdateProjectAssignees={async (projectId: string, assigneeIds: string[]) => {
                await updateProjectAssignees(projectId, assigneeIds);
              }}
              onUpdateProjectProducts={async (projectId: string, productIds: string[]) => {
                await updateProjectProducts(projectId, productIds);
              }}
              onUpdateProjectAssignments={updateProjectAssignments}
              onAddProject={handleAddProject}
            />
          </TabsContent>

          <TabsContent value="members">
            <div className="flex gap-2 mb-6">
              <Button variant="outline" onClick={() => setIsAddTeamDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
              <Button variant="outline" onClick={() => setIsAddProductDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </div>
            
            <TeamMembersView 
              teamMembers={filteredTeamMembers} 
              teams={teams}
              products={products}
              memberships={memberships}
              onAddTeamMember={handleAddTeamMember} 
              onUpdateTeamMember={handleUpdateTeamMember}
              onAddProduct={handleAddProduct}
              onUpdateProduct={updateProduct}
              onAddTeam={handleAddTeam}
              onUpdateTeam={handleUpdateTeam}
              onAddMembership={addTeamMembership}
              onUpdateMembership={updateTeamMembership}
              onDeleteMembership={deleteTeamMembership}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsView 
              projects={projects} 
              teamMembers={teamMembers} 
              assignments={assignments}
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
      </div>
    </div>
  );
}
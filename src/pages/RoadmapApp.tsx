import { useState, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectList } from '@/components/ProjectList';
import { RoadmapView } from '@/components/RoadmapView';
import { TeamMembersView } from '@/components/TeamMembersView';
import { toast } from 'sonner';

export default function RoadmapApp() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  
  const { 
    projects, 
    teamMembers, 
    teams, 
    products,
    loading, 
    error, 
    addProject, 
    updateProject, 
    addTeamMember, 
    updateTeamMember,
    addTeam,
    updateTeam,
    updateProjectAssignees,
    addProduct,
    updateProduct,
    updateProjectProducts
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
      await addProject(projectData);
      toast.success('Project added successfully');
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Project Roadmap
          </h1>
          <p className="text-muted-foreground mt-2">
            Plan, track, and visualize your team's projects
          </p>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="projects" className="text-sm font-medium">
                Projects
              </TabsTrigger>
              <TabsTrigger value="roadmap" className="text-sm font-medium">
                Roadmap
              </TabsTrigger>
              <TabsTrigger value="members" className="text-sm font-medium">
                Team Members
              </TabsTrigger>
            </TabsList>
            
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

          <TabsContent value="projects">
            <ProjectList 
              projects={filteredProjects} 
              teams={teams}
              onAddProject={handleAddProject} 
              onUpdateProject={handleUpdateProject}
            />
          </TabsContent>

          <TabsContent value="roadmap">
            <RoadmapView 
              projects={filteredProjects} 
              teamMembers={filteredTeamMembers} 
              teams={teams}
              onUpdateProject={handleUpdateProject}
              onUpdateProjectAssignees={async (projectId: string, assigneeIds: string[]) => {
                await updateProjectAssignees(projectId, assigneeIds);
              }}
            />
          </TabsContent>

          <TabsContent value="members">
            <TeamMembersView 
              teamMembers={filteredTeamMembers} 
              teams={teams}
              products={products}
              onAddTeamMember={handleAddTeamMember} 
              onUpdateTeamMember={handleUpdateTeamMember}
              onAddProduct={handleAddProduct}
              onUpdateProduct={updateProduct}
              onAddTeam={handleAddTeam}
              onUpdateTeam={handleUpdateTeam}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
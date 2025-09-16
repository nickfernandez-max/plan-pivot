import { useMemo, useState } from 'react';
import { RoadmapView } from '@/components/RoadmapView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project, TeamMember, Team, Product, ProjectAssignment, WorkAssignment, TeamMembership } from '@/types/roadmap';
import { CheckCircle, Clock, Eye, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FuturePlanningViewProps {
  projects: Project[];
  teamMembers: TeamMember[];
  teams: Team[];
  products: Product[];
  assignments: ProjectAssignment[];
  workAssignments: WorkAssignment[];
  memberships: TeamMembership[];
  selectedTeam?: string;
  selectedProduct?: string;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignees: (projectId: string, assigneeIds: string[]) => Promise<void>;
  onUpdateProjectProducts: (projectId: string, productIds: string[]) => Promise<void>;
  onUpdateProjectAssignments: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
  onAddProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onAddWorkAssignment: (assignment: Omit<WorkAssignment, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateWorkAssignment: (id: string, updates: Partial<WorkAssignment>) => Promise<any>;
  onDeleteWorkAssignment: (id: string) => Promise<void>;
}

export function FuturePlanningView({ 
  projects, 
  teamMembers, 
  teams, 
  products, 
  assignments,
  workAssignments,
  memberships,
  selectedTeam = 'all',
  selectedProduct = 'all',
  onUpdateProject,
  onUpdateProjectAssignees,
  onUpdateProjectProducts,
  onUpdateProjectAssignments,
  onAddProject,
  onAddWorkAssignment,
  onUpdateWorkAssignment,
  onDeleteWorkAssignment
}: FuturePlanningViewProps) {
  const { toast } = useToast();
  const [publishingAll, setPublishingAll] = useState(false);

  // Get filtered tentative projects based on current filters
  const filteredTentativeProjects = useMemo(() => {
    console.log('🔍 FuturePlanning - Starting project filter process');
    console.log('🔍 Total projects received:', projects.length);
    console.log('🔍 Current filters - team:', selectedTeam, 'product:', selectedProduct);
    
    const tentativeProjects = projects.filter(project => {
      console.log('🔍 Checking project:', {
        name: project.name,
        status_visibility: project.status_visibility,
        team_id: project.team_id,
        products: project.products?.map(p => ({ id: p.id, name: p.name })) || []
      });
      return project.status_visibility === 'tentative';
    });
    
    console.log('🔍 All tentative projects found:', tentativeProjects.length);
    tentativeProjects.forEach(p => {
      const team = teams.find(t => t.id === p.team_id);
      console.log('🔍 Tentative project details:', {
        name: p.name,
        id: p.id,
        team_name: team?.name,
        team_id: p.team_id,
        products: p.products?.map(pr => pr.name) || 'No products'
      });
    });
    
    const filtered = tentativeProjects.filter(project => {
      let teamMatch = true;
      let productMatch = true;
      
      // Apply team filter
      if (selectedTeam !== 'all') {
        const team = teams.find(t => t.id === project.team_id);
        teamMatch = team && team.name === selectedTeam;
        console.log('🔍 Team filter check:', {
          project: project.name,
          selectedTeam,
          projectTeam: team?.name,
          match: teamMatch
        });
      }

      // Apply product filter
      if (selectedProduct !== 'all') {
        productMatch = project.products?.some(p => p.name === selectedProduct) || false;
        console.log('🔍 Product filter check:', {
          project: project.name,
          selectedProduct,
          projectProducts: project.products?.map(p => p.name) || [],
          match: productMatch
        });
      }

      const passes = teamMatch && productMatch;
      console.log('🔍 Final filter result for', project.name, ':', passes);
      return passes;
    });
    
    console.log('🔍 Final filtered tentative projects:', filtered.length);
    console.log('🔍 Filtered project names:', filtered.map(p => p.name));
    return filtered;
  }, [projects, selectedTeam, selectedProduct, teams]);

  // Handle publishing a single project
  const handlePublishProject = async (projectId: string) => {
    try {
      await onUpdateProject(projectId, { status_visibility: 'published' });
      toast({
        title: "Project Published",
        description: "Project is now visible on the main roadmap.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish project. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle publishing all filtered tentative projects
  const handlePublishAll = async () => {
    if (filteredTentativeProjects.length === 0) {
      toast({
        title: "No Projects",
        description: "No tentative projects to publish with current filters.",
        variant: "destructive",
      });
      return;
    }

    setPublishingAll(true);
    try {
      await Promise.all(
        filteredTentativeProjects.map(project =>
          onUpdateProject(project.id, { status_visibility: 'published' })
        )
      );
      toast({
        title: "Projects Published",
        description: `${filteredTentativeProjects.length} project(s) are now visible on the main roadmap.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish some projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPublishingAll(false);
    }
  };

  // Custom add project handler that creates tentative projects by default
  const handleAddTentativeProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    return await onAddProject({
      ...projectData,
      status_visibility: 'tentative'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with publish controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Future Planning</CardTitle>
              <p className="text-muted-foreground">
                Plan tentative projects and publish them when ready
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {filteredTentativeProjects.length} tentative projects
              </Badge>
              {filteredTentativeProjects.length > 0 && (
                <Button 
                  onClick={handlePublishAll}
                  disabled={publishingAll}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {publishingAll ? 'Publishing...' : `Publish All (${filteredTentativeProjects.length})`}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary/60 border-2 border-primary/80" />
              <span>Tentative projects (planning)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary border" />
              <span>Published projects</span>
            </div>
            {selectedTeam !== 'all' || selectedProduct !== 'all' ? (
              <div className="flex items-center gap-2 ml-4">
                <Filter className="h-4 w-4" />
                <span>Filtered view - only filtered projects will be published</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Roadmap View */}
      <RoadmapView
        projects={projects} // Show all projects (published + tentative)
        teamMembers={teamMembers}
        teams={teams}
        products={products}
        assignments={assignments}
        workAssignments={workAssignments}
        memberships={memberships}
        selectedTeam={selectedTeam}
        selectedProduct={selectedProduct}
        onUpdateProject={onUpdateProject}
        onUpdateProjectAssignees={onUpdateProjectAssignees}
        onUpdateProjectProducts={onUpdateProjectProducts}
        onUpdateProjectAssignments={onUpdateProjectAssignments}
        onAddProject={handleAddTentativeProject}
        onAddWorkAssignment={onAddWorkAssignment}
        onUpdateWorkAssignment={onUpdateWorkAssignment}
        onDeleteWorkAssignment={onDeleteWorkAssignment}
        isFuturePlanning={true}
        onPublishProject={handlePublishProject}
      />
    </div>
  );
}
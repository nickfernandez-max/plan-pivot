import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectList } from '@/components/ProjectList';

import { Project, TeamMember } from '@/types/roadmap';
import { useSupabaseData } from '@/hooks/useSupabaseData';

export function RoadmapApp() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const { 
    projects, 
    teamMembers, 
    teams, 
    loading, 
    error, 
    addProject, 
    updateProject, 
    addTeamMember, 
    updateTeamMember,
    updateProjectAssignees
  } = useSupabaseData();

  // Get unique team names for filter
  const teamNames = useMemo(() => {
    return teams.map(t => t.name).sort();
  }, [teams]);

  // Filter projects and team members based on selected team
  const filteredProjects = useMemo(() => {
    if (selectedTeam === 'all') return projects;
    return projects.filter(p => p.team?.name === selectedTeam);
  }, [projects, selectedTeam]);

  const filteredTeamMembers = useMemo(() => {
    if (selectedTeam === 'all') return teamMembers;
    return teamMembers.filter(m => m.team?.name === selectedTeam);
  }, [teamMembers, selectedTeam]);

  const handleAddProject = async (newProject: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await addProject(newProject);
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await updateProject(id, updates);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const handleAddTeamMember = async (newMember: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await addTeamMember(newMember);
    } catch (err) {
      console.error('Error adding team member:', err);
    }
  };

  const handleUpdateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      await updateTeamMember(id, updates);
    } catch (err) {
      console.error('Error updating team member:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading roadmap data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading data: {error}</p>
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
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="projects" className="text-sm font-medium">
                Project List
              </TabsTrigger>
              <TabsTrigger value="roadmap" className="text-sm font-medium">
                Roadmap View
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Filter by team:</span>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teamNames.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="projects" className="space-y-6">
            <ProjectList
              projects={filteredProjects}
              teams={teams}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
            />
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Roadmap view is being updated for the new database structure.</p>
              <p className="text-sm text-muted-foreground">Use the Project List view to manage your projects.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
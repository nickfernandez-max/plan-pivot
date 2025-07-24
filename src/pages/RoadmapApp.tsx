import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectList } from '@/components/ProjectList';
import { RoadmapView } from '@/components/RoadmapView';
import { Project } from '@/types/roadmap';

export function RoadmapApp() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Mobile App Redesign',
      team: 'Design Team',
      startDate: '2024-08-01',
      endDate: '2024-10-15',
      valueScore: 85,
      isRD: false,
      assignees: ['Sarah Johnson', 'Mike Chen']
    },
    {
      id: '2',
      name: 'AI Integration Research',
      team: 'R&D Team',
      startDate: '2024-07-15',
      endDate: '2024-12-01',
      valueScore: 95,
      isRD: true,
      assignees: ['Dr. Emily Watson', 'Alex Rodriguez']
    },
    {
      id: '3',
      name: 'API Performance Optimization',
      team: 'Backend Team',
      startDate: '2024-09-01',
      endDate: '2024-11-30',
      valueScore: 70,
      isRD: false,
      assignees: ['John Smith', 'Lisa Park']
    }
  ]);

  // Get unique teams for filter
  const teams = useMemo(() => {
    const allTeams = [...new Set(projects.map(p => p.team))].sort();
    return allTeams;
  }, [projects]);

  // Filter projects based on selected team
  const filteredProjects = useMemo(() => {
    if (selectedTeam === 'all') return projects;
    return projects.filter(p => p.team === selectedTeam);
  }, [projects, selectedTeam]);

  const handleAddProject = (newProject: Omit<Project, 'id'>) => {
    const project: Project = {
      ...newProject,
      id: Date.now().toString()
    };
    setProjects(prev => [...prev, project]);
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project => 
      project.id === id ? { ...project, ...updates } : project
    ));
  };

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
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="projects" className="space-y-6">
            <ProjectList
              projects={filteredProjects}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
            />
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <RoadmapView
              projects={filteredProjects}
              onUpdateProject={handleUpdateProject}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
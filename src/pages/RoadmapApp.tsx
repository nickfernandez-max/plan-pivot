import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectList } from '@/components/ProjectList';
import { RoadmapView } from '@/components/RoadmapView';
import { Project, TeamMember } from '@/types/roadmap';

export function RoadmapApp() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Mobile App Redesign',
      team: 'Design Team',
      startDate: '2024-08-01',
      endDate: '2024-10-15',
      valueScore: 8,
      isRD: false,
      assignees: ['Sarah Johnson', 'Mike Chen']
    },
    {
      id: '2',
      name: 'AI Integration Research',
      team: 'R&D Team',
      startDate: '2024-07-15',
      endDate: '2024-12-01',
      valueScore: 9,
      isRD: true,
      assignees: ['Dr. Emily Watson', 'Alex Rodriguez']
    },
    {
      id: '3',
      name: 'API Performance Optimization',
      team: 'Backend Team',
      startDate: '2024-09-01',
      endDate: '2024-11-30',
      valueScore: 7,
      isRD: false,
      assignees: ['John Smith', 'Lisa Park']
    }
  ]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      team: 'Design Team',
      role: 'Senior Designer',
      startDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Mike Chen',
      team: 'Design Team',
      role: 'UX Designer',
      startDate: '2024-03-01'
    },
    {
      id: '3',
      name: 'Dr. Emily Watson',
      team: 'R&D Team',
      role: 'Research Lead',
      startDate: '2024-01-01'
    },
    {
      id: '4',
      name: 'Alex Rodriguez',
      team: 'R&D Team',
      role: 'ML Engineer',
      startDate: '2024-02-15'
    },
    {
      id: '5',
      name: 'John Smith',
      team: 'Backend Team',
      role: 'Senior Developer',
      startDate: '2024-01-10'
    },
    {
      id: '6',
      name: 'Lisa Park',
      team: 'Backend Team',
      role: 'DevOps Engineer',
      startDate: '2024-04-01'
    },
    {
      id: '7',
      name: 'David Kim',
      team: 'Design Team',
      role: 'Product Designer',
      startDate: '2024-05-15'
    }
  ]);

  // Get unique teams for filter
  const teams = useMemo(() => {
    const projectTeams = projects.map(p => p.team);
    const memberTeams = teamMembers.map(m => m.team);
    const allTeams = [...new Set([...projectTeams, ...memberTeams])].sort();
    return allTeams;
  }, [projects, teamMembers]);

  // Filter projects and team members based on selected team
  const filteredProjects = useMemo(() => {
    if (selectedTeam === 'all') return projects;
    return projects.filter(p => p.team === selectedTeam);
  }, [projects, selectedTeam]);

  const filteredTeamMembers = useMemo(() => {
    if (selectedTeam === 'all') return teamMembers;
    return teamMembers.filter(m => m.team === selectedTeam);
  }, [teamMembers, selectedTeam]);

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

  const handleAddTeamMember = (newMember: Omit<TeamMember, 'id'>) => {
    const member: TeamMember = {
      ...newMember,
      id: Date.now().toString()
    };
    setTeamMembers(prev => [...prev, member]);
  };

  const handleUpdateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(member => 
      member.id === id ? { ...member, ...updates } : member
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
              teamMembers={filteredTeamMembers}
              onUpdateProject={handleUpdateProject}
              onAddTeamMember={handleAddTeamMember}
              onUpdateTeamMember={handleUpdateTeamMember}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
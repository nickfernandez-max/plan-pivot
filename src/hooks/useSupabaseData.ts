import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, TeamMember, Team } from '@/types/roadmap';

export const useSupabaseData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch team members with their teams
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          *,
          team:teams(*)
        `)
        .order('name');

      if (teamMembersError) throw teamMembersError;

      // Fetch projects with teams and assignees
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          team:teams(*),
          assignees:project_assignees(
            team_member:team_members(*)
          )
        `)
        .order('start_date');

      if (projectsError) throw projectsError;

      // Transform the data to match our interface
      const transformedProjects = projectsData?.map(project => ({
        ...project,
        assignees: project.assignees?.map(assignee => assignee.team_member).filter(Boolean) || []
      })) || [];

      setTeams(teamsData || []);
      setTeamMembers(teamMembersData || []);
      setProjects(transformedProjects);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (newProject: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select(`
          *,
          team:teams(*),
          assignees:project_assignees(
            team_member:team_members(*)
          )
        `)
        .single();

      if (error) throw error;

      const transformedProject = {
        ...data,
        assignees: data.assignees?.map(assignee => assignee.team_member).filter(Boolean) || []
      };

      setProjects(prev => [...prev, transformedProject]);
      return transformedProject;
    } catch (err) {
      console.error('Error adding project:', err);
      throw err;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          team:teams(*),
          assignees:project_assignees(
            team_member:team_members(*)
          )
        `)
        .single();

      if (error) throw error;

      const transformedProject = {
        ...data,
        assignees: data.assignees?.map(assignee => assignee.team_member).filter(Boolean) || []
      };

      setProjects(prev => prev.map(p => p.id === id ? transformedProject : p));
      return transformedProject;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  const addTeamMember = async (newMember: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert(newMember)
        .select(`
          *,
          team:teams(*)
        `)
        .single();

      if (error) throw error;

      setTeamMembers(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding team member:', err);
      throw err;
    }
  };

  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          team:teams(*)
        `)
        .single();

      if (error) throw error;

      setTeamMembers(prev => prev.map(m => m.id === id ? data : m));
      return data;
    } catch (err) {
      console.error('Error updating team member:', err);
      throw err;
    }
  };

  const updateProjectAssignees = async (projectId: string, assigneeIds: string[]) => {
    try {
      // First, remove all existing assignees for this project
      await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', projectId);

      // Then add the new assignees
      if (assigneeIds.length > 0) {
        const { error } = await supabase
          .from('project_assignees')
          .insert(
            assigneeIds.map(memberId => ({
              project_id: projectId,
              team_member_id: memberId
            }))
          );

        if (error) throw error;
      }

      // Refresh the project data
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          team:teams(*),
          assignees:project_assignees(
            team_member:team_members(*)
          )
        `)
        .eq('id', projectId)
        .single();

      if (fetchError) throw fetchError;

      const transformedProject = {
        ...data,
        assignees: data.assignees?.map(assignee => assignee.team_member).filter(Boolean) || []
      };

      setProjects(prev => prev.map(p => p.id === projectId ? transformedProject : p));
      return transformedProject;
    } catch (err) {
      console.error('Error updating project assignees:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchData();
      })
      .subscribe();

    const teamMembersSubscription = supabase
      .channel('team-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        fetchData();
      })
      .subscribe();

    const assigneesSubscription = supabase
      .channel('project-assignees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignees' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(teamMembersSubscription);
      supabase.removeChannel(assigneesSubscription);
    };
  }, []);

  return {
    projects,
    teamMembers,
    teams,
    loading,
    error,
    addProject,
    updateProject,
    addTeamMember,
    updateTeamMember,
    updateProjectAssignees,
    refetch: fetchData
  };
};
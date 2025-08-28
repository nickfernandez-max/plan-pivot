import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, TeamMember, Team, Product, ProjectAssignment, TeamMembership } from '@/types/roadmap';

export function useSupabaseData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting data fetch...');

      // Fetch products
      console.log('Fetching products...');
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) {
        console.error('Products error:', productsError);
        throw productsError;
      }
      console.log('Products fetched:', productsData?.length || 0);

      // Fetch teams with their products
      console.log('Fetching teams...');
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          product:products(*)
        `)
        .order('name');

      if (teamsError) {
        console.error('Teams error:', teamsError);
        throw teamsError;
      }
      console.log('Teams fetched:', teamsData?.length || 0);

      // Fetch team members with their teams
      console.log('Fetching team members...');
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          *,
          team:teams(*)
        `)
        .order('name');

      if (teamMembersError) {
        console.error('Team members error:', teamMembersError);
        throw teamMembersError;
      }
      console.log('Team members fetched:', teamMembersData?.length || 0);

      // Fetch projects with teams, assignees, and products
      console.log('Fetching projects...');
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          team:teams(*, product:products(*)),
          assignees:project_assignees(team_member:team_members(*)),
          products:project_products(product:products(*))
        `)
        .order('start_date');

      if (projectsError) {
        console.error('Projects error:', projectsError);
        throw projectsError;
      }
      console.log('Projects fetched:', projectsData?.length || 0);

      // Fetch project assignments with allocations
      console.log('Fetching project assignments...');
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignees')
        .select('*');

      if (assignmentsError) {
        console.error('Assignments error:', assignmentsError);
        throw assignmentsError;
      }
      console.log('Assignments fetched:', assignmentsData?.length || 0);

      // Fetch team memberships
      console.log('Fetching team memberships...');
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('team_memberships')
        .select('*')
        .order('start_month');
      if (membershipsError) {
        console.error('Team memberships error:', membershipsError);
        throw membershipsError;
      }
      console.log('Team memberships fetched:', membershipsData?.length || 0);

      // Transform the data to match our interface
      const transformedProjects = projectsData?.map(project => ({
        ...project,
        assignees: project.assignees?.map((a: any) => a.team_member) || [],
        products: project.products?.map((p: any) => p.product) || []
      })) || [];

      setProducts(productsData || []);
      setTeams(teamsData || []);
      setTeamMembers(teamMembersData || []);
      setProjects(transformedProjects);
      setAssignments(assignmentsData || []);
      setMemberships(membershipsData || []);
      console.log('Data fetch completed successfully');
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error details:', {
        message: errorMessage,
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(errorMessage);
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

  const addProduct = async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      throw error;
    }

    setProducts(prev => [...prev, data]);
    return data;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }

    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, ...updates } : product
    ));
    return data;
  };

  const addTeam = async (newTeam: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert(newTeam)
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (error) throw error;

      setTeams(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding team:', err);
      throw err;
    }
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (error) throw error;

      setTeams(prev => prev.map(t => t.id === id ? data : t));
      return data;
    } catch (err) {
      console.error('Error updating team:', err);
      throw err;
    }
  };

  const updateProjectProducts = async (projectId: string, productIds: string[]) => {
    // Delete existing product assignments
    const { error: deleteError } = await supabase
      .from('project_products')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting project products:', deleteError);
      throw deleteError;
    }

    // Insert new product assignments
    if (productIds.length > 0) {
      const { error: insertError } = await supabase
        .from('project_products')
        .insert(
          productIds.map(productId => ({
            project_id: projectId,
            product_id: productId,
          }))
        );

      if (insertError) {
        console.error('Error inserting project products:', insertError);
        throw insertError;
      }
    }

    // Refetch the updated project
    await fetchData();
    
    return await supabase
      .from('projects')
      .select(`
        *,
        team:teams(*, product:products(*)),
        assignees:project_assignees(team_member:team_members(*)),
        products:project_products(product:products(*))
      `)
      .eq('id', projectId)
      .single();
  };

  const updateProjectAssignees = async (projectId: string, assigneeIds: string[]) => {
    try {
      // Delete existing assignees for this project
      const { error: deleteError } = await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('Error deleting project assignees:', deleteError);
        throw deleteError;
      }

      // Insert new assignees
      if (assigneeIds.length > 0) {
        const { error: insertError } = await supabase
          .from('project_assignees')
          .insert(
            assigneeIds.map(memberId => ({
              project_id: projectId,
              team_member_id: memberId,
            }))
          );

        if (insertError) {
          console.error('Error inserting project assignees:', insertError);
          throw insertError;
        }
      }

      // Refetch the updated project
      await fetchData();
      
      return await supabase
        .from('projects')
        .select(`
          *,
          team:teams(*, product:products(*)),
          assignees:project_assignees(team_member:team_members(*)),
          products:project_products(product:products(*))
        `)
        .eq('id', projectId)
        .single();
    } catch (err) {
      console.error('Error updating project assignees:', err);
      throw err;
    }
  };

  const updateProjectAssignments = async (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => {
    try {
      // Get project dates for fallback
      const project = projects.find(p => p.id === projectId);
      const fallbackStartDate = project?.start_date;
      const fallbackEndDate = project?.end_date;
      
      // Delete existing assignments for this project
      const { error: deleteError } = await supabase
        .from('project_assignees')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('Error deleting project assignments:', deleteError);
        throw deleteError;
      }

      // Insert new assignments with allocations and dates (with fallbacks)
      if (assignments.length > 0) {
        const { error: insertError } = await supabase
          .from('project_assignees')
          .insert(
            assignments.map(assignment => ({
              project_id: projectId,
              team_member_id: assignment.teamMemberId,
              percent_allocation: assignment.percentAllocation,
              start_date: assignment.startDate || fallbackStartDate,
              end_date: assignment.endDate || fallbackEndDate,
            }))
          );

        if (insertError) {
          console.error('Error inserting project assignments:', insertError);
          throw insertError;
        }
      }

      // Refetch data to update UI
      await fetchData();
    } catch (err) {
      console.error('Error updating project assignments:', err);
      throw err;
    }
  };

  // Team memberships CRUD
  const addTeamMembership = async (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => {
    // Ensure month truncation client-side
    const payload = {
      ...membership,
      start_month: new Date(membership.start_month).toISOString().split('T')[0],
      end_month: membership.end_month ? new Date(membership.end_month).toISOString().split('T')[0] : null,
    };

    // Check for overlapping memberships and end them automatically
    const overlappingMemberships = memberships.filter(m => 
      m.team_member_id === membership.team_member_id &&
      m.team_id !== membership.team_id &&
      (!m.end_month || new Date(m.end_month) >= new Date(payload.start_month))
    );

    // End overlapping memberships by setting their end_month to one month before the new start
    for (const overlapping of overlappingMemberships) {
      const newEndDate = new Date(payload.start_month);
      newEndDate.setMonth(newEndDate.getMonth() - 1);
      const endMonth = newEndDate.toISOString().split('T')[0];
      
      await updateTeamMembership(overlapping.id, { end_month: endMonth });
    }

    const { data, error } = await supabase
      .from('team_memberships')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    setMemberships(prev => [...prev, data]);
    return data;
  };

  const updateTeamMembership = async (id: string, updates: Partial<TeamMembership>) => {
    const payload: any = { ...updates };
    if (payload.start_month) payload.start_month = new Date(payload.start_month).toISOString().split('T')[0];
    if (payload.end_month !== undefined) payload.end_month = payload.end_month ? new Date(payload.end_month).toISOString().split('T')[0] : null;

    const { data, error } = await supabase
      .from('team_memberships')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    setMemberships(prev => prev.map(m => m.id === id ? data : m));
    return data;
  };

  const deleteTeamMembership = async (id: string) => {
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setMemberships(prev => prev.filter(m => m.id !== id));
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

    const membershipsSubscription = supabase
      .channel('team-memberships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_memberships' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(teamMembersSubscription);
      supabase.removeChannel(assigneesSubscription);
      supabase.removeChannel(membershipsSubscription);
    };
  }, []);

  return {
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
    refetch: fetchData,
  };
};
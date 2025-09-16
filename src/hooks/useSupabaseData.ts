import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, TeamMember, Team, Product, ProjectAssignment, TeamMembership, Role, WorkAssignment, TeamIdealSize } from '@/types/roadmap';
import { toast } from 'sonner';

export function useSupabaseData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [teamIdealSizes, setTeamIdealSizes] = useState<TeamIdealSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (includeArchived = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting data fetch...');

      // Fetch roles
      console.log('Fetching roles...');
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (rolesError) {
        console.error('Roles error:', rolesError);
        throw rolesError;
      }
      console.log('Roles fetched:', rolesData?.length || 0);

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

      // Fetch teams (with optional archived filtering)
      console.log('Fetching teams...');
      let teamsQuery = supabase
        .from('teams')
        .select('*, product:products(*)')
        .order('name');
      
      if (!includeArchived) {
        teamsQuery = teamsQuery.eq('archived', false);
      }

      const { data: teamsData, error: teamsError } = await teamsQuery;

      if (teamsError) {
        console.error('Teams error:', teamsError);
        throw teamsError;
      }
      console.log('Teams fetched:', teamsData?.length || 0);

      // Fetch team members with relationships
      console.log('Fetching team members...');
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('*, team:teams(*, product:products(*)), role:roles(*)')
        .order('name');

      if (teamMembersError) {
        console.error('Team members error:', teamMembersError);
        throw teamMembersError;
      }
      console.log('Team members fetched:', teamMembersData?.length || 0);
      console.log('Sample team member structure:', teamMembersData?.[0]);

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
        console.error('Memberships error:', membershipsError);
        throw membershipsError;
      }
      console.log('Memberships fetched:', membershipsData?.length || 0);

      // Fetch work assignments
      console.log('Fetching work assignments...');
      const { data: workAssignmentsData, error: workAssignmentsError } = await supabase
        .from('work_assignments')
        .select('*')
        .order('start_date');

      if (workAssignmentsError) {
        console.error('Work assignments error:', workAssignmentsError);
        throw workAssignmentsError;
      }
      console.log('Work assignments fetched:', workAssignmentsData?.length || 0);

      // Fetch team ideal sizes
      console.log('Fetching team ideal sizes...');
      const { data: teamIdealSizesData, error: teamIdealSizesError } = await supabase
        .from('team_ideal_sizes')
        .select('*')
        .order('start_month');

      if (teamIdealSizesError) {
        console.error('Team ideal sizes error:', teamIdealSizesError);
        throw teamIdealSizesError;
      }
      console.log('Team ideal sizes fetched:', teamIdealSizesData?.length || 0);

      // Transform the data to match our interface
      const transformedProjects = projectsData?.map(project => ({
        ...project,
        assignees: project.assignees?.map((a: any) => a.team_member) || [],
        products: project.products?.map((p: any) => p.product) || []
      })) || [];

      setProducts(productsData || []);
      setRoles(rolesData || []);
      setTeams(teamsData || []);
      setTeamMembers(teamMembersData || []);
      setProjects(transformedProjects);
      setAssignments(assignmentsData || []);
      setMemberships(membershipsData || []);
      setWorkAssignments((workAssignmentsData || []) as WorkAssignment[]);
      setTeamIdealSizes(teamIdealSizesData || []);
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

  // Project CRUD operations
  const addProject = async (newProject: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select(`
          *,
          team:teams(*, product:products(*)),
          assignees:project_assignees(team_member:team_members(*)),
          products:project_products(product:products(*))
        `)
        .single();

      if (error) throw error;

      const transformedProject = {
        ...data,
        assignees: data.assignees?.map((assignee: any) => assignee.team_member).filter(Boolean) || [],
        products: data.products?.map((p: any) => p.product).filter(Boolean) || []
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
          team:teams(*, product:products(*)),
          assignees:project_assignees(team_member:team_members(*)),
          products:project_products(product:products(*))
        `)
        .single();

      if (error) throw error;

      const transformedProject = {
        ...data,
        assignees: data.assignees?.map((assignee: any) => assignee.team_member).filter(Boolean) || [],
        products: data.products?.map((p: any) => p.product).filter(Boolean) || []
      };

      setProjects(prev => prev.map(p => p.id === id ? transformedProject : p));
      return transformedProject;
    } catch (err) {
      console.error('Error updating project:', err);
      throw err;
    }
  };

  // Team member CRUD operations
  const addTeamMember = async (newMember: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert(newMember)
        .select('*, team:teams(*, product:products(*)), role:roles(*)')
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
        .select('*, team:teams(*, product:products(*)), role:roles(*)')
        .single();

      if (error) throw error;
      setTeamMembers(prev => prev.map(m => m.id === id ? data : m));
      return data;
    } catch (err) {
      console.error('Error updating team member:', err);
      throw err;
    }
  };

  // Product CRUD operations
  const addProduct = async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select('*')
      .single();

    if (error) throw error;
    setProducts(prev => [...prev, data]);
    return data;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === id ? data : p));
    await fetchData();
    return data;
  };

  // Role CRUD operations
  const addRole = async (newRole: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('roles')
      .insert(newRole)
      .select('*')
      .single();

    if (error) throw error;
    setRoles(prev => [...prev, data]);
    return data;
  };

  const updateRole = async (id: string, updates: Partial<Role>) => {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    setRoles(prev => prev.map(r => r.id === id ? data : r));
    await fetchData();
    return data;
  };

  // Team CRUD operations
  const addTeam = async (newTeam: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        ...newTeam,
        product_id: newTeam.product_id || null
      })
      .select('*, product:products(*)')
      .single();

    if (error) throw error;
    setTeams(prev => [...prev, data]);
    return data;
  };

  const updateTeam = async (id: string, updates: Partial<Team>) => {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select('*, product:products(*)')
      .single();

    if (error) throw error;
    setTeams(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const archiveTeam = async (id: string) => {
    const { data, error } = await supabase
      .from('teams')
      .update({ archived: true })
      .eq('id', id)
      .select('*, product:products(*)')
      .single();

    if (error) throw error;
    setTeams(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const unarchiveTeam = async (id: string) => {
    const { data, error } = await supabase
      .from('teams')
      .update({ archived: false })
      .eq('id', id)
      .select('*, product:products(*)')
      .single();

    if (error) throw error;
    setTeams(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  // Project-related operations
  const updateProjectProducts = async (projectId: string, productIds: string[]) => {
    await supabase.from('project_products').delete().eq('project_id', projectId);
    
    if (productIds.length > 0) {
      const inserts = productIds.map(productId => ({ project_id: projectId, product_id: productId }));
      const { error } = await supabase.from('project_products').insert(inserts);
      if (error) throw error;
    }
    
    await fetchData();
  };

  const updateProjectAssignees = async (projectId: string, assigneeIds: string[]) => {
    await supabase.from('project_assignees').delete().eq('project_id', projectId);
    
    if (assigneeIds.length > 0) {
      const inserts = assigneeIds.map(assigneeId => ({ 
        project_id: projectId, 
        team_member_id: assigneeId,
        percent_allocation: 100
      }));
      const { error } = await supabase.from('project_assignees').insert(inserts);
      if (error) throw error;
    }
    
    await fetchData();
  };

  const updateProjectAssignments = async (
    projectId: string, 
    assignments: Array<{ 
      team_member_id: string; 
      percent_allocation: number; 
      start_date?: string; 
      end_date?: string; 
    }>
  ) => {
    try {
      await supabase.from('project_assignees').delete().eq('project_id', projectId);
      
      if (assignments.length > 0) {
        const inserts = assignments.map(assignment => ({
          project_id: projectId,
          ...assignment
        }));
        const { error } = await supabase.from('project_assignees').insert(inserts);
        if (error) throw error;
      }
      
      const [assignmentsResult, projectResult] = await Promise.all([
        supabase
          .from('project_assignees')
          .select('*')
          .eq('project_id', projectId),
        supabase
          .from('projects')
          .select(`
            *,
            team:teams(*, product:products(*)),
            assignees:project_assignees(team_member:team_members(*)),
            products:project_products(product:products(*))
          `)
          .eq('id', projectId)
          .single()
      ]);
      
      if (assignmentsResult.data) {
        setAssignments(prev => [
          ...prev.filter(a => a.project_id !== projectId),
          ...assignmentsResult.data
        ]);
      }

      if (projectResult.data) {
        const transformedProject = {
          ...projectResult.data,
          assignees: projectResult.data.assignees?.map((a: any) => a.team_member) || [],
          products: projectResult.data.products?.map((p: any) => p.product) || []
        };
        
        setProjects(prev => prev.map(p => p.id === projectId ? transformedProject : p));
      }
    } catch (err) {
      console.error('Error updating project assignments:', err);
      throw err;
    }
  };

  // Team memberships CRUD
  const addTeamMembership = async (membership: Omit<TeamMembership, 'id' | 'created_at' | 'updated_at'>) => {
    const payload = {
      ...membership,
      start_month: new Date(membership.start_month).toISOString().split('T')[0],
      end_month: membership.end_month ? new Date(membership.end_month).toISOString().split('T')[0] : null,
    };

    const overlappingMemberships = memberships.filter(m => 
      m.team_member_id === membership.team_member_id &&
      m.team_id !== membership.team_id &&
      (!m.end_month || new Date(m.end_month) >= new Date(payload.start_month))
    );

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

  // Work assignments CRUD
  const addWorkAssignment = async (assignment: Omit<WorkAssignment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('work_assignments')
        .insert(assignment)
        .select('*')
        .single();
      
      if (error) throw error;
      
      setWorkAssignments(prev => [...prev, data as WorkAssignment]);
      return data;
    } catch (err) {
      console.error('Error adding work assignment:', err);
      throw err;
    }
  };

  const updateWorkAssignment = async (id: string, updates: Partial<WorkAssignment>) => {
    try {
      const { data, error } = await supabase
        .from('work_assignments')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      setWorkAssignments(prev => prev.map(w => w.id === id ? data as WorkAssignment : w));
      return data;
    } catch (err) {
      console.error('Error updating work assignment:', err);
      throw err;
    }
  };

  const deleteWorkAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setWorkAssignments(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Error deleting work assignment:', err);
      throw err;
    }
  };

  // Team ideal size CRUD operations
  const addTeamIdealSize = async (idealSize: Omit<TeamIdealSize, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('team_ideal_sizes')
      .insert(idealSize);

    if (error) throw error;
    await fetchData();
  };

  const updateTeamIdealSize = async (id: string, updates: Partial<TeamIdealSize>) => {
    const { error } = await supabase
      .from('team_ideal_sizes')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  const deleteTeamIdealSize = async (id: string) => {
    const { error } = await supabase
      .from('team_ideal_sizes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchData();
  };

  // Real-time subscriptions
  useEffect(() => {
    fetchData();
    
    let subscriptions: any[] = [];
    
    try {
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
        .channel('assignees-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignees' }, () => {
          fetchData();
        })
        .subscribe();

      const membershipsSubscription = supabase
        .channel('memberships-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_memberships' }, () => {
          fetchData();
        })
        .subscribe();

      const workAssignmentsSubscription = supabase
        .channel('work-assignments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_assignments' }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'team_ideal_sizes' }, () => {
          fetchData();
        })
        .subscribe();

      subscriptions = [projectsSubscription, teamMembersSubscription, assigneesSubscription, membershipsSubscription, workAssignmentsSubscription];
    } catch (error) {
      console.warn('Real-time subscriptions could not be established:', error);
    }

    return () => {
      subscriptions.forEach(subscription => {
        try {
          supabase.removeChannel(subscription);
        } catch (error) {
          console.warn('Error removing subscription:', error);
        }
      });
    };
  }, []);

  return {
    projects,
    teamMembers,
    teams,
    products,
    roles,
    assignments,
    memberships,
    workAssignments,
    teamIdealSizes,
    loading,
    error,
    addProject,
    updateProject,
    addTeamMember,
    updateTeamMember,
    addRole,
    updateRole,
    addTeam,
    updateTeam,
    archiveTeam,
    unarchiveTeam,
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
    addTeamIdealSize,
    updateTeamIdealSize,
    deleteTeamIdealSize,
    refetch: fetchData,
  };
};
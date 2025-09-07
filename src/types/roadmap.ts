export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  product_id?: string;
  ideal_size?: number;
  created_at?: string;
  updated_at?: string;
  product?: Product;
}

export type ProjectStatus = 'Logged' | 'Planned' | 'In Progress' | 'Blocked' | 'On Hold' | 'Complete';

export interface Project {
  id: string;
  name: string;
  team_id: string;
  start_date: string;
  end_date: string;
  value_score: number;
  is_rd: boolean;
  status: ProjectStatus;
  color?: string;
  description?: string;
  link?: string;
  created_at?: string;
  updated_at?: string;
  team?: Team;
  products?: Product[];
  assignees?: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role_id: string;
  team_id: string;
  start_date: string;
  created_at?: string;
  updated_at?: string;
  team?: Team;
  role?: Role;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  team_member_id: string;
  percent_allocation: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface TeamMembership {
  id: string;
  team_member_id: string;
  team_id: string;
  start_month: string; // YYYY-MM-01
  end_month?: string | null; // YYYY-MM-01 or null for ongoing
  created_at?: string;
  updated_at?: string;
}

export interface WorkAssignment {
  id: string;
  name: string;
  description?: string;
  team_member_id: string;
  type: 'support' | 'queue_work' | 'other';
  percent_allocation: number;
  start_date: string;
  end_date: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export type SortField = keyof Omit<Project, 'id' | 'assignees' | 'color' | 'created_at' | 'updated_at' | 'description'> | 'team';
export type SortDirection = 'asc' | 'desc';
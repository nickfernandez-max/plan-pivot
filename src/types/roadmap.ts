export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  team_id: string;
  start_date: string;
  end_date: string;
  value_score: number;
  is_rd: boolean;
  color?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  team?: Team;
  assignees?: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  team_id: string;
  start_date: string;
  created_at?: string;
  updated_at?: string;
  team?: Team;
}

export type SortField = keyof Omit<Project, 'id' | 'assignees' | 'color' | 'created_at' | 'updated_at' | 'description'> | 'team';
export type SortDirection = 'asc' | 'desc';
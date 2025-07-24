export interface Project {
  id: string;
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  valueScore: number;
  isRD: boolean;
  assignees: string[];
  color?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

export type SortField = keyof Omit<Project, 'id' | 'assignees' | 'color'>;
export type SortDirection = 'asc' | 'desc';
import { Project, ProjectAssignment, TeamMember } from '@/types/roadmap';

export interface DateConflictInfo {
  type: 'project_date_change' | 'assignment_date_change' | 'assignment_outside_project';
  projectName: string;
  projectDates: { start: string; end: string };
  assignmentDates?: { start: string; end: string };
  affectedAssignments?: Array<{
    memberName: string;
    currentDates: { start: string; end: string };
  }>;
}

export interface DateConflictAction {
  id: string;
  label: string;
  description: string;
  variant: 'default' | 'destructive' | 'outline';
}

export interface DateValidationResult {
  isValid: boolean;
  conflicts: DateConflictInfo[];
}

export interface AssignmentWithMember extends ProjectAssignment {
  member?: TeamMember;
}

/**
 * Validates if assignment dates are within project date boundaries
 */
export function validateAssignmentDates(
  assignmentStart: string,
  assignmentEnd: string,
  projectStart: string,
  projectEnd: string
): boolean {
  const asStart = new Date(assignmentStart);
  const asEnd = new Date(assignmentEnd);
  const projStart = new Date(projectStart);
  const projEnd = new Date(projectEnd);

  return asStart >= projStart && asEnd <= projEnd;
}

/**
 * Checks for conflicts when changing project dates
 */
export function checkProjectDateConflicts(
  project: Project,
  newStartDate: string,
  newEndDate: string,
  assignments: AssignmentWithMember[]
): DateConflictInfo | null {
  const projectAssignments = assignments.filter(a => a.project_id === project.id);
  
  if (projectAssignments.length === 0) {
    return null;
  }

  // Find assignments that would be affected by the date change
  const affectedAssignments = projectAssignments.filter(assignment => {
    if (!assignment.start_date || !assignment.end_date) return false;
    
    // Check if assignment dates match current project dates (auto-managed)
    const assignmentMatchesProject = (
      assignment.start_date === project.start_date &&
      assignment.end_date === project.end_date
    );

    // Check if assignment dates would be outside new project boundaries
    const wouldBeOutside = !validateAssignmentDates(
      assignment.start_date,
      assignment.end_date,
      newStartDate,
      newEndDate
    );

    return assignmentMatchesProject || wouldBeOutside;
  });

  if (affectedAssignments.length === 0) {
    return null;
  }

  return {
    type: 'project_date_change',
    projectName: project.name,
    projectDates: { start: newStartDate, end: newEndDate },
    affectedAssignments: affectedAssignments.map(assignment => ({
      memberName: assignment.member?.name || 'Unknown Member',
      currentDates: {
        start: assignment.start_date || project.start_date,
        end: assignment.end_date || project.end_date
      }
    }))
  };
}

/**
 * Checks for conflicts when changing assignment dates
 */
export function checkAssignmentDateConflicts(
  project: Project,
  assignmentStart: string,
  assignmentEnd: string
): DateConflictInfo | null {
  const isOutside = !validateAssignmentDates(
    assignmentStart,
    assignmentEnd,
    project.start_date,
    project.end_date
  );

  if (!isOutside) {
    return null;
  }

  return {
    type: 'assignment_outside_project',
    projectName: project.name,
    projectDates: { start: project.start_date, end: project.end_date },
    assignmentDates: { start: assignmentStart, end: assignmentEnd }
  };
}

/**
 * Gets suggested actions for project date conflicts
 */
export function getProjectDateConflictActions(): DateConflictAction[] {
  return [
    {
      id: 'update_assignments',
      label: 'Update All Assignments',
      description: 'Change assignment dates to match the new project timeline',
      variant: 'default'
    },
    {
      id: 'keep_custom',
      label: 'Keep Custom Dates', 
      description: 'Maintain existing assignment dates (they may extend outside project)',
      variant: 'outline'
    }
  ];
}

/**
 * Gets suggested actions for assignment date conflicts
 */
export function getAssignmentDateConflictActions(): DateConflictAction[] {
  return [
    {
      id: 'extend_project',
      label: 'Extend Project Timeline',
      description: 'Update project dates to include this assignment',
      variant: 'default'
    },
    {
      id: 'constrain_assignment',
      label: 'Constrain Assignment',
      description: 'Change assignment dates to fit within project timeline',
      variant: 'outline'
    }
  ];
}

/**
 * Calculates new project dates that would encompass all assignments
 */
export function calculateExtendedProjectDates(
  currentProject: Project,
  newAssignmentStart: string,
  newAssignmentEnd: string,
  existingAssignments: ProjectAssignment[] = []
): { start: string; end: string } {
  const allDates = [
    currentProject.start_date,
    currentProject.end_date,
    newAssignmentStart,
    newAssignmentEnd,
    ...existingAssignments.flatMap(a => [a.start_date, a.end_date].filter(Boolean))
  ].filter(Boolean).map(date => new Date(date as string));

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  return {
    start: minDate.toISOString().split('T')[0],
    end: maxDate.toISOString().split('T')[0]
  };
}

/**
 * Constrains assignment dates to fit within project boundaries
 */
export function constrainAssignmentDates(
  assignmentStart: string,
  assignmentEnd: string,
  projectStart: string,
  projectEnd: string
): { start: string; end: string } {
  const asStart = new Date(assignmentStart);
  const asEnd = new Date(assignmentEnd);
  const projStart = new Date(projectStart);
  const projEnd = new Date(projectEnd);

  const constrainedStart = asStart < projStart ? projStart : asStart;
  const constrainedEnd = asEnd > projEnd ? projEnd : asEnd;

  return {
    start: constrainedStart.toISOString().split('T')[0],
    end: constrainedEnd.toISOString().split('T')[0]
  };
}
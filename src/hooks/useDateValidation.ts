import { useState } from 'react';
import { Project, ProjectAssignment, TeamMember } from '@/types/roadmap';
import { 
  checkProjectDateConflicts, 
  checkAssignmentDateConflicts,
  getProjectDateConflictActions,
  getAssignmentDateConflictActions,
  DateConflictInfo,
  DateConflictAction,
  calculateExtendedProjectDates,
  constrainAssignmentDates
} from '@/utils/dateValidation';

interface UseDateValidationProps {
  projects?: Project[];
  assignments?: ProjectAssignment[];
  teamMembers?: TeamMember[];
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignments?: (projectId: string, assignments: any[]) => Promise<void>;
}

export function useDateValidation({
  projects = [],
  assignments = [],
  teamMembers = [],
  onUpdateProject,
  onUpdateProjectAssignments
}: UseDateValidationProps = {}) {
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflict: DateConflictInfo | null;
    actions: DateConflictAction[];
    onAction: (actionId: string) => void;
  }>({
    open: false,
    conflict: null,
    actions: [],
    onAction: () => {}
  });

  const closeConflictDialog = () => {
    setConflictDialog({
      open: false,
      conflict: null,
      actions: [],
      onAction: () => {}
    });
  };

  const handleProjectDateChange = async (
    projectId: string, 
    newStartDate: string, 
    newEndDate: string
  ): Promise<boolean> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return false;

    // Get assignments for this project with member details
    const projectAssignments = assignments
      .filter(a => a.project_id === projectId)
      .map(assignment => {
        const member = teamMembers.find(m => m.id === assignment.team_member_id);
        return {
          ...assignment,
          memberName: member?.name || 'Unknown Member',
          currentDates: {
            start: assignment.start_date || project.start_date,
            end: assignment.end_date || project.end_date
          }
        };
      });

    // Check for conflicts
    const conflict = checkProjectDateConflicts(
      project, 
      newStartDate, 
      newEndDate, 
      projectAssignments
    );

    if (conflict) {
      const actions = getProjectDateConflictActions();
      
      setConflictDialog({
        open: true,
        conflict,
        actions,
        onAction: async (actionId: string) => {
          await handleConflictResolution(
            actionId, 
            project, 
            { start_date: newStartDate, end_date: newEndDate },
            projectAssignments
          );
          closeConflictDialog();
        }
      });
      return false; // Don't proceed with the update yet
    }

    // No conflicts, proceed with update
    if (onUpdateProject) {
      await onUpdateProject(projectId, { start_date: newStartDate, end_date: newEndDate });
    }
    return true;
  };

  const handleAssignmentDateChange = async (
    projectId: string,
    assignmentStart: string,
    assignmentEnd: string
  ): Promise<{ success: boolean }> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { success: false };

    const conflict = checkAssignmentDateConflicts(project, assignmentStart, assignmentEnd);
    
    if (conflict) {
      const actions = getAssignmentDateConflictActions();
      
      setConflictDialog({
        open: true,
        conflict,
        actions,
        onAction: async (actionId: string) => {
          await handleAssignmentConflictResolution(
            actionId,
            project,
            assignmentStart,
            assignmentEnd
          );
          closeConflictDialog();
        }
      });
      return { success: false };
    }

    return { success: true };
  };

  const handleConflictResolution = async (
    actionId: string,
    project: Project,
    newDates: { start_date: string; end_date: string },
    affectedAssignments: any[]
  ) => {
    switch (actionId) {
      case 'update_assignments':
        // Update project dates and adjust assignments to match
        if (onUpdateProject) {
          await onUpdateProject(project.id, newDates);
        }
        if (onUpdateProjectAssignments && affectedAssignments.length > 0) {
          const updatedAssignments = affectedAssignments.map(assignment => ({
            teamMemberId: assignment.team_member_id,
            percentAllocation: assignment.percent_allocation,
            startDate: newDates.start_date,
            endDate: newDates.end_date
          }));
          await onUpdateProjectAssignments(project.id, updatedAssignments);
        }
        break;
        
      case 'keep_custom_dates':
        // Only update project dates, keep assignment dates as they are
        if (onUpdateProject) {
          await onUpdateProject(project.id, newDates);
        }
        break;
        
      default:
        break;
    }
  };

  const handleAssignmentConflictResolution = async (
    actionId: string,
    project: Project,
    assignmentStart: string,
    assignmentEnd: string
  ) => {
    switch (actionId) {
      case 'extend_project':
        // Extend project dates to accommodate the assignment
        const existingAssignments = assignments.filter(a => a.project_id === project.id);
        const extendedDates = calculateExtendedProjectDates(
          project,
          assignmentStart,
          assignmentEnd,
          existingAssignments
        );
        
        if (onUpdateProject) {
          await onUpdateProject(project.id, {
            start_date: extendedDates.start,
            end_date: extendedDates.end
          });
        }
        break;
        
      case 'constrain_assignment':
        // Adjust assignment dates to fit within project dates
        const constrainedDates = constrainAssignmentDates(
          assignmentStart,
          assignmentEnd,
          project.start_date,
          project.end_date
        );
        
        // This would need to be handled by the calling component
        // as it needs to update the specific assignment
        break;
        
      default:
        break;
    }
  };

  return {
    conflictDialog,
    closeConflictDialog,
    handleProjectDateChange,
    handleAssignmentDateChange
  };
}
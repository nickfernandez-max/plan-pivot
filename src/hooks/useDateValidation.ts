import { useState } from 'react';
import { Project, ProjectAssignment, TeamMember } from '@/types/roadmap';
import { 
  DateConflictInfo, 
  DateConflictAction,
  checkProjectDateConflicts,
  checkAssignmentDateConflicts,
  getProjectDateConflictActions,
  getAssignmentDateConflictActions,
  calculateExtendedProjectDates,
  constrainAssignmentDates
} from '@/utils/dateValidation';
import { toast } from '@/hooks/use-toast';

interface AssignmentWithMember extends ProjectAssignment {
  member?: TeamMember;
}

interface UseDateValidationProps {
  onUpdateProject?: (projectId: string, updates: Partial<Project>) => Promise<void>;
  onUpdateProjectAssignments?: (projectId: string, assignments: { teamMemberId: string; percentAllocation: number; startDate?: string; endDate?: string }[]) => Promise<void>;
}

export function useDateValidation({
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

  /**
   * Validates and handles project date changes
   */
  const handleProjectDateChange = async (
    project: Project,
    newStartDate: string,
    newEndDate: string,
    assignments: AssignmentWithMember[] = []
  ): Promise<boolean> => {
    const conflict = checkProjectDateConflicts(project, newStartDate, newEndDate, assignments);
    
    if (!conflict) {
      // No conflicts, proceed with update
      if (onUpdateProject) {
        await onUpdateProject(project.id, {
          start_date: newStartDate,
          end_date: newEndDate
        });
      }
      return true;
    }

    // Show conflict dialog
    return new Promise((resolve) => {
      const actions = getProjectDateConflictActions();
      
      setConflictDialog({
        open: true,
        conflict,
        actions,
        onAction: async (actionId: string) => {
          try {
            if (actionId === 'update_assignments') {
              // Update project dates and adjust matching assignments
              if (onUpdateProject) {
                await onUpdateProject(project.id, {
                  start_date: newStartDate,
                  end_date: newEndDate
                });
              }

              // Update assignments that matched the old project dates
              if (onUpdateProjectAssignments && conflict.affectedAssignments) {
                const assignmentsToUpdate = assignments
                  .filter(a => 
                    a.project_id === project.id &&
                    (a.start_date === project.start_date && a.end_date === project.end_date)
                  )
                  .map(a => ({
                    teamMemberId: a.team_member_id,
                    percentAllocation: a.percent_allocation,
                    startDate: newStartDate,
                    endDate: newEndDate
                  }));

                if (assignmentsToUpdate.length > 0) {
                  await onUpdateProjectAssignments(project.id, assignmentsToUpdate);
                }
              }

              toast({
                title: "Project Updated",
                description: "Project dates and matching assignments have been updated."
              });
            } else if (actionId === 'keep_custom') {
              // Just update project dates, leave assignments as-is
              if (onUpdateProject) {
                await onUpdateProject(project.id, {
                  start_date: newStartDate,
                  end_date: newEndDate
                });
              }

              toast({
                title: "Project Updated", 
                description: "Project dates updated. Some assignments may extend beyond project timeline."
              });
            }
            
            resolve(true);
          } catch (error) {
            console.error('Error handling project date change:', error);
            toast({
              title: "Error",
              description: "Failed to update project dates.",
              variant: "destructive"
            });
            resolve(false);
          }
        }
      });
    });
  };

  /**
   * Validates and handles assignment date changes
   */
  const handleAssignmentDateChange = async (
    project: Project,
    assignmentStart: string,
    assignmentEnd: string,
    assignments: ProjectAssignment[] = []
  ): Promise<{ success: boolean; updatedProject?: Partial<Project> }> => {
    const conflict = checkAssignmentDateConflicts(project, assignmentStart, assignmentEnd);
    
    if (!conflict) {
      // No conflicts, assignment dates are within project boundaries
      return { success: true };
    }

    // Show conflict dialog
    return new Promise((resolve) => {
      const actions = getAssignmentDateConflictActions();
      
      setConflictDialog({
        open: true,
        conflict,
        actions,
        onAction: async (actionId: string) => {
          try {
            if (actionId === 'extend_project') {
              // Calculate new project dates to encompass all assignments
              const extendedDates = calculateExtendedProjectDates(
                project,
                assignmentStart,
                assignmentEnd,
                assignments
              );

              if (onUpdateProject) {
                await onUpdateProject(project.id, {
                  start_date: extendedDates.start,
                  end_date: extendedDates.end
                });
              }

              toast({
                title: "Project Extended",
                description: "Project timeline extended to include assignment dates."
              });

              resolve({ 
                success: true,
                updatedProject: {
                  start_date: extendedDates.start,
                  end_date: extendedDates.end
                }
              });
            } else if (actionId === 'constrain_assignment') {
              // Constrain assignment dates to project boundaries
              const constrainedDates = constrainAssignmentDates(
                assignmentStart,
                assignmentEnd,
                project.start_date,
                project.end_date
              );

              toast({
                title: "Assignment Constrained",
                description: `Assignment dates adjusted to fit within project timeline (${constrainedDates.start} to ${constrainedDates.end}).`
              });

              resolve({ 
                success: true,
                updatedProject: {
                  // Return the constrained dates for the caller to use
                  start_date: constrainedDates.start,
                  end_date: constrainedDates.end
                }
              });
            }
          } catch (error) {
            console.error('Error handling assignment date change:', error);
            toast({
              title: "Error",
              description: "Failed to resolve date conflict.",
              variant: "destructive"
            });
            resolve({ success: false });
          }
        }
      });
    });
  };

  /**
   * Closes the conflict dialog
   */
  const closeConflictDialog = () => {
    setConflictDialog({
      open: false,
      conflict: null,
      actions: [],
      onAction: () => {}
    });
  };

  return {
    conflictDialog,
    closeConflictDialog,
    handleProjectDateChange,
    handleAssignmentDateChange
  };
}
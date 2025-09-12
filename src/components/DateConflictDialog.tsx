import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface DateConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: DateConflictInfo | null;
  actions: DateConflictAction[];
  onAction: (actionId: string) => void;
}

export function DateConflictDialog({
  open,
  onOpenChange,
  conflict,
  actions,
  onAction
}: DateConflictDialogProps) {
  if (!conflict) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getConflictTitle = () => {
    switch (conflict.type) {
      case 'project_date_change':
        return 'Project Date Change Detected';
      case 'assignment_date_change':
        return 'Assignment Date Conflict';
      case 'assignment_outside_project':
        return 'Assignment Outside Project Timeline';
      default:
        return 'Date Conflict Detected';
    }
  };

  const getConflictDescription = () => {
    switch (conflict.type) {
      case 'project_date_change':
        return 'Changing the project dates will affect existing assignments. How would you like to handle this?';
      case 'assignment_date_change':
        return 'The assignment dates extend beyond the current project timeline.';
      case 'assignment_outside_project':
        return 'The assignment dates are outside the project date range.';
      default:
        return 'There is a date conflict that needs to be resolved.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-base">{getConflictTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-left">
            {getConflictDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Information */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Project: {conflict.projectName}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(conflict.projectDates.start)} → {formatDate(conflict.projectDates.end)}
            </div>
          </div>

          {/* Assignment Information */}
          {conflict.assignmentDates && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Assignment Dates</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(conflict.assignmentDates.start)} → {formatDate(conflict.assignmentDates.end)}
              </div>
            </div>
          )}

          {/* Affected Assignments */}
          {conflict.affectedAssignments && conflict.affectedAssignments.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  Affected Assignments ({conflict.affectedAssignments.length})
                </span>
              </div>
              <div className="space-y-2">
                {conflict.affectedAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{assignment.memberName}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatDate(assignment.currentDates.start)} → {formatDate(assignment.currentDates.end)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                className="w-full justify-start h-auto py-3"
                onClick={() => {
                  onAction(action.id);
                  onOpenChange(false);
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import { DateConflictDialog } from './DateConflictDialog';
import { useDateValidation } from '@/hooks/useDateValidation';

interface DateValidationProviderProps {
  children: React.ReactNode;
  onUpdateProject?: (projectId: string, updates: any) => Promise<void>;
  onUpdateProjectAssignments?: (projectId: string, assignments: any[]) => Promise<void>;
}

export function DateValidationProvider({
  children,
  onUpdateProject,
  onUpdateProjectAssignments
}: DateValidationProviderProps) {
  const { conflictDialog, closeConflictDialog } = useDateValidation({
    onUpdateProject,
    onUpdateProjectAssignments
  });

  return (
    <>
      {children}
      <DateConflictDialog
        open={conflictDialog.open}
        onOpenChange={closeConflictDialog}
        conflict={conflictDialog.conflict}
        actions={conflictDialog.actions}
        onAction={conflictDialog.onAction}
      />
    </>
  );
}
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProjectResizeDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdateAll: () => void;
  onUpdateIndividual: () => void;
  projectName: string;
  memberName: string;
}

export function ProjectResizeDialog({
  open,
  onClose,
  onUpdateAll,
  onUpdateIndividual,
  projectName,
  memberName
}: ProjectResizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Project Dates</DialogTitle>
          <DialogDescription>
            You're resizing "<strong>{projectName}</strong>". How would you like to apply the date changes?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Two options:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Update all assignments:</strong> Changes dates for everyone assigned to this project</li>
              <li>• <strong>Update only {memberName}:</strong> Changes dates only for this team member's assignment</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onUpdateIndividual}>
            Update Only {memberName}
          </Button>
          <Button onClick={onUpdateAll}>
            Update All Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
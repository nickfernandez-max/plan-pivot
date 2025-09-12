import { useState } from 'react';
import { Role } from '@/types/roadmap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Edit } from 'lucide-react';

interface EditRoleDialogProps {
  role: Role;
  onSave: (updates: Partial<Role>) => Promise<void>;
}

export function EditRoleDialog({ role, onSave }: EditRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: role.name,
    display_name: role.display_name || role.name,
    finance_name: role.finance_name || '',
    hourly_rate: role.hourly_rate?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updates = {
        ...formData,
        finance_name: formData.finance_name || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0
      };
      await onSave(updates);
      setOpen(false);
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form data when opening
      setFormData({
        name: role.name,
        display_name: role.display_name || role.name,
        finance_name: role.finance_name || '',
        hourly_rate: role.hourly_rate?.toString() || '',
      });
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>
            Update the display name, finance code, and hourly rate for this role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Role name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Display name for this role"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="finance_name">Finance Code</Label>
              <Input
                id="finance_name"
                value={formData.finance_name}
                onChange={(e) => setFormData(prev => ({ ...prev, finance_name: e.target.value }))}
                placeholder="Finance code (e.g., BA1, DEV)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
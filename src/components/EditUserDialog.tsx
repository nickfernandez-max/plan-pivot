import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Eye, EyeOff } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'editor' | 'admin' | 'viewer';
  created_at: string;
}

interface EditUserDialogProps {
  user: User;
  onSave: (updates: { full_name: string; role: 'editor' | 'admin' | 'viewer' }) => Promise<void>;
}

export function EditUserDialog({ user, onSave }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    role: user.role as 'editor' | 'admin' | 'viewer',
    newPassword: ''
  });

  useEffect(() => {
    setFormData({
      full_name: user.full_name || '',
      role: user.role as 'editor' | 'admin' | 'viewer',
      newPassword: ''
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Update profile information (name and role)
      await onSave({ 
        full_name: formData.full_name,
        role: formData.role 
      });

      // Update password if provided
      if (formData.newPassword.trim()) {
        if (formData.newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { error: passwordError } = await supabase.functions.invoke('update-user-password', {
          body: {
            userId: user.id,
            newPassword: formData.newPassword
          }
        });

        if (passwordError) {
          throw new Error(`Failed to update password: ${passwordError.message}`);
        }
      }

      toast({
        title: "Success",
        description: formData.newPassword.trim() 
          ? "User information and password updated successfully!" 
          : "User information updated successfully!",
      });
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setFormData({
        full_name: user.full_name || '',
        role: user.role as 'editor' | 'admin' | 'viewer',
        newPassword: ''
      });
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'editor' | 'admin' | 'viewer') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password (optional)</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (leave blank to keep current)"
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Leave blank to keep current password. Minimum 6 characters if changing.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
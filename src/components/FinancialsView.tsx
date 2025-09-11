import { useState, useEffect } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditRoleDialog } from '@/components/EditRoleDialog';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@/types/roadmap';
import { Lock } from 'lucide-react';

interface FinancialsViewProps {
  roles: Role[];
  onUpdateRole: (id: string, updates: Partial<Role>) => Promise<any>;
}

export function FinancialsView({ roles, onUpdateRole }: FinancialsViewProps) {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          setIsAdmin(profile?.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    try {
      await onUpdateRole(roleId, updates);
      toast({ title: "Success", description: "Role updated successfully" });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          This section is only available to administrators. Please contact your system administrator for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Financial Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage display names, finance codes, and hourly rates for all roles.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Hourly Rate ($)</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.display_name || role.name}</TableCell>
                  <TableCell>
                    {role.hourly_rate ? `$${role.hourly_rate.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <EditRoleDialog
                      role={role}
                      onSave={(updates) => handleUpdateRole(role.id, updates)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
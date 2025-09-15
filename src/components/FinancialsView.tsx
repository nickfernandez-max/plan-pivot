import { useState, useEffect, useMemo } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EditRoleDialog } from '@/components/EditRoleDialog';
import { AddRoleDialog } from '@/components/AddRoleDialog';
import { AddUserDialog } from '@/components/AddUserDialog';
import { DataImportDialog } from '@/components/DataImportDialog';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@/types/roadmap';
import { Settings, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface FinancialsViewProps {
  roles: Role[];
  teams: any[];
  products: any[];
  onUpdateRole: (id: string, updates: Partial<Role>) => Promise<any>;
  onAddRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<Role>;
  onDataImported: () => void;
}

export function FinancialsView({ roles, teams, products, onUpdateRole, onAddRole, onDataImported }: FinancialsViewProps) {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'display_name' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'display_name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'display_name') => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const sortedRoles = useMemo(() => {
    if (!sortField) return roles;

    return [...roles].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'display_name':
          aValue = (a.display_name || a.name).toLowerCase();
          bValue = (b.display_name || b.name).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [roles, sortField, sortDirection]);

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
          <CardTitle>Data Import</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bulk import employee data from Excel files.
          </p>
        </CardHeader>
        <CardContent>
          <DataImportDialog 
            roles={roles}
            teams={teams}
            products={products}
            onImportComplete={onDataImported}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Role Management
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage roles in the system. Only administrators can view and edit this information.
            </p>
          </div>
          <div className="flex gap-2">
            <AddRoleDialog onAddRole={onAddRole} />
            <AddUserDialog />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('name')}
                  >
                    Role Name
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('display_name')}
                  >
                    Display Name
                    {getSortIcon('display_name')}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.display_name || role.name}</TableCell>
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
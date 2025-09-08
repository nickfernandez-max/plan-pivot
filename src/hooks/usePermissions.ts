import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { profile } = useAuth();

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';
  const canDelete = profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';
  const isViewer = profile?.role === 'viewer';

  return {
    canEdit,
    canDelete,
    isAdmin,
    isViewer,
    role: profile?.role,
  };
}
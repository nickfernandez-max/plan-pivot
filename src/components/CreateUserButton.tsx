import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createUser } from '@/utils/createUser';
import { useToast } from '@/hooks/use-toast';

export function CreateUserButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateSteven = async () => {
    setLoading(true);
    try {
      const result = await createUser({
        email: 'steven.nunnally@granstreet.com',
        password: 'ABCD1234',
        full_name: 'Steven Nunnally',
        role: 'editor'
      });

      if (result.error) {
        toast({
          title: "Error",
          description: `Failed to create user: ${result.error.message || 'Unknown error'}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Steven Nunnally has been added to the database!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create user: ${error}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateSteven} 
      disabled={loading}
      className="mb-4"
    >
      {loading ? 'Creating User...' : 'Add Steven Nunnally'}
    </Button>
  );
}
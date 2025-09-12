import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface UserPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ name: string }>;
  products: Array<{ name: string }>;
  currentUserId?: string;
  onPreferencesUpdate?: () => void;
}

export function UserPreferencesDialog({ 
  open, 
  onOpenChange, 
  teams, 
  products, 
  currentUserId,
  onPreferencesUpdate 
}: UserPreferencesDialogProps) {
  const [defaultTeam, setDefaultTeam] = useState<string>('all');
  const [defaultProduct, setDefaultProduct] = useState<string>('all');
  const [preferredLandingPage, setPreferredLandingPage] = useState<string>('/');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && currentUserId) {
      loadCurrentPreferences();
    }
  }, [open, currentUserId]);

  const loadCurrentPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('default_team_filter, default_product_filter, preferred_landing_page')
        .eq('id', currentUserId)
        .single();

      if (error) throw error;

      setDefaultTeam(data.default_team_filter || 'all');
      setDefaultProduct(data.default_product_filter || 'all');
      setPreferredLandingPage(data.preferred_landing_page || '/');
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          default_team_filter: defaultTeam,
          default_product_filter: defaultProduct,
          preferred_landing_page: preferredLandingPage,
        })
        .eq('id', currentUserId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User preferences saved successfully",
      });
      
      onPreferencesUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const teamNames = Array.from(new Set(teams.map(team => team.name))).sort();
  const productNames = Array.from(new Set(products.map(product => product.name))).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="preferred-landing-page">Preferred Landing Page</Label>
            <Select value={preferredLandingPage} onValueChange={setPreferredLandingPage}>
              <SelectTrigger>
                <SelectValue placeholder="Select preferred landing page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/">Dashboard</SelectItem>
                <SelectItem value="/roadmap">Roadmap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="default-product">Default Product Filter</Label>
            <Select value={defaultProduct} onValueChange={setDefaultProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select default product filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {productNames.map((productName) => (
                  <SelectItem key={productName} value={productName}>
                    {productName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="default-team">Default Team Filter</Label>
            <Select value={defaultTeam} onValueChange={setDefaultTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select default team filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teamNames.map((teamName) => (
                  <SelectItem key={teamName} value={teamName}>
                    {teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
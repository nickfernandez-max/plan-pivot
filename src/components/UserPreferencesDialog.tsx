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
  const [defaultTimelineMonths, setDefaultTimelineMonths] = useState<number>(9);
  const [teamMemberPrimarySort, setTeamMemberPrimarySort] = useState<string>('role');
  const [teamMemberPrimaryDirection, setTeamMemberPrimaryDirection] = useState<string>('asc');
  const [teamMemberSecondarySort, setTeamMemberSecondarySort] = useState<string>('name');
  const [teamMemberSecondaryDirection, setTeamMemberSecondaryDirection] = useState<string>('asc');
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
        .select('default_team_filter, default_product_filter, preferred_landing_page, default_timeline_months, team_member_primary_sort, team_member_primary_direction, team_member_secondary_sort, team_member_secondary_direction')
        .eq('id', currentUserId)
        .single();

      if (error) throw error;

      setDefaultTeam(data.default_team_filter || 'all');
      setDefaultProduct(data.default_product_filter || 'all');
      setPreferredLandingPage(data.preferred_landing_page || '/');
      setDefaultTimelineMonths(data.default_timeline_months || 9);
      setTeamMemberPrimarySort(data.team_member_primary_sort || 'role');
      setTeamMemberPrimaryDirection(data.team_member_primary_direction || 'asc');
      setTeamMemberSecondarySort(data.team_member_secondary_sort || 'name');
      setTeamMemberSecondaryDirection(data.team_member_secondary_direction || 'asc');
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
          default_timeline_months: defaultTimelineMonths,
          team_member_primary_sort: teamMemberPrimarySort,
          team_member_primary_direction: teamMemberPrimaryDirection,
          team_member_secondary_sort: teamMemberSecondarySort,
          team_member_secondary_direction: teamMemberSecondaryDirection,
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

          <div className="grid gap-2">
            <Label htmlFor="default-timeline-months">Default Timeline Length</Label>
            <Select value={defaultTimelineMonths.toString()} onValueChange={(value) => setDefaultTimelineMonths(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select default timeline length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="9">9 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="18">18 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 py-2 border-t">
            <h4 className="text-sm font-medium">Team Member Sorting</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="primary-sort">Primary Sort</Label>
                <Select value={teamMemberPrimarySort} onValueChange={setTeamMemberPrimarySort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="start_date">Start Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="primary-direction">Direction</Label>
                <Select value={teamMemberPrimaryDirection} onValueChange={setTeamMemberPrimaryDirection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="secondary-sort">Secondary Sort</Label>
                <Select value={teamMemberSecondarySort} onValueChange={setTeamMemberSecondarySort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="start_date">Start Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="secondary-direction">Direction</Label>
                <Select value={teamMemberSecondaryDirection} onValueChange={setTeamMemberSecondaryDirection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
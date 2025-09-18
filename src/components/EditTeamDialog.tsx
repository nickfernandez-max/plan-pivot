import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Team, Product, TeamIdealSize } from '@/types/roadmap';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface EditTeamDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  onArchiveTeam?: (id: string) => Promise<void>;
  onUnarchiveTeam?: (id: string) => Promise<void>;
  products: Product[];
  teamIdealSizes: TeamIdealSize[];
  onAddTeamIdealSize: (idealSize: Omit<TeamIdealSize, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateTeamIdealSize: (id: string, updates: Partial<TeamIdealSize>) => Promise<void>;
  onDeleteTeamIdealSize: (id: string) => Promise<void>;
}

export function EditTeamDialog({ 
  team, 
  open, 
  onOpenChange, 
  onUpdateTeam, 
  onArchiveTeam, 
  onUnarchiveTeam, 
  products,
  teamIdealSizes,
  onAddTeamIdealSize,
  onUpdateTeamIdealSize,
  onDeleteTeamIdealSize
}: EditTeamDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // New ideal size form state
  const [showNewIdealSizeForm, setShowNewIdealSizeForm] = useState(false);
  const [newIdealSize, setNewIdealSize] = useState('1');
  const [newStartMonth, setNewStartMonth] = useState('');
  const [newEndMonth, setNewEndMonth] = useState('');

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setProductId(team.product_id || 'none');
      
      // Reset form when team changes
      setShowNewIdealSizeForm(false);
      setNewIdealSize('1');
      setNewStartMonth('');
      setNewEndMonth('');
    }
  }, [team, teamIdealSizes]);

  const currentTeamIdealSizes = teamIdealSizes
    .filter(tis => team && tis.team_id === team.id)
    .sort((a, b) => a.start_month.localeCompare(b.start_month));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !name.trim()) return;

    setIsSubmitting(true);
    try {
      // Update team basic info (without ideal_size)
      await onUpdateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        product_id: productId === 'none' ? undefined : productId,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddIdealSize = async () => {
    if (!team || !newIdealSize || !newStartMonth) return;

    try {
      await onAddTeamIdealSize({
        team_id: team.id,
        ideal_size: parseInt(newIdealSize) || 1,
        start_month: newStartMonth,
        end_month: newEndMonth || undefined
      });
      
      // Reset form
      setShowNewIdealSizeForm(false);
      setNewIdealSize('1');
      setNewStartMonth('');
      setNewEndMonth('');
    } catch (error) {
      console.error('Error adding ideal size:', error);
    }
  };

  const handleDeleteIdealSize = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ideal size period?')) return;
    
    try {
      await onDeleteTeamIdealSize(id);
    } catch (error) {
      console.error('Error deleting ideal size:', error);
    }
  };

  const handleArchive = async () => {
    if (!team || !onArchiveTeam) return;
    
    if (!confirm(`Are you sure you want to archive the team "${team.name}"? This will hide it from most views but preserve all historical data.`)) {
      return;
    }

    setIsArchiving(true);
    try {
      await onArchiveTeam(team.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error archiving team:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!team || !onUnarchiveTeam) return;
    
    setIsArchiving(true);
    try {
      await onUnarchiveTeam(team.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error unarchiving team:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team details and manage ideal team sizes over time.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Team Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter team description (optional)"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ideal Team Sizes Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ideal Team Sizes Timeline</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewIdealSizeForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Period
              </Button>
            </div>

            {/* Existing Ideal Size Periods */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentTeamIdealSizes.length === 0 ? (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No ideal size periods defined. Add one to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                currentTeamIdealSizes.map((idealSize) => (
                  <Card key={idealSize.id} className="relative">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {idealSize.ideal_size} people
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(idealSize.start_month), 'MMM yyyy')} 
                            {idealSize.end_month 
                              ? ` - ${format(new Date(idealSize.end_month), 'MMM yyyy')}`
                              : ' - Ongoing'
                            }
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIdealSize(idealSize.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Add New Ideal Size Form */}
            {showNewIdealSizeForm && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">Add New Ideal Size Period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newIdealSize">Ideal Size</Label>
                      <Input
                        id="newIdealSize"
                        type="number"
                        min="1"
                        max="100"
                        value={newIdealSize}
                        onChange={(e) => setNewIdealSize(e.target.value)}
                        placeholder="e.g. 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newStartMonth">Start Month</Label>
                      <Input
                        id="newStartMonth"
                        type="month"
                        value={newStartMonth ? newStartMonth.substring(0, 7) : ''}
                        onChange={(e) => setNewStartMonth(e.target.value + '-01')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEndMonth">End Month (Optional)</Label>
                      <Input
                        id="newEndMonth"
                        type="month"
                        value={newEndMonth ? newEndMonth.substring(0, 7) : ''}
                        onChange={(e) => setNewEndMonth(e.target.value ? e.target.value + '-01' : '')}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowNewIdealSizeForm(false);
                        setNewIdealSize('1');
                        setNewStartMonth('');
                        setNewEndMonth('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      size="sm"
                      onClick={handleAddIdealSize}
                      disabled={!newIdealSize || !newStartMonth}
                    >
                      Add Period
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="flex justify-between">
            {(onArchiveTeam || onUnarchiveTeam) && (
              <div className="flex space-x-2">
                {team?.archived ? (
                  onUnarchiveTeam && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleUnarchive}
                      disabled={isArchiving || isSubmitting}
                    >
                      {isArchiving ? 'Unarchiving...' : 'Unarchive Team'}
                    </Button>
                  )
                ) : (
                  onArchiveTeam && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleArchive}
                      disabled={isArchiving || isSubmitting}
                    >
                      {isArchiving ? 'Archiving...' : 'Archive Team'}
                    </Button>
                  )
                )}
              </div>
            )}
            <div className="flex space-x-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Updating...' : 'Update Team'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team, Product } from '@/types/roadmap';

interface EditTeamDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  onDeleteTeam?: (id: string) => Promise<void>;
  products: Product[];
}

export function EditTeamDialog({ team, open, onOpenChange, onUpdateTeam, onDeleteTeam, products }: EditTeamDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('none');
  const [idealSize, setIdealSize] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setProductId(team.product_id || 'none');
      setIdealSize(String(team.ideal_size || 1));
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdateTeam(team.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        product_id: productId === 'none' ? undefined : productId,
        ideal_size: parseInt(idealSize) || 1,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!team || !onDeleteTeam) return;
    
    if (!confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteTeam(team.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team. It may have associated members or projects.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team details and settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          
          <div className="space-y-2">
            <Label htmlFor="idealSize">Ideal Team Size</Label>
            <Input
              id="idealSize"
              type="number"
              min="1"
              max="100"
              value={idealSize}
              onChange={(e) => setIdealSize(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between">
            {onDeleteTeam && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Team'}
              </Button>
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
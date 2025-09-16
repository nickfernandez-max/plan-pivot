import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/types/roadmap';

interface AddTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeam: (teamData: { name: string; description?: string; product_id: string; ideal_size?: number }) => Promise<void>;
  products: Product[];
}

export function AddTeamDialog({ open, onOpenChange, onAddTeam, products }: AddTeamDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [idealSize, setIdealSize] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !productId) return;

    setIsSubmitting(true);
    try {
      await onAddTeam({
        name: name.trim(),
        description: description.trim() || undefined,
        product_id: productId,
        ideal_size: idealSize,
      });
      setName('');
      setDescription('');
      setProductId('');
      setIdealSize(3);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding team:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
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
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Product *</Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
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
              max="20"
              value={idealSize}
              onChange={(e) => setIdealSize(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !productId}>
              {isSubmitting ? 'Adding...' : 'Add Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WorkAssignment } from '@/types/roadmap';
import { useToast } from '@/hooks/use-toast';

interface AddWorkAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teamMemberId: string;
  memberName: string;
  onAddWorkAssignment: (assignment: Omit<WorkAssignment, 'id' | 'created_at' | 'updated_at'>) => Promise<WorkAssignment>;
}

const workTypeOptions = [
  { value: 'support', label: 'Support Work', color: '#EF4444' },
  { value: 'queue_work', label: 'Queue Work', color: '#F59E0B' },
  { value: 'other', label: 'Other', color: '#8B5CF6' }
];

export function AddWorkAssignmentDialog({
  isOpen,
  onClose,
  teamMemberId,
  memberName,
  onAddWorkAssignment
}: AddWorkAssignmentDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'support' as 'support' | 'queue_work' | 'other',
    percent_allocation: 100,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    color: '#EF4444'
  });

  const handleTypeChange = (type: 'support' | 'queue_work' | 'other') => {
    const typeOption = workTypeOptions.find(opt => opt.value === type);
    setFormData(prev => ({
      ...prev,
      type,
      color: typeOption?.color || '#EF4444'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onAddWorkAssignment({
        ...formData,
        team_member_id: teamMemberId
      });
      
      toast({
        title: "Success",
        description: `Work assignment added for ${memberName}`
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'support',
        percent_allocation: 100,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        color: '#EF4444'
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding work assignment:', error);
      toast({
        title: "Error",
        description: "Failed to add work assignment",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    // Reset form on close
    setFormData({
      name: '',
      description: '',
      type: 'support',
      percent_allocation: 100,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      color: '#EF4444'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Work Assignment for {memberName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Assignment Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Customer Support, Bug Fixes"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="percent_allocation">Allocation (%)</Label>
            <Input
              id="percent_allocation"
              type="number"
              min="1"
              max="100"
              value={formData.percent_allocation}
              onChange={(e) => setFormData(prev => ({ ...prev, percent_allocation: parseInt(e.target.value) || 100 }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the work assignment..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
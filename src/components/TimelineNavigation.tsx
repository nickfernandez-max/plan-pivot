import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface TimelineNavigationProps {
  title: string;
  timelineStart: Date;
  timelineEnd: Date;
  timelineMonths: number;
  navigationIncrement: number;
  canNavigateLeft: boolean;
  canNavigateRight: boolean;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  onResetToToday: () => void;
  onTimelineMonthsChange: (months: number) => void;
  showMonthSelector?: boolean;
}

export function TimelineNavigation({
  title,
  timelineStart,
  timelineEnd, 
  timelineMonths,
  navigationIncrement,
  canNavigateLeft,
  canNavigateRight,
  onNavigateLeft,
  onNavigateRight,
  onResetToToday,
  onTimelineMonthsChange,
  showMonthSelector = false
}: TimelineNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Timeline: {format(timelineStart, 'MMM yyyy')} - {format(timelineEnd, 'MMM yyyy')}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {showMonthSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={timelineMonths.toString()} onValueChange={(value) => onTimelineMonthsChange(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
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
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNavigateLeft}
          disabled={!canNavigateLeft}
        >
          <ChevronLeft className="h-4 w-4" />
          {navigationIncrement} Month{navigationIncrement !== 1 ? 's' : ''}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResetToToday}
        >
          Today
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNavigateRight}
          disabled={!canNavigateRight}
        >
          {navigationIncrement} Month{navigationIncrement !== 1 ? 's' : ''}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
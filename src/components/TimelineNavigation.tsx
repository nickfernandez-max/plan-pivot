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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Timeline:</span>
        <span className="text-sm font-semibold">{format(timelineStart, 'MMM yyyy')} - {format(timelineEnd, 'MMM yyyy')}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateLeft}
          disabled={!canNavigateLeft}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-3 h-3" />
          3 Months
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetToToday}
          className="text-xs"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateRight}
          disabled={!canNavigateRight}
          className="flex items-center gap-1"
        >
          3 Months
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
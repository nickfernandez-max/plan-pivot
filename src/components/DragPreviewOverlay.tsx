import { Project } from '@/types/roadmap';
import { format, differenceInDays } from 'date-fns';

interface DragPreviewOverlayProps {
  project: Project;
  newStartDate: Date | null;
  newEndDate: Date | null;
  timelineBounds: { start: Date; end: Date };
  totalDays: number;
  isValidDrop: boolean;
}

export function DragPreviewOverlay({ 
  project, 
  newStartDate, 
  newEndDate, 
  timelineBounds, 
  totalDays,
  isValidDrop 
}: DragPreviewOverlayProps) {
  if (!newStartDate || !newEndDate) return null;

  // Calculate position and width
  const daysFromStart = Math.max(0, differenceInDays(newStartDate, timelineBounds.start));
  const duration = differenceInDays(newEndDate, newStartDate) + 1;
  
  const leftPercentage = (daysFromStart / totalDays) * 100;
  const widthPercentage = Math.min((duration / totalDays) * 100, 100 - leftPercentage);

  return (
    <>
      {/* Drop preview with exact positioning */}
      <div
        className={`absolute top-0 h-full border-2 border-dashed rounded-md transition-all duration-150 ${
          isValidDrop 
            ? 'bg-primary/20 border-primary' 
            : 'bg-destructive/20 border-destructive'
        }`}
        style={{
          left: `${leftPercentage}%`,
          width: `${widthPercentage}%`,
          zIndex: 100,
        }}
      >
        {/* Week boundary indicators */}
        <div className="absolute inset-0 flex">
          <div className="w-1 h-full bg-primary/60 rounded-l-md" />
          <div className="flex-1" />
          <div className="w-1 h-full bg-primary/60 rounded-r-md" />
        </div>
        
        {/* Date tooltip */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-popover text-popover-foreground rounded-md shadow-lg text-xs whitespace-nowrap border z-50">
          <div className="font-medium">{project.name}</div>
          <div className="text-muted-foreground">
            {format(newStartDate, 'MMM d')} - {format(newEndDate, 'MMM d, yyyy')}
          </div>
          {!isValidDrop && (
            <div className="text-destructive text-xs">Invalid drop zone</div>
          )}
        </div>
      </div>
    </>
  );
}
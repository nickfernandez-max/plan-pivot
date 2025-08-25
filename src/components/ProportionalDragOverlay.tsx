import { Project } from '@/types/roadmap';
import { differenceInDays } from 'date-fns';

interface ProportionalDragOverlayProps {
  project: Project;
  timelineBounds: { start: Date; end: Date };
  totalDays: number;
  timelineWidth: number; // The actual pixel width of the timeline area
}

export function ProportionalDragOverlay({ 
  project, 
  timelineBounds, 
  totalDays, 
  timelineWidth 
}: ProportionalDragOverlayProps) {
  // Calculate the project's proportional dimensions
  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const duration = differenceInDays(endDate, startDate) + 1;
  
  // Convert percentage width to actual pixels
  const widthPercentage = Math.max((duration / totalDays) * 100, 2);
  const actualWidth = (widthPercentage / 100) * timelineWidth;
  
  // Set a consistent height that matches the project slots (32px is the base slot height)
  const height = 32;

  return (
    <div 
      className="rounded-md shadow-lg border-2 border-white/30 pointer-events-none z-50 flex items-center px-2 backdrop-blur-sm"
      style={{
        backgroundColor: project.team?.color || project.color || 'hsl(var(--primary))',
        borderColor: project.team?.color || project.color || 'hsl(var(--primary))',
        width: `${actualWidth}px`,
        height: `${height}px`,
        minWidth: '60px', // Minimum width for readability
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-medium truncate">
          {project.name}
        </div>
        {project.is_rd && (
          <div className="text-white/80 text-xs">R&D</div>
        )}
      </div>
    </div>
  );
}
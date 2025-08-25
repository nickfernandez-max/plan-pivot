import { Project } from '@/types/roadmap';

interface CompactDragOverlayProps {
  project: Project;
}

export function CompactDragOverlay({ project }: CompactDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md shadow-lg pointer-events-none z-50 max-w-48">
      <div 
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ 
          backgroundColor: project.team?.color || project.color || 'hsl(var(--primary))' 
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {project.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {project.is_rd ? 'R&D Project' : 'Project'}
        </div>
      </div>
    </div>
  );
}
import { Project } from '@/types/roadmap';

interface CompactDragOverlayProps {
  project: Project;
}

export function CompactDragOverlay({ project }: CompactDragOverlayProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border-2 border-primary rounded-lg shadow-2xl pointer-events-none z-[9999] max-w-64 backdrop-blur-sm opacity-100 transform-gpu">
      <div 
        className="w-4 h-4 rounded-md flex-shrink-0 shadow-sm border border-white/20"
        style={{ 
          backgroundColor: project.color || 'hsl(var(--primary))' 
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate text-card-foreground">
          {project.name}
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          {project.is_rd ? 'R&D Project' : 'Project'}
        </div>
      </div>
    </div>
  );
}
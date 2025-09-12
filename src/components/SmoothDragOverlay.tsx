import { Project } from '@/types/roadmap';

interface SmoothDragOverlayProps {
  project: Project;
  className?: string;
}

export function SmoothDragOverlay({ project, className = "" }: SmoothDragOverlayProps) {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-2xl border-2 
        pointer-events-none backdrop-blur-sm transform-gpu
        bg-card/95 border-primary/50 max-w-72
        ${className}
      `}
      style={{
        zIndex: 10000, // Ensure it's always on top
      }}
    >
      <div 
        className="w-3 h-3 rounded-sm flex-shrink-0 shadow-sm border border-white/30"
        style={{ 
          backgroundColor: project.color || 'hsl(var(--primary))' 
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate text-card-foreground">
          {project.name}
        </div>
        <div className="text-xs text-muted-foreground">
          Project
        </div>
      </div>
      <div className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
        Moving...
      </div>
    </div>
  );
}
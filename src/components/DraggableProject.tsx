import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Project, Team } from '@/types/roadmap';

interface DraggableProjectProps {
  project: Project;
  team: Team;
  style: React.CSSProperties;
  memberId: string;
  isPreview?: boolean;
}

export function DraggableProject({ 
  project, 
  team, 
  style, 
  memberId, 
  isPreview = false 
}: DraggableProjectProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `project-${project.id}`,
    data: {
      type: 'project',
      projectId: project.id,
      memberId,
      startDate: project.start_date,
      endDate: project.end_date,
    },
    disabled: isPreview,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute rounded-md shadow-sm border transition-all hover:shadow-md cursor-grab active:cursor-grabbing group animate-fade-in"
      style={{
        ...style,
        ...dragStyle,
        backgroundColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))',
        borderColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))',
      }}
    >
      <div className="h-full flex items-center px-2 overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">
            {project.name}
          </div>
          {project.is_rd && (
            <div className="text-white/80 text-xs">R&D</div>
          )}
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
        <div className="text-sm font-medium">{project.name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {format(new Date(project.start_date), 'MMM d, yyyy')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
        </div>
        {project.description && (
          <div className="text-xs mt-1 max-w-xs">{project.description}</div>
        )}
        <div className="text-xs mt-1">
          Value Score: {project.value_score}
        </div>
      </div>
    </div>
  );
}
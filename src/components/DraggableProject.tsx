import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Edit } from 'lucide-react';
import { Project, Team } from '@/types/roadmap';

interface DraggableProjectProps {
  project: Project & { allocation?: number };
  team: Team;
  style: React.CSSProperties;
  memberId: string;
  isPreview?: boolean;
  onEdit?: () => void;
}

export function DraggableProject({ 
  project, 
  team, 
  style, 
  memberId, 
  isPreview = false,
  onEdit
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

  // Debug logging
  if (project.name.toLowerCase().includes('mobile')) {
    console.log('Mobile project drag state:', {
      projectName: project.name,
      projectId: project.id,
      isDragging,
      transform,
      isPreview
    });
  }

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1000 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.3)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute rounded-md shadow-sm border transition-all hover:shadow-md group animate-fade-in"
      style={{
        ...style,
        ...dragStyle,
        backgroundColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))',
        borderColor: project.team?.color || project.color || team.color || 'hsl(var(--primary))',
      }}
    >
      <div className="h-full flex items-center overflow-hidden">
        {/* Drag handle area - enhanced visual feedback */}
        <div 
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 h-full flex items-center px-2 cursor-grab active:cursor-grabbing touch-none hover:bg-black/10 transition-colors"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate pointer-events-none">
              {project.name}
            </div>
            {project.is_rd && (
              <div className="text-white/80 text-xs pointer-events-none">R&D</div>
            )}
          </div>
          {/* Visual drag indicator */}
          <div className="text-white/60 text-xs ml-2 pointer-events-none select-none">⋮⋮</div>
        </div>
        
        {/* Edit button - separate from drag handle */}
        {onEdit && !isPreview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="mr-2 p-1 rounded hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit project"
          >
            <Edit className="h-3 w-3 text-white" />
          </button>
        )}
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
        {project.allocation && (
          <div className="text-xs mt-1">
            Allocation: {project.allocation}%
          </div>
        )}
      </div>
    </div>
  );
}
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
  onClick?: () => void;
  isFront?: boolean;
}

export function DraggableProject({ 
  project, 
  team, 
  style, 
  memberId, 
  isPreview = false,
  onEdit,
  onClick,
  isFront = false
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
      onClick: onClick,
    },
    disabled: isPreview,
  });

  const dragStyle = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : (isFront ? 10 : 1),
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute rounded-md shadow-sm border transition-all duration-200 hover:shadow-lg group animate-fade-in cursor-grab active:cursor-grabbing"
      style={{
        ...style,
        ...dragStyle,
        backgroundColor: project.color || 'hsl(var(--primary))',
        borderColor: project.color || 'hsl(var(--primary))',
      }}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="h-full flex items-center overflow-hidden">
        {/* Drag handle area */}
        <div 
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 h-full flex items-center px-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">
              {project.name}
            </div>
          </div>
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
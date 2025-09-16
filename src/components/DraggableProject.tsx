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
  // Debug: Log if onEdit is available for this project
  console.log(`🔧 DraggableProject for "${project.name}":`, {
    hasOnEdit: !!onEdit,
    isPreview,
    project: project.name,
    projectId: project.id
  });
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

  // Visual differentiation for tentative vs published projects
  const isTentative = project.status_visibility === 'tentative';
  
  return (
    <div
      ref={setNodeRef}
      className={`absolute rounded-md shadow-sm transition-all duration-200 hover:shadow-lg group animate-fade-in cursor-grab active:cursor-grabbing ${
        isTentative 
          ? 'border-2 border-dashed bg-gradient-to-r from-orange-100/90 to-yellow-100/90 border-orange-400' 
          : 'border border-solid'
      }`}
      style={{
        ...style,
        ...dragStyle,
        backgroundColor: isTentative ? undefined : (project.color || 'hsl(var(--primary))'),
        borderColor: isTentative ? 'orange' : (project.color || 'hsl(var(--primary))'),
        minHeight: isTentative ? '35px' : undefined,
        backgroundImage: isTentative ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,165,0,0.1) 5px, rgba(255,165,0,0.1) 10px)' : undefined,
      }}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onDoubleClick={(e) => {
        if (!isDragging && onEdit) {
          e.stopPropagation();
          e.preventDefault();
          console.log('🔧 Double-click detected for project:', project.name);
          onEdit();
        }
      }}
    >
      <div className="h-full flex items-center overflow-hidden">
        {/* Drag handle area */}
        <div 
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 h-full flex items-center px-2 cursor-grab active:cursor-grabbing touch-none"
          title={project.name} // Add native tooltip as fallback
        >
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-medium leading-tight break-words hyphens-auto ${
              isTentative ? 'text-orange-800' : 'text-white'
            }`} style={{ wordBreak: 'break-word' }}>
              {project.name}
              {isTentative && <span className="ml-1 text-[8px] font-bold">[TENTATIVE]</span>}
            </div>
          </div>
        </div>
        
        {/* Edit button - separate from drag handle - DEBUGGING: Always visible */}
        {onEdit && !isPreview && (
          <button
            onClick={(e) => {
              console.log('🔧 Edit button clicked for project:', project.name);
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="mr-2 p-1 rounded hover:bg-white/20 transition-colors bg-black/30 border border-white/50"
            title="Edit project"
            style={{ minWidth: '20px', minHeight: '20px', zIndex: 1000 }}
          >
            <Edit className="h-3 w-3 text-white" />
          </button>
        )}
      </div>
      
      {/* Enhanced Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border border-gray-700">
        <div className="text-sm font-medium">{project.name}</div>
        
        {/* Show assignment dates clearly labeled */}
        <div className="text-xs text-gray-300 mt-1">
          <div className="text-yellow-300 font-medium">Assignment Period:</div>
          <div>{format(new Date(project.start_date), 'MMM d, yyyy')} - {format(new Date(project.end_date), 'MMM d, yyyy')}</div>
        </div>
        
        {project.description && (
          <div className="text-xs mt-1 max-w-xs text-gray-300">{project.description}</div>
        )}
        <div className="text-xs mt-1 text-gray-300">
          Value Score: {project.value_score}
        </div>
        {project.allocation && (
          <div className="text-xs mt-1 text-gray-300">
            Allocation: {project.allocation}%
          </div>
        )}
      </div>
    </div>
  );
}
import { useDroppable } from '@dnd-kit/core';
import { TeamMember } from '@/types/roadmap';

interface DroppableMemberRowProps {
  member: TeamMember;
  rowHeight: number;
  top: number;
  children: React.ReactNode;
  isOver: boolean;
}

export function DroppableMemberRow({ 
  member, 
  rowHeight, 
  top, 
  children, 
  isOver 
}: DroppableMemberRowProps) {
  const { setNodeRef } = useDroppable({
    id: `member-row-${member.id}`,
    data: {
      type: 'member-row',
      memberId: member.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute w-full border-b border-border/50 transition-all duration-200`}
      style={{
        top: `${top}px`,
        height: `${rowHeight}px`,
      }}
    >
      {children}
      {isOver && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-sm" />
      )}
    </div>
  );
}
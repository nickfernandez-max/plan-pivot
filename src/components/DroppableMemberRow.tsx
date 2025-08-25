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
      className={`absolute w-full border-b border-border/50 transition-all duration-300 ${
        isOver ? 'bg-primary/20 border-primary/60 shadow-xl' : ''
      }`}
      style={{
        top: `${top}px`,
        height: `${rowHeight}px`,
      }}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-primary/15 border-2 border-dashed border-primary/60 rounded-lg pointer-events-none animate-pulse shadow-lg" />
      )}
    </div>
  );
}
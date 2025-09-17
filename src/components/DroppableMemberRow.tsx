import { useDroppable } from '@dnd-kit/core';
import { TeamMember } from '@/types/roadmap';
import { addDays, startOfWeek } from 'date-fns';

interface DroppableMemberRowProps {
  member: TeamMember;
  rowHeight: number;
  top: number;
  children: React.ReactNode;
  isOver: boolean;
  timelineBounds?: {
    start: Date;
    end: Date;
  };
  totalDays?: number;
  onDoubleClick?: (memberId: string, clickedDate: Date) => void;
}

export function DroppableMemberRow({ 
  member, 
  rowHeight, 
  top, 
  children, 
  isOver,
  timelineBounds,
  totalDays = 0,
  onDoubleClick
}: DroppableMemberRowProps) {
  const { setNodeRef } = useDroppable({
    id: `member-row-${member.id}`,
    data: {
      type: 'member-row',
      memberId: member.id,
    },
  });

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (!onDoubleClick || !timelineBounds || totalDays === 0) return;
    
    // Calculate the clicked date based on mouse position
    // Since DroppableMemberRow is positioned within the timeline area (no sidebar offset),
    // we use the full width for calculations
    const rect = event.currentTarget.getBoundingClientRect();
    const timelineWidth = rect.width;
    const clickX = event.clientX - rect.left;
    
    if (clickX < 0) return; // Clicked outside area
    
    // Calculate which day was clicked
    const pixelsPerDay = timelineWidth / totalDays;
    const dayOffset = Math.floor(clickX / pixelsPerDay);
    const clickedDate = addDays(timelineBounds.start, dayOffset);
    
    // Snap to start of week for better UX
    const weekStartDate = startOfWeek(clickedDate, { weekStartsOn: 1 }); // Monday start
    
    onDoubleClick(member.id, weekStartDate);
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute w-full border-b border-border/50 transition-all duration-150 cursor-pointer hover:bg-muted/20"
      style={{
        top: `${top}px`,
        height: `${rowHeight}px`,
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to add assignment"
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-primary/8 border-2 border-primary/25 rounded-md animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
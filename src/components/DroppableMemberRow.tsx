import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TeamMember, TeamMembership } from '@/types/roadmap';
import { addDays, startOfWeek, isBefore, isAfter } from 'date-fns';

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
  membership?: TeamMembership;
}

export function DroppableMemberRow({ 
  member, 
  rowHeight, 
  top, 
  children, 
  isOver,
  timelineBounds,
  totalDays = 0,
  onDoubleClick,
  membership
}: DroppableMemberRowProps) {
  const { setNodeRef } = useDroppable({
    id: `member-row-${member.id}`,
    data: {
      type: 'member-row',
      memberId: member.id,
    },
  });

  // Calculate inactive periods within the visible timeline
  const inactivePeriods = React.useMemo(() => {
    if (!membership || !timelineBounds || totalDays === 0) return [];
    
    const membershipStart = new Date(membership.start_month);
    const membershipEnd = membership.end_month ? new Date(membership.end_month) : null;
    
    const periods = [];
    
    // Pre-start period (member not yet on team)
    if (isBefore(timelineBounds.start, membershipStart)) {
      const preStartEnd = membershipStart < timelineBounds.end ? membershipStart : timelineBounds.end;
      periods.push({
        type: 'pre-start' as const,
        start: timelineBounds.start,
        end: preStartEnd
      });
    }
    
    // Post-end period (member no longer on team)
    if (membershipEnd && isAfter(timelineBounds.end, membershipEnd)) {
      const postEndStart = membershipEnd > timelineBounds.start ? membershipEnd : timelineBounds.start;
      periods.push({
        type: 'post-end' as const,
        start: postEndStart,
        end: timelineBounds.end
      });
    }
    
    return periods;
  }, [membership, timelineBounds, totalDays]);

  const handleDoubleClick = (event: React.MouseEvent) => {
    if (!onDoubleClick || !timelineBounds || totalDays === 0) return;
    
    // Calculate the clicked date based on mouse position
    const rect = event.currentTarget.getBoundingClientRect();
    const timelineWidth = rect.width;
    const clickX = event.clientX - rect.left;
    
    if (clickX < 0) return; // Clicked outside area
    
    // Calculate which day was clicked
    const pixelsPerDay = timelineWidth / totalDays;
    const dayOffset = Math.floor(clickX / pixelsPerDay);
    const clickedDate = addDays(timelineBounds.start, dayOffset);
    
    // Check if clicked date is during an inactive period
    if (membership && inactivePeriods.some(period => 
      clickedDate >= period.start && clickedDate <= period.end
    )) {
      // Don't allow assignment creation during inactive periods
      return;
    }
    
    // Snap to start of week for better UX
    const weekStartDate = startOfWeek(clickedDate, { weekStartsOn: 1 }); // Monday start
    
    onDoubleClick(member.id, weekStartDate);
  };

  // Render inactive period overlays
  const renderInactiveOverlays = () => {
    if (!timelineBounds || totalDays === 0) return null;
    
    return inactivePeriods.map((period, index) => {
      const startDayOffset = Math.max(0, Math.floor((period.start.getTime() - timelineBounds.start.getTime()) / (1000 * 60 * 60 * 24)));
      const endDayOffset = Math.min(totalDays, Math.ceil((period.end.getTime() - timelineBounds.start.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (startDayOffset >= endDayOffset) return null;
      
      const leftPercent = (startDayOffset / totalDays) * 100;
      const widthPercent = ((endDayOffset - startDayOffset) / totalDays) * 100;
      
      const overlayClass = period.type === 'pre-start' 
        ? 'bg-muted/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--muted-foreground)/0.1)_6px,hsl(var(--muted-foreground)/0.1)_12px)]'
        : 'bg-muted/30 bg-[repeating-linear-gradient(-45deg,transparent,transparent_8px,hsl(var(--muted-foreground)/0.15)_8px,hsl(var(--muted-foreground)/0.15)_16px)]';
      
      const tooltipText = period.type === 'pre-start' 
        ? 'Member not yet on team - cannot assign work'
        : 'Member no longer on team - cannot assign work';
      
      return (
        <div
          key={`inactive-${index}`}
          className={`absolute pointer-events-none ${overlayClass}`}
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            top: 0,
            height: '100%',
          }}
          title={tooltipText}
        />
      );
    });
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
      {renderInactiveOverlays()}
      {isOver && (
        <div className="absolute inset-0 bg-primary/8 border-2 border-primary/25 rounded-md animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
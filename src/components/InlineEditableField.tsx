import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ProjectStatus } from '@/types/roadmap';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineEditableFieldProps {
  value: any;
  onSave: (newValue: any) => Promise<void> | void;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  className?: string;
  displayValue?: string;
  variant?: 'default' | 'badge';
}

export function InlineEditableField({
  value,
  onSave,
  type,
  options = [],
  min,
  max,
  className = '',
  displayValue,
  variant = 'default'
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    let processedValue = editValue;
    
    if (type === 'number') {
      processedValue = parseInt(editValue);
      if (isNaN(processedValue)) {
        processedValue = value;
      }
    }
    
    // For date fields, validate the value before saving
    if (type === 'date' && processedValue) {
      try {
        // Basic date validation
        const date = new Date(processedValue);
        if (isNaN(date.getTime())) {
          processedValue = value; // Revert to original value if invalid
        }
      } catch (error) {
        processedValue = value; // Revert to original value if invalid
      }
    }
    
    try {
      await onSave(processedValue);
      setIsEditing(false);
    } catch (error) {
      // If save fails, keep editing mode open
      console.error('Error saving field:', error);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getStatusBadgeVariant = (status: ProjectStatus) => {
    switch (status) {
      case 'Complete':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Blocked':
        return 'destructive';
      case 'On Hold':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {type === 'select' ? (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-7 min-w-[120px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'boolean' ? (
          <Switch
            checked={editValue}
            onCheckedChange={setEditValue}
            className="data-[state=checked]:bg-primary"
          />
        ) : (
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            className="h-7 min-w-[80px] bg-background"
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const displayText = displayValue || value?.toString() || '';

  return (
    <div
      className={`group relative cursor-pointer transition-colors ${className}`}
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {variant === 'badge' ? (
        <div className="flex items-center gap-1">
          {type === 'select' && value ? (
            <Badge variant={getStatusBadgeVariant(value as ProjectStatus)} className="text-xs">
              {displayText}
            </Badge>
          ) : type === 'number' ? (
            <Badge 
              variant={value >= 8 ? "default" : value >= 6 ? "secondary" : "outline"} 
              className="text-xs"
            >
              {displayText}
            </Badge>
          ) : type === 'boolean' ? (
            value ? (
              <Badge variant="outline" className="text-xs">R&D</Badge>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )
          ) : (
            <span className="text-xs">{displayText}</span>
          )}
          {isHovered && (
            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className={type === 'date' ? 'text-xs text-muted-foreground' : 'text-sm'}>
            {type === 'date' && value 
              ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : displayText
            }
          </span>
          {isHovered && (
            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      )}
    </div>
  );
}
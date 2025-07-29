import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Save, X, Edit3 } from 'lucide-react';

interface CommentInputProps {
  existingComment?: string;
  onSave: (comment: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  existingComment = '',
  onSave,
  onCancel,
  placeholder = "Add your guidance or insights for this step...",
  disabled = false
}) => {
  const [comment, setComment] = useState(existingComment || '');
  const [isEditing, setIsEditing] = useState(!existingComment);

  const handleSave = () => {
    const trimmedComment = comment?.trim() || '';
    if (trimmedComment) {
      onSave(trimmedComment);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setComment(existingComment || '');
    setIsEditing(false);
    onCancel?.();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (!isEditing && existingComment) {
    return (
      <div className="border rounded-lg p-3 bg-muted/30 relative group">
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Your guidance:</p>
            <p className="text-sm">{existingComment}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={disabled}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Add Your Guidance</span>
      </div>
      
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={disabled}
      />
      
      <div className="flex gap-2 justify-end">
        {(isEditing && existingComment) || onCancel ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={disabled}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        ) : null}
        
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !(comment?.trim())}
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
};
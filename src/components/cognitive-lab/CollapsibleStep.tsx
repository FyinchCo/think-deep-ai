import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Bookmark, BookmarkCheck, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentInput } from './CommentInput';

interface Answer {
  id: string;
  step_number: number;
  answer_text: string;
  is_valid: boolean;
  judge_scores?: any;
  generated_at: string;
  retry_count: number;
  user_comment?: string;
  is_user_guided?: boolean;
}

interface CollapsibleStepProps {
  answer: Answer;
  showScores: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (stepId: string) => void;
  onSaveComment?: (stepId: string, comment: string) => void;
  defaultExpanded?: boolean;
}

export const CollapsibleStep: React.FC<CollapsibleStepProps> = ({
  answer,
  showScores,
  isBookmarked,
  onToggleBookmark,
  onSaveComment,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-warning';
    return 'text-destructive';
  };

  const preview = answer.answer_text.substring(0, 120) + (answer.answer_text.length > 120 ? '...' : '');

  return (
    <Card className="border-l-4 border-l-neural shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Badge className={cn("text-white", answer.is_user_guided ? "bg-primary" : "bg-neural")}>
              Step {answer.step_number}
              {answer.is_user_guided && <MessageSquareText className="h-3 w-3 ml-1" />}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleBookmark(answer.id)}
              className="h-6 w-6 p-0"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-neural" />
              ) : (
                <Bookmark className="h-4 w-4 text-muted-foreground hover:text-neural" />
              )}
            </Button>
          </div>
          {showScores && answer.judge_scores && (
            <div className="flex gap-2 text-xs">
              <span className={`font-medium ${getScoreColor(answer.judge_scores.novelty)}`}>
                N:{answer.judge_scores.novelty}
              </span>
              <span className={`font-medium ${getScoreColor(answer.judge_scores.depth)}`}>
                D:{answer.judge_scores.depth}
              </span>
              <span className={`font-medium ${getScoreColor(answer.judge_scores.coherence)}`}>
                C:{answer.judge_scores.coherence}
              </span>
              {answer.step_number > 1 && (
                <span className={`font-medium ${getScoreColor(answer.judge_scores.incremental_build)}`}>
                  I:{answer.judge_scores.incremental_build}
                </span>
              )}
              <span className={`font-medium ${getScoreColor(answer.judge_scores.relevance)}`}>
                R:{answer.judge_scores.relevance}
              </span>
              {/* Research Mode Scores */}
              {answer.judge_scores.evidence && (
                <span className={`font-medium ${getScoreColor(answer.judge_scores.evidence)} text-neural-accent`}>
                  E:{answer.judge_scores.evidence}
                </span>
              )}
              {answer.judge_scores.practicality && (
                <span className={`font-medium ${getScoreColor(answer.judge_scores.practicality)} text-neural-accent`}>
                  P:{answer.judge_scores.practicality}
                </span>
              )}
              {answer.judge_scores.research_rigor && (
                <span className={`font-medium ${getScoreColor(answer.judge_scores.research_rigor)} text-neural-accent`}>
                  RR:{answer.judge_scores.research_rigor}
                </span>
              )}
              {answer.judge_scores.breakthrough_potential && (
                <span className={`font-medium ${getScoreColor(answer.judge_scores.breakthrough_potential)} text-xs bg-neural/10 px-1 rounded`}>
                  BT:{answer.judge_scores.breakthrough_potential}
                </span>
              )}
            </div>
          )}
        </div>
        {!isExpanded && (
          <p className="text-sm text-muted-foreground ml-9 mt-1 cursor-pointer" onClick={() => setIsExpanded(true)}>
            {preview}
          </p>
        )}
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">{answer.answer_text}</p>
          
          {onSaveComment && (
            <CommentInput
              existingComment={answer.user_comment}
              onSave={(comment) => onSaveComment(answer.id, comment)}
              placeholder={`Guide the exploration from step ${answer.step_number}...`}
            />
          )}
          
          {showScores && answer.judge_scores && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">{answer.judge_scores.explanation}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';

interface ThoughtNode {
  id: string;
  step_number: number;
  answer_text: string;
  judge_scores?: any;
  conceptual_coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  semantic_weight?: number;
}

interface ThoughtTrajectoryProps {
  thoughts: ThoughtNode[];
  selectedThought: string | null;
  onThoughtSelect: (thoughtId: string) => void;
  isProcessing: boolean;
}

export const ThoughtTrajectory: React.FC<ThoughtTrajectoryProps> = ({
  thoughts,
  selectedThought,
  onThoughtSelect,
  isProcessing
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (thoughts.length === 0) {
      ctx.fillStyle = 'hsl(var(--muted-foreground))';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Consciousness trajectory will appear here...', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw trajectory path
    if (thoughts.length > 1) {
      ctx.beginPath();
      
      thoughts.forEach((thought, index) => {
        if (!thought.conceptual_coordinates) return;
        
        const x = (index / (thoughts.length - 1)) * (canvas.width - 100) + 50;
        const y = canvas.height - (thought.conceptual_coordinates.y + 100) * (canvas.height / 200) - 50;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw trajectory gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'hsla(var(--primary), 0.1)');
      gradient.addColorStop(1, 'hsla(var(--secondary), 0.1)');
      
      ctx.beginPath();
      thoughts.forEach((thought, index) => {
        if (!thought.conceptual_coordinates) return;
        
        const x = (index / (thoughts.length - 1)) * (canvas.width - 100) + 50;
        const y = canvas.height - (thought.conceptual_coordinates.y + 100) * (canvas.height / 200) - 50;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(canvas.width - 50, canvas.height - 50);
      ctx.lineTo(50, canvas.height - 50);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw thought points
    thoughts.forEach((thought, index) => {
      if (!thought.conceptual_coordinates) return;
      
      const x = (index / Math.max(thoughts.length - 1, 1)) * (canvas.width - 100) + 50;
      const y = canvas.height - (thought.conceptual_coordinates.y + 100) * (canvas.height / 200) - 50;
      const radius = 6 + (thought.semantic_weight || 0) * 8;

      // Glow effect for selected thought
      if (selectedThought === thought.id) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        glowGradient.addColorStop(0, 'hsla(var(--primary), 0.6)');
        glowGradient.addColorStop(1, 'hsla(var(--primary), 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Main point
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      const breakthrough = thought.judge_scores?.breakthrough_potential || 0;
      if (breakthrough >= 8) {
        ctx.fillStyle = 'hsl(var(--primary))';
      } else if (breakthrough >= 6) {
        ctx.fillStyle = 'hsl(var(--secondary))';
      } else {
        ctx.fillStyle = 'hsl(var(--muted))';
      }
      ctx.fill();
      
      ctx.strokeStyle = selectedThought === thought.id ? 'hsl(var(--primary))' : 'hsl(var(--border))';
      ctx.lineWidth = selectedThought === thought.id ? 3 : 1;
      ctx.stroke();

      // Step label
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(thought.step_number.toString(), x, y - radius - 8);
    });

    // Draw depth line (conceptual complexity over time)
    if (thoughts.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'hsla(var(--secondary), 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      thoughts.forEach((thought, index) => {
        const depth = thought.judge_scores?.depth || 0;
        const x = (index / (thoughts.length - 1)) * (canvas.width - 100) + 50;
        const y = canvas.height - (depth * 10) - 20;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Axes labels
    ctx.fillStyle = 'hsl(var(--muted-foreground))';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('Time →', 20, canvas.height - 10);
    
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('↑ Conceptual Height', 0, 0);
    ctx.restore();
  }, [thoughts, selectedThought]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    for (const [index, thought] of thoughts.entries()) {
      if (!thought.conceptual_coordinates) continue;
      
      const x = (index / Math.max(thoughts.length - 1, 1)) * (canvas.width - 100) + 50;
      const y = canvas.height - (thought.conceptual_coordinates.y + 100) * (canvas.height / 200) - 50;
      const radius = 6 + (thought.semantic_weight || 0) * 8;

      const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (distance <= radius + 5) {
        onThoughtSelect(thought.id);
        break;
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
      />
      
      {/* Legend */}
      {thoughts.length > 0 && (
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium">Trajectory Legend</div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Breakthrough</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-secondary"></div>
            <span>Significant</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-0.5 bg-secondary opacity-60" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', borderStyle: 'dashed'}}></div>
            <span>Depth trend</span>
          </div>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Mapping consciousness trajectory...</span>
          </div>
        </div>
      )}
    </div>
  );
};
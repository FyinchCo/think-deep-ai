import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target } from 'lucide-react';

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
  connection_strength?: number[];
}

interface ConceptNetworkProps {
  thoughts: ThoughtNode[];
  selectedThought: string | null;
  onThoughtSelect: (thoughtId: string) => void;
  isProcessing: boolean;
}

export const ConceptNetwork: React.FC<ConceptNetworkProps> = ({
  thoughts,
  selectedThought,
  onThoughtSelect,
  isProcessing
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredThought, setHoveredThought] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Clear canvas
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (thoughts.length === 0) {
      // Show empty state
      ctx.fillStyle = 'hsl(var(--muted-foreground))';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Begin observation to see consciousness unfold...', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw connections first (so they appear behind nodes)
    thoughts.forEach((thought, i) => {
      if (!thought.conceptual_coordinates) return;

      thoughts.forEach((other, j) => {
        if (i >= j || !other.conceptual_coordinates) return;

        const strength = thought.connection_strength?.[j] || 0;
        if (strength < 0.1) return; // Skip weak connections

        const x1 = (thought.conceptual_coordinates.x + 100) * (canvas.width / 200);
        const y1 = (thought.conceptual_coordinates.y + 100) * (canvas.height / 200);
        const x2 = (other.conceptual_coordinates.x + 100) * (canvas.width / 200);
        const y2 = (other.conceptual_coordinates.y + 100) * (canvas.height / 200);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(var(--primary), ${strength * 0.3})`;
        ctx.lineWidth = strength * 3;
        ctx.stroke();
      });
    });

    // Draw thought nodes
    thoughts.forEach((thought) => {
      if (!thought.conceptual_coordinates) return;

      const x = (thought.conceptual_coordinates.x + 100) * (canvas.width / 200);
      const y = (thought.conceptual_coordinates.y + 100) * (canvas.height / 200);
      const radius = 8 + (thought.semantic_weight || 0) * 12;

      // Node glow effect
      if (selectedThought === thought.id || hoveredThought === thought.id) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, 'hsla(var(--primary), 0.4)');
        gradient.addColorStop(1, 'hsla(var(--primary), 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Main node
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      // Color based on breakthrough potential
      const breakthrough = thought.judge_scores?.breakthrough_potential || 0;
      if (breakthrough >= 8) {
        ctx.fillStyle = 'hsl(var(--primary))';
      } else if (breakthrough >= 6) {
        ctx.fillStyle = 'hsl(var(--secondary))';
      } else {
        ctx.fillStyle = 'hsl(var(--muted))';
      }
      
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = selectedThought === thought.id ? 'hsl(var(--primary))' : 'hsl(var(--border))';
      ctx.lineWidth = selectedThought === thought.id ? 3 : 1;
      ctx.stroke();

      // Step number
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(thought.step_number.toString(), x, y + 3);
    });

    // Processing indicator
    if (isProcessing) {
      ctx.fillStyle = 'hsla(var(--muted-foreground), 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.font = '18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Consciousness telescope focusing...', canvas.width / 2, canvas.height / 2);
    }
  }, [thoughts, dimensions, selectedThought, hoveredThought, isProcessing]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Find clicked thought
    for (const thought of thoughts) {
      if (!thought.conceptual_coordinates) continue;

      const x = (thought.conceptual_coordinates.x + 100) * (canvas.width / 200);
      const y = (thought.conceptual_coordinates.y + 100) * (canvas.height / 200);
      const radius = 8 + (thought.semantic_weight || 0) * 12;

      const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (distance <= radius) {
        onThoughtSelect(thought.id);
        break;
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let foundHover = null;

    // Find hovered thought
    for (const thought of thoughts) {
      if (!thought.conceptual_coordinates) continue;

      const x = (thought.conceptual_coordinates.x + 100) * (canvas.width / 200);
      const y = (thought.conceptual_coordinates.y + 100) * (canvas.height / 200);
      const radius = 8 + (thought.semantic_weight || 0) * 12;

      const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
      if (distance <= radius) {
        foundHover = thought.id;
        break;
      }
    }

    setHoveredThought(foundHover);
    canvas.style.cursor = foundHover ? 'pointer' : 'default';
  };

  const hoveredThoughtData = hoveredThought ? thoughts.find(t => t.id === hoveredThought) : null;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredThought(null)}
        className="w-full h-full"
      />
      
      {/* Hover tooltip */}
      {hoveredThoughtData && (
        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Step {hoveredThoughtData.step_number}</Badge>
            {hoveredThoughtData.judge_scores?.breakthrough_potential >= 8 && (
              <Badge variant="secondary">Breakthrough</Badge>
            )}
          </div>
          <p className="text-sm line-clamp-3">{hoveredThoughtData.answer_text}</p>
          {hoveredThoughtData.judge_scores && (
            <div className="flex gap-2 mt-2 text-xs">
              <span>Novelty: {hoveredThoughtData.judge_scores.novelty}</span>
              <span>Depth: {hoveredThoughtData.judge_scores.depth}</span>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {thoughts.length > 0 && !isProcessing && (
        <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            Click any thought to explore deeper
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Focusing consciousness telescope...</span>
          </div>
        </div>
      )}
    </div>
  );
};
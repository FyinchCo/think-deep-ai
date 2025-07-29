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

    console.log('ConceptNetwork: Canvas dimensions:', dimensions);
    console.log('ConceptNetwork: Thoughts to render:', thoughts);

    // Clear canvas with a visible background
    ctx.fillStyle = '#1a1a1a'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (thoughts.length === 0) {
      // Show empty state
      ctx.fillStyle = '#888888';
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
        ctx.strokeStyle = `rgba(139, 92, 246, ${Math.min(strength * 0.3, 1)})`; // Ensure alpha is valid
        ctx.lineWidth = Math.max(strength * 3, 1);
        ctx.stroke();
      });
    });

    // Draw thought nodes
    thoughts.forEach((thought, index) => {
      if (!thought.conceptual_coordinates) return;

      const rawX = (thought.conceptual_coordinates.x + 100) * (canvas.width / 200);
      const rawY = (thought.conceptual_coordinates.y + 100) * (canvas.height / 200);
      
      // Validate coordinates
      const x = isFinite(rawX) ? rawX : canvas.width / 2;
      const y = isFinite(rawY) ? rawY : canvas.height / 2;
      const radius = Math.max(8 + (thought.semantic_weight || 0) * 12, 8);

      console.log(`ConceptNetwork: Drawing thought ${index} at (${x}, ${y}) with radius ${radius}`, {
        originalCoords: thought.conceptual_coordinates,
        semanticWeight: thought.semantic_weight,
        canvasSize: { width: canvas.width, height: canvas.height }
      });

      // Simple selection highlight (no gradient for now)
      if (selectedThought === thought.id || hoveredThought === thought.id) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.fill();
      }

      // Main node
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      
      // Color based on breakthrough potential
      const breakthrough = thought.judge_scores?.breakthrough_potential || 0;
      if (breakthrough >= 8) {
        ctx.fillStyle = '#8b5cf6'; // Primary purple
      } else if (breakthrough >= 6) {
        ctx.fillStyle = '#06b6d4'; // Secondary cyan
      } else {
        ctx.fillStyle = '#6b7280'; // Muted gray
      }
      
      ctx.fill();
      
      // Node border
      ctx.strokeStyle = selectedThought === thought.id ? '#8b5cf6' : '#374151';
      ctx.lineWidth = selectedThought === thought.id ? 3 : 1;
      ctx.stroke();

      // Step number
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(thought.step_number.toString(), x, y);
    });

    // Processing indicator
    if (isProcessing) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#8b5cf6';
      ctx.font = '18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
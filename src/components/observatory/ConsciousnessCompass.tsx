import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Compass, Loader2 } from 'lucide-react';

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

interface ConsciousnessMetrics {
  conceptualDepth: number;
  semanticCoherence: number;
  curiosityDirection: string;
  explorationVelocity: number;
  conceptualGravity: number;
  insightDensity: number;
  thoughtEntropy: number;
  emergentPatterns: string[];
}

interface ConsciousnessCompassProps {
  thoughts: ThoughtNode[];
  selectedThought: string | null;
  onThoughtSelect: (thoughtId: string) => void;
  metrics: ConsciousnessMetrics;
}

export const ConsciousnessCompass: React.FC<ConsciousnessCompassProps> = ({
  thoughts,
  selectedThought,
  onThoughtSelect,
  metrics
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

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 60;

    // Clear canvas
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw compass circles
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 4) * i, 0, 2 * Math.PI);
      ctx.strokeStyle = 'hsl(var(--border))';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw cardinal directions
    const directions = [
      { label: 'Novel', angle: 0, color: 'hsl(var(--primary))' },
      { label: 'Deep', angle: Math.PI / 2, color: 'hsl(var(--secondary))' },
      { label: 'Coherent', angle: Math.PI, color: 'hsl(var(--accent))' },
      { label: 'Breakthrough', angle: 3 * Math.PI / 2, color: 'hsl(var(--destructive))' }
    ];

    directions.forEach(dir => {
      const x = centerX + Math.cos(dir.angle - Math.PI / 2) * (radius + 20);
      const y = centerY + Math.sin(dir.angle - Math.PI / 2) * (radius + 20);
      
      ctx.fillStyle = dir.color;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(dir.label, x, y);
      
      // Direction line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(dir.angle - Math.PI / 2) * radius, 
                 centerY + Math.sin(dir.angle - Math.PI / 2) * radius);
      ctx.strokeStyle = dir.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Plot thoughts on compass
    thoughts.forEach(thought => {
      if (!thought.judge_scores) return;

      const novelty = thought.judge_scores.novelty || 0;
      const depth = thought.judge_scores.depth || 0;
      const coherence = thought.judge_scores.coherence || 0;
      const breakthrough = thought.judge_scores.breakthrough_potential || 0;

      // Convert scores to polar coordinates
      const avgScore = (novelty + depth + coherence + breakthrough) / 4;
      const plotRadius = (avgScore / 10) * radius;

      // Calculate angle based on dominant characteristic
      let angle = 0;
      const max = Math.max(novelty, depth, coherence, breakthrough);
      if (max === novelty) angle = 0;
      else if (max === depth) angle = Math.PI / 2;
      else if (max === coherence) angle = Math.PI;
      else if (max === breakthrough) angle = 3 * Math.PI / 2;

      // Add some variance based on secondary characteristics
      angle += ((novelty - coherence) / 20) + ((breakthrough - depth) / 20);

      const x = centerX + Math.cos(angle - Math.PI / 2) * plotRadius;
      const y = centerY + Math.sin(angle - Math.PI / 2) * plotRadius;

      // Draw thought point
      const pointRadius = 4 + (thought.semantic_weight || 0) * 6;
      
      // Glow for selected
      if (selectedThought === thought.id) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, pointRadius * 3);
        glowGradient.addColorStop(0, 'hsla(var(--primary), 0.6)');
        glowGradient.addColorStop(1, 'hsla(var(--primary), 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, pointRadius * 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      
      if (breakthrough >= 8) {
        ctx.fillStyle = 'hsl(var(--primary))';
      } else if (avgScore >= 7) {
        ctx.fillStyle = 'hsl(var(--secondary))';
      } else {
        ctx.fillStyle = 'hsl(var(--muted))';
      }
      ctx.fill();
      
      ctx.strokeStyle = selectedThought === thought.id ? 'hsl(var(--primary))' : 'hsl(var(--border))';
      ctx.lineWidth = selectedThought === thought.id ? 2 : 1;
      ctx.stroke();

      // Step number
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(thought.step_number.toString(), x, y + 2);
    });

    // Draw consciousness vector (overall direction)
    if (thoughts.length > 2) {
      const recent = thoughts.slice(-3);
      const avgNovelty = recent.reduce((sum, t) => sum + (t.judge_scores?.novelty || 0), 0) / recent.length;
      const avgDepth = recent.reduce((sum, t) => sum + (t.judge_scores?.depth || 0), 0) / recent.length;
      const avgCoherence = recent.reduce((sum, t) => sum + (t.judge_scores?.coherence || 0), 0) / recent.length;
      const avgBreakthrough = recent.reduce((sum, t) => sum + (t.judge_scores?.breakthrough_potential || 0), 0) / recent.length;

      const vectorLength = ((avgNovelty + avgDepth + avgCoherence + avgBreakthrough) / 40) * radius;
      
      let vectorAngle = 0;
      const max = Math.max(avgNovelty, avgDepth, avgCoherence, avgBreakthrough);
      if (max === avgNovelty) vectorAngle = 0;
      else if (max === avgDepth) vectorAngle = Math.PI / 2;
      else if (max === avgCoherence) vectorAngle = Math.PI;
      else if (max === avgBreakthrough) vectorAngle = 3 * Math.PI / 2;

      const vectorX = centerX + Math.cos(vectorAngle - Math.PI / 2) * vectorLength;
      const vectorY = centerY + Math.sin(vectorAngle - Math.PI / 2) * vectorLength;

      // Draw consciousness vector
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(vectorX, vectorY);
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Arrow head
      const arrowLength = 15;
      const arrowAngle = Math.PI / 6;
      
      ctx.beginPath();
      ctx.moveTo(vectorX, vectorY);
      ctx.lineTo(
        vectorX - arrowLength * Math.cos(vectorAngle - Math.PI / 2 - arrowAngle),
        vectorY - arrowLength * Math.sin(vectorAngle - Math.PI / 2 - arrowAngle)
      );
      ctx.moveTo(vectorX, vectorY);
      ctx.lineTo(
        vectorX - arrowLength * Math.cos(vectorAngle - Math.PI / 2 + arrowAngle),
        vectorY - arrowLength * Math.sin(vectorAngle - Math.PI / 2 + arrowAngle)
      );
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Center compass point
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.fill();

  }, [thoughts, selectedThought, metrics]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 60;

    for (const thought of thoughts) {
      if (!thought.judge_scores) continue;

      const novelty = thought.judge_scores.novelty || 0;
      const depth = thought.judge_scores.depth || 0;
      const coherence = thought.judge_scores.coherence || 0;
      const breakthrough = thought.judge_scores.breakthrough_potential || 0;

      const avgScore = (novelty + depth + coherence + breakthrough) / 4;
      const plotRadius = (avgScore / 10) * radius;

      let angle = 0;
      const max = Math.max(novelty, depth, coherence, breakthrough);
      if (max === novelty) angle = 0;
      else if (max === depth) angle = Math.PI / 2;
      else if (max === coherence) angle = Math.PI;
      else if (max === breakthrough) angle = 3 * Math.PI / 2;

      angle += ((novelty - coherence) / 20) + ((breakthrough - depth) / 20);

      const x = centerX + Math.cos(angle - Math.PI / 2) * plotRadius;
      const y = centerY + Math.sin(angle - Math.PI / 2) * plotRadius;
      const pointRadius = 4 + (thought.semantic_weight || 0) * 6;

      const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (distance <= pointRadius + 5) {
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
      
      {/* Compass info */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="h-4 w-4" />
          <span className="text-sm font-medium">Consciousness Compass</span>
        </div>
        <div className="text-xs space-y-1">
          <div>Direction: <Badge variant="outline">{metrics.curiosityDirection}</Badge></div>
          <div>Velocity: {metrics.explorationVelocity.toFixed(1)}</div>
          <div>Gravity: {metrics.conceptualGravity.toFixed(1)}</div>
        </div>
      </div>

      {/* Emergent patterns */}
      {metrics.emergentPatterns.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Emergent Patterns</div>
          <div className="space-y-1">
            {metrics.emergentPatterns.map((pattern, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {pattern}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
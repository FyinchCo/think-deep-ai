import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Flame, Zap, Star, Brain } from "lucide-react";

interface BrillianceMetrics {
  paradigmShiftPotential: number;
  conceptualNoveltyScore: number;
  ontologicalDepth: number;
  brillianceTrigger: boolean;
  brillianceType: 'paradigmatic' | 'ontological' | 'epistemological' | 'meta-cognitive' | null;
  brillianceConfidence: number;
  recommendation: string;
}

interface BrillianceMonitorProps {
  metrics: BrillianceMetrics;
  brillianceModeActive: boolean;
  onToggleBrillianceMode: () => void;
}

export const BrillianceMonitor = ({ 
  metrics, 
  brillianceModeActive, 
  onToggleBrillianceMode 
}: BrillianceMonitorProps) => {
  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'paradigmatic': return <Brain className="h-4 w-4" />;
      case 'ontological': return <Star className="h-4 w-4" />;
      case 'epistemological': return <Zap className="h-4 w-4" />;
      case 'meta-cognitive': return <Flame className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'paradigmatic': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ontological': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'epistemological': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'meta-cognitive': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getBrillianceVariant = () => {
    if (metrics.brillianceTrigger) return 'destructive';
    if (metrics.brillianceConfidence > 0.5) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          Brilliance Detection
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Brilliance Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Brilliance Mode</span>
          <Button 
            variant={getBrillianceVariant()}
            size="sm"
            onClick={onToggleBrillianceMode}
            className={`text-xs ${brillianceModeActive ? 'animate-pulse' : ''}`}
          >
            {brillianceModeActive ? (
              <>
                <Flame className="h-3 w-3 mr-1" />
                ACTIVE
              </>
            ) : (
              'ACTIVATE'
            )}
          </Button>
        </div>

        {/* Brilliance Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Brilliance Confidence</span>
            <span>{Math.round(metrics.brillianceConfidence * 100)}%</span>
          </div>
          <Progress 
            value={metrics.brillianceConfidence * 100} 
            className="h-2"
          />
        </div>

        {/* Brilliance Type */}
        {metrics.brillianceType && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Type:</span>
            <Badge variant="outline" className={`text-xs ${getTypeColor(metrics.brillianceType)}`}>
              {getTypeIcon(metrics.brillianceType)}
              <span className="ml-1 capitalize">{metrics.brillianceType}</span>
            </Badge>
          </div>
        )}

        {/* Detailed Metrics */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">Paradigm</div>
            <div className="text-center">
              <div className="font-mono">{Math.round(metrics.paradigmShiftPotential * 100)}%</div>
              <Progress value={metrics.paradigmShiftPotential * 100} className="h-1" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Novelty</div>
            <div className="text-center">
              <div className="font-mono">{Math.round(metrics.conceptualNoveltyScore * 100)}%</div>
              <Progress value={metrics.conceptualNoveltyScore * 100} className="h-1" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Depth</div>
            <div className="text-center">
              <div className="font-mono">{Math.round(metrics.ontologicalDepth * 100)}%</div>
              <Progress value={metrics.ontologicalDepth * 100} className="h-1" />
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {metrics.recommendation && (
          <div className={`text-xs p-2 rounded ${
            metrics.brillianceTrigger 
              ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' 
              : metrics.brillianceConfidence > 0.5
              ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            {metrics.recommendation}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
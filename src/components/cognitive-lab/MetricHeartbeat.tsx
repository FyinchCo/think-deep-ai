import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Shield, TrendingUp } from "lucide-react";

interface HeartbeatMetrics {
  livesImprovedEstimate: number; // DALYs/QALYs saved
  systemResilienceScore: number; // 0-1 scale
  equityIndex: number; // Gini coefficient (0-1, lower is more equal)
  targetLives: number; // Goal (e.g., 1 billion)
  lastUpdated: number; // Step number
}

interface MetricHeartbeatProps {
  metrics: HeartbeatMetrics;
  currentStep: number;
}

export const MetricHeartbeat = ({ metrics, currentStep }: MetricHeartbeatProps) => {
  const progressToTarget = (metrics.livesImprovedEstimate / metrics.targetLives) * 100;
  const progressDisplay = Math.min(progressToTarget, 100);
  
  const getResilienceColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-400";
    if (score >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getEquityColor = (gini: number) => {
    if (gini <= 0.3) return "text-emerald-400"; // Good equality
    if (gini <= 0.5) return "text-yellow-400"; // Moderate inequality
    return "text-red-400"; // High inequality
  };

  const formatLivesNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary animate-pulse" />
          Metric Heartbeat
          <Badge variant="outline" className="text-xs">
            Step {currentStep}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Lives Improved Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Lives Improved</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatLivesNumber(metrics.livesImprovedEstimate)} / {formatLivesNumber(metrics.targetLives)}
            </div>
          </div>
          <Progress value={progressDisplay} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progressToTarget.toFixed(3)}% of goal achieved
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* System Resilience */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span className="text-xs">Resilience</span>
            </div>
            <div className="text-center">
              <div className={`text-sm font-mono ${getResilienceColor(metrics.systemResilienceScore)}`}>
                {(metrics.systemResilienceScore * 100).toFixed(1)}%
              </div>
              <Progress value={metrics.systemResilienceScore * 100} className="h-1" />
            </div>
          </div>

          {/* Equity Index */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Equity</span>
            </div>
            <div className="text-center">
              <div className={`text-sm font-mono ${getEquityColor(metrics.equityIndex)}`}>
                {(metrics.equityIndex * 100).toFixed(1)}
              </div>
              <Progress value={100 - (metrics.equityIndex * 100)} className="h-1" />
            </div>
          </div>
        </div>

        {/* Last Updated Indicator */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
          Last updated: Step {metrics.lastUpdated}
          {currentStep > metrics.lastUpdated && (
            <span className="text-orange-400 ml-1">
              ({currentStep - metrics.lastUpdated} steps behind)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
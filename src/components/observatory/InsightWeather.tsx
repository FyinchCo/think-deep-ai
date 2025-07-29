import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Sun, CloudRain, Zap, Wind, Snowflake } from 'lucide-react';

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

interface InsightWeatherProps {
  metrics: ConsciousnessMetrics;
}

export const InsightWeather: React.FC<InsightWeatherProps> = ({ metrics }) => {
  const getWeatherIcon = () => {
    const { insightDensity, thoughtEntropy, semanticCoherence } = metrics;
    
    if (insightDensity >= 8) return <Zap className="h-5 w-5 text-yellow-500" />;
    if (thoughtEntropy >= 7) return <CloudRain className="h-5 w-5 text-blue-500" />;
    if (semanticCoherence >= 8) return <Sun className="h-5 w-5 text-orange-500" />;
    if (semanticCoherence <= 3) return <Snowflake className="h-5 w-5 text-blue-300" />;
    return <Cloud className="h-5 w-5 text-gray-500" />;
  };

  const getWeatherCondition = () => {
    const { insightDensity, thoughtEntropy, semanticCoherence, conceptualDepth } = metrics;
    
    if (insightDensity >= 8) return "Breakthrough Storm";
    if (thoughtEntropy >= 7 && semanticCoherence <= 4) return "Conceptual Turbulence";
    if (semanticCoherence >= 8 && conceptualDepth >= 7) return "Clear Thinking";
    if (conceptualDepth >= 8) return "Deep Currents";
    if (thoughtEntropy >= 6) return "Scattered Thoughts";
    if (semanticCoherence <= 3) return "Foggy Territory";
    return "Partly Conscious";
  };

  const getWeatherDescription = () => {
    const condition = getWeatherCondition();
    
    switch (condition) {
      case "Breakthrough Storm":
        return "High density of breakthrough insights with electrical potential for major discoveries.";
      case "Conceptual Turbulence":
        return "Chaotic thought patterns creating dynamic but unstable conceptual weather.";
      case "Clear Thinking":
        return "Optimal conditions with high coherence and depth. Perfect for exploration.";
      case "Deep Currents":
        return "Strong undercurrents of profound thought moving through consciousness.";
      case "Scattered Thoughts":
        return "High entropy creating unpredictable but potentially creative conditions.";
      case "Foggy Territory":
        return "Low visibility in conceptual space. Proceed with careful navigation.";
      default:
        return "Mixed conditions with some clarity and some confusion.";
    }
  };

  const getIntensityColor = () => {
    const intensity = (metrics.insightDensity + metrics.conceptualDepth) / 2;
    
    if (intensity >= 8) return "text-red-500";
    if (intensity >= 6) return "text-orange-500";
    if (intensity >= 4) return "text-yellow-500";
    return "text-blue-500";
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon()}
            <div>
              <h3 className="font-semibold text-lg">{getWeatherCondition()}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {getWeatherDescription()}
              </p>
            </div>
          </div>
          
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Velocity: <span className={getIntensityColor()}>{metrics.explorationVelocity.toFixed(1)}</span>
              </span>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Entropy: {metrics.thoughtEntropy.toFixed(1)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Density: {metrics.insightDensity.toFixed(1)}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Direction: {metrics.curiosityDirection}
            </div>
          </div>
        </div>
        
        {/* Weather indicators */}
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-blue-500"
              style={{ opacity: metrics.semanticCoherence / 10 }}
            ></div>
            <span>Coherence</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-purple-500"
              style={{ opacity: metrics.conceptualDepth / 10 }}
            ></div>
            <span>Depth</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-yellow-500"
              style={{ opacity: metrics.insightDensity / 10 }}
            ></div>
            <span>Insights</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full bg-red-500"
              style={{ opacity: metrics.thoughtEntropy / 10 }}
            ></div>
            <span>Entropy</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
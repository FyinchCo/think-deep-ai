import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scissors, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";

interface ConceptUsage {
  acronym: string;
  fullName: string;
  introducedAtStep: number;
  lastReferencedAtStep: number;
  referenceCount: number;
  isCandidate: boolean; // For pruning
}

interface PruningRitualProps {
  concepts: ConceptUsage[];
  currentStep: number;
  onPruneConcepts: (acronymsToRemove: string[]) => void;
  lastPruningStep: number;
}

export const PruningRitual = ({ 
  concepts, 
  currentStep, 
  onPruneConcepts, 
  lastPruningStep 
}: PruningRitualProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const stepsSinceLastPruning = currentStep - lastPruningStep;
  const shouldTriggerPruning = stepsSinceLastPruning >= 10;
  
  const prunableConcepts = concepts.filter(concept => {
    const stepsSinceLastReference = currentStep - concept.lastReferencedAtStep;
    const stepsSinceIntroduction = currentStep - concept.introducedAtStep;
    
    // Prune if: introduced more than 5 steps ago, referenced less than 2 times, 
    // and not referenced in last 5 steps
    return stepsSinceIntroduction > 5 && 
           concept.referenceCount < 2 && 
           stepsSinceLastReference > 5;
  });

  const staleConcepts = concepts.filter(concept => {
    const stepsSinceLastReference = currentStep - concept.lastReferencedAtStep;
    return stepsSinceLastReference > 10 && concept.referenceCount >= 2;
  });

  const activeConcepts = concepts.filter(concept => {
    const stepsSinceLastReference = currentStep - concept.lastReferencedAtStep;
    return stepsSinceLastReference <= 5;
  });

  const handlePruning = () => {
    const acronymsToRemove = prunableConcepts.map(c => c.acronym);
    onPruneConcepts(acronymsToRemove);
  };

  const getConceptStatusColor = (concept: ConceptUsage) => {
    const stepsSinceLastReference = currentStep - concept.lastReferencedAtStep;
    
    if (stepsSinceLastReference <= 2) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (stepsSinceLastReference <= 5) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    if (concept.referenceCount < 2) return "bg-red-500/20 text-red-300 border-red-500/30";
    return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scissors className="h-4 w-4 text-orange-400" />
          Acronym Reaper
          {shouldTriggerPruning && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Pruning Due
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span>Active</span>
            </div>
            <div className="font-mono text-emerald-400">{activeConcepts.length}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-yellow-400" />
              <span>Stale</span>
            </div>
            <div className="font-mono text-yellow-400">{staleConcepts.length}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span>Prunable</span>
            </div>
            <div className="font-mono text-red-400">{prunableConcepts.length}</div>
          </div>
        </div>

        {/* Pruning Action */}
        {shouldTriggerPruning && prunableConcepts.length > 0 && (
          <div className="space-y-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handlePruning}
              className="w-full text-xs"
            >
              <Scissors className="h-3 w-3 mr-1" />
              Prune {prunableConcepts.length} Concepts
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              Remove unused concepts to reduce cognitive load
            </div>
          </div>
        )}

        {/* Concept List Toggle */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs"
        >
          {isExpanded ? 'Hide' : 'Show'} Concept Details ({concepts.length})
        </Button>

        {/* Detailed Concept List */}
        {isExpanded && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {concepts.map((concept) => (
              <div key={concept.acronym} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getConceptStatusColor(concept)}>
                    {concept.acronym}
                  </Badge>
                  <span className="text-muted-foreground truncate max-w-32">
                    {concept.fullName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>#{concept.introducedAtStep}</span>
                  <span>→</span>
                  <span>#{concept.lastReferencedAtStep}</span>
                  <span>({concept.referenceCount}x)</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Last Pruning Info */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
          Last pruning: Step {lastPruningStep} ({stepsSinceLastPruning} steps ago)
        </div>
      </CardContent>
    </Card>
  );
};
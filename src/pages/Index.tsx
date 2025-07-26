// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-neural via-neural-secondary to-neural-accent rounded-3xl shadow-[var(--shadow-neural)]">
            <Brain className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-neural via-neural-secondary to-neural-accent bg-clip-text text-transparent">
            ThinkDeep AI
          </h1>
        </div>
        
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Explore the depths of philosophical questions through incremental AI-guided discovery.
          Each step builds meaningfully upon the last, creating unprecedented intellectual journeys.
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/cognitive-lab')}
            className="bg-gradient-to-r from-neural to-neural-secondary hover:from-neural-secondary hover:to-neural-accent shadow-[var(--shadow-neural)] text-lg px-8 py-6"
            size="lg"
          >
            Enter Cognitive Lab
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Proof of concept for incremental value AI exploration
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

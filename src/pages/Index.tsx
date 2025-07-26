// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background relative overflow-hidden">
      {/* Ominous background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-axiom/5 to-background opacity-60"></div>
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-axiom/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-axiom-accent/10 rounded-full blur-2xl"></div>
      
      <div className="text-center max-w-2xl mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="p-4 bg-gradient-to-br from-axiom via-axiom-secondary to-axiom-shadow rounded-2xl shadow-[var(--shadow-axiom)] border border-axiom/20">
            <Brain className="h-14 w-14 text-foreground" />
          </div>
          <div className="text-left">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground via-axiom-accent to-foreground bg-clip-text text-transparent">
              The Axiom
            </h1>
            <h2 className="text-3xl font-medium text-axiom-accent mt-1">
              Project
            </h2>
          </div>
        </div>
        
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Descend into the depths of forbidden knowledge through incremental discovery.
          Each revelation builds upon the last, unveiling truths that challenge reality itself.
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/cognitive-lab')}
            className="bg-gradient-to-r from-axiom to-axiom-accent hover:from-axiom-accent hover:to-primary shadow-[var(--shadow-crimson)] text-lg px-8 py-6 border border-axiom/30"
            size="lg"
          >
            Enter the Laboratory
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <p className="text-sm text-muted-foreground/80">
            Experimental protocol for reality dissolution
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;

# Technical Architecture Documentation

## System Overview

The Axiom Project is a sophisticated AI-powered cognitive exploration system designed to generate breakthrough philosophical insights through iterative exploration and multi-model AI orchestration.

## Architecture Patterns

### 1. Microservices Architecture
- **Frontend**: React SPA with TypeScript
- **Backend**: Supabase Edge Functions (serverless)
- **Database**: PostgreSQL with vector extensions
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase for structured data + vector embeddings

### 2. Event-Driven Architecture
- Real-time exploration updates via Supabase subscriptions
- Asynchronous AI model interactions
- Event logging for analytics and debugging
- Webhook integrations for external services

### 3. Security-First Design
- Zero-trust security model
- Row-level security (RLS) for data isolation
- JWT-based authentication for all API calls
- Encrypted secrets management via Supabase Vault

## Core Components

### Frontend Architecture (React/TypeScript)

```
src/
├── components/
│   ├── cognitive-lab/         # Core exploration components
│   ├── observatory/           # Analytics and visualization
│   └── ui/                    # Reusable UI components (shadcn/ui)
├── hooks/                     # Custom React hooks
│   ├── useAuth.tsx           # Authentication management
│   ├── useBrillianceDetection.ts # Quality assessment
│   ├── useBreakthroughDetection.ts # Paradigm shift detection
│   └── useCoherenceTracking.ts # Exploration coherence
├── pages/                     # Route components
├── integrations/
│   └── supabase/             # Supabase client and types
└── lib/                      # Utility functions
```

### Backend Architecture (Supabase Edge Functions)

```
supabase/functions/
├── rabbit-hole-step/          # Core exploration engine
├── panel-step/               # Multi-agent exploration
├── grounding-panel-step/     # Reality-anchored exploration
├── brilliance-compression-engine/ # Quality analysis
├── breakthrough-engine/       # Paradigm shift detection
├── atom-status-engine/       # System health monitoring
└── optimized-prompts/        # Prompt template management
```

### Database Schema

#### Core Tables
```sql
-- Exploration sessions
rabbit_holes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  initial_question TEXT NOT NULL,
  domain TEXT DEFAULT 'philosophy',
  status TEXT DEFAULT 'active',
  total_steps INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Generated insights
answers (
  id UUID PRIMARY KEY,
  rabbit_hole_id UUID REFERENCES rabbit_holes(id),
  step_number INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  judge_scores JSONB,
  generator_model TEXT,
  judge_model TEXT,
  retry_count INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vector embeddings for novelty detection
answer_embeddings (
  answer_id UUID REFERENCES answers(id),
  embedding VECTOR(1536),
  domain TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Advanced Tables
```sql
-- Customizable exploration rules
exploration_rules (
  id UUID PRIMARY KEY,
  rabbit_hole_id UUID REFERENCES rabbit_holes(id),
  user_id UUID REFERENCES auth.users(id),
  rule_text TEXT NOT NULL,
  rule_type TEXT DEFAULT 'methodological',
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  trigger_condition TEXT,
  scope TEXT DEFAULT 'all',
  effectiveness_score NUMERIC DEFAULT 0
);

-- Breakthrough detection tracking
paradigm_shifts (
  id UUID PRIMARY KEY,
  rabbit_hole_id UUID REFERENCES rabbit_holes(id),
  answer_id UUID REFERENCES answers(id),
  intensity_score REAL NOT NULL,
  shift_type TEXT NOT NULL,
  conceptual_revolution_markers JSONB DEFAULT '[]',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## AI Model Integration

### Model Orchestration Strategy

```typescript
interface AIModelConfig {
  primary: 'grok' | 'openai' | 'gemini' | 'anthropic';
  fallback: AIProvider[];
  timeout: number;
  retryPolicy: RetryConfig;
}

class AIOrchestrator {
  async generateResponse(
    prompt: string, 
    config: AIModelConfig
  ): Promise<AIResponse> {
    // 1. Try primary model
    // 2. Fallback on failure
    // 3. Apply retry logic
    // 4. Return best response
  }
}
```

### Cognitive Pressure Algorithm

```typescript
interface PressureConfig {
  baseComplexity: number;
  escalationRate: number;
  qualityMomentum: number;
  domainModifiers: Record<string, number>;
  brillianceMode: boolean;
}

function calculateCognitivePressure(
  stepNumber: number,
  recentAnswers: Answer[],
  config: PressureConfig
): number {
  const momentum = calculateQualityMomentum(recentAnswers);
  const territoryBonus = detectBrillianceTerritory(recentAnswers) ? 0.3 : 0;
  
  return Math.min(
    config.baseComplexity + 
    (stepNumber * config.escalationRate) + 
    momentum + 
    territoryBonus,
    1.0 // Cap at maximum pressure
  );
}
```

### Quality Assessment Framework

```typescript
interface QualityMetrics {
  novelty: number;          // 0-1 scale
  coherence: number;        // 0-1 scale
  depth: number;           // 0-1 scale
  breakthrough: number;     // 0-1 scale
  practicality: number;    // 0-1 scale
  clarity: number;         // 0-1 scale
  buildingUpon: number;    // 0-1 scale
}

class QualityAssessor {
  async assessQuality(
    answer: string,
    context: ExplorationContext
  ): Promise<QualityMetrics> {
    // Multi-dimensional quality assessment
    // Uses dedicated AI judge model
    // Returns structured quality scores
  }
}
```

## Security Architecture

### Authentication Flow
```
1. User Registration/Login
   ↓ (Supabase Auth)
2. JWT Token Generation
   ↓
3. Client-Side Token Storage
   ↓
4. API Request with Bearer Token
   ↓
5. Edge Function JWT Verification
   ↓
6. Database Access with RLS
```

### Row-Level Security (RLS) Policies

```sql
-- Example: Users can only access their own rabbit holes
CREATE POLICY "Users can view their own rabbit holes" 
ON rabbit_holes 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Example: Users can only access answers from their explorations
CREATE POLICY "Users can view answers from their rabbit holes" 
ON answers 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rabbit_holes 
    WHERE rabbit_holes.id = answers.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);
```

### API Security

```typescript
// Edge Function Security Middleware
export const verifyAuth = async (req: Request): Promise<User | null> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }
  
  return user;
};
```

## Performance Optimizations

### Database Performance
- **Indexes**: Optimized for common query patterns
- **Connection Pooling**: Supabase managed connections
- **Query Optimization**: Efficient JOINs and subqueries
- **Vector Operations**: Optimized embedding similarity searches

### Frontend Performance
- **Code Splitting**: Route-based lazy loading
- **Memoization**: React.memo and useMemo optimizations
- **Virtual Scrolling**: For large answer lists
- **Debouncing**: User input handling

### AI API Optimization
- **Response Caching**: Cache similar prompts
- **Batch Processing**: Group related API calls
- **Timeout Management**: Prevent hanging requests
- **Cost Monitoring**: Track API usage and costs

## Monitoring & Observability

### Application Metrics
- Response times for exploration steps
- AI model success/failure rates
- Quality score distributions
- User engagement patterns

### System Health
- Database connection status
- Edge function performance
- AI provider availability
- Error rates and patterns

### Business Metrics
- Exploration completion rates
- Breakthrough detection frequency
- User retention and engagement
- Cost per exploration metrics

## Scalability Considerations

### Horizontal Scaling
- **Serverless Functions**: Auto-scaling edge functions
- **Database**: Supabase managed scaling
- **CDN**: Global content distribution
- **Caching**: Redis for session data

### Vertical Scaling
- **Database**: Connection pooling optimization
- **Memory**: Efficient data structures
- **CPU**: Algorithm optimization
- **Storage**: Efficient data serialization

### Cost Optimization
- **AI API Usage**: Smart caching and batching
- **Database Queries**: Efficient query patterns
- **Storage**: Data archival strategies
- **Compute**: Serverless auto-scaling

## Deployment Architecture

### Environment Strategy
```
Development → Staging → Production
     ↓           ↓         ↓
   Local      Preview   Deployed
  Supabase   Supabase  Supabase
```

### CI/CD Pipeline
1. **Code Push**: GitHub integration
2. **Automated Testing**: Unit, integration, security tests
3. **Build**: TypeScript compilation and bundling
4. **Deploy**: Automatic deployment to Lovable/Vercel
5. **Database Migrations**: Automated schema updates
6. **Monitoring**: Health checks and alerting

### Infrastructure Components
- **Frontend**: Static site hosting (Lovable/Vercel)
- **Backend**: Supabase Edge Functions
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Monitoring**: Supabase Analytics
- **Secrets**: Supabase Vault

## API Documentation

### Core Endpoints

#### Exploration Management
```typescript
POST /functions/v1/rabbit-hole-step
// Start or continue exploration
{
  rabbit_hole_id: string;
  action_type: 'start' | 'next';
  generation_mode?: 'single' | 'devils_advocate';
}

POST /functions/v1/panel-step
// Multi-agent exploration
{
  rabbit_hole_id: string;
  research_mode: boolean;
}
```

#### Quality Assessment
```typescript
POST /functions/v1/brilliance-compression-engine
// Analyze insight quality
{
  answers: Answer[];
  rabbit_hole_id: string;
}
```

### Response Formats

```typescript
interface ExplorationResponse {
  success: boolean;
  step_number?: number;
  answer?: {
    id: string;
    text: string;
    quality_scores: QualityMetrics;
  };
  error?: string;
  metadata?: {
    model_used: string;
    processing_time: number;
    tokens_used: number;
  };
}
```

## Error Handling Strategy

### Error Categories
1. **User Errors**: Invalid input, authentication failures
2. **System Errors**: Database issues, network problems
3. **AI Provider Errors**: API failures, rate limits
4. **Business Logic Errors**: Quality thresholds, exploration limits

### Error Recovery
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback Models**: AI provider failover
- **Graceful Degradation**: Reduced functionality vs. complete failure
- **User Communication**: Clear error messages and recovery guidance

This architecture supports the system's goals of providing sophisticated AI-powered exploration while maintaining security, performance, and scalability.
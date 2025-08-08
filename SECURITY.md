# Security Policy

## Overview

The Axiom Project implements comprehensive security measures to protect user data, prevent unauthorized access, and ensure responsible AI interactions.

## Authentication & Authorization

### Row Level Security (RLS)
All database tables implement Row Level Security policies to ensure users can only access their own data:

```sql
-- Example RLS Policy for Explorations
CREATE POLICY "Users can view their own explorations" 
ON public.explorations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own explorations" 
ON public.explorations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### JWT Validation
- All API endpoints validate JWT tokens from Supabase Auth
- Edge functions use service-level authentication for internal operations
- Client-side requests include proper authorization headers

## Data Protection

### API Key Security
- **No client-side API keys**: All AI provider keys stored securely in Supabase secrets
- **Environment isolation**: Development, staging, and production use separate key sets
- **Key rotation**: Regular rotation of API keys with zero-downtime deployment

### Input Validation
```typescript
// Schema validation for all user inputs
const ExplorationRequestSchema = z.object({
  question: z.string().min(10).max(1000),
  mode: z.enum(['exploration', 'grounding', 'devils_advocate']),
  cognitiveLevel: z.number().min(1).max(10)
});
```

### SQL Injection Prevention
- **Parameterized queries**: All database operations use Supabase client methods
- **No raw SQL**: Edge functions prohibited from executing arbitrary SQL
- **Type safety**: TypeScript ensures compile-time query validation

## AI Safety Measures

### Content Filtering
- **Quality thresholds**: Responses below quality score of 0.4 are rejected
- **Coherence validation**: Responses with coherence score < 0.3 are flagged
- **Relevance checking**: Off-topic responses (relevance < 0.4) are filtered

### Rate Limiting
```typescript
// Per-user rate limiting
const RATE_LIMITS = {
  explorations: 10, // per hour
  responses: 100,   // per hour
  api_calls: 1000   // per day
};
```

### Response Monitoring
- **Breakthrough detection**: Identifies potentially harmful paradigm shifts
- **Bias detection**: Monitors for discriminatory or harmful content
- **Hallucination prevention**: Multi-model validation and quality assessment

## Infrastructure Security

### Network Security
- **HTTPS only**: All communications encrypted in transit
- **CORS policies**: Strict origin validation for API requests
- **CSP headers**: Content Security Policy prevents XSS attacks

### Database Security
- **Encrypted at rest**: Supabase provides AES-256 encryption
- **Connection encryption**: SSL/TLS for all database connections
- **Audit logging**: All data access is logged and monitored

### Secrets Management
- **Supabase Vault**: Encrypted storage for sensitive configuration
- **Environment variables**: Development secrets isolated from production
- **Access controls**: Service keys restricted to specific operations

## Privacy Protection

### Data Minimization
- **Purpose limitation**: Data collected only for specified AI exploration purposes
- **Retention policies**: Exploration data automatically archived after 90 days
- **Anonymization**: Personal identifiers removed from analytics data

### User Rights
- **Data export**: Users can export all their exploration data
- **Deletion requests**: Complete data removal within 30 days
- **Access transparency**: Users can view all data associated with their account

## Incident Response

### Monitoring
- **Real-time alerts**: Automated detection of security anomalies
- **Performance monitoring**: Tracking for unusual usage patterns
- **Error tracking**: Comprehensive logging of security-relevant events

### Response Procedures
1. **Detection**: Automated alerts for potential security incidents
2. **Assessment**: Rapid evaluation of threat severity and scope
3. **Containment**: Immediate isolation of affected systems
4. **Remediation**: Fix vulnerabilities and restore normal operation
5. **Communication**: User notification for any data-affecting incidents

## Vulnerability Reporting

### Responsible Disclosure
We welcome security researchers to report vulnerabilities responsibly:

- **Contact**: security@example.com
- **Response time**: Initial response within 24 hours
- **Resolution timeline**: Critical issues resolved within 72 hours

### Bug Bounty
- **Scope**: All user-facing features and API endpoints
- **Exclusions**: Social engineering, physical attacks, DDoS
- **Rewards**: Based on severity and impact assessment

## Security Audits

### Regular Reviews
- **Code reviews**: All security-relevant code changes peer-reviewed
- **Dependency scanning**: Automated vulnerability detection in packages
- **Penetration testing**: Annual third-party security assessment

### Compliance
- **SOC 2 Type II**: Supabase infrastructure compliance
- **GDPR**: European data protection regulation compliance
- **CCPA**: California privacy rights compliance

## Security Configuration

### Supabase RLS Policies
View current policies: [Supabase RLS Dashboard](https://supabase.com/dashboard/project/oypsdwgvjwycgjxfqndi/auth/policies)

### Edge Function Security
Configuration in `supabase/config.toml`:
```toml
[functions.rabbit-hole-step]
verify_jwt = true

[functions.panel-step] 
verify_jwt = true

[functions.grounding-panel-step]
verify_jwt = true
```

For detailed security implementation, see:
- `src/lib/aiOrchestrator.ts` - API key management and rate limiting
- `supabase/functions/` - Edge function security patterns
- Database migration files - RLS policy definitions

## Contact

For security concerns or questions about this policy:
- Email: security@example.com
- GitHub Issues: Use "security" label for public, non-sensitive reports
- Direct Contact: For sensitive security matters requiring immediate attention

Last updated: January 2025
# Security Documentation

## Security Overview

The Axiom Project implements enterprise-grade security measures to protect user data, ensure system integrity, and maintain confidentiality of AI-generated insights. This document outlines the comprehensive security architecture and implemented safeguards.

## 🔒 Security Architecture

### Security Principles
1. **Zero Trust**: No implicit trust, verify everything
2. **Defense in Depth**: Multiple layers of security controls
3. **Least Privilege**: Minimum required access permissions
4. **Data Isolation**: Complete user data segregation
5. **Secure by Default**: Security controls enabled by default

### Security Layers
```
┌─────────────────┐
│   Frontend      │ ← Input Validation, XSS Protection
├─────────────────┤
│   API Gateway   │ ← Authentication, Rate Limiting
├─────────────────┤
│   Edge Functions│ ← Authorization, Business Logic
├─────────────────┤
│   Database      │ ← RLS Policies, Encryption
└─────────────────┘
```

## 🛡️ Authentication & Authorization

### Authentication System
- **Provider**: Supabase Auth
- **Method**: Email/Password with JWT tokens
- **Session Management**: Secure session handling with auto-refresh
- **Token Expiry**: Configurable token lifetime with refresh capability

#### JWT Token Structure
```typescript
interface JWTPayload {
  iss: string;           // Issuer (Supabase)
  sub: string;           // Subject (User ID)
  aud: string;           // Audience
  exp: number;           // Expiration timestamp
  iat: number;           // Issued at timestamp
  email: string;         // User email
  app_metadata: object;  // Application metadata
  user_metadata: object; // User metadata
}
```

### Authorization Framework

#### Role-Based Access Control (RBAC)
```sql
-- User roles (future implementation)
CREATE TYPE user_role AS ENUM ('user', 'admin', 'researcher');

-- User profiles with role assignment
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';
```

#### Row-Level Security (RLS) Policies
All database tables implement comprehensive RLS policies:

```sql
-- Example: Rabbit holes access control
CREATE POLICY "Users can view their own rabbit holes" 
ON rabbit_holes 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rabbit holes" 
ON rabbit_holes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

## 🔐 Data Protection

### Data Classification
1. **Public**: Non-sensitive system data
2. **Internal**: User-generated content, exploration results
3. **Confidential**: Authentication tokens, API keys
4. **Restricted**: System secrets, encryption keys

### Encryption Standards

#### Data at Rest
- **Database**: AES-256 encryption (Supabase managed)
- **File Storage**: AES-256 encryption for stored files
- **Backups**: Encrypted backup storage
- **Secrets**: Supabase Vault with envelope encryption

#### Data in Transit
- **HTTPS**: TLS 1.3 for all web traffic
- **API Calls**: TLS encryption for all API communications
- **Database Connections**: Encrypted connections to PostgreSQL
- **WebSocket**: WSS for real-time subscriptions

### Data Isolation

#### User Data Segregation
```sql
-- Complete data isolation between users
CREATE POLICY "User data isolation" 
ON answers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rabbit_holes 
    WHERE rabbit_holes.id = answers.rabbit_hole_id 
    AND rabbit_holes.user_id = auth.uid()
  )
);
```

#### Vector Embedding Security
```sql
-- Secure vector embeddings with user context
CREATE POLICY "Embedding access control" 
ON answer_embeddings 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM answers a
    JOIN rabbit_holes rh ON a.rabbit_hole_id = rh.id
    WHERE a.id = answer_embeddings.answer_id 
    AND rh.user_id = auth.uid()
  )
);
```

## 🚪 API Security

### Edge Function Security

#### JWT Verification
```typescript
// Mandatory authentication for protected functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const authenticateRequest = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid authentication token');
  }
  
  return user;
};
```

#### Function Configuration
```toml
# supabase/config.toml - Secure function configuration
[functions.rabbit-hole-step]
verify_jwt = true  # Requires authentication

[functions.panel-step]
verify_jwt = true  # Requires authentication

[functions.backfill-embeddings]
verify_jwt = false # Admin-only function
```

### Rate Limiting & Abuse Prevention

#### API Rate Limits
- **User Tier**: 100 requests/minute per user
- **Exploration Rate**: 1 step per 30 seconds per user
- **Bulk Operations**: 10 requests/minute for batch operations
- **Anonymous**: No access to protected resources

#### DDoS Protection
- Cloudflare protection for frontend
- Supabase built-in DDoS mitigation
- Rate limiting at multiple layers
- Geographic restrictions (configurable)

## 🔍 Input Validation & Sanitization

### Frontend Validation
```typescript
// Comprehensive input validation
const questionSchema = z.object({
  text: z.string()
    .min(10, 'Question must be at least 10 characters')
    .max(2000, 'Question must be less than 2000 characters')
    .refine(text => !containsMaliciousPatterns(text), 'Invalid content detected')
});

const containsMaliciousPatterns = (input: string): boolean => {
  const maliciousPatterns = [
    /<script/i,                    // Script injection
    /javascript:/i,                // JavaScript protocol
    /on\w+\s*=/i,                 // Event handlers
    /data:text\/html/i,           // Data URIs
    /vbscript:/i,                 // VBScript
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(input));
};
```

### Backend Sanitization
```typescript
// Server-side input sanitization
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (input: string): string => {
  // Remove HTML tags and scripts
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Additional validation
  if (cleaned.length !== input.length) {
    throw new Error('Input contains invalid characters');
  }
  
  return cleaned.trim();
};
```

### SQL Injection Prevention
```typescript
// Parameterized queries prevent SQL injection
const fetchUserRabbitHoles = async (userId: string) => {
  const { data, error } = await supabase
    .from('rabbit_holes')
    .select('*')
    .eq('user_id', userId)  // Parameterized where clause
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
```

## 🔧 Secure Configuration

### Environment Variables
```typescript
// No sensitive data in client-side code
const supabaseConfig = {
  url: process.env.SUPABASE_URL,           // Public
  anonKey: process.env.SUPABASE_ANON_KEY,  // Public
  // Service role key only in server environment
};
```

### Secret Management
```typescript
// Supabase Edge Functions secret access
const getSecret = async (name: string): Promise<string> => {
  const secret = Deno.env.get(name);
  if (!secret) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return secret;
};

// Required secrets for AI providers
const requiredSecrets = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 
  'GEMINI_API_KEY',
  'GROK_API_KEY'
];
```

### Secure Headers
```typescript
// Security headers for enhanced protection
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

## 🚨 Vulnerability Management

### Eliminated Vulnerabilities

#### 1. Code Execution Vulnerability (CRITICAL)
**Before**: Dangerous Function() constructor usage
```typescript
// DANGEROUS - Removed
return Function(`"use strict"; return (${evalCondition})`)();
```

**After**: Safe pattern matching
```typescript
// SECURE - Implemented
const patterns = [
  { pattern: /^step\s*>\s*(\d+)$/, eval: (match) => step > parseInt(match[1]) },
  { pattern: /^step\s*>=\s*(\d+)$/, eval: (match) => step >= parseInt(match[1]) },
  // ... more safe patterns
];

for (const { pattern, eval: evalFn } of patterns) {
  const match = sanitized.match(pattern);
  if (match) return evalFn(match);
}
```

#### 2. Public Database Access (CRITICAL)
**Before**: Complete public access to all data
**After**: User-isolated access with RLS policies

#### 3. Unprotected API Endpoints (HIGH)
**Before**: JWT verification disabled
**After**: Authentication required for all sensitive operations

### Security Testing

#### Automated Security Scans
```bash
# Security audit commands
npm audit                    # Dependency vulnerability scan
npm run lint:security      # ESLint security rules
npm run test:security      # Security-focused tests
```

#### Manual Security Testing
- Authentication bypass attempts
- SQL injection testing
- XSS vulnerability assessment
- Authorization boundary testing
- Rate limiting validation

### Incident Response Plan

#### Security Incident Classification
1. **P0 - Critical**: Data breach, authentication bypass
2. **P1 - High**: Privilege escalation, injection vulnerabilities  
3. **P2 - Medium**: Information disclosure, DoS vulnerabilities
4. **P3 - Low**: Configuration issues, non-sensitive data exposure

#### Response Procedures
1. **Detection**: Automated monitoring and manual reporting
2. **Assessment**: Impact analysis and severity classification
3. **Containment**: Immediate threat mitigation
4. **Eradication**: Root cause elimination
5. **Recovery**: Service restoration and validation
6. **Lessons Learned**: Process improvement and documentation

## 📊 Security Monitoring

### Audit Logging
```sql
-- Security event logging
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Monitoring Alerts
- Failed authentication attempts
- Unusual API usage patterns
- Database query anomalies
- High error rates
- Security policy violations

### Privacy Compliance

#### GDPR Compliance
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Retain data only as long as necessary
- **Data Portability**: Users can export their data
- **Right to Erasure**: Users can delete their accounts

#### Data Processing
```typescript
// Privacy-compliant data handling
interface DataProcessor {
  lawfulBasis: 'consent' | 'contract' | 'legitimate_interest';
  purpose: string;
  retention: string;
  sharing: boolean;
}

const userDataProcessor: DataProcessor = {
  lawfulBasis: 'consent',
  purpose: 'Philosophical exploration and insight generation',
  retention: 'Until user account deletion',
  sharing: false
};
```

## 🔄 Security Maintenance

### Regular Security Tasks
- [ ] **Weekly**: Dependency vulnerability scans
- [ ] **Monthly**: Security configuration reviews
- [ ] **Quarterly**: Penetration testing
- [ ] **Annually**: Comprehensive security audits

### Security Training
- Secure coding practices
- OWASP Top 10 awareness
- Privacy regulation compliance
- Incident response procedures

### Continuous Improvement
- Security metrics tracking
- Threat modeling updates
- Security architecture reviews
- Community security feedback integration

## 📞 Security Contact

### Reporting Security Issues
- **Email**: security@axiom-project.dev
- **Response Time**: 24 hours for critical issues
- **Disclosure Policy**: 90-day responsible disclosure

### Security Team
- Lead Security Engineer: [Contact Information]
- DevSecOps Engineer: [Contact Information]
- Compliance Officer: [Contact Information]

---

**Last Updated**: January 7, 2024  
**Next Review**: April 7, 2024  
**Version**: 2.0.0
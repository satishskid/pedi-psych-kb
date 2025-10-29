# Security Guidelines

## Secret Management

### Production Deployment

**CRITICAL**: Never commit actual secrets to version control. Use Cloudflare's secret management system:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET

# Set Clerk secret key
wrangler secret put CLERK_SECRET_KEY

# Set Google OAuth credentials (if using)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### Development

For local development, use environment variables:

```bash
# Set in your shell or .env file (not committed)
export JWT_SECRET=your-dev-jwt-secret
export CLERK_SECRET_KEY=your-dev-clerk-secret
```

## Password Security

### Current Implementation

The application currently uses plaintext password storage for demo purposes. **This must be updated before production deployment.**

### Recommended Implementation

1. **Use bcrypt or argon2** for password hashing
2. **Store only password hashes** in the database
3. **Implement proper password validation** in login endpoints

Example implementation:

```typescript
import bcrypt from 'bcryptjs';

// Store password hash
const passwordHash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, user.password_hash);
```

## API Security

### Authentication
- JWT tokens are used for API authentication
- Tokens expire and should be refreshed periodically
- Store tokens securely (httpOnly cookies recommended)

### Authorization
- RBAC (Role-Based Access Control) is implemented
- Users have roles: admin, clinician, parent, educator, therapist
- Policies control access to resources

### Rate Limiting
Consider implementing rate limiting for:
- Login attempts
- API endpoints
- File uploads

## Infrastructure Security

### Cloudflare Workers
- Use environment secrets for sensitive data
- Enable HTTPS everywhere
- Configure proper CORS policies

### Database
- Use parameterized queries (already implemented)
- Regular backups
- Access control and audit logging

## Monitoring

### Security Monitoring
- Monitor for suspicious login attempts
- Track failed authentication requests
- Log security events

### Health Checks
- Regular security audits
- Dependency vulnerability scanning
- SSL certificate monitoring

## Incident Response

1. **Immediate Actions**
   - Rotate compromised secrets
   - Disable affected accounts
   - Review access logs

2. **Investigation**
   - Analyze breach scope
   - Identify attack vectors
   - Document timeline

3. **Recovery**
   - Patch vulnerabilities
   - Restore from secure backups
   - Implement additional security measures

## Compliance

Ensure compliance with:
- GDPR (if serving EU users)
- HIPAA (if handling health data)
- COPPA (if serving children)
- Local data protection regulations
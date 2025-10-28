# 🧠 Pediatric Psychiatry Knowledge Base System

A comprehensive, role-based knowledge management system for pediatric psychiatry with advanced AI personalization, BYOK support, and multi-tenant architecture.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)
- Wrangler CLI

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pedi-psych-kb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Cloudflare D1 database**
   ```bash
   # Create database
   cd database
   npm run db:create
   
   # Run migrations
   npm run db:migrate
   
   # Seed demo data
   npm run db:seed
   ```

4. **Configure environment**
   ```bash
   cp wrangler.toml.example wrangler.toml
   # Edit wrangler.toml with your Cloudflare credentials
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Start API server
   cd apps/app-api
   npm run dev
   
   # Terminal 2: Start frontend
   cd apps/frontend
   npm run dev
   ```

6. **Access the application**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8787
   - **Demo login**: `admin@example.com` / `password123`

## 🎯 **System Overview**

### **Core Features**
- ✅ **Role-Based Access Control**: 5 user roles with appropriate content access
- ✅ **Advanced AI Search**: BYOK-powered personalization with medical accuracy boundaries
- ✅ **Comprehensive Knowledge Base**: 9 chapters covering pediatric behavioral health
- ✅ **Multi-Language Support**: English and Arabic content
- ✅ **Professional Tools**: Teleprompters, handouts, intervention plans
- ✅ **License Management**: Flexible licensing with individual and organization tiers

### **User Roles & Access**
- **👑 Admin/CTO**: Full system access, user management, content administration
- **👨‍⚕️ Doctor**: Complete clinical access, all content categories, patient resources
- **👩‍⚕️ Therapist**: Therapeutic focus, session tools, intervention planning
- **👨‍🏫 Educator**: Educational content, classroom strategies, student support
- **👨‍👩‍👧‍👦 Parent**: Family-focused guidance, practical home strategies

## 🏗️ **Architecture**

### **Backend (Hono.js + Cloudflare Workers)**
```
apps/app-api/
├── src/
│   ├── index.ts              # Main application entry
│   ├── middleware/
│   │   ├── license.ts        # Simplified role-based middleware
│   │   └── api-usage.ts      # Optional usage tracking
│   └── routes/
│       ├── content.ts        # Knowledge base & AI search
│       ├── admin.ts          # User management
│       └── licenses.ts       # License management
```

### **Frontend (React + TypeScript)**
```
apps/frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/               # Route-specific pages
│   ├── contexts/            # React contexts (Auth, etc.)
│   └── i18n.ts             # Internationalization
```

### **Database Schema**
```
database/
├── schema.sql              # Core tables (users, cards, tenants)
├── license_schema.sql      # License management tables
└── seed.sql               # Demo data
```

## 🔧 **API Endpoints**

### **Authentication**
```bash
# Login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### **Content Access**
```bash
# Browse knowledge base structure
GET /api/content/book-structure

# Basic search
POST /api/content/search
{
  "query": "anxiety management",
  "limit": 10
}

# Advanced AI-powered search
POST /api/content/advanced-search
{
  "query": "My child has meltdowns at bedtime",
  "context": {
    "user_role": "parent",
    "child_age": 8,
    "conditions": ["behavioral"],
    "severity": "moderate"
  },
  "response_type": "handout"
}
```

### **BYOK Configuration**
```bash
# Configure AI provider
POST /api/content/byok-config
{
  "provider": "gemini",
  "api_key": "your-api-key",
  "model_preferences": {
    "model": "gemini-pro",
    "temperature": 0.7
  }
}

# Get configurations
GET /api/content/byok-config
```

### **Admin Functions**
```bash
# Create user
POST /api/users
{
  "email": "doctor@hospital.com",
  "name": "Dr. Smith",
  "role": "doctor"
}

# List users
GET /api/admin/users

# System health
GET /api/health
```

## 🚀 **Deployment Options**

### **Option 1: Cloudflare Workers (Recommended)**

**Advantages:**
- ✅ Serverless, global CDN
- ✅ Automatic scaling
- ✅ Built-in D1 database
- ✅ Cost-effective for most use cases

**Setup:**
```bash
# 1. Configure Cloudflare
npm install -g wrangler
wrangler login

# 2. Create D1 database
wrangler d1 create pedi-psych-kb-prod

# 3. Update wrangler.toml with database ID
# 4. Deploy
npm run deploy
```

### **Option 2: Docker Deployment**

**Advantages:**
- ✅ Self-hosted control
- ✅ Custom infrastructure
- ✅ Enterprise compliance

**Setup:**
```bash
# 1. Build Docker image
docker build -t pedi-psych-kb .

# 2. Run with environment variables
docker run -p 8787:8787 \
  -e JWT_SECRET=your-secret \
  -e DATABASE_URL=your-db-url \
  pedi-psych-kb
```

### **Option 3: Traditional VPS**

**Advantages:**
- ✅ Full server control
- ✅ Custom database setup
- ✅ Predictable costs

**Setup:**
```bash
# 1. Install Node.js 18+
# 2. Clone repository
# 3. Install dependencies
# 4. Configure database
# 5. Start with PM2
pm2 start ecosystem.config.js
```

## 👥 **User Management**

### **Creating Admin Users**

1. **Database Method** (Initial Setup):
```sql
INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
VALUES (
  'cto@yourorg.com',
  'password123',  -- Use proper hashing in production
  'CTO Name',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);
```

2. **API Method** (After Initial Setup):
```bash
curl -X POST -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@yourorg.com",
    "name": "New Admin",
    "role": "admin"
  }' \
  "https://your-domain.com/api/users"
```

### **Adding New Users (Admin Process)**

**Via Web Interface:**
1. Login as admin
2. Navigate to Admin Panel → Users
3. Click "Add New User"
4. Fill in user details:
   - Email address
   - Full name
   - Role (doctor, therapist, educator, parent)
   - Organization/tenant
5. Send credentials to user

**Via API:**
```bash
# Create doctor
curl -X POST -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "name": "Dr. Jane Smith",
    "role": "doctor",
    "tenant_id": 1
  }' \
  "https://your-domain.com/api/users"

# Create parent
curl -X POST -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@family.com",
    "name": "John Parent",
    "role": "parent",
    "tenant_id": 1
  }' \
  "https://your-domain.com/api/users"
```

## 🧪 **Testing Setup**

### **Demo Users for Testing**

The system comes with pre-seeded demo users:

```bash
# Admin User
Email: admin@example.com
Password: password123
Role: admin
Access: Full system administration

# Doctor User  
Email: doctor@example.com
Password: password123
Role: doctor
Access: All clinical content + AI features

# Therapist User
Email: therapist@example.com  
Password: password123
Role: therapist
Access: Therapeutic content + session tools

# Educator User
Email: educator@example.com
Password: password123
Role: educator  
Access: Educational content + classroom strategies

# Parent User
Email: parent@example.com
Password: password123
Role: parent
Access: Family-focused guidance
```

### **Test Scenarios**

1. **Admin Testing**:
   - Login as admin
   - Create new users
   - View system analytics
   - Manage content

2. **Professional Testing**:
   - Login as doctor/therapist
   - Configure BYOK (optional)
   - Test advanced search
   - Generate handouts/teleprompters

3. **Parent Testing**:
   - Login as parent
   - Browse educational content
   - Use basic search
   - Access family resources

## 🔐 **Security Configuration**

### **Environment Variables**
```bash
# Required
JWT_SECRET=your-super-secure-jwt-secret-key
DATABASE_URL=your-database-connection-string

# Optional
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
```

### **Production Security Checklist**
- [ ] Change default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates

## 📊 **Monitoring & Analytics**

### **Health Checks**
```bash
# System health
curl https://your-domain.com/api/health

# Response
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-28T12:00:00Z"
}
```

### **Usage Analytics**
- User activity tracking
- Content engagement metrics
- Search query analysis
- AI usage statistics
- Performance monitoring

## 🔄 **Development Workflow**

### **Local Development**
```bash
# 1. Start API server
cd apps/app-api
npm run dev

# 2. Start frontend (new terminal)
cd apps/frontend  
npm run dev

# 3. Access application
# Frontend: http://localhost:3000
# API: http://localhost:8787
```

### **Database Management**
```bash
# Reset database
npm run db:reset

# Add new migration
npm run db:migrate

# Seed with fresh data
npm run db:seed
```

### **Testing**
```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📚 **Documentation**

- **[User Manual](USER_MANUAL.md)**: Comprehensive guide for all user roles
- **[Deployment Guide](DEPLOYMENT.md)**: Detailed deployment instructions
- **[API Documentation](API_DOCS.md)**: Complete API reference
- **[Admin Guide](ADMIN_GUIDE.md)**: System administration manual

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@your-domain.com

## 🏆 **Roadmap**

### **Current Version (v1.0)**
- ✅ Role-based access control
- ✅ Advanced AI search with BYOK
- ✅ Comprehensive knowledge base
- ✅ Multi-language support
- ✅ Professional tools (teleprompters, handouts)

### **Upcoming Features (v1.1)**
- [ ] Mobile applications (iOS/Android)
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Video content support
- [ ] Third-party integrations

### **Future Enhancements (v2.0)**
- [ ] Advanced personalization algorithms
- [ ] Offline mode support
- [ ] Custom branding for organizations
- [ ] Advanced reporting and analytics
- [ ] Integration with EHR systems

---

**Built with ❤️ for pediatric mental health professionals and families**

*Last Updated: October 2025*
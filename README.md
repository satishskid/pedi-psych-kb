# Pediatric Psychology Knowledge Base

A comprehensive, multi-tenant knowledge base system for pediatric psychology with internationalization support, role-based access control, and export capabilities.

## 🌟 Features

- **Multi-tenant Architecture**: Support for multiple organizations with complete data isolation
- **Internationalization**: Full i18n support with English, Hindi, and Arabic languages
- **Right-to-Left (RTL) Support**: Proper RTL text rendering and layout for Arabic content
- **Role-Based Access Control (RBAC)**: Granular permissions system with customizable policies
- **Export Capabilities**: Export knowledge base content to HTML and PDF formats
- **Modern Web Interface**: React-based frontend with Tailwind CSS and responsive design
- **Cloud-Native**: Built on Cloudflare Workers for global scalability
- **Type Safety**: Full TypeScript implementation with Zod validation

## ✅ Recent Fixes & Improvements

### TypeScript Configuration
- ✅ Fixed TypeScript configuration issues across all packages
- ✅ Added proper type definitions for Node.js and Cloudflare Workers
- ✅ Resolved implicit `any` type errors
- ✅ Updated `tsconfig.json` files with proper compiler options

### Dependency Management
- ✅ Added missing dependencies to `ops-api`:
  - `@hono/zod-validator` for request validation
  - `zod` for schema validation
  - `@types/node` for Node.js types
- ✅ Updated shared package build configuration
- ✅ Fixed module resolution issues

### Code Quality
- ✅ Fixed type mismatches between shared package and applications
- ✅ Updated field names to match shared package interfaces:
  - `tenantId` → `tenant_id`
  - `createdAt` → `created_at`
  - `updatedAt` → `updated_at`
- ✅ Updated policy structure to use arrays:
  - `resource` → `resources[]`
  - `action` → `actions[]`
  - Added `effect` field for allow/deny policies

### API Improvements
- ✅ Enhanced RBAC (Role-Based Access Control) system
- ✅ Improved tenant isolation in policy management
- ✅ Fixed export functionality type issues
- ✅ Updated policy evaluation logic

## 🏗️ Architecture

### Backend Services

1. **kb-api**: Main knowledge base API (Port 8787)
   - Card management (CRUD operations)
   - Search functionality
   - Tenant isolation

2. **app-api**: Application API (Port 8788)
   - User management
   - Authentication & JWT tokens
   - Tenant management

3. **ops-api**: Operations API (Port 8789)
   - Policy management
   - RBAC evaluation
   - Export services

### Frontend

- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **i18next** for internationalization
- **Lucide React** for icons

### Database

- **Cloudflare D1** (SQLite) for production
- **SQLite** with better-sqlite3 for development
- **Cloudflare KV** for policy storage

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account (for deployment)
- SQLite3 (for local development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pedi-psych-kb
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Start development servers**
   ```bash
   ./dev-start.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - kb-api: http://localhost:8787
   - app-api: http://localhost:8788
   - ops-api: http://localhost:8789

### Default Credentials

After running the database seed script, you can login with:
- **Email**: admin@example.com
- **Password**: admin123

## 📁 Project Structure

```
pedi-psych-kb/
├── apps/
│   ├── kb-api/           # Main knowledge base API
│   ├── app-api/          # Application API (users, auth)
│   ├── ops-api/          # Operations API (policies, exports)
│   └── frontend/         # React frontend application
├── packages/
│   └── shared/           # Shared types and utilities
├── database/
│   ├── schema.sql        # Database schema
│   ├── seed.sql          # Sample data
│   └── seed.js           # Database seeding script
├── scripts/
│   ├── setup-dev.sh      # Development setup script
│   └── deploy.sh         # Production deployment script
└── .github/workflows/    # CI/CD pipelines
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8787
VITE_APP_API_URL=http://localhost:8788
VITE_OPS_API_URL=http://localhost:8789
```

#### Cloudflare Workers (wrangler.toml)
```toml
name = "pedi-psych-kb-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "pedi-psych-kb"
database_id = "your-database-id"

[env.production.vars]
JWT_SECRET = "your-jwt-secret"
```

### Database Setup

The project uses SQLite for development and Cloudflare D1 for production.

1. **Development Database**
   ```bash
   cd database
   node seed.js
   ```

2. **Production Database**
   - Create D1 database in Cloudflare dashboard
   - Run schema.sql to create tables
   - Run seed.sql to populate initial data

## 🌍 Internationalization

The application supports multiple languages with proper RTL support:

- **English** (LTR): Default language
- **Hindi** (LTR): हिंदी
- **Arabic** (RTL): العربية

### Adding New Languages

1. Add translations in `apps/frontend/src/i18n.ts`
2. Update the language switcher in `Layout.tsx`
3. Add RTL support if needed

## 🔐 RBAC System

The role-based access control system allows granular permissions:

### Default Roles

- **Admin**: Full system access
- **Editor**: Content management
- **Viewer**: Read-only access

### Custom Policies

Create custom policies via the ops-api:

```json
{
  "name": "Custom Policy",
  "description": "Allows specific actions",
  "resource": "cards",
  "action": "write",
  "conditions": { "tenantId": 1 },
  "tenantId": 1
}
```

## 📤 Export System

Export knowledge base content in multiple formats:

### Supported Formats

- **HTML**: Responsive web pages with RTL support
- **PDF**: Coming soon (currently generates HTML)

### Export Options

- Language selection
- Metadata inclusion
- Custom templates
- Batch export

## 🚀 Deployment

### Prerequisites

- Cloudflare account
- Wrangler CLI installed
- Environment variables configured

### Production Deployment

1. **Configure environment variables**
   ```bash
   # Set your Cloudflare credentials
   wrangler login
   ```

2. **Deploy all services**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

3. **Configure Cloudflare services**
   - Set up D1 database
   - Create KV namespaces
   - Configure environment variables
   - Set up custom domains

### CI/CD Pipeline

The project includes GitHub Actions workflows for:

- **Continuous Integration**: Linting, type checking, security scanning
- **Staging Deployment**: Automatic deployment on `develop` branch
- **Production Deployment**: Automatic deployment on `main` branch

## 🔒 Security

### Authentication

- JWT-based authentication
- Secure password hashing
- Token expiration and refresh

### Authorization

- Role-based access control
- Tenant isolation
- Resource-level permissions

### Data Protection

- Input validation with Zod
- SQL injection prevention
- XSS protection
- HTTPS enforcement

## 📊 Monitoring

### Health Checks

All services include health check endpoints:

- `GET /health` - Service health status
- `GET /api/user/permissions` - User permissions

### Logging

- Structured logging with correlation IDs
- Error tracking and reporting
- Performance monitoring

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific service tests
cd apps/kb-api && npm test
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style

- Use TypeScript for all code
- Follow ESLint configuration
- Write meaningful commit messages
- Add JSDoc comments for public APIs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the documentation
- Search existing issues
- Create a new issue
- Contact the development team

## 📈 Roadmap

### Phase 1 (Completed)
- ✅ Basic CRUD operations
- ✅ Multi-tenant support
- ✅ i18n and RTL support
- ✅ RBAC system
- ✅ Export functionality

### Phase 2 (Planned)
- 📋 Advanced search with filters
- 📋 Content versioning
- 📋 Analytics and reporting
- 📋 Mobile application
- 📋 AI-powered content suggestions

### Phase 3 (Future)
- 🎯 Real-time collaboration
- 🎯 Advanced workflow management
- 🎯 Integration with external systems
- 🎯 Advanced analytics dashboard

---

**Built with ❤️ for pediatric psychology professionals worldwide**
# CommerceAI Pro - API Gateway

A comprehensive SaaS API Gateway with enterprise-grade features for multi-tenant AI-powered commerce platform.

## 🚀 Features

### Core SaaS Features
- **Multi-tenant Architecture** - Complete organization and user management
- **Role-based Access Control (RBAC)** - Granular permissions system
- **Subscription Management** - Stripe integration with multiple plans
- **Quota & Usage Tracking** - Resource limits and monitoring
- **Analytics & Metrics** - Business intelligence and reporting
- **Audit Logging** - Comprehensive activity tracking

### Security & Authentication
- **JWT Authentication** - Secure token-based authentication
- **Two-Factor Authentication (2FA)** - TOTP and backup codes
- **Single Sign-On (SSO)** - SAML and OAuth integration
- **Password Security** - Advanced password policies
- **Encryption Service** - AES-256-GCM encryption
- **Security Headers** - CORS, CSP, HSTS protection

### Communication & Notifications
- **Email Service** - SMTP and SendGrid integration
- **SMS Notifications** - Twilio integration
- **Push Notifications** - FCM and APNS support
- **Webhook System** - Outgoing webhooks with retry logic
- **Real-time Updates** - WebSocket support

### Data Management & Compliance
- **GDPR Compliance** - Data export, deletion, and anonymization
- **Backup Service** - Automated database backups
- **Data Retention** - Configurable retention policies
- **Email Verification** - Secure email confirmation
- **Password Reset** - Secure password recovery

### Support & Monitoring
- **Support Ticket System** - Customer support management
- **Health Monitoring** - System health checks
- **Performance Metrics** - Request tracking and analytics
- **Error Handling** - Comprehensive error management
- **Rate Limiting** - API protection and throttling

### AI Agent Integration
- **Agent Management** - AI agent orchestration
- **Activity Logging** - Agent activity tracking
- **Feedback System** - Agent performance monitoring
- **Autonomy Features** - Self-managing agent capabilities

## 📁 Project Structure

```
api-gateway/
├── middleware/           # Security, auth, monitoring middleware
├── models/              # MongoDB schemas
├── routes/              # API route definitions
├── services/            # Business logic services
├── logs/                # Application logs
├── public/              # Static files
├── data/                # Data persistence
├── server.js            # Main application entry point
├── package.json         # Dependencies and scripts
├── .env.example         # Environment configuration template
└── Dockerfile           # Container configuration
```

## 🛠 Services

### Core Services
- **AnalyticsService** - Business metrics and reporting
- **AuditService** - Activity logging and compliance
- **NotificationService** - Multi-channel notifications
- **QuotaService** - Resource usage and limits
- **EncryptionService** - Data encryption and security

### Authentication Services
- **TwoFactorService** - 2FA implementation
- **SSOService** - Single sign-on integration
- **EmailVerificationService** - Email confirmation
- **PasswordResetService** - Password recovery

### Data Services
- **BackupService** - Database backup automation
- **GDPRService** - Data compliance and privacy
- **WebhookService** - Outgoing webhook management
- **SupportService** - Customer support system

### Platform Services
- **OrganizationService** - Multi-tenant management
- **RoleService** - Permission and role management
- **PermissionService** - Access control
- **StripeService** - Payment processing

## 🔧 API Routes

### Authentication & Users
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/users/me` - User profile
- `POST /api/two-factor/setup` - 2FA setup
- `POST /api/password-reset/request` - Password reset

### Organizations & Roles
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id/permissions` - Update permissions

### Analytics & Monitoring
- `POST /api/analytics/track` - Track events
- `GET /api/analytics/metrics` - Business metrics
- `GET /api/analytics/usage/:organizationId` - Usage analytics
- `GET /api/quota/status` - Quota status
- `GET /health` - Health check

### Support & Admin
- `POST /api/support/tickets` - Create support ticket
- `GET /api/admin/users` - Admin user management
- `POST /api/backup/create` - Create backup
- `GET /api/gdpr/export/:userId` - Export user data

### Webhooks & Integrations
- `POST /api/outgoing-webhooks` - Create webhook
- `GET /api/outgoing-webhooks` - List webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 5+
- Redis 6+
- Stripe Account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd commerceai-pro/api-gateway
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

### Environment Configuration

Key environment variables to configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/commerceai-pro
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-character-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
```

## 🔒 Security Features

### Authentication
- JWT tokens with refresh mechanism
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Account lockout protection

### Authorization
- Role-based access control (RBAC)
- Permission-based route protection
- Organization-level isolation
- API key authentication

### Data Protection
- AES-256-GCM encryption
- Sensitive data masking in logs
- GDPR compliance features
- Secure backup encryption

### Security Headers
- CORS configuration
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options protection

## 📊 Monitoring & Analytics

### Metrics Tracked
- User registrations and activity
- API usage and performance
- Revenue and subscription metrics
- Error rates and system health
- Agent performance and feedback

### Health Checks
- Database connectivity
- Redis availability
- External service status
- Memory and CPU usage

## 🔧 Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run test suite (when implemented)

### Code Structure
- **Middleware** - Authentication, validation, security
- **Routes** - API endpoint definitions
- **Services** - Business logic implementation
- **Models** - Database schema definitions

## 📝 API Documentation

The API follows RESTful conventions with:
- Consistent error responses
- Proper HTTP status codes
- Request/response validation
- Rate limiting headers
- Comprehensive logging

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 Deployment

### Docker
```bash
docker build -t commerceai-api-gateway .
docker run -p 4000:4000 commerceai-api-gateway
```

### Production Considerations
- Use environment-specific configurations
- Enable SSL/TLS certificates
- Configure load balancing
- Set up monitoring and alerting
- Implement backup strategies

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support and questions:
- Create a support ticket through the admin panel
- Check the health endpoint for system status
- Review logs for troubleshooting

---

**CommerceAI Pro** - Enterprise-grade AI-powered commerce platform with comprehensive SaaS features.
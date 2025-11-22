# NexusSuite Backend API

A comprehensive B2B SaaS multi-tenant backend API built with Express.js, Firebase, and Polar integration.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with Better Auth
- 🏢 **Multi-tenant Organizations**: Organization management with role-based access control
- 📧 **OTP Verification**: Secure email and SMS verification system
- 💳 **Subscription Management**: Integration with Polar for billing and subscriptions
- 👥 **Member Invitations**: Organization member invitation system
- 📊 **Admin Dashboard**: Comprehensive admin APIs for system management
- 🔒 **Security**: Rate limiting, CORS, helmet, input validation
- 📋 **Audit Logging**: Comprehensive audit trail for all operations
- 🎫 **Support System**: Support ticket management system

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Better Auth + Firebase Auth
- **Payments**: Polar API Integration
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, Rate Limiting
- **Language**: TypeScript

## Quick Start

### Prerequisites

- Node.js 18+ 
- Firebase project
- Polar account (for subscriptions)
- Gmail account (for email OTP)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexussuite-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Firebase Setup**
   - Create a Firebase project
   - Enable Firestore Database
   - Enable Authentication (Email/Password)
   - Download service account key
   - Update Firebase configuration in `.env`

5. **Polar Setup**
   - Create a Polar account
   - Set up subscription products
   - Get API credentials
   - Configure webhook endpoint

6. **Start the server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

The server will start on `http://localhost:3001`

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout User
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Organization Endpoints

#### Create Organization
```http
POST /api/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Company",
  "slug": "my-company",
  "description": "A great company"
}
```

#### Get Organization
```http
GET /api/organizations/:organizationId
Authorization: Bearer <token>
```

#### Update Organization
```http
PUT /api/organizations/:organizationId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "description": "Updated description"
}
```

#### Invite Member
```http
POST /api/organizations/:organizationId/members/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "member"
}
```

### OTP Verification Endpoints

#### Generate OTP
```http
POST /api/otp/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email",
  "identifier": "user@example.com",
  "purpose": "verification"
}
```

#### Verify OTP
```http
POST /api/otp/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "otp_123456",
  "code": "123456"
}
```

### Subscription Endpoints

#### Get Subscription Plans
```http
GET /api/subscriptions/plans
Authorization: Bearer <token>
```

#### Get User Subscription
```http
GET /api/subscriptions
Authorization: Bearer <token>
```

#### Create Checkout Session
```http
POST /api/subscriptions/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "pro",
  "billingInterval": "monthly"
}
```

### Admin Endpoints

#### Get System Metrics
```http
GET /api/admin/metrics
Authorization: Bearer <token>
```

#### Get User Analytics
```http
GET /api/admin/users/analytics?page=1&limit=50
Authorization: Bearer <token>
```

#### Get Audit Logs
```http
GET /api/admin/audit-logs?page=1&limit=100
Authorization: Bearer <token>
```

#### Get Support Tickets
```http
GET /api/admin/support-tickets?page=1&limit=50&status=open
Authorization: Bearer <token>
```

## Testing

### Run Tests

```bash
# Run API tests
npm test

# Run with custom base URL
API_BASE_URL=http://your-api-url.com npm test

# Run bash script (Unix/Mac)
bash test-api.sh

# Run Node.js script (Cross-platform)
node test-api.js
```

### Test Coverage

The test suite covers:
- ✅ User registration and authentication
- ✅ Organization creation and management
- ✅ Member invitations and role management
- ✅ OTP generation and verification
- ✅ Subscription management
- ✅ Error handling and validation
- ✅ Rate limiting and security
- ✅ Admin dashboard APIs

## Environment Variables

### Required Configuration

```bash
# Server
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Better Auth
BETTER_AUTH_SECRET=your-secret-key

# Polar (Subscriptions)
POLAR_ACCESS_TOKEN=your-polar-token
POLAR_WEBHOOK_SECRET=your-webhook-secret

# Email (OTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

### Optional Configuration

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Feature Flags
ENABLE_OTP_VERIFICATION=true
ENABLE_SUBSCRIPTIONS=true
ENABLE_ADMIN_DASHBOARD=true
```

## Security Features

- **Input Validation**: All inputs validated with Zod schemas
- **Rate Limiting**: Configurable rate limits per endpoint
- **CORS Protection**: Configurable CORS policies
- **Security Headers**: Helmet.js security headers
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Fine-grained permission system
- **Audit Logging**: Comprehensive security audit trail
- **Error Handling**: Secure error responses without sensitive data

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

### Environment-Specific Deployment

#### Development
```bash
npm run dev
```

#### Production
```bash
npm run build
npm start
```

### Health Check

The server provides health check endpoints:
- `GET /health` - Basic health status
- `GET /healthz` - Kubernetes health check

## Monitoring & Logging

### Logging
- Winston logger with configurable levels
- Request/response logging
- Error tracking
- Performance metrics

### Monitoring
- System health metrics
- API performance tracking
- Error rate monitoring
- User activity analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@nexussuite.com or create a support ticket through the admin dashboard.
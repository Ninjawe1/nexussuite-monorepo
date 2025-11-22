# Deployment Guide

This guide covers deploying the NexusSuite frontend application to production environments.

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Set production environment variables
- [ ] Configure API endpoints
- [ ] Set up monitoring and analytics
- [ ] Configure error reporting
- [ ] Set up SSL certificates

### 2. Code Quality
- [ ] Run full test suite
- [ ] Check code coverage (target: >85%)
- [ ] Run linting and type checking
- [ ] Verify build process
- [ ] Test in mock mode

### 3. Security
- [ ] Review CSP headers
- [ ] Enable HTTPS enforcement
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Review authentication flows

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Or connect GitHub repository for automatic deployments
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
```

### Option 3: AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

**S3 Configuration**:
- Enable static website hosting
- Configure bucket policy for public access
- Set up CloudFront distribution
- Configure custom domain (optional)

### Option 4: Docker

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Environment Variables

### Required Variables
```bash
# API Configuration
VITE_API_URL=https://api.yourdomain.com

# Better Auth Configuration
VITE_BETTER_AUTH_SECRET=your-production-secret

# Application Configuration
VITE_APP_NAME=NexusSuite
VITE_APP_URL=https://app.yourdomain.com
```

### Optional Variables
```bash
# Polar Configuration (for production)
VITE_POLAR_ACCESS_TOKEN=your-polar-token
VITE_POLAR_MOCK_MODE=false

# Analytics and Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GA_TRACKING_ID=your-ga-id
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

## Performance Optimization

### Build Optimization
```bash
# Enable production optimizations
export NODE_ENV=production

# Build with optimizations
npm run build
```

### CDN Configuration
- Use CDN for static assets
- Enable gzip/brotli compression
- Configure proper cache headers
- Implement service worker for offline support

### Image Optimization
- Use WebP format where possible
- Implement lazy loading
- Use responsive images
- Optimize image sizes

## Security Configuration

### Content Security Policy
```javascript
// Add to your deployment configuration
const csp = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", "https://api.yourdomain.com"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
};
```

### HTTPS Configuration
- Force HTTPS redirects
- Configure HSTS headers
- Use secure cookies
- Implement CSRF protection

## Monitoring and Analytics

### Error Tracking
- Set up Sentry for error monitoring
- Configure error boundaries
- Monitor console errors
- Track user-reported issues

### Performance Monitoring
- Monitor Core Web Vitals
- Track API response times
- Monitor bundle sizes
- Set up performance budgets

### User Analytics
- Configure Google Analytics
- Track user flows
- Monitor conversion rates
- Analyze user behavior

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads correctly
- [ ] Authentication works
- [ ] Organization switching functions
- [ ] Subscription management operates
- [ ] Admin dashboard accessible
- [ ] Error pages display properly

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Bundle size < 500KB
- [ ] Lighthouse score > 90

### Security Tests
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No mixed content warnings
- [ ] XSS protection working

## Rollback Strategy

### Quick Rollback
1. Revert to previous deployment
2. Update DNS if necessary
3. Verify functionality
4. Monitor for issues

### Database Rollback
1. Backup current state
2. Restore previous backup
3. Verify data integrity
4. Test application functionality

## Maintenance

### Regular Updates
- Monitor dependencies for security updates
- Update Node.js version regularly
- Keep npm packages current
- Review and update configurations

### Backup Strategy
- Regular database backups
- Configuration backups
- Static asset backups
- Documentation updates

## Troubleshooting

### Common Issues

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors
- Review build logs

**Runtime Errors**
- Check browser console for errors
- Verify API endpoints are accessible
- Check network requests
- Review error tracking logs

**Performance Issues**
- Monitor bundle sizes
- Check for memory leaks
- Optimize images and assets
- Review third-party dependencies

### Support Contacts
- Development Team: dev@yourcompany.com
- Operations Team: ops@yourcompany.com
- Security Team: security@yourcompany.com

## Success Metrics

### Performance KPIs
- Page load time < 3 seconds
- API response time < 500ms
- Bundle size < 500KB
- Lighthouse score > 90

### Reliability KPIs
- Uptime > 99.9%
- Error rate < 1%
- Recovery time < 1 hour
- Deployment success rate > 95%

### User Experience KPIs
- Authentication success rate > 98%
- Subscription conversion rate > 5%
- User satisfaction score > 4.5/5
- Support ticket resolution < 24 hours
// Deployment utilities and configuration
export const DEPLOYMENT_CONFIG = {
  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // API Configuration
  apiUrl: '/',

  // Authentication
  betterAuthSecret: import.meta.env.VITE_BETTER_AUTH_SECRET,

  // Polar Configuration
  polarAccessToken: import.meta.env.VITE_POLAR_ACCESS_TOKEN,
  polarMockMode: import.meta.env.VITE_POLAR_MOCK_MODE === 'true',

  // Application
  appName: import.meta.env.VITE_APP_NAME || 'NexusSuite',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',

  // Features
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',

  // Monitoring
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,
} as const;

// Validate required environment variables
export function validateEnvironment(): void {
  const requiredEnvVars = ['VITE_BETTER_AUTH_SECRET'];

  const missing = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);

  if (missing.length > 0 && DEPLOYMENT_CONFIG.isProduction) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Build optimization flags
export const BUILD_CONFIG = {
  // Code splitting
  enableCodeSplitting: true,

  // Tree shaking
  enableTreeShaking: true,

  // Compression
  enableCompression: DEPLOYMENT_CONFIG.isProduction,

  // Source maps
  enableSourceMaps: DEPLOYMENT_CONFIG.isDevelopment,

  // Minification
  enableMinification: DEPLOYMENT_CONFIG.isProduction,
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],

    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },

  // HTTPS enforcement
  enforceHttps: DEPLOYMENT_CONFIG.isProduction,

  // XSS protection
  enableXssProtection: true,

  // CSRF protection
  enableCsrfProtection: true,
} as const;

// Performance configuration
export const PERFORMANCE_CONFIG = {
  // Bundle size limits (in KB)
  maxBundleSize: 500,
  maxChunkSize: 200,

  // Loading strategies
  enableLazyLoading: true,
  enablePreloading: true,

  // Caching
  enableCaching: DEPLOYMENT_CONFIG.isProduction,
  cacheMaxAge: 31536000, // 1 year

  // Compression
  enableGzip: true,
  enableBrotli: true,
} as const;

// Deployment helpers
export function getApiUrl(path: string = ''): string {
  const baseUrl = DEPLOYMENT_CONFIG.apiUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  const prefix = baseUrl ? baseUrl + '/' : '/';
  return cleanPath ? `${prefix}${cleanPath}` : baseUrl || '/';
}

export function isMockModeEnabled(): boolean {
  return DEPLOYMENT_CONFIG.polarMockMode;
}

export function shouldEnableAnalytics(): boolean {
  return DEPLOYMENT_CONFIG.enableAnalytics && DEPLOYMENT_CONFIG.isProduction;
}

export function getErrorReportingConfig() {
  return {
    enabled: DEPLOYMENT_CONFIG.enableErrorReporting,
    dsn: DEPLOYMENT_CONFIG.sentryDsn,
    environment: DEPLOYMENT_CONFIG.isProduction ? 'production' : 'development',
  };
}

// Validate environment on module load
if (DEPLOYMENT_CONFIG.isProduction) {
  validateEnvironment();
}

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError, ErrorCode, ErrorType, createErrorResponse } from "./errorHandler";

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse = createErrorResponse(
          "Request body validation failed",
          ErrorCode.INVALID_INPUT,
          ErrorType.VALIDATION_ERROR,
          {
            errors: error.errors.map(err => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
          (req as any).id
        );
        res.status(400).json(errorResponse);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse = createErrorResponse(
          "Query parameters validation failed",
          ErrorCode.INVALID_INPUT,
          ErrorType.VALIDATION_ERROR,
          {
            errors: error.errors.map(err => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
          (req as any).id
        );
        res.status(400).json(errorResponse);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorResponse = createErrorResponse(
          "URL parameters validation failed",
          ErrorCode.INVALID_INPUT,
          ErrorType.VALIDATION_ERROR,
          {
            errors: error.errors.map(err => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
          (req as any).id
        );
        res.status(400).json(errorResponse);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  label?: string;
  disableInDev?: boolean;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.disableInDev && (process.env.NODE_ENV || "development") === "development") {
      return next();
    }
    const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || "unknown";
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < now) {
        requests.delete(k);
      }
    }
    
    // Get or create request data
    let requestData = requests.get(key);
    if (!requestData || requestData.resetTime < now) {
      requestData = {
        count: 0,
        resetTime: now + options.windowMs,
      };
      requests.set(key, requestData);
    }
    
    // Check rate limit
    if (requestData.count >= options.max) {
      const errorResponse = createErrorResponse(
        options.message || "Too many requests",
        ErrorCode.TOO_MANY_REQUESTS,
        ErrorType.RATE_LIMIT_ERROR,
        {
          limit: options.max,
          windowMs: options.windowMs,
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        },
        (req as any).id
      );
      console.warn("RateLimit", {
        label: options.label || "general",
        ip: key,
        count: requestData.count,
        max: options.max,
        path: req.path,
      });
      res.status(429).json(errorResponse);
      return;
    }
    
    // Increment counter
    requestData.count++;
    
    // Set headers
    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", options.max - requestData.count);
    res.setHeader("X-RateLimit-Reset", new Date(requestData.resetTime).toISOString());
    
    next();
  };
}

/**
 * Request ID middleware
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  (req as any).id = requestId as string;
  res.setHeader("X-Request-Id", requestId);
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request ID: ${(req as any).id}`);
  
  // Log response
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ` +
      `${res.statusCode} ${res.statusMessage} - ${duration}ms - Request ID: ${(req as any).id}`
    );
  });
  
  next();
}

/**
 * Timeout middleware
 */
export function timeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const errorResponse = createErrorResponse(
          "Request timeout",
          ErrorCode.INTERNAL_SERVER_ERROR,
          ErrorType.INTERNAL_SERVER_ERROR,
          { timeout: ms },
          (req as any).id
        );
        res.status(503).json(errorResponse);
      }
    }, ms);
    
    res.on("finish", () => clearTimeout(timeoutId));
    res.on("close", () => clearTimeout(timeoutId));
    
    next();
  };
}

/**
 * CORS middleware
 */

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    
    next();
  };
}

/**
 * Health check middleware
 */
export function healthCheck() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === "/health" || req.path === "/healthz") {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
      return;
    }
    
    next();
  };
}
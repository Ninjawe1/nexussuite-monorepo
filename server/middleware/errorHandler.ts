import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { FirebaseError } from "firebase/app";

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types for better error categorization
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  CONFLICT_ERROR = "CONFLICT_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

/**
 * Error codes for consistent error responses
 */
export enum ErrorCode {
  // Validation errors (400)
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_EMAIL_FORMAT = "INVALID_EMAIL_FORMAT",
  INVALID_PASSWORD_FORMAT = "INVALID_PASSWORD_FORMAT",
  INVALID_ORGANIZATION_SLUG = "INVALID_ORGANIZATION_SLUG",
  
  // Authentication errors (401)
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  
  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  ROLE_NOT_ALLOWED = "ROLE_NOT_ALLOWED",
  ORGANIZATION_ACCESS_DENIED = "ORGANIZATION_ACCESS_DENIED",
  ADMIN_ACCESS_REQUIRED = "ADMIN_ACCESS_REQUIRED",
  
  // Not found errors (404)
  USER_NOT_FOUND = "USER_NOT_FOUND",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  ORGANIZATION_NOT_FOUND = "ORGANIZATION_NOT_FOUND",
  SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",
  INVITATION_NOT_FOUND = "INVITATION_NOT_FOUND",
  OTP_NOT_FOUND = "OTP_NOT_FOUND",
  
  // Conflict errors (409)
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  ORGANIZATION_SLUG_TAKEN = "ORGANIZATION_SLUG_TAKEN",
  USER_ALREADY_MEMBER = "USER_ALREADY_MEMBER",
  ACTIVE_SUBSCRIPTION_EXISTS = "ACTIVE_SUBSCRIPTION_EXISTS",
  
  // Rate limit errors (429)
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  OTP_RATE_LIMIT_EXCEEDED = "OTP_RATE_LIMIT_EXCEEDED",
  LOGIN_ATTEMPTS_EXCEEDED = "LOGIN_ATTEMPTS_EXCEEDED",
  
  // Database errors (500)
  DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
  DATABASE_QUERY_ERROR = "DATABASE_QUERY_ERROR",
  
  // External service errors (502/503)
  POLAR_SERVICE_ERROR = "POLAR_SERVICE_ERROR",
  EMAIL_SERVICE_ERROR = "EMAIL_SERVICE_ERROR",
  SMS_SERVICE_ERROR = "SMS_SERVICE_ERROR",
  
  // Business logic errors (400/422)
  SUBSCRIPTION_PLAN_NOT_AVAILABLE = "SUBSCRIPTION_PLAN_NOT_AVAILABLE",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  USAGE_LIMIT_EXCEEDED = "USAGE_LIMIT_EXCEEDED",
  ORGANIZATION_MEMBER_LIMIT_EXCEEDED = "ORGANIZATION_MEMBER_LIMIT_EXCEEDED",
  OTP_EXPIRED = "OTP_EXPIRED",
  OTP_INVALID = "OTP_INVALID",
  INVITATION_EXPIRED = "INVITATION_EXPIRED",
  
  // Internal server errors (500)
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    type: ErrorType;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code: ErrorCode,
  type: ErrorType,
  details?: any,
  requestId?: string
): ErrorResponse {
  const errorObj: any = {
    message,
    code,
    type,
    timestamp: new Date().toISOString(),
  };
  if (details !== undefined) errorObj.details = details;
  if (requestId !== undefined) errorObj.requestId = requestId;
  return { success: false, error: errorObj } as ErrorResponse;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let errorResponse: ErrorResponse;
  const requestId = (req as any).id || "unknown";

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    statusCode = 400;
    errorResponse = createErrorResponse(
      "Validation failed",
      ErrorCode.INVALID_INPUT,
      ErrorType.VALIDATION_ERROR,
      {
        errors: error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      },
      requestId
    );
  }
  // Handle Firebase errors
  else if (error instanceof FirebaseError) {
    statusCode = 500;
    errorResponse = createErrorResponse(
      "Database operation failed",
      ErrorCode.DATABASE_QUERY_ERROR,
      ErrorType.DATABASE_ERROR,
      {
        firebaseCode: error.code,
        firebaseMessage: error.message,
      },
      requestId
    );
  }
  // Handle AppError instances
  else if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorResponse = createErrorResponse(
      error.message,
      getErrorCodeFromMessage(error.message),
      getErrorTypeFromStatusCode(statusCode),
      error.details,
      requestId
    );
  }
  // Handle other errors
  else {
    statusCode = 500;
    errorResponse = createErrorResponse(
      error.message || "Internal server error",
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorType.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }

  // Log error for monitoring
  console.error("Error occurred:", {
    requestId,
    method: req.method,
    url: req.url,
    statusCode,
    error: error.message,
    stack: error.stack,
    user: (req as any).user?.id,
    organization: (req as any).user?.organizationId,
  });

  res.status(statusCode).json(errorResponse);
}

/**
 * Map error messages to error codes
 */
function getErrorCodeFromMessage(message: string): ErrorCode {
  const messageLower = message.toLowerCase();
  
  // Authentication errors
  if (messageLower.includes("invalid credentials")) return ErrorCode.INVALID_CREDENTIALS;
  if (messageLower.includes("token expired")) return ErrorCode.TOKEN_EXPIRED;
  if (messageLower.includes("token invalid")) return ErrorCode.TOKEN_INVALID;
  if (messageLower.includes("email not verified")) return ErrorCode.EMAIL_NOT_VERIFIED;
  
  // Authorization errors
  if (messageLower.includes("insufficient permissions")) return ErrorCode.INSUFFICIENT_PERMISSIONS;
  if (messageLower.includes("admin access required")) return ErrorCode.ADMIN_ACCESS_REQUIRED;
  
  // Not found errors
  if (messageLower.includes("resource not found")) return ErrorCode.RESOURCE_NOT_FOUND;
  if (messageLower.includes("not found")) return ErrorCode.USER_NOT_FOUND;
  if (messageLower.includes("organization not found")) return ErrorCode.ORGANIZATION_NOT_FOUND;
  if (messageLower.includes("subscription not found")) return ErrorCode.SUBSCRIPTION_NOT_FOUND;
  
  // Conflict errors
  if (messageLower.includes("email already exists")) return ErrorCode.EMAIL_ALREADY_EXISTS;
  if (messageLower.includes("organization slug taken")) return ErrorCode.ORGANIZATION_SLUG_TAKEN;
  if (messageLower.includes("user already member")) return ErrorCode.USER_ALREADY_MEMBER;
  
  // Rate limit errors
  if (messageLower.includes("too many requests")) return ErrorCode.TOO_MANY_REQUESTS;
  if (messageLower.includes("rate limit")) return ErrorCode.TOO_MANY_REQUESTS;
  
  // Business logic errors
  if (messageLower.includes("usage limit exceeded")) return ErrorCode.USAGE_LIMIT_EXCEEDED;
  if (messageLower.includes("otp expired")) return ErrorCode.OTP_EXPIRED;
  if (messageLower.includes("otp invalid")) return ErrorCode.OTP_INVALID;
  if (messageLower.includes("subscription plan not available")) return ErrorCode.SUBSCRIPTION_PLAN_NOT_AVAILABLE;
  
  // External service errors
  if (messageLower.includes("polar service")) return ErrorCode.POLAR_SERVICE_ERROR;
  if (messageLower.includes("email service")) return ErrorCode.EMAIL_SERVICE_ERROR;
  
  return ErrorCode.INTERNAL_SERVER_ERROR;
}

/**
 * Map status codes to error types
 */
function getErrorTypeFromStatusCode(statusCode: number): ErrorType {
  switch (statusCode) {
    case 400:
      return ErrorType.VALIDATION_ERROR;
    case 401:
      return ErrorType.AUTHENTICATION_ERROR;
    case 403:
      return ErrorType.AUTHORIZATION_ERROR;
    case 404:
      return ErrorType.NOT_FOUND_ERROR;
    case 409:
      return ErrorType.CONFLICT_ERROR;
    case 429:
      return ErrorType.RATE_LIMIT_ERROR;
    case 500:
      return ErrorType.INTERNAL_SERVER_ERROR;
    case 502:
    case 503:
      return ErrorType.EXTERNAL_SERVICE_ERROR;
    default:
      return ErrorType.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Not found handler middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse = createErrorResponse(
    "Resource not found",
    ErrorCode.RESOURCE_NOT_FOUND,
    ErrorType.NOT_FOUND_ERROR,
    { path: req.path, method: req.method },
    (req as any).id
  );
  
  res.status(404).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Retry logic for external service calls
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = initialDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

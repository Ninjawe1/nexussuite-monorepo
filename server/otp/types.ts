/**
 * OTP System Types
 * Type definitions for One-Time Password verification system
 */

import { z } from "zod";

// OTP Types
export const OTP_TYPE = {
  EMAIL_VERIFICATION: "email_verification",
  PHONE_VERIFICATION: "phone_verification", 
  PASSWORD_RESET: "password_reset",
  TWO_FACTOR_AUTH: "two_factor_auth",
  ORG_INVITATION: "org_invitation",
} as const;

export type OtpType = typeof OTP_TYPE[keyof typeof OTP_TYPE];

// OTP Status
export const OTP_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified", 
  EXPIRED: "expired",
  FAILED: "failed",
} as const;

export type OtpStatus = typeof OTP_STATUS[keyof typeof OTP_STATUS];

// OTP Delivery Method
export const OTP_DELIVERY = {
  EMAIL: "email",
  SMS: "sms",
  WHATSAPP: "whatsapp",
} as const;

export type OtpDeliveryMethod = typeof OTP_DELIVERY[keyof typeof OTP_DELIVERY];

// OTP Record Interface
export interface OtpRecord {
  id: string;
  userId: string;
  type: OtpType;
  deliveryMethod: OtpDeliveryMethod;
  target: string; // email or phone number
  code: string;
  status: OtpStatus;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Validation Schemas
export const generateOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.nativeEnum(OTP_TYPE),
  deliveryMethod: z.nativeEnum(OTP_DELIVERY),
  target: z.string().min(1, "Target (email/phone) is required"),
  metadata: z.object({}).passthrough().optional(),
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  code: z.string().min(4, "OTP code is required").max(8, "Invalid OTP format"),
  type: z.nativeEnum(OTP_TYPE).optional(),
});

export const resendOtpSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.nativeEnum(OTP_TYPE).optional(),
});

// Response Types
export interface GenerateOtpResponse {
  success: boolean;
  otpId: string;
  expiresAt: Date;
  deliveryMethod: OtpDeliveryMethod;
  target: string;
  message?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified: boolean;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface OtpStatusResponse {
  success: boolean;
  otp?: OtpRecord;
  hasActiveOtp: boolean;
  canResend: boolean;
  nextResendAvailableAt?: Date;
}
/**
 * OTP Service
 * Core service for OTP generation, verification, and management
 */

import { z } from "zod";
import { isSupabaseEnabled } from "../db/supabase";
import { insertOtp, getLatestPendingOtpByUser, updateOtp, invalidatePendingOtps, countResendsLastHour } from "../db/repos/otps";
import crypto from "crypto";
import {
  OtpRecord,
  OtpType,
  OtpStatus,
  OtpDeliveryMethod,
  generateOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  GenerateOtpResponse,
  VerifyOtpResponse,
  OtpStatusResponse,
  OTP_TYPE,
  OTP_STATUS,
  OTP_DELIVERY,
} from "./types";

// Configuration
const OTP_CONFIG = {
  CODE_LENGTH: 6,
  EXPIRY_MINUTES: 15,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_MINUTES: 1,
  MAX_RESENDS_PER_HOUR: 5,
} as const;

// Email service (placeholder - integrate with your email provider)
class EmailService {
  async sendOtpEmail(email: string, code: string, type: OtpType): Promise<boolean> {
    console.log(`[EmailService] Sending ${type} OTP ${code} to ${email}`);
    
    // TODO: Integrate with your email provider (SendGrid, AWS SES, etc.)
    // For now, we'll simulate success
    return true;
  }
}

// SMS service (placeholder - integrate with your SMS provider)
class SmsService {
  async sendOtpSms(phone: string, code: string, type: OtpType): Promise<boolean> {
    console.log(`[SmsService] Sending ${type} OTP ${code} to ${phone}`);
    
    // TODO: Integrate with your SMS provider (Twilio, AWS SNS, etc.)
    // For now, we'll simulate success
    return true;
  }
}

export class OtpService {
  private db = (isSupabaseEnabled() ? null : require("../auth/firebase").getFirestore());
  private emailService = new EmailService();
  private smsService = new SmsService();

  /**
   * Generate cryptographically secure OTP code
   */
  private generateCode(): string {
    const code = crypto.randomInt(0, Math.pow(10, OTP_CONFIG.CODE_LENGTH));
    return code.toString().padStart(OTP_CONFIG.CODE_LENGTH, '0');
  }

  /**
   * Generate unique OTP ID
   */
  private generateOtpId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate OTP for user
   */
  async generateOtp(params: z.infer<typeof generateOtpSchema>): Promise<GenerateOtpResponse> {
    try {
      const validated = generateOtpSchema.parse(params);
      
      // Check for existing active OTPs
      if (isSupabaseEnabled()) {
        await invalidatePendingOtps(validated.userId, validated.type);
      } else {
        await this.invalidateExistingOtps(validated.userId, validated.type);
      }
      
      // Check rate limits
      if (isSupabaseEnabled()) {
        const count = await countResendsLastHour(validated.userId, validated.deliveryMethod);
        if (count >= OTP_CONFIG.MAX_RESENDS_PER_HOUR) {
          throw new Error(`Maximum ${OTP_CONFIG.MAX_RESENDS_PER_HOUR} OTP requests per hour exceeded`);
        }
      } else {
        await this.checkRateLimits(validated.userId, validated.deliveryMethod);
      }
      
      // Generate OTP
      const code = this.generateCode();
      const otpId = this.generateOtpId();
      const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
      
      // Create OTP record
      const otpRecord: OtpRecord = {
        id: otpId,
        userId: validated.userId,
        type: validated.type,
        deliveryMethod: validated.deliveryMethod,
        target: validated.target,
        code,
        status: OTP_STATUS.PENDING,
        attempts: 0,
        maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: validated.metadata || {},
      };
      
      // Store in Firestore
      if (isSupabaseEnabled()) {
        await insertOtp({
          id: otpRecord.id,
          user_id: otpRecord.userId,
          type: otpRecord.type,
          delivery_method: otpRecord.deliveryMethod,
          target: otpRecord.target,
          code: otpRecord.code,
          status: otpRecord.status,
          attempts: otpRecord.attempts,
          max_attempts: otpRecord.maxAttempts,
          expires_at: otpRecord.expiresAt.toISOString(),
          metadata: otpRecord.metadata,
          created_at: otpRecord.createdAt.toISOString(),
          updated_at: otpRecord.updatedAt.toISOString(),
        });
      } else {
        const Timestamp = require("firebase-admin/firestore").Timestamp;
        await this.db.collection('otps').doc(otpId).set({
          ...otpRecord,
          expiresAt: Timestamp.fromDate(expiresAt),
          createdAt: Timestamp.fromDate(otpRecord.createdAt),
          updatedAt: Timestamp.fromDate(otpRecord.updatedAt),
        });
      }
      
      // Send OTP via chosen delivery method
      const sent = await this.sendOtp(validated.target, code, validated.type, validated.deliveryMethod);
      
      if (!sent) {
        // Clean up failed OTP
        await this.db.collection('otps').doc(otpId).delete();
        throw new Error("Failed to send OTP");
      }
      
      return {
        success: true,
        otpId,
        expiresAt,
        deliveryMethod: validated.deliveryMethod,
        target: validated.target,
        message: `OTP sent successfully via ${validated.deliveryMethod}`,
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(params: z.infer<typeof verifyOtpSchema>): Promise<VerifyOtpResponse> {
    try {
      const validated = verifyOtpSchema.parse(params);
      
      // Find active OTP for user
      let otp: any = null;
      if (isSupabaseEnabled()) {
        const row = await getLatestPendingOtpByUser(validated.userId, validated.type);
        if (!row) {
          return { success: true, verified: false, message: "No active OTP found" };
        }
        otp = {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          deliveryMethod: row.delivery_method,
          target: row.target,
          code: row.code,
          status: row.status,
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          expiresAt: new Date(row.expires_at),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          metadata: row.metadata || {},
        };
      } else {
        const otpSnapshot = await this.db.collection('otps')
          .where('userId', '==', validated.userId)
          .where('status', '==', OTP_STATUS.PENDING)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (otpSnapshot.empty) {
          return { success: true, verified: false, message: "No active OTP found" };
        }
        const otpDoc = otpSnapshot.docs[0];
        otp = otpDoc.data() as OtpRecord;
      }
      
      // Check if OTP is expired
      if (new Date() > otp.expiresAt) {
        await this.updateOtpStatus(otp.id, OTP_STATUS.EXPIRED);
        return {
          success: true,
          verified: false,
          message: "OTP has expired",
        };
      }
      
      // Check max attempts
      if (otp.attempts >= otp.maxAttempts) {
        await this.updateOtpStatus(otp.id, OTP_STATUS.FAILED);
        return {
          success: true,
          verified: false,
          message: "Maximum attempts exceeded",
        };
      }
      
      // Increment attempts
      if (isSupabaseEnabled()) {
        await updateOtp(otp.id, { attempts: otp.attempts + 1, updated_at: new Date().toISOString() });
      } else {
        await this.db.collection('otps').doc(otp.id).update({
          attempts: otp.attempts + 1,
          updatedAt: require("firebase-admin/firestore").Timestamp.now(),
        });
      }
      
      // Verify code
      if (otp.code !== validated.code) {
        return {
          success: true,
          verified: false,
          message: "Invalid OTP code",
        };
      }
      
      // Mark as verified
      if (isSupabaseEnabled()) {
        await updateOtp(otp.id, { status: OTP_STATUS.VERIFIED, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      } else {
        await this.updateOtpStatus(otp.id, OTP_STATUS.VERIFIED, new Date());
      }
      
      // Invalidate other OTPs for this user and type
      if (validated.type) {
        if (isSupabaseEnabled()) {
          await invalidatePendingOtps(validated.userId, validated.type, otp.id);
        } else {
          await this.invalidateExistingOtps(validated.userId, validated.type, otp.id);
        }
      }
      
      return {
        success: true,
        verified: true,
        message: "OTP verified successfully",
        userId: validated.userId,
        metadata: otp.metadata,
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(params: z.infer<typeof resendOtpSchema>): Promise<GenerateOtpResponse> {
    try {
      const validated = resendOtpSchema.parse(params);
      
      // Find latest OTP for user
      let latestOtp: OtpRecord | null = null;
      if (isSupabaseEnabled()) {
        const row = await getLatestPendingOtpByUser(validated.userId);
        if (!row) throw new Error("No OTP found for user");
        latestOtp = {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          deliveryMethod: row.delivery_method,
          target: row.target,
          code: row.code,
          status: row.status,
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          expiresAt: new Date(row.expires_at),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          metadata: row.metadata || {},
        };
      } else {
        const otpSnapshot = await this.db.collection('otps')
          .where('userId', '==', validated.userId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (otpSnapshot.empty) throw new Error("No OTP found for user");
        latestOtp = otpSnapshot.docs[0].data() as OtpRecord;
      }
      
      // Check cooldown period
      const cooldownEnd = new Date(latestOtp.createdAt.getTime() + OTP_CONFIG.RESEND_COOLDOWN_MINUTES * 60 * 1000);
      if (new Date() < cooldownEnd) {
        throw new Error(`Please wait ${OTP_CONFIG.RESEND_COOLDOWN_MINUTES} minute(s) before requesting a new OTP`);
      }
      
      // Generate new OTP with same parameters
      return this.generateOtp({
        userId: validated.userId,
        type: validated.type || latestOtp.type,
        deliveryMethod: latestOtp.deliveryMethod,
        target: latestOtp.target,
        metadata: latestOtp.metadata,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw error;
    }
  }

  /**
   * Get OTP status for user
   */
  async getOtpStatus(userId: string, type?: OtpType): Promise<OtpStatusResponse> {
    try {
      let query = this.db.collection('otps').where('userId', '==', userId);
      
      if (type) {
        query = query.where('type', '==', type);
      }
      
      if (isSupabaseEnabled()) {
        const row = await getLatestPendingOtpByUser(userId, type);
        if (!row) {
          return { success: true, hasActiveOtp: false, canResend: true } as any;
        }
        const created = new Date(row.created_at);
        const nextAt = new Date(created.getTime() + OTP_CONFIG.RESEND_COOLDOWN_MINUTES * 60 * 1000);
        const canResend = new Date() > nextAt;
        return { success: true, otp: { id: row.id, userId: row.user_id, type: row.type, deliveryMethod: row.delivery_method, target: row.target, code: row.code, status: row.status, attempts: row.attempts, maxAttempts: row.max_attempts, expiresAt: new Date(row.expires_at), createdAt: created, updatedAt: new Date(row.updated_at), metadata: row.metadata || {} }, hasActiveOtp: true, canResend, nextResendAvailableAt: canResend ? nextAt : nextAt } as any;
      } else {
        const otpSnapshot = await query
          .where('status', '==', OTP_STATUS.PENDING)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (otpSnapshot.empty) {
          return { success: true, hasActiveOtp: false, canResend: true } as any;
        }
        const otp = otpSnapshot.docs[0].data() as OtpRecord;
        const canResend = new Date() > new Date(otp.createdAt.getTime() + OTP_CONFIG.RESEND_COOLDOWN_MINUTES * 60 * 1000);
        return { success: true, otp, hasActiveOtp: true, canResend, nextResendAvailableAt: new Date(otp.createdAt.getTime() + OTP_CONFIG.RESEND_COOLDOWN_MINUTES * 60 * 1000) } as any;
      }
      
    } catch (error) {
      throw new Error(`Failed to get OTP status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Invalidate existing OTPs for user and type
   */
  private async invalidateExistingOtps(userId: string, type: OtpType, excludeOtpId?: string): Promise<void> {
    const batch = this.db.batch();
    const otpSnapshot = await this.db.collection('otps')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('status', '==', OTP_STATUS.PENDING)
      .get();
    otpSnapshot.docs.forEach((doc: any) => {
      if (doc.id !== excludeOtpId) {
        batch.update(doc.ref, { status: OTP_STATUS.EXPIRED, updatedAt: require("firebase-admin/firestore").Timestamp.now() });
      }
    });
    await batch.commit();
  }

  /**
   * Update OTP status
   */
  private async updateOtpStatus(otpId: string, status: OtpStatus, verifiedAt?: Date): Promise<void> {
    const Timestamp = require("firebase-admin/firestore").Timestamp;
    const updateData: any = { status, updatedAt: Timestamp.now() };
    
    if (verifiedAt) {
      updateData.verifiedAt = Timestamp.fromDate(verifiedAt);
    }
    
    await this.db.collection('otps').doc(otpId).update(updateData);
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(userId: string, deliveryMethod: OtpDeliveryMethod): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await this.db.collection('otps')
      .where('userId', '==', userId)
      .where('deliveryMethod', '==', deliveryMethod)
      .where('createdAt', '>', require("firebase-admin/firestore").Timestamp.fromDate(oneHourAgo))
      .get();
    if (recentOtps.size >= OTP_CONFIG.MAX_RESENDS_PER_HOUR) {
      throw new Error(`Maximum ${OTP_CONFIG.MAX_RESENDS_PER_HOUR} OTP requests per hour exceeded`);
    }
  }

  /**
   * Send OTP via delivery method
   */
  private async sendOtp(target: string, code: string, type: OtpType, method: OtpDeliveryMethod): Promise<boolean> {
    switch (method) {
      case OTP_DELIVERY.EMAIL:
        return this.emailService.sendOtpEmail(target, code, type);
      case OTP_DELIVERY.SMS:
      case OTP_DELIVERY.WHATSAPP:
        return this.smsService.sendOtpSms(target, code, type);
      default:
        throw new Error(`Unsupported delivery method: ${method}`);
    }
  }

  /**
   * Clean up expired OTPs (call this periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const expiredOtps = await this.db.collection('otps')
      .where('createdAt', '<', require("firebase-admin/firestore").Timestamp.fromDate(oneDayAgo))
      .limit(1000)
      .get();
    
    const batch = this.db.batch();
    expiredOtps.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return expiredOtps.size;
  }
}

// Export singleton instance
export const otpService = new OtpService();
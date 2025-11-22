/**
 * OTP Routes
 * Express routes for OTP verification system
 */

import { Router } from "express";
import { z } from "zod";
import { otpService } from "./service";
import { generateOtpSchema, verifyOtpSchema, resendOtpSchema, OTP_TYPE, OTP_DELIVERY } from "./types";
import { requireAuth } from "../auth/authRoutes";

const router = Router();

/**
 * Generate OTP
 * POST /api/otp/generate
 */
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { type, deliveryMethod, target, metadata } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    // Validate input
    const validated = generateOtpSchema.parse({
      userId,
      type,
      deliveryMethod,
      target,
      metadata,
    });
    
    const result = await otpService.generateOtp(validated);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Generate OTP error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: error.errors.map(e => e.message).join(", "),
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "OTP generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Verify OTP
 * POST /api/otp/verify
 */
router.post("/verify", requireAuth, async (req, res) => {
  try {
    const { code, type } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    // Validate input
    const validated = verifyOtpSchema.parse({
      userId,
      code,
      type,
    });
    
    const result = await otpService.verifyOtp(validated);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: error.errors.map(e => e.message).join(", "),
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "OTP verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Resend OTP
 * POST /api/otp/resend
 */
router.post("/resend", requireAuth, async (req, res) => {
  try {
    const { type } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    // Validate input
    const validated = resendOtpSchema.parse({
      userId,
      type,
    });
    
    const result = await otpService.resendOtp(validated);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: error.errors.map(e => e.message).join(", "),
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "OTP resend failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get OTP status
 * GET /api/otp/status
 */
router.get("/status", requireAuth, async (req, res) => {
  try {
    const { type } = req.query;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    const result = await otpService.getOtpStatus(userId, type as any);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get OTP status error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Failed to get OTP status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Public endpoint for email verification (no auth required)
 * POST /api/otp/verify-email
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: "Email and code are required",
      });
    }
    
    // Find user by email (you'll need to implement this lookup)
    // For now, we'll use a placeholder userId
    const userId = "placeholder-user-id"; // TODO: Implement user lookup by email
    
    const result = await otpService.verifyOtp({
      userId,
      code,
      type: OTP_TYPE.EMAIL_VERIFICATION,
    });
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Email verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Public endpoint for password reset OTP
 * POST /api/otp/reset-password
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: "Email is required",
      });
    }
    
    // Find user by email (you'll need to implement this lookup)
    // For now, we'll use a placeholder userId
    const userId = "placeholder-user-id"; // TODO: Implement user lookup by email
    
    const result = await otpService.generateOtp({
      userId,
      type: OTP_TYPE.PASSWORD_RESET,
      deliveryMethod: OTP_DELIVERY.EMAIL,
      target: email,
    });
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Password reset OTP error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Password reset failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
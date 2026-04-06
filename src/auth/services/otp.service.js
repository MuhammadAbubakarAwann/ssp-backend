import { prisma } from "../../../config/database.js"


class OTPService {
  static generateOTP() {
    // TODO: Remove hardcoded OTP for production
    return "1234" // Hardcoded for development/testing
    // return Math.floor(1000 + Math.random() * 9000).toString()
  }

  static async createOTP(email, type = "PASSWORD_SETUP") {
    try {
      const otp = this.generateOTP()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Delete any existing OTPs for this email and type
      await prisma.oTP.deleteMany({
        where: {
          email,
          type,
          isUsed: false,
        },
      })

      // Create new OTP
      const otpRecord = await prisma.oTP.create({
        data: {
          email,
          otp,
          type,
          expiresAt,
          isUsed: false,
        },
      })

      return {
        success: true,
        otp: otpRecord.otp,
        expiresAt: otpRecord.expiresAt,
      }
    } catch (error) {
      console.error("Create OTP error:", error)
      return {
        success: false,
        error: "Failed to create OTP",
      }
    }
  }

  static async verifyOTP(email, otp, type = "PASSWORD_SETUP") {
    try {
      const otpRecord = await prisma.oTP.findFirst({
        where: {
          email,
          otp,
          type,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      })

      if (!otpRecord) {
        return {
          success: false,
          error: "Invalid or expired OTP",
        }
      }

      // Mark OTP as used
      await prisma.oTP.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          isUsed: true,
        },
      })

      return {
        success: true,
        message: "OTP verified successfully",
      }
    } catch (error) {
      console.error("Verify OTP error:", error)
      return {
        success: false,
        error: "Failed to verify OTP",
      }
    }
  }

  static async cleanupExpiredOTPs() {
    try {
      await prisma.oTP.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      })
    } catch (error) {
      console.error("Cleanup expired OTPs error:", error)
    }
  }
}

export default OTPService

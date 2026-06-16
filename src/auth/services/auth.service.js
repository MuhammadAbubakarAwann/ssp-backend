import { prisma } from "../../config/database.js";
import { PasswordService } from "../utils/password.js";
import { JWTService } from "../utils/jwt.js";
import crypto from "node:crypto";

export class AuthService {
  static sanitizeUser(user) {
    return {
      id: user.publicId || String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  static async register(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid request body");
    }

    const { email, password, firstName, lastName, role } = data;

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = await PasswordService.hash(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        firstName,
        lastName,
        role,
      },
    });

    const payload = { userId: user.id, role: user.role };

    return {
      user: this.sanitizeUser(user),
      accessToken: JWTService.generateAccessToken(payload),
      refreshToken: JWTService.generateRefreshToken(payload),
    };
  }

  static async login(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid request body");
    }

    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await PasswordService.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const payload = { userId: user.id, role: user.role };

    return {
      user: this.sanitizeUser(user),
      accessToken: JWTService.generateAccessToken(payload),
      refreshToken: JWTService.generateRefreshToken(payload),
    };
  }

  static async refreshToken(token) {
    const decoded = JWTService.verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const payload = { userId: user.id, role: user.role };

    return {
      accessToken: JWTService.generateAccessToken(payload),
      refreshToken: JWTService.generateRefreshToken(payload),
    };
  }

  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return this.sanitizeUser(user);
  }

  static async getMyProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const profile = {
      id: user.publicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      createdAt: user.createdAt,
      regNo: null,
      phoneNumber: null,
      address: null,
    };

    if (user.role === "STUDENT") {
      const studentRecord = await prisma.studentRecord.findFirst({
        where: {
          email: {
            equals: user.email,
            mode: "insensitive",
          },
        },
        select: {
          regNo: true,
          phoneNumber: true,
          address: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (studentRecord) {
        profile.regNo = studentRecord.regNo;
        profile.phoneNumber = studentRecord.phoneNumber;
        profile.address = studentRecord.address;
      }
    }

    return profile;
  }

  static async updateMyProfile(userId, data) {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { firstName, lastName, phoneNumber, address } = data || {};

    const userUpdateData = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    const wantsContactUpdate = phoneNumber !== undefined || address !== undefined;

    if (wantsContactUpdate) {
      if (user.role !== "STUDENT") {
        throw new Error("Phone number and address can only be updated for student accounts");
      }

      const studentUpdateData = {};
      if (phoneNumber !== undefined) studentUpdateData.phoneNumber = phoneNumber || null;
      if (address !== undefined) studentUpdateData.address = address || null;

      await prisma.studentRecord.updateMany({
        where: {
          email: {
            equals: user.email,
            mode: "insensitive",
          },
        },
        data: studentUpdateData,
      });
    }

    return this.getMyProfile(user.id);
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await PasswordService.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const isSamePassword = await PasswordService.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error("New password must be different from the current password");
    }

    const passwordHash = await PasswordService.hash(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    return { message: "Password changed successfully" };
  }

  static async forgotPassword(email) {
    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");

      // TODO: Send resetToken via email once email transport is wired for this project.
      console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
    }

    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  }

  static async logout(refreshToken) {
    if (refreshToken) {
      try {
        JWTService.verifyRefreshToken(refreshToken);
      } catch (_error) {
        // Keep logout idempotent. Client should clear local tokens regardless.
      }
    }

    return {
      loggedOut: true,
    };
  }
}

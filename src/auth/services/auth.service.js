import { prisma } from "../../config/database.js";
import { PasswordService } from "../utils/password.js";
import { JWTService } from "../utils/jwt.js";

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
}

import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "30d";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export class JWTService {
  static generateAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
    });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    });
  }

  static verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
  }

  static verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
  }
}

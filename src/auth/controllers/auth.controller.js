import { AuthService } from "../services/auth.service.js";

export class AuthController {
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  static async login(req, res) {
    try {
      const result = await AuthService.login(req.body);
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "refreshToken is required",
        });
      }

      const result = await AuthService.refreshToken(refreshToken);
      return res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: result,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : "Token refresh failed",
      });
    }
  }

  static async me(req, res) {
    try {
      const user = await AuthService.getProfile(req.user.userId);
      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : "User not found",
      });
    }
  }
}

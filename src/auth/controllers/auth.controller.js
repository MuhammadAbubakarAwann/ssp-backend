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

  static async getProfile(req, res) {
    try {
      const profile = await AuthService.getMyProfile(req.user.userId);
      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch profile",
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const profile = await AuthService.updateMyProfile(req.user.userId, req.body);
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to change password",
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Forgot password failed",
      });
    }
  }

  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Logout failed",
      });
    }
  }
}

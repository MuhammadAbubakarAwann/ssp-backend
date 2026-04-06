import bcrypt from "bcryptjs"

export class PasswordService {
  static async hash(password) {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  static async compare(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateRandomPassword(length = 12) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&"
    let password = ""

    // Ensure at least one character from each required category
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)] // lowercase
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)] // uppercase
    password += "0123456789"[Math.floor(Math.random() * 10)] // number
    password += "@$!%*?&"[Math.floor(Math.random() * 7)] // special character

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("")
  }
}

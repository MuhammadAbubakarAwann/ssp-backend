import admin from "firebase-admin"
import { getFirebaseAdmin } from "../../../config/firebase.js"

// Use centralized Firebase initialization
getFirebaseAdmin()

class FirebaseService {
  static async verifyIdToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken)
      return {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          name: decodedToken.name,
          picture: decodedToken.picture,
          provider: decodedToken.firebase.sign_in_provider,
        },
      }
    } catch (error) {
      console.error("Firebase token verification failed:", error)
      return {
        success: false,
        error: "Invalid Firebase token",
      }
    }
  }

  static async getUserByUid(uid) {
    try {
      const userRecord = await admin.auth().getUser(uid)
      return {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
          providerData: userRecord.providerData,
        },
      }
    } catch (error) {
      console.error("Firebase get user failed:", error)
      return {
        success: false,
        error: "User not found in Firebase",
      }
    }
  }
}

export default FirebaseService

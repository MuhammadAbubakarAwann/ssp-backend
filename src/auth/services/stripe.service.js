import { stripe } from "../../../config/stripe.js"

export class StripeService {
  static async createCustomer(userData) {
    try {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        phone: userData.phone || undefined,
        metadata: {
          userId: userData.id,
          role: userData.role,
        },
      })

      return customer.id
    } catch (error) {
      console.error("Failed to create Stripe customer:", error)
      throw new Error("Failed to create payment profile")
    }
  }

  static async updateCustomer(stripeCustomerId, updateData) {
    try {
      await stripe.customers.update(stripeCustomerId, updateData)
    } catch (error) {
      console.error("Failed to update Stripe customer:", error)
      throw new Error("Failed to update payment profile")
    }
  }

  static async deleteCustomer(stripeCustomerId) {
    try {
      await stripe.customers.del(stripeCustomerId)
    } catch (error) {
      console.error("Failed to delete Stripe customer:", error)
      // Don't throw error for delete operations to avoid blocking user deletion
    }
  }
}

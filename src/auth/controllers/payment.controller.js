import PaymentService from "../services/payment.service.js"
import { paymentValidation } from "../utils/payment.validation.js"

// Add payment method
export const addPaymentMethod = async (req, res) => {
  try {
    const { error, value } = paymentValidation.addPaymentMethod.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      })
    }

    const { paymentMethodId } = value
    const userId = req.user.id

    const paymentMethod = await PaymentService.addPaymentMethod(userId, paymentMethodId)

    res.status(201).json({
      success: true,
      message: "Payment method added successfully",
      data: { paymentMethod },
    })
  } catch (error) {
    console.error("Add payment method error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add payment method",
    })
  }
}

// Get user payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id
    const result = await PaymentService.getUserPaymentMethods(userId)

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        paymentMethods: result.paymentMethods,
        totalCount: result.totalCount,
      },
    })
  } catch (error) {
    console.error("Get payment methods error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payment methods",
    })
  }
}

// Set default payment method
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { error, value } = paymentValidation.setDefaultPaymentMethod.validate(req.params)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      })
    }

    const { paymentMethodId } = value
    const userId = req.user.id

    const paymentMethod = await PaymentService.setDefaultPaymentMethod(userId, paymentMethodId)

    res.status(200).json({
      success: true,
      message: "Default payment method updated successfully",
      data: { paymentMethod },
    })
  } catch (error) {
    console.error("Set default payment method error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to set default payment method",
    })
  }
}

// Delete payment method
export const deletePaymentMethod = async (req, res) => {
  try {
    const { error, value } = paymentValidation.deletePaymentMethod.validate(req.params)
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      })
    }

    const { paymentMethodId } = value
    const userId = req.user.id

    const result = await PaymentService.deletePaymentMethod(userId, paymentMethodId)

    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error("Delete payment method error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payment method",
    })
  }
}

// NEW: Create Payment Intent
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderIds, paymentMethodId } = req.body
    const customerId = req.user.id

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs are required'
      })
    }

    const result = await PaymentService.createPaymentIntent(
      customerId, 
      orderIds, 
      paymentMethodId
    )

    res.json({
      success: true,
      message: 'Payment intent created successfully',
      data: result
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment intent'
    })
  }
}

// NEW: Confirm Payment
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body
    const customerId = req.user.id

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      })
    }

    const result = await PaymentService.confirmPayment(paymentIntentId, customerId)

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          orderIds: result.orderIds,
          paidAmount: result.paidAmount,
          status: result.status
        }
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: {
          status: result.status,
          orderIds: result.orderIds
        }
      })
    }

  } catch (error) {
    console.error('Error confirming payment:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment'
    })
  }
}

// NEW: Handle Stripe Webhooks
export const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature']
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Stripe signature missing'
      })
    }

    const result = await PaymentService.handleStripeWebhook(req.rawBody, signature)
    
    res.json(result)

  } catch (error) {
    console.error('Webhook error:', error)
    res.status(400).json({
      success: false,
      message: `Webhook error: ${error.message}`
    })
  }
}

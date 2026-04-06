import express from "express"
import {
  addPaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook
} from "../controllers/payment.controller.js"
import { authenticate } from "../middlewares/auth.js"

const router = express.Router()

// Existing payment method routes
router.post("/payment-methods", authenticate, addPaymentMethod)
router.get("/payment-methods", authenticate, getPaymentMethods)
router.put("/payment-methods/:paymentMethodId/default", authenticate, setDefaultPaymentMethod)
router.delete("/payment-methods/:paymentMethodId", authenticate, deletePaymentMethod)

// NEW PAYMENT INTENT ROUTES
router.post("/create-intent", authenticate, createPaymentIntent)
router.post("/confirm-payment", authenticate, confirmPayment)

// NEW WEBHOOK ROUTE (no auth needed for webhooks)
router.post("/stripe-webhook", 
  express.raw({ type: 'application/json' }),  // Raw body for webhook verification
  handleStripeWebhook
)

export default router

import Stripe from "stripe"
import { prisma } from "../../../config/database.js"
import { RiderCommissionHelper } from "../../../services/rider-commission-helper.service.js"
import { CurrencyService } from "../../../services/currency.service.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

class PaymentService {
  // Add payment method (created by frontend)
  static async addPaymentMethod(userId, paymentMethodId, isDefault = false) {
    try {
      // Get user with Stripe customer ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, stripeCustomerId: true, email: true, firstName: true, lastName: true },
      })

      if (!user) {
        throw new Error("User not found")
      }

      if (!user.stripeCustomerId) {
        throw new Error("User does not have a Stripe customer ID. Please contact support.")
      }

      const existingPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          userId,
          stripePaymentMethodId: paymentMethodId,
        },
      })

      if (existingPaymentMethod) {
        throw new Error("This payment method has already been added to your account")
      }

      let paymentMethod
      try {
        paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
      } catch (stripeError) {
        if (stripeError.code === "resource_missing") {
          throw new Error("Invalid payment method ID. The payment method does not exist in Stripe.")
        } else if (stripeError.code === "invalid_request_error") {
          throw new Error("Invalid payment method ID format or the payment method is not accessible.")
        } else {
          throw new Error("Failed to validate payment method with Stripe. Please try again.")
        }
      }

      if (paymentMethod.customer && paymentMethod.customer !== user.stripeCustomerId) {
        throw new Error("This payment method is already attached to another customer")
      }

      try {
        if (!paymentMethod.customer) {
          await stripe.paymentMethods.attach(paymentMethodId, {
            customer: user.stripeCustomerId,
          })
        }
      } catch (stripeError) {
        if (stripeError.code === "payment_method_not_available") {
          throw new Error("This payment method is no longer available. Please add a new payment method.")
        } else {
          throw new Error("Failed to attach payment method to your account. Please try again.")
        }
      }

      // Check if this should be the default payment method
      const existingPaymentMethods = await prisma.paymentMethod.findMany({
        where: { userId },
      })

      const shouldBeDefault = isDefault || existingPaymentMethods.length === 0

      // If this is set as default, update other payment methods
      if (shouldBeDefault) {
        await prisma.paymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        })
      }

      // Save payment method details to database
      const savedPaymentMethod = await prisma.paymentMethod.create({
        data: {
          userId,
          stripePaymentMethodId: paymentMethodId,
          type: paymentMethod.type,
          brand: paymentMethod.card?.brand || null,
          last4: paymentMethod.card?.last4 || null,
          expiryMonth: paymentMethod.card?.exp_month || null,
          expiryYear: paymentMethod.card?.exp_year || null,
          isDefault: shouldBeDefault,
        },
      })

      return savedPaymentMethod
    } catch (error) {
      console.error("Error adding payment method:", error)
      throw error
    }
  }

  // Get all payment methods for a user
  static async getUserPaymentMethods(userId) {
    try {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      })

      return {
        paymentMethods,
        totalCount: paymentMethods.length,
        message: paymentMethods.length === 0 ? "No payment methods found. Add your first payment method to get started." : null,
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error)
      throw new Error("Failed to retrieve payment methods. Please try again.")
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(userId, paymentMethodId) {
    try {
      const userPaymentMethods = await prisma.paymentMethod.findMany({
        where: { userId },
      })

      if (userPaymentMethods.length === 0) {
        throw new Error("No payment methods found. Please add a payment method first.")
      }

      // Verify payment method belongs to user
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId },
      })

      if (!paymentMethod) {
        throw new Error("Payment method not found. Please check the payment method ID and try again.")
      }

      if (paymentMethod.isDefault) {
        throw new Error("This payment method is already set as your default payment method.")
      }

      // Update all payment methods to not be default
      await prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      })

      // Set the specified payment method as default
      const updatedPaymentMethod = await prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      })

      return updatedPaymentMethod
    } catch (error) {
      console.error("Error setting default payment method:", error)
      throw error
    }
  }

  // Delete payment method
  static async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const userPaymentMethods = await prisma.paymentMethod.findMany({
        where: { userId },
      })

      if (userPaymentMethods.length === 0) {
        throw new Error("No payment methods found to delete.")
      }

      // Verify payment method belongs to user
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId },
      })

      if (!paymentMethod) {
        throw new Error("Payment method not found. It may have already been deleted or doesn't belong to your account.")
      }

      try {
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId)
      } catch (stripeError) {
        if (stripeError.code === "resource_missing") {
          console.warn("Payment method not found in Stripe, continuing with database deletion")
        } else {
          console.warn("Failed to detach payment method from Stripe:", stripeError.message)
        }
      }

      // Delete from database
      await prisma.paymentMethod.delete({
        where: { id: paymentMethodId },
      })

      // If this was the default payment method, set another as default
      if (paymentMethod.isDefault) {
        const remainingPaymentMethods = await prisma.paymentMethod.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 1,
        })

        if (remainingPaymentMethods.length > 0) {
          await prisma.paymentMethod.update({
            where: { id: remainingPaymentMethods[0].id },
            data: { isDefault: true },
          })
        }
      }

      return { message: "Payment method deleted successfully" }
    } catch (error) {
      console.error("Error deleting payment method:", error)
      throw error
    }
  }

  // NEW: Create Payment Intent for order
  static async createPaymentIntent(customerId, orderIds, paymentMethodId = null) {
    try {
      console.log(`🎯 Creating payment intent for customer ${customerId}`)
      
      // Get orders and calculate total amount
      const orders = await prisma.order.findMany({
        where: { 
          id: { in: orderIds },
          customerId: customerId 
        },
        include: {
          customer: true,
          restaurant: true
        }
      })

      if (orders.length === 0) {
        throw new Error('No valid orders found')
      }

      const riderFeeSettings = await RiderCommissionHelper.getRiderFeeForOrder(new Date())
      const defaultRiderFee = riderFeeSettings.riderFee

      // Keep persisted order totals immutable. If totalAmount is already stored,
      // use it as-is (it may already include tax/tip snapshots).
      const normalizedOrders = orders.map((order) => {
        const riderFee = order.riderFeeAmount ?? defaultRiderFee
        const tipAmount = order.tipAmount ?? 0
        const subtotal = order.subtotalAmount ?? null
        const normalizedCurrency = (order.currency || "").toLowerCase() || null
        const normalizedTotal = order.totalAmount != null
          ? parseFloat(Number(order.totalAmount).toFixed(2))
          : parseFloat((((subtotal ?? 0) + riderFee + tipAmount)).toFixed(2))

        return {
          ...order,
          normalizedSubtotal: subtotal,
          normalizedRiderFee: riderFee,
          normalizedCurrency,
          normalizedTotal,
        }
      })

      const { currency: fallbackCustomerCurrency } = await CurrencyService.getCustomerCurrencyForAddress(
        customerId,
        normalizedOrders[0]?.deliveryAddress || "",
      )
      const knownCurrencies = new Set(
        normalizedOrders
          .map((order) => order.normalizedCurrency)
          .filter(Boolean)
      )

      if (knownCurrencies.size > 1) {
        throw new Error("All selected orders must have the same currency")
      }

      const resolvedCurrency = knownCurrencies.size === 1
        ? [...knownCurrencies][0]
        : fallbackCustomerCurrency

      const ordersNeedingSync = normalizedOrders.filter((order) =>
        order.riderFeeAmount == null ||
        order.totalAmount == null ||
        (order.subtotalAmount == null && order.totalAmount == null) ||
        !order.normalizedCurrency,
      )

      if (ordersNeedingSync.length > 0) {
        await prisma.$transaction(
          ordersNeedingSync.map((order) => {
            const updateData = {}

            if (order.riderFeeAmount == null) {
              updateData.riderFeeAmount = order.normalizedRiderFee
            }

            if (order.totalAmount == null) {
              updateData.totalAmount = order.normalizedTotal
            }

            if (order.subtotalAmount == null && order.totalAmount == null) {
              updateData.subtotalAmount = order.normalizedSubtotal ?? 0
            }

            if (!order.normalizedCurrency) {
              updateData.currency = resolvedCurrency
            }

            return prisma.order.update({
              where: { id: order.id },
              data: updateData,
            })
          }),
        )
      }

      // Calculate charge amount using normalized totals (includes rider fee).
      const totalAmount = normalizedOrders.reduce((sum, order) => sum + order.normalizedTotal, 0)
      
      // Get or create Stripe customer
      let stripeCustomerId = orders[0].customer.stripeCustomerId
      
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          email: orders[0].customer.email,
          name: `${orders[0].customer.firstName} ${orders[0].customer.lastName}`,
          phone: orders[0].customer.phone,
          metadata: {
            doomliCustomerId: customerId
          }
        })

        stripeCustomerId = stripeCustomer.id

        // Update customer with Stripe customer ID
        await prisma.user.update({
          where: { id: customerId },
          data: { stripeCustomerId: stripeCustomerId }
        })
      }

      // Create Payment Intent
      const paymentIntentData = {
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: resolvedCurrency,
        customer: stripeCustomerId,
        metadata: {
          orderIds: orderIds.join(','),
          customerId: customerId,
          restaurantIds: orders.map(o => o.restaurantId).join(','),
          customerCurrency: resolvedCurrency,
        },
        payment_method_types: ['card'],
        capture_method: 'automatic'
      }

      // If payment method provided, attach it
      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId
        paymentIntentData.confirmation_method = 'manual'
        paymentIntentData.confirm = true
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

      // Update orders with payment intent ID
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { 
          paymentIntentId: paymentIntent.id,
          paymentStatus: 'PENDING'
        }
      })

      console.log(`✅ Payment intent created: ${paymentIntent.id}`)

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        totalAmount: totalAmount,
        currency: paymentIntent.currency.toUpperCase()
      }

    } catch (error) {
      console.error('❌ Error creating payment intent:', error)
      throw error
    }
  }

  // NEW: Confirm payment and update orders
  static async confirmPayment(paymentIntentId, customerId) {
    try {
      console.log(`🎯 Confirming payment: ${paymentIntentId}`)

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      
      if (!paymentIntent) {
        throw new Error('Payment intent not found')
      }

      const orderIds = paymentIntent.metadata.orderIds.split(',')

      // Verify orders belong to customer
      const orders = await prisma.order.findMany({
        where: {
          id: { in: orderIds },
          customerId: customerId,
          paymentIntentId: paymentIntentId
        },
        include: {
          restaurant: true,
          customer: { 
            select: { firstName: true, lastName: true, phone: true, email: true } 
          },
          orderItems: { 
            include: { meal: true } 
          }
        }
      })

      if (orders.length === 0) {
        throw new Error('No matching orders found')
      }

      if (paymentIntent.status === 'succeeded') {
        // Update orders to PAID status and change order status to PENDING
        const updatedOrders = await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: {
            status: 'PENDING', // Change from PAYMENT_PENDING to PENDING
            paymentStatus: 'COMPLETED',
            paidAt: new Date()
          }
        })

        console.log(`✅ ${updatedOrders.count} orders marked as paid and ready for restaurants`)

        // ⚡ PAYMENT SPLIT: Create split records with proper Stripe account structure
        console.log(`💰 [PAYMENT SPLIT] Creating split records for ${orders.length} orders`)
        
        for (const order of orders) {
          try {
            console.log(`💰 [PAYMENT SPLIT] Creating split record for order ${order.id} ($${order.totalAmount})`)

            // Use persisted order financial snapshots. Do not recompute from live settings.
            const subtotalAmount = order.subtotalAmount || 0
            const persistedPlatformFee = order.platformFeeAmount != null
              ? parseFloat(Number(order.platformFeeAmount).toFixed(2))
              : 0
            const persistedRiderAmount = order.riderEarning != null
              ? parseFloat(Number(order.riderEarning).toFixed(2))
              : parseFloat(Number(order.riderFeeAmount || 0).toFixed(2))
            const persistedRestaurantAmount = order.restaurantEarning != null
              ? parseFloat(Number(order.restaurantEarning).toFixed(2))
              : parseFloat(Math.max(subtotalAmount - persistedPlatformFee, 0).toFixed(2))

            console.log(`💵 Split amounts (persisted): Restaurant $${persistedRestaurantAmount}, Rider $${persistedRiderAmount}, Platform $${persistedPlatformFee}`)
            
            // Create PaymentSplit record
            // Funds are captured on platform account, will be distributed based on order status
            const paymentSplit = await prisma.paymentSplit.create({
              data: {
                orderId: order.id,
                totalAmount: order.totalAmount,
                restaurantAmount: persistedRestaurantAmount,
                riderAmount: persistedRiderAmount,
                platformFeeAmount: persistedPlatformFee,
                currency: (order.currency || paymentIntent.currency || 'cad').toLowerCase(),
                stripePaymentIntentId: paymentIntent.id,
                status: 'CONFIRMED_PENDING_TRANSFER', // Confirmed but not transferred yet
                confirmedAt: new Date()
              }
            })
            
            // Link PaymentSplit to order using relation
            await prisma.order.update({
              where: { id: order.id },
              data: { 
                paymentSplit: { connect: { id: paymentSplit.id } },
                platformFeeAmount: persistedPlatformFee,
                riderEarning: persistedRiderAmount,
                restaurantEarning: persistedRestaurantAmount
              }
            })
            
            console.log(`✅ [PAYMENT SPLIT] Created split record ${paymentSplit.id} for order ${order.id}`)
            console.log(`📋 [PAYMENT SPLIT] Restaurant gets $${persistedRestaurantAmount} when OUT_FOR_DELIVERY`)
            console.log(`📋 [PAYMENT SPLIT] Rider gets $${persistedRiderAmount} when DELIVERED`)
            
          } catch (splitError) {
            console.error(`❌ [PAYMENT SPLIT] Error creating split record for order ${order.id}:`, splitError.message)
            // Don't fail payment confirmation if PaymentSplit creation fails
          }
        }

        // Send FCM notifications to restaurants now that payment is confirmed
        const { notifyCustomer, notifyRestaurant } = await import('../../../config/fcm-notifier.js')
        
        for (const order of orders) {
          try {
            // Get restaurant details
            const restaurant = await prisma.restaurantProfile.findUnique({
              where: { id: order.restaurantId },
              include: { user: true }
            })

            if (restaurant && restaurant.user) {
              console.log(`📤 Sending order ${order.id} to restaurant ${restaurant.businessName}`)
              
              await notifyRestaurant(restaurant.user.id, "newOrder", {
                orderId: order.id,
                restaurantId: order.restaurantId,
                totalAmount: order.totalAmount,
                deliveryAddress: order.deliveryAddress,
                status: 'PENDING', // Now restaurants see PENDING status
                orderDate: order.orderDate,
                customerName: `${order.customer.firstName} ${order.customer.lastName}`,
                customerPhone: order.customer.phone,
                customerEmail: order.customer.email,
                deliveryVerificationCode: order.deliveryVerificationCode,
                items: order.orderItems.map((i) => ({
                  mealName: i.meal.name,
                  quantity: i.quantity,
                  price: i.priceAtTimeOfOrder,
                  notes: i.notes,
                })),
              })
            }
          } catch (notificationError) {
            console.error(`❌ Error sending notification for order ${order.id}:`, notificationError)
          }
        }

        // Notify customer that orders are now placed and restaurants have been notified
        try {
          const placedOrderIds = orders.map((order) => order.id)
          const placedTotalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

          await notifyCustomer(orders[0].customerId, "ordersPlaced", {
            orderCount: orders.length,
            orderIds: placedOrderIds,
            totalAmount: parseFloat(placedTotalAmount.toFixed(2)),
            orders: orders.map((order) => ({
              orderId: order.id,
              restaurantId: order.restaurantId,
              totalAmount: order.totalAmount,
              status: 'PENDING',
              deliveryVerificationCode: order.deliveryVerificationCode,
            })),
          })
          console.log(`📤 Notified customer that ${orders.length} orders are now placed`)
        } catch (customerNotificationError) {
          console.error('❌ Error sending customer notification:', customerNotificationError)
        }

        return {
          success: true,
          message: 'Payment confirmed and orders sent to restaurants',
          orderIds: orderIds,
          paidAmount: paymentIntent.amount / 100,
          status: paymentIntent.status
        }

      } else {
        // Payment failed or incomplete
        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: {
            paymentStatus: 'FAILED'
          }
        })

        return {
          success: false,
          message: 'Payment not completed',
          status: paymentIntent.status,
          orderIds: orderIds
        }
      }

    } catch (error) {
      console.error('❌ Error confirming payment:', error)
      throw error
    }
  }

  // NEW: Handle Stripe webhooks
  static async handleStripeWebhook(rawBody, signature) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      
      const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)
      
      console.log(`🔔 Webhook received: ${event.type}`)

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object)
          break
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object)
          break
        default:
          console.log(`🤷 Unhandled event type: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      console.error('❌ Webhook error:', error)
      throw error
    }
  }

  static async handlePaymentSucceeded(paymentIntent) {
    const orderIds = paymentIntent.metadata.orderIds.split(',')
    
    // Update orders to PAID status and change order status to PENDING
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: 'PENDING', // Change from PAYMENT_PENDING to PENDING
        paymentStatus: 'COMPLETED',
        paidAt: new Date()
      }
    })

    console.log(`✅ Webhook: ${orderIds.length} orders marked as paid and ready for restaurants`)

    // Get orders with restaurant details for notifications
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        restaurant: { include: { user: true } },
        customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
        orderItems: { include: { meal: true } }
      }
    })

    // Send FCM notifications to restaurants
    const { notifyCustomer, notifyRestaurant } = await import('../../../config/fcm-notifier.js')
    
    for (const order of orders) {
      try {
        if (order.restaurant && order.restaurant.user) {
          console.log(`📤 Webhook: Sending order ${order.id} to restaurant ${order.restaurant.businessName}`)
          
          await notifyRestaurant(order.restaurant.user.id, "newOrder", {
            orderId: order.id,
            restaurantId: order.restaurantId,
            totalAmount: order.totalAmount,
            deliveryAddress: order.deliveryAddress,
            status: 'PENDING',
            orderDate: order.orderDate,
            customerName: `${order.customer.firstName} ${order.customer.lastName}`,
            customerPhone: order.customer.phone,
            customerEmail: order.customer.email,
            deliveryVerificationCode: order.deliveryVerificationCode,
            items: order.orderItems.map((i) => ({
              mealName: i.meal.name,
              quantity: i.quantity,
              price: i.priceAtTimeOfOrder,
              notes: i.notes,
            })),
          })
        }
      } catch (notificationError) {
        console.error(`❌ Webhook: Error sending notification for order ${order.id}:`, notificationError)
      }
    }

    // Notify customer that orders are now placed
    if (orders.length > 0) {
      try {
        await notifyCustomer(orders[0].customerId, "ordersPlaced", {
          orderCount: orders.length,
          orders: orders.map((order) => ({
            orderId: order.id,
            restaurantId: order.restaurantId,
            totalAmount: order.totalAmount,
            status: 'PENDING',
            deliveryVerificationCode: order.deliveryVerificationCode,
          })),
        })
        console.log(`📤 Webhook: Notified customer that ${orders.length} orders are now placed`)
      } catch (customerNotificationError) {
        console.error('❌ Webhook: Error sending customer notification:', customerNotificationError)
      }
    }
  }

  static async handlePaymentFailed(paymentIntent) {
    const orderIds = paymentIntent.metadata.orderIds.split(',')
    
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        paymentStatus: 'FAILED'
      }
    })

    console.log(`❌ Webhook: ${orderIds.length} orders marked as failed`)
  }
}

export default PaymentService

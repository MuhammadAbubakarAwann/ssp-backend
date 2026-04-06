import Joi from "joi"

export const paymentValidation = {
  addPaymentMethod: Joi.object({
    paymentMethodId: Joi.string()
      .pattern(/^pm_[a-zA-Z0-9]+$/)
      .required()
      .messages({
        "string.pattern.base":
          "Invalid payment method ID format. It should start with 'pm_' followed by alphanumeric characters.",
        "any.required": "Payment method ID is required. Please provide a valid Stripe payment method ID.",
        "string.empty": "Payment method ID cannot be empty.",
      }),
    isDefault: Joi.boolean().optional().default(false).messages({
      "boolean.base": "isDefault must be a boolean value (true or false).",
    }),
  }),

  setDefaultPaymentMethod: Joi.object({
    paymentMethodId: Joi.string().required().messages({
      "any.required": "Payment method ID is required to set as default.",
      "string.empty": "Payment method ID cannot be empty.",
    }),
  }),

  deletePaymentMethod: Joi.object({
    paymentMethodId: Joi.string().required().messages({
      "any.required": "Payment method ID is required to delete the payment method.",
      "string.empty": "Payment method ID cannot be empty.",
    }),
  }),
}

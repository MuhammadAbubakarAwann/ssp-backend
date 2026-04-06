import Joi from "joi"

export const profileValidation = {
  customer: Joi.object({
    dateOfBirth: Joi.date().optional(),
    preferences: Joi.object().optional(),
    profilePhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo URL must be a valid URI",
    }),
  }),

  restaurant: Joi.object({
    // Restaurant Profile Photo
    profilePhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo URL must be a valid URI",
    }),

    // Restaurant Name (businessName in DB)
    businessName: Joi.string().min(2).max(100).required().messages({
      "string.min": "Restaurant name must be at least 2 characters long",
      "string.max": "Restaurant name cannot exceed 100 characters",
      "any.required": "Restaurant name is required",
    }),

    // Description
    description: Joi.string().max(500).optional().messages({
      "string.max": "Description cannot exceed 500 characters",
    }),

    // Cuisine Type
    cuisine: Joi.array().items(Joi.string().max(50)).optional().messages({
      "array.base": "Cuisine must be an array of strings",
      "string.max": "Each cuisine type cannot exceed 50 characters",
    }),

    // Address
    address: Joi.string().min(5).max(255).required().messages({
      "string.min": "Address must be at least 5 characters long",
      "string.max": "Address cannot exceed 255 characters",
      "any.required": "Address is required",
    }),

    // Latitude
    latitude: Joi.number().min(-90).max(90).required().messages({
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
      "any.required": "Latitude is required",
    }),

    // Longitude
    longitude: Joi.number().min(-180).max(180).required().messages({
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
      "any.required": "Longitude is required",
    }),

    // Postal Address (city and postalCode)
    city: Joi.string().min(2).max(100).optional().messages({
      "string.min": "City must be at least 2 characters long",
      "string.max": "City cannot exceed 100 characters",
      "string.base": "City must be a valid string",
    }),
    postalCode: Joi.string().max(20).optional().allow('').messages({
      "string.max": "Postal code cannot exceed 20 characters",
      "string.base": "Postal code must be a valid string",
    }),

    // Cover Photo
    coverPhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Cover photo URL must be a valid URI",
    }),

    // Business Email
    businessEmail: Joi.string().email().optional().messages({
      "string.email": "Please provide a valid business email address",
    }),

    // Contact Number
    contactNumber: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .required()
      .messages({
        "string.pattern.base": "Please provide a valid contact number",
        "any.required": "Contact number is required",
      }),

    // Additional optional fields
    operatingHours: Joi.object().optional(),
    deliveryRadius: Joi.number().positive().optional().messages({
      "number.positive": "Delivery radius must be positive",
    }),
    minimumOrderAmount: Joi.number().min(0).optional().messages({
      "number.min": "Minimum order amount cannot be negative",
    }),
    deliveryFee: Joi.number().min(0).optional().messages({
      "number.min": "Delivery fee cannot be negative",
    }),
    isActive: Joi.boolean().optional().default(true),
  }),

  rider: Joi.object({
    licenseNumber: Joi.string().min(5).max(50).required().messages({
      "string.min": "License number must be at least 5 characters long",
      "string.max": "License number cannot exceed 50 characters",
      "any.required": "License number is required",
    }),
    vehicleType: Joi.string().max(50).optional(),
    vehicleModel: Joi.string().max(100).optional(),
    vehiclePlateNumber: Joi.string().max(20).optional(),
    isAvailable: Joi.boolean().optional().default(true),
    currentLatitude: Joi.number().min(-90).max(90).optional(),
    currentLongitude: Joi.number().min(-180).max(180).optional(),
  }),

  restaurantOwner: Joi.object({
    firstName: Joi.string().min(2).max(50).optional().messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 50 characters",
    }),
    lastName: Joi.string().min(2).max(50).optional().messages({
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name cannot exceed 50 characters",
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .optional()
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),
  }).min(1).messages({
    "object.min": "At least one field (firstName, lastName, phone) must be provided",
  }),
}

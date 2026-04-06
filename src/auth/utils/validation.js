import Joi from "joi"
import pkg from "@prisma/client"
const { UserRole, MealCategory } = pkg

export const authValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .optional()
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "Password is required",
      }),
    firstName: Joi.string().min(2).max(50).required().messages({
      "string.min": "First name must be at least 2 characters long",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      "string.min": "Last name must be at least 2 characters long",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required()
      .messages({
        "any.only": "Invalid user role",
        "any.required": "User role is required",
      }),
    // profileData stays optional for CUSTOMER/RESTAURANT but is required for RIDER currency resolution
    profileData: Joi.when("role", {
      is: UserRole.RIDER,
      then: Joi.object({
        country: Joi.string().trim().max(100).required().messages({
          "any.required": "Country is required for rider registration",
          "string.empty": "Country is required for rider registration",
        }),
      })
        .unknown(true)
        .required()
        .messages({
          "any.required": "profileData is required for rider registration",
        }),
      otherwise: Joi.object({
        country: Joi.string().trim().max(100).optional(),
      })
        .unknown(true)
        .optional(),
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required()
      .messages({
        "any.only": "Invalid user role",
        "any.required": "User role is required",
      }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      "any.required": "Reset token is required",
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "Password is required",
      }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        "string.min": "New password must be at least 8 characters long",
        "string.pattern.base":
          "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "New password is required",
      }),
  }),

  verifyCode: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    code: Joi.string()
      .length(4)
      .pattern(/^\d{4}$/)
      .required()
      .messages({
        "string.length": "Verification code must be 4 digits long",
        "string.pattern.base": "Verification code must be numeric",
        "any.required": "Verification code is required",
      }),
  }),

  resendVerificationCode: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required()
      .messages({
        "any.only": "Invalid user role",
        "any.required": "User role is required",
      }),
  }),

  generatePasswordSetupOTP: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .optional()
      .default("CUSTOMER")
      .messages({
        "any.only": "Invalid user role",
      }),
  }),

  verifyPasswordSetupOTP: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    otp: Joi.string()
      .length(4)
      .pattern(/^\d{4}$/)
      .required()
      .messages({
        "string.length": "OTP must be 4 digits long",
        "string.pattern.base": "OTP must be numeric",
        "any.required": "OTP is required",
      }),
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .optional()
      .default("CUSTOMER")
      .messages({
        "any.only": "Invalid user role",
      }),
  }),

  setPassword: Joi.object({
    verificationToken: Joi.string().required().messages({
      "any.required": "Verification token is required",
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        "any.required": "Password is required",
      }),
  }),
}

export const profileValidation = {
  customer: Joi.object({
    dateOfBirth: Joi.date().optional(),
    preferences: Joi.object().optional(),
    profilePhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo URL must be a valid URI",
    }),
  }),

  restaurant: Joi.object({
    businessName: Joi.string().min(2).max(100).required().messages({
      "string.min": "Business name must be at least 2 characters long",
      "string.max": "Business name cannot exceed 100 characters",
      "any.required": "Business name is required",
    }),
    description: Joi.string().max(500).optional(),
    cuisine: Joi.array().items(Joi.string().max(50)).optional(),
    address: Joi.string().max(255).required().messages({
      "any.required": "Address is required",
    }),
    city: Joi.string().max(100).required().messages({
      "any.required": "City is required",
    }),
    postalCode: Joi.string().max(20).required().messages({
      "any.required": "Postal code is required",
    }),
    latitude: Joi.number().min(-90).max(90).optional().messages({
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
    }),
    longitude: Joi.number().min(-180).max(180).optional().messages({
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
    }),
    businessEmail: Joi.string().email().optional().messages({
      "string.email": "Please provide a valid business email address",
    }),
    contactNumber: Joi.string()
      .pattern(/^\+?[\d\s-()]+$/)
      .optional()
      .messages({
        "string.pattern.base": "Please provide a valid contact number",
      }),
    operatingHours: Joi.object().optional(),
    taxRegistrationNumber: Joi.string().max(100).optional(),
    coverPhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Cover photo URL must be a valid URI",
    }),
    profilePhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo URL must be a valid URI",
    }),
  }),

  client: Joi.object({
    companyName: Joi.string().min(2).max(100).required(),
    businessType: Joi.string().max(100).required(),
    address: Joi.string().max(255).required(),
    city: Joi.string().max(100).required(),
    postalCode: Joi.string().max(20).required(),
    website: Joi.string().uri().optional(),
    profilePhotoUrl: Joi.string().uri().optional().messages({
      "string.uri": "Profile photo URL must be a valid URI",
    }),
  }),
}

// New validation for Meal items
export const mealValidation = {
  createMeal: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Meal name must be at least 2 characters long",
      "string.max": "Meal name cannot exceed 100 characters",
      "any.required": "Meal name is required",
    }),
    description: Joi.string().max(500).optional(),
    category: Joi.string()
      .valid(...Object.values(MealCategory))
      .required()
      .messages({
        "any.only": "Invalid meal category",
        "any.required": "Meal category is required",
      }),
    price: Joi.number().positive().precision(2).required().messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be a positive number",
      "number.precision": "Price can have at most 2 decimal places",
      "any.required": "Price is required",
    }),
    isPromoted: Joi.boolean().optional().default(false),
    inStock: Joi.boolean().optional().default(true),
    // imageUrls are handled separately by the controller after S3 upload
    // imagesToDelete is for update only
  }),

  updateMeal: Joi.object({
    name: Joi.string().min(2).max(100).optional().messages({
      "string.min": "Meal name must be at least 2 characters long",
      "string.max": "Meal name cannot exceed 100 characters",
    }),
    description: Joi.string().max(500).optional(),
    category: Joi.string()
      .valid(...Object.values(MealCategory))
      .optional()
      .messages({
        "any.only": "Invalid meal category",
      }),
    price: Joi.number().positive().precision(2).optional().messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be a positive number",
      "number.precision": "Price can have at most 2 decimal places",
    }),
    isPromoted: Joi.boolean().optional(),
    inStock: Joi.boolean().optional(),
    // For updating images:
    // newImages (files) are handled by multer
    // imagesToDelete is a comma-separated string of URLs
    imagesToDelete: Joi.string().optional().allow(""), // Expects a string of comma-separated URLs
  }),
}

// New validation for Profile Photo
export const profilePhotoValidation = {
  upload: {
    // File validation is handled by multer middleware
    // This is for any additional data that might be sent
  },
}

// PharmaLink/backend/microservices/personalized_advisory_microservice/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    passwordHash: String,

    age: Number,
    allergies: { type: [String], default: [] },

    dietaryPreferences: {
      vegetarian: { type: Boolean, default: false },
      diabeticFriendly: { type: Boolean, default: false },
      lowSodium: { type: Boolean, default: false }
    },

    activeMedicationNames: { type: [String], default: [] }
  },
  { timestamps: true }
);

// IMPORTANT: force same collection name as main backend
module.exports = mongoose.model("User", UserSchema, "users");

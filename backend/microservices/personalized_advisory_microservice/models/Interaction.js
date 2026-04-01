// PharmaLink/backend/microservices/personalized_advisory_microservice/models/Interaction.js
const mongoose = require("mongoose");

const InteractionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: ["food_drug", "meal_plan", "drug_image_prediction", "symptom_drug_reco", "patient_story_analysis"],
      required: true
    },

    input: { type: Object, default: {} },
    result: { type: Object, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interaction", InteractionSchema);

// PharmaLink/backend/microservices/personalized_advisory_microservice/routes/interactions.js
const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const Interaction = require("../models/Interaction");
const User = require("../models/User");

const {
  checkFoodDrug,
  generateMealPlan,
  predictDrugFromImage,
  listDrugs
} = require("../services/mlClient");

const router = express.Router();

const normList = (arr, lower = false) =>
  (arr || [])
    .map(x => String(x).trim())
    .filter(Boolean)
    .map(x => (lower ? x.toLowerCase() : x));

async function getDrugCatalog() {
  // Pull once per request (simple + safe)
  return await listDrugs({ q: "", limit: 5000 });
}

async function resolveDrugIndicesFromNames(drug_names) {
  const drugs = await getDrugCatalog();

  const nameToIndex = new Map(
    drugs.map(d => [String(d.name).toLowerCase(), Number(d.index)])
  );

  const indices = (drug_names || [])
    .map(n => nameToIndex.get(String(n).toLowerCase()))
    .filter(i => i !== undefined);

  if (indices.length === 0) {
    throw new Error("No valid drug names found");
  }
  return indices;
}

async function resolveDrugNamesFromIndices(drug_indices) {
  const drugs = await getDrugCatalog();

  const indexToName = new Map(
    drugs.map(d => [Number(d.index), String(d.name)])
  );

  const names = (drug_indices || [])
    .map(i => indexToName.get(Number(i)))
    .filter(Boolean);

  if (names.length === 0) {
    throw new Error("No valid drug indices found");
  }
  return names;
}

/**
 * ✅ 1) FOOD-DRUG CHECK (saved)
 * POST /food-drug/check
 * body: { drug_index, food_name }
 */
/**
 * ✅ 1) FOOD-DRUG CHECK (saved)
 * POST /food-drug/check
 * body: { drug_name, food_name, safe_food_limit? }
 */
router.post("/food-drug/check", auth, async (req, res) => {
  try {
    const { drug_name, food_name, safe_food_limit } = req.body;

    if (!drug_name || !food_name) {
      return res.status(400).json({ error: "drug_name and food_name required" });
    }

    const result = await checkFoodDrug({
      drug_name: String(drug_name),
      food_name: String(food_name),
      safe_food_limit: Number(safe_food_limit ?? 10)
    });

    const doc = await Interaction.create({
      userId: req.user.userId,
      type: "food_drug",
      input: { drug_name: String(drug_name), food_name: String(food_name) },
      result
    });

    res.json({ saved: true, interactionId: doc._id, ...result });
  } catch (e) {
    res.status(500).json({ error: "Food-drug check failed", details: String(e) });
  }
});

/**
 * ✅ 2) MEAL PLAN GENERATION (saved + update profile)
 * POST /meal-plan/generate
 *
 * body supports BOTH:
 *  - drug_indices:[0,1]
 *  - drug_names:["Panadol","Amoxicillin"]
 */
// ✅ UPDATED: /meal-plan/generate route
// - Accepts ONLY drug_names from frontend (still supports drug_indices if you send it)
// - Sends ONLY drug_names to FastAPI (because your FastAPI expects drug_names)
// - Still stores BOTH indices + names in MongoDB for history/profile

router.post("/meal-plan/generate", auth, async (req, res) => {
  try {
    const body = req.body || {};

    const drug_names_raw = Array.isArray(body.drug_names) ? body.drug_names : [];
    const drug_names = normList(drug_names_raw, false);

    if (drug_names.length === 0) {
      return res.status(400).json({ error: "drug_names required (non-empty array)" });
    }

    // ✅ payload matches FastAPI MealPlanRequest exactly
    const payload = {
      drug_names,

      days: Number(body.days ?? 3),
      meals_per_day: Number(body.meals_per_day ?? 3),
      calories_per_day: Number(body.calories_per_day ?? 1800),
      meal_types: body.meal_types ?? null,

      allergies: normList(body.allergies, true),
      vegetarian: !!body.vegetarian,
      diabetic_friendly: !!body.diabetic_friendly,
      low_sodium: !!body.low_sodium
    };

    // ✅ call FastAPI
    const result = await generateMealPlan(payload);

    // ✅ save interaction
    const doc = await Interaction.create({
      userId: req.user.userId,
      type: "meal_plan",
      input: payload,
      result
    });

    // ✅ update user profile (store names only)
    await User.findByIdAndUpdate(
      req.user.userId,
      {
        allergies: payload.allergies,
        dietaryPreferences: {
          vegetarian: payload.vegetarian,
          diabeticFriendly: payload.diabetic_friendly,
          lowSodium: payload.low_sodium
        },
        activeMedicationNames: drug_names
      },
      { new: true, runValidators: true }
    );

    res.json({
      saved: true,
      interactionId: doc._id,
      activeMedicationNames: drug_names,
      result
    });
  } catch (e) {
    res.status(500).json({ error: "Meal plan generation failed", details: String(e) });
  }
});




/**
 * ✅ 3) DRUG IMAGE PREDICTION (saved)
 * POST /drug-image/predict (multipart)
 * file field: "file"
 */
router.post(
  "/drug-image/predict",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      // 1) validate file
      if (!req.file) {
        return res.status(400).json({ error: "Image file required (field: file)" });
      }

      // optional: basic mimetype guard
      if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Upload a valid image file (png/jpg/etc)" });
      }

      // 2) read topk
      const topkRaw = req.body?.topk;
      const topk = Number.isFinite(Number(topkRaw)) ? Number(topkRaw) : 3;

      // 3) call FastAPI
      const ml = await predictDrugFromImage({
        fileBuffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        topk
      });
      // ml = { predictions: [...] }

      // 4) save interaction (store image in Mongo if you want)
      const doc = await Interaction.create({
        userId: req.user.userId,
        type: "drug_image_prediction",
        input: {
          topk,
          uploadedImage: {
            data: req.file.buffer,
            contentType: req.file.mimetype,
            filename: req.file.originalname
          }
        },
        result: ml
      });

      // 5) return
      return res.json({
        saved: true,
        interactionId: doc._id,
        ...ml
      });
    } catch (e) {
      // if FastAPI returns error message:
      return res.status(500).json({
        error: "Drug image prediction failed",
        details: String(e?.response?.data?.detail || e?.message || e)
      });
    }
  }
);

/**
 * ✅ 4) HISTORY (filtered)
 * GET /history?type=food_drug|meal_plan|drug_image_prediction
 */
router.get("/history", auth, async (req, res) => {
  try {
    const { type } = req.query;

    const q = { userId: req.user.userId };

    // type filter (optional)
    const allowed = ["food_drug", "meal_plan", "drug_image_prediction"];
    if (type) {
      if (!allowed.includes(String(type))) {
        return res.status(400).json({ error: "Invalid type. Use food_drug|meal_plan|drug_image_prediction" });
      }
      q.type = String(type);
    }

    const items = await Interaction.find(q)
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-input.uploadedImage.data"); // image binary not in list

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Failed to list history", details: String(e) });
  }
});

/**
 * ✅ 5) STORED IMAGE
 * GET /history/:id/image
 */
router.get("/history/:id/image", auth, async (req, res) => {
  try {
    const item = await Interaction.findOne({ _id: req.params.id, userId: req.user.userId })
      .select("input.uploadedImage");

    if (!item?.input?.uploadedImage?.data) return res.status(404).json({ error: "No image found" });

    res.set("Content-Type", item.input.uploadedImage.contentType || "application/octet-stream");
    res.send(item.input.uploadedImage.data);
  } catch (e) {
    res.status(500).json({ error: "Failed to load image", details: String(e) });
  }
});

module.exports = router;

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
  listDrugs,
  recommendDrugsFromSymptoms,
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
 * 1) FOOD-DRUG CHECK (saved)
 * POST /food-drug/check
 * body: { drug_index, food_name }
 */
/**
 * 1) FOOD-DRUG CHECK (saved)
 * POST /food-drug/check
 * body: { drug_name, food_name, safe_food_limit? }
 */
router.post("/food-drug/check", auth, async (req, res) => {
  try {
    const { drug_name, food_name, safe_food_limit, medication_time } = req.body;

    if (!drug_name || !food_name) {
      return res.status(400).json({ error: "drug_name and food_name required" });
    }

    const result = await checkFoodDrug({
      drug_name: String(drug_name),
      food_name: String(food_name),
      medication_time: medication_time || null,
      safe_food_limit: Number(safe_food_limit ?? 10)
    });

    const doc = await Interaction.create({
      userId: req.user.userId,
      type: "food_drug",
      input: { drug_name: String(drug_name), food_name: String(food_name) },
      result
    });

    res.json({
  saved: true,
  interactionId: doc._id,
  drug: result.drug,
  food: result.food,
  severity: result.severity,
  message: result.message,
  reasons: result.reasons,
  explanation: result.explanation,
  timing_advice: result.timing_advice,
  safe_foods: result.safe_foods
});
  } catch (e) {
    res.status(500).json({ error: "Food-drug check failed", details: String(e) });
  }
});

/**
 * 2) MEAL PLAN GENERATION (saved + update profile)
 * POST /meal-plan/generate
 *
 * body supports BOTH:
 *  - drug_indices:[0,1]
 *  - drug_names:["Panadol","Amoxicillin"]
 */
// UPDATED: /meal-plan/generate route
// - Accepts ONLY drug_names from frontend (still supports drug_indices if you send it)
// - Sends ONLY drug_names to FastAPI (because your FastAPI expects drug_names)
// - Still stores BOTH indices + names in MongoDB for history/profile

// PharmaLink/backend/microservices/personalized_advisory_microservice/routes/interactions.js

router.post("/meal-plan/generate", auth, async (req, res) => {
  try {
    const body = req.body || {};

    // ----------------------------
    // 1) Validate + normalize input
    // ----------------------------
    const drug_names_raw = Array.isArray(body.drug_names) ? body.drug_names : [];
    const drug_names = normList(drug_names_raw, false);

    if (!drug_names.length) {
      return res.status(400).json({ error: "drug_names required (non-empty array)" });
    }

    const prefs = body.preferences || {};
    const vegetarian = body.vegetarian ?? prefs.vegetarian ?? false;
    const diabetic_friendly = body.diabetic_friendly ?? prefs.diabeticFriendly ?? false;
    const low_sodium = body.low_sodium ?? prefs.lowSodium ?? false;

    const days = Number(body.days ?? 3);
    const meals_per_day = Number(body.meals_per_day ?? 3);
    const calories_per_day = Number(body.calories_per_day ?? 1800);

    const allergies = normList(body.allergies, true);

    // meal_types optional; if not given, auto based on meals_per_day
    const defaultMealTypes = ["breakfast", "lunch", "dinner"];
    const meal_types =
      Array.isArray(body.meal_types) && body.meal_types.length
        ? body.meal_types.map(String)
        : defaultMealTypes.slice(0, Math.max(1, Math.min(3, meals_per_day)));

    // Guard values
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 30) : 3;
    const safeMealsPerDay =
      Number.isFinite(meals_per_day) && meals_per_day > 0 ? Math.min(meals_per_day, 3) : 3;
    const safeCaloriesPerDay =
      Number.isFinite(calories_per_day) && calories_per_day > 0 ? Math.min(calories_per_day, 6000) : 1800;

    // ----------------------------
    // 2) Call FastAPI ONCE (days × meals_per_day returned)
    //    FastAPI endpoint: POST /ml-meal-plan-generate
    // ----------------------------
    const plan = await generateMealPlan({
      drug_names,
      days: safeDays,
      meals_per_day: safeMealsPerDay,
      calories_per_day: safeCaloriesPerDay,
      meal_types,
      allergies,
      vegetarian: !!vegetarian,
      diabetic_friendly: !!diabetic_friendly,
      low_sodium: !!low_sodium,
      debug_score: false,
    });

    // plan should look like:
    // {
    //   drug_names: [...],
    //   drug_indices: [...],
    //   days: [{ day: 1, meals: [...] }, ...]
    // }

    const result = {
      drug_names: plan?.drug_names ?? drug_names,
      drug_indices: plan?.drug_indices ?? [],
      days: plan?.days ?? [],
      preferences: {
        vegetarian: !!vegetarian,
        diabeticFriendly: !!diabetic_friendly,
        lowSodium: !!low_sodium,
      },
      allergies,
      calories_per_day: safeCaloriesPerDay,
      meals_per_day: safeMealsPerDay,
      meal_types,
    };

    // ----------------------------
    // 3) Save interaction history
    // ----------------------------
    const doc = await Interaction.create({
      userId: req.user.userId,
      type: "meal_plan",
      input: {
        drug_names,
        days: safeDays,
        meals_per_day: safeMealsPerDay,
        calories_per_day: safeCaloriesPerDay,
        allergies,
        preferences: {
          vegetarian: !!vegetarian,
          diabeticFriendly: !!diabetic_friendly,
          lowSodium: !!low_sodium,
        },
        meal_types,
      },
      result,
    });

    // ----------------------------
    // 4) Update user profile
    // ----------------------------
await User.findByIdAndUpdate(
  req.user.userId,
  {
    $set: {
      allergies,
      dietaryPreferences: {
        vegetarian: !!vegetarian,
        diabeticFriendly: !!diabetic_friendly,
        lowSodium: !!low_sodium,
      },
    },
    $addToSet: {
      activeMedicationNames: { $each: drug_names },
    },
  },
  { new: true, runValidators: true }
);


    // ----------------------------
    // 5) Respond
    // ----------------------------
    return res.json({
      saved: true,
      interactionId: doc._id,
      activeMedicationNames: drug_names,
      result,
    });
  } catch (e) {
    return res.status(500).json({
      error: "Meal plan generation failed",
      details: String(e?.message || e),
    });
  }
});






/**
 * 3) DRUG IMAGE PREDICTION (saved)
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
 * 4) HISTORY (filtered)
 * GET /history?type=food_drug|meal_plan|drug_image_prediction
 */
router.get("/history", auth, async (req, res) => {
  try {
    const { type } = req.query;

    const q = { userId: req.user.userId };

    // type filter (optional)
    const allowed = ["food_drug", "meal_plan", "drug_image_prediction", "symptom_drug_reco"];
    if (type) {
      if (!allowed.includes(String(type))) {
        return res.status(400).json({ error: "Invalid type. Use food_drug|meal_plan|drug_image_prediction|symptom_drug_reco" });
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
 * 5) STORED IMAGE
 * GET /history/:id/image
 */
router.get("/history/:id/image", auth, async (req, res) => {
  try {
    const item = await Interaction.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      type: "drug_image_prediction"
    }).select("input.uploadedImage");

    const img = item?.input?.uploadedImage;
    if (!img?.data) return res.status(404).json({ error: "No image found" });

    // Convert BSON Binary -> Buffer safely
    const buf = Buffer.isBuffer(img.data)
      ? img.data
      : Buffer.from(img.data.buffer || img.data);

    res.setHeader("Content-Type", img.contentType || "image/png");
    res.setHeader("Content-Length", buf.length);

    return res.status(200).end(buf);
  } catch (e) {
    return res.status(500).json({ error: "Failed to load image", details: String(e) });
  }
});

// 6) DELETE ONE HISTORY ITEM
// DELETE /history/:id
router.delete("/history/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await Interaction.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });

    if (!deleted) return res.status(404).json({ error: "History item not found" });

    res.json({ deleted: true, id });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete history item", details: String(e) });
  }
});

// 7) CLEAR HISTORY (by type OR all)
// DELETE /history?type=food_drug|meal_plan|drug_image_prediction
router.delete("/history", auth, async (req, res) => {
  try {
    const { type } = req.query;

    const q = { userId: req.user.userId };

    const allowed = ["food_drug", "meal_plan", "drug_image_prediction", "symptom_drug_reco"];
    if (type) {
      if (!allowed.includes(String(type))) {
        return res.status(400).json({
          error: "Invalid type. Use food_drug|meal_plan|drug_image_prediction|symptom_drug_reco",
        });
      }
      q.type = String(type);
    }

    const r = await Interaction.deleteMany(q);

    res.json({
      cleared: true,
      type: type || "all",
      deletedCount: r.deletedCount || 0,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to clear history", details: String(e) });
  }
});


/**
 * 8) RECOMMEND DRUGS FROM SYMPTOMS (saved)
 * POST /symptoms/recommend-drugs
 * body: { symptoms:[], top_k_diseases?:3, patient?:{...} }
 */
router.post("/symptoms/recommend-drugs", auth, async (req, res) => {
  try {
    const body = req.body || {};

    const symptoms = Array.isArray(body.symptoms)
      ? body.symptoms.map(s => String(s).trim()).filter(Boolean)
      : [];

    if (!symptoms.length) {
      return res.status(400).json({ error: "symptoms required (non-empty array)" });
    }

    const payload = {
      symptoms,
      top_k_diseases: Number(body.top_k_diseases ?? 3),
      patient: body.patient || {}
    };

    const result = await recommendDrugsFromSymptoms(payload);

    // save to history
    const doc = await Interaction.create({
      userId: req.user.userId,
      type: "symptom_drug_reco",
      input: payload,
      result
    });

    return res.json({
      saved: true,
      interactionId: doc._id,
      ...result
    });
  } catch (e) {
    return res.status(500).json({
      error: "Recommend drugs failed",
      details: String(e?.response?.data?.detail || e?.message || e)
    });
  }
});

module.exports = router;

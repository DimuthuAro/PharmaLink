// PharmaLink/backend/routes/user.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, age, phone } = req.body;

    if (!fullName || !email || !password || !age || !phone) {
      return res.status(400).json({ error: "fullName, email, password , age , phone required" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      age: Number(age),
      phone: phone, 
    });

    res.status(201).json({
      message: "User created",
      user: { id: user._id, fullName: user.fullName, email: user.email, age: user.age, phone: user.phone }
    });
  } catch (e) {
    res.status(500).json({ error: "Register failed", details: String(e) });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email, password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: "Login failed", details: String(e) });
  }
});

// GET ME (profile)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });

    // return everything including:
    // allergies, dietaryPreferences, activeMedicationIndices, activeMedicationNames
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: "Failed to load profile", details: String(e) });
  }
});

// UPDATE ME (profile)
router.put("/me", auth, async (req, res) => {
  try {
    const updates = { ...req.body };

    // block sensitive fields
    delete updates.passwordHash;
    delete updates.email;
    

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true
    }).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: "Failed to update profile", details: String(e) });
  }
});

/**
 * OPTIONAL: update meds manually (if you want from frontend)
 * body: { activeMedicationIndices:[0,1], activeMedicationNames:["X","Y"] }
 */
// PharmaLink/backend/routes/user.js
router.put("/me/medications", auth, async (req, res) => {
  try {
    const indices = Array.isArray(req.body.activeMedicationIndices)
      ? req.body.activeMedicationIndices.map(Number)
      : [];

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { activeMedicationIndices: indices },   // store ONLY indices
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: "Failed to update medications", details: String(e) });
  }
});


module.exports = router;

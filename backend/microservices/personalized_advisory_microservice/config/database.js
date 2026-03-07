const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true
    });
    console.log("[advisory] MongoDB connected");
  } catch (err) {
    console.error("[advisory] MongoDB connection failed:", err);
    process.exit(1);
  }
};

module.exports = connectDB;

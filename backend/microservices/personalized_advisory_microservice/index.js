const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3002;

// middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// db
connectDB();

// routes
const interactionsRoutes = require("./routes/interactions");
app.use("/", interactionsRoutes);

// health
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "personalized_advisory_microservice", time: new Date().toISOString() });
});

// start
app.listen(PORT, () => {
  console.log(`personalized_advisory_microservice running on port ${PORT}`);
});

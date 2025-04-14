const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  require("cors")({
    origin: "http://localhost:5500", // adjust if using a different port
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

const JWT_SECRET = process.env.JWT_SECRET;

// Signup route (for testing)
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashed });
  await user.save();
  res.json({ message: "User created" });
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false, // set to true on Render
      sameSite: "lax",
    })
    .json({ message: "Logged in" });
});
// Logout route
app.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

// Middleware to protect routes
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.userId = decoded.userId;
    next();
  });
}

// Protected route
app.get("/home", authMiddleware, (req, res) => {
  res.json({ message: "Welcome to the protected home page!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

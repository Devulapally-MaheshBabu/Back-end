require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser"); 

// Import models and routes
const Blog = require("./models/blog");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middleware/authentication");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Database Configuration
const MONGODB_URI = process.env.MONGODB_URL;
if (!MONGODB_URI) {
  console.error("MongoDB connection URI not found in environment variables");
  process.exit(1);
}

// Enhanced MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
};

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middleware
app.use(express.static(path.resolve("./public")));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

// Routes
app.use("/user", userRoute);
app.use("/blog", blogRoute);

// Image Redirect
app.use('/public/default.png', (req, res) => {
  res.redirect('/default.png');
});

// Debug Route
app.get('/debug-user', (req, res) => {
  res.json({ user: req.user });
});

// Home Route with Error Handling
app.get("/", async (req, res, next) => {
  try {
    const allBlogs = await Blog.find({}).maxTimeMS(10000); // 10s timeout for query
    res.render("home", {
      user: req.user,  
      blogs: allBlogs
    });
  } catch (err) {
    next(err);
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Start Server after DB connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
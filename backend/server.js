// This file is now set up to run a standard local Express server on PORT 5000.

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes"); 

const app = express();

// Set the port from the .env file, default to 5000
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;


// --- CORS Setup ---
// Crucial: Allows the frontend running on http://localhost:3000 to communicate with this server on port 5000
const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

// --- Middleware Setup ---
app.use(express.json());


// --- Database Connection ---
const connectDB = async () => {
    if (!MONGO_URI) {
        console.error("❌ MONGO_URI is not set! Check your .env file.");
        return;
    }
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB Atlas");
        
        // Start the server only after successful database connection
        app.listen(PORT, () => {
            console.log(`🌍 Server running on port ${PORT}`);
            console.log(`Listening for requests from http://localhost:3000`);
        });

    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        // Exit process if connection fails
        process.exit(1); 
    }
};

// --- Routes ---
app.use("/api/tasks", taskRoutes);

// Connect to DB and start server
connectDB();

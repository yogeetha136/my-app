const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const taskRoutes = require("./taskroutes");
app.use("/api/tasks", taskRoutes);

exports.api = functions.https.onRequest(app);

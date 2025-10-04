const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  assignedTo: {
    type: String,
    required: true,
  },
  dueDate: {
    // Storing as Date object in MongoDB
    type: Date,
    required: true,
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  status: {
    // CRITICAL CORRECTION: Standardized to "Completed" to match all logic
    type: String,
    enum: ["Pending", "Completed"], 
    default: "Pending",
  },
  description: {
    type: String,
    trim: true,
  },
  points: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Assuming this file is placed in a 'models' subdirectory relative to server.js
const Task = mongoose.model("Task", TaskSchema); 

module.exports = Task;

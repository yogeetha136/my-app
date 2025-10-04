const express = require("express");
// Adjusted path to look for Task.js in the sibling models folder
const Task = require("../models/Task"); 
const router = express.Router();

// GET /api/tasks (READ all tasks with optional filters)
router.get("/", async (req, res) => {
  try {
    // Extract filter queries from URL
    const { status, assignedTo } = req.query;
    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }

    if (assignedTo && assignedTo !== "All") {
      filter.assignedTo = assignedTo;
    }

    // Find and sort tasks by due date
    const tasks = await Task.find(filter).sort({ dueDate: 1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
});

// POST /api/tasks (CREATE a new task)
router.post("/", async (req, res) => {
  try {
    // Ensure all required fields are present; Mongoose will validate
    const newTask = new Task(req.body);
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    // Mongoose validation error often results in a 400
    res.status(400).json({ message: "Error creating task (Validation failed or missing fields)", error: error.message });
  }
});

// PATCH /api/tasks/:id (UPDATE an existing task)
router.patch("/:id", async (req, res) => {
  try {
    // Use findByIdAndUpdate to update the task, returning the modified document
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Return the new document, run schema validators
    );
    
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: "Error updating task", error: error.message });
  }
});

// PATCH /api/tasks/complete/:id (TOGGLE task status to Completed)
router.patch("/complete/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // CORRECTED: Use "Completed" status value
    const newStatus = task.status === "Pending" ? "Completed" : "Pending";

    const updatedTask = await Task.findByIdAndUpdate(
        req.params.id,
        { status: newStatus },
        { new: true },
    );
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Error completing task", error: error.message });
  }
});

// DELETE /api/tasks/:id (DELETE a task)
router.delete("/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      // Task ID was valid but not found in the database
      return res.status(404).json({ message: "Task not found" });
    }

    // Success: Send 200 OK
    res.status(200).json({ message: "Task deleted successfully", _id: req.params.id });
  } catch (error) {
    // Handle invalid ID format
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
});

module.exports = router;

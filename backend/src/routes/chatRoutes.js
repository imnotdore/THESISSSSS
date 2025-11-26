//chatRoutes.js
const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const Class = require("../models/Class");
const authMiddleware = require("../middleware/authMiddleware");
const { checkClassAccess } = require("../middleware/classAuth");

// Get chat messages for a class
router.get("/:classId/messages", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.find({ 
      classId, 
      isDeleted: false 
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await ChatMessage.countDocuments({ 
      classId, 
      isDeleted: false 
    });

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalMessages: total
      }
    });
  } catch (err) {
    console.error("❌ Get chat messages error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch chat messages" 
    });
  }
});

// Send a new message
router.post("/:classId/messages", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const { classId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "Message cannot be empty" 
      });
    }

    // Get user info from class members
    const classData = await Class.findById(classId)
      .populate("ownerId", "name")
      .populate("members.userId", "name");

    let userName = req.user.name;
    let userRole = "student";

    // Check if user is teacher (owner)
    if (classData.ownerId._id.toString() === userId) {
      userRole = "teacher";
    } else {
      // Check if user is a member with teacher role
      const member = classData.members.find(m => 
        m.userId._id.toString() === userId && m.role === "teacher"
      );
      if (member) {
        userRole = "teacher";
      }
    }

    const newMessage = await ChatMessage.create({
      classId,
      userId,
      userName,
      userRole,
      message: message.trim()
    });

    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage
    });
  } catch (err) {
    console.error("❌ Send message error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to send message" 
    });
  }
});

// Delete a message (soft delete)
router.delete("/messages/:messageId", authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: "Message not found" 
      });
    }

    // Check if user owns the message or is a teacher in the class
    const classData = await Class.findById(message.classId);
    const isTeacher = classData.ownerId.toString() === userId || 
                     classData.members.some(m => 
                       m.userId.toString() === userId && m.role === "teacher"
                     );

    if (message.userId.toString() !== userId && !isTeacher) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to delete this message" 
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (err) {
    console.error("❌ Delete message error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete message" 
    });
  }
});

// Add reply to a message
router.post("/messages/:messageId/reply", authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "Reply cannot be empty" 
      });
    }

    const parentMessage = await ChatMessage.findById(messageId);
    
    if (!parentMessage) {
      return res.status(404).json({ 
        success: false,
        message: "Message not found" 
      });
    }

    // Get user info
    const classData = await Class.findById(parentMessage.classId)
      .populate("ownerId", "name")
      .populate("members.userId", "name");

    let userName = req.user.name;
    let userRole = "student";

    if (classData.ownerId._id.toString() === userId) {
      userRole = "teacher";
    } else {
      const member = classData.members.find(m => 
        m.userId._id.toString() === userId && m.role === "teacher"
      );
      if (member) {
        userRole = "teacher";
      }
    }

    const reply = {
      userId,
      userName,
      userRole,
      message: message.trim(),
      createdAt: new Date()
    };

    parentMessage.replies.push(reply);
    await parentMessage.save();

    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: reply
    });
  } catch (err) {
    console.error("❌ Add reply error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to add reply" 
    });
  }
});

module.exports = router;
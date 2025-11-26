//ChatMeassge.js
const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ["teacher", "student"], required: true },
  message: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  replies: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    userRole: { type: String, enum: ["teacher", "student"] },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// Add index for better performance
chatMessageSchema.index({ classId: 1, createdAt: -1 });

module.exports = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
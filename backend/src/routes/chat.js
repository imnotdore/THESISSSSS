const express = require('express');
const router = express.Router();
const Message = require('../models/Chat');
const auth = require('../middleware/authMiddleware');

// Get messages for a class
router.get('/:classId/messages', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ classId })
      .populate('sender', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      messages: messages.reverse(),
      currentPage: page,
      totalPages: Math.ceil(await Message.countDocuments({ classId }) / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/:classId/messages', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { message } = req.body;

    const newMessage = new Message({
      classId,
      sender: req.user.id,
      message
    });

    await newMessage.save();
    await newMessage.populate('sender', 'name email role');

    // Emit to Socket.io (if implemented)
    req.app.get('io').to(classId).emit('newMessage', newMessage);

    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
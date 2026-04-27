const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

/**
 * Anti-bypass: mask Indian/international phone numbers and common contact info.
 * Replaces matches with a unicode shield so the intent is obvious to both parties.
 */
const PHONE_PATTERNS = [
  /\b(\+?91[\s\-]?)?[6-9]\d{9}\b/g,           // Indian mobile +91 / local
  /\b\d{3}[\s.\-]\d{3}[\s.\-]\d{4}\b/g,        // US/intl formats
  /\b\d{10}\b/g,                                // bare 10-digit
  /\b\d{5}[\s\-]\d{5}\b/g,                     // split 5+5
];

function maskContactInfo(text) {
  let out = text;
  for (const re of PHONE_PATTERNS) out = out.replace(re, '[📵 contact hidden]');
  return out;
}

// @route   POST /api/chat/order/:orderId
// @desc    Get or create chat for an order
router.post('/order/:orderId', protect, async (req, res) => {
  try {
    let chat = await Chat.findOne({ orderId: req.params.orderId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found for this order',
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat',
      });
    }

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/chat/:chatId/messages
// @desc    Get chat messages
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat',
      });
    }

    res.json({
      success: true,
      messages: chat.messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/chat/:chatId/message
// @desc    Send message in chat
router.post('/:chatId/message', protect, async (req, res) => {
  try {
    const rawMessage = req.body.message || '';
    const message = maskContactInfo(rawMessage);
    const { type = 'text', imageUrl } = req.body;
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this chat',
      });
    }

    const newMessage = {
      senderId: req.user.id,
      message,
      type,
      imageUrl,
    };

    chat.messages.push(newMessage);
    chat.lastMessage = message;
    chat.lastMessageAt = new Date();

    // Update unread count for other participants
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        const currentCount = chat.unreadCount.get(participantId.toString()) || 0;
        chat.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await chat.save();

    // Notify other participants
    const otherParticipants = chat.participants.filter(
      id => id.toString() !== req.user.id
    );

    for (const participantId of otherParticipants) {
      await Notification.create({
        userId: participantId,
        type: 'chat',
        title: 'New Message',
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        data: { chatId: chat._id, orderId: chat.orderId },
      });
    }

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/chat/:chatId/read
// @desc    Mark messages as read
router.put('/:chatId/read', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Reset unread count for this user
    chat.unreadCount.set(req.user.id, 0);
    await chat.save();

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/chat
// @desc    Get user's chats
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('orderId', 'orderNumber status totalAmount')
      .populate('participants', 'name avatar userType')
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      count: chats.length,
      chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;

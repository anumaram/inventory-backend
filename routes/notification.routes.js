const router = require('express').Router();
const jwt = require('jsonwebtoken');
const notificationService = require('../services/notification.service');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Universal auth middleware that extracts both customer and vendor IDs
function universalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userType = decoded.type === 'vendor' ? 'vendor' : 'customer';
    req.recipientId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
}

// GET /notifications (get list + unreadCount)
router.get('/', universalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const data = await notificationService.getNotifications({
      recipientType: req.userType,
      recipientId: req.recipientId,
      limit
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to load notifications' });
  }
});

// PATCH /notifications/:id/read (mark single as read)
router.patch('/:id/read', universalAuth, async (req, res) => {
  try {
    const updated = await notificationService.markAsRead(req.params.id, req.recipientId);
    if (!updated) return res.status(404).json({ msg: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update notification' });
  }
});

// POST /notifications/read-all (mark all as read)
router.post('/read-all', universalAuth, async (req, res) => {
  try {
    await notificationService.markAllAsRead({
      recipientType: req.userType,
      recipientId: req.recipientId
    });
    res.json({ success: true, msg: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to update notifications' });
  }
});

// DELETE /notifications/:id (dismiss/remove single notification)
router.delete('/:id', universalAuth, async (req, res) => {
  try {
    const dismissed = await notificationService.dismissNotification(req.params.id, req.recipientId);
    if (!dismissed) return res.status(404).json({ msg: 'Notification not found' });
    res.json({ success: true, msg: 'Notification dismissed' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to dismiss notification' });
  }
});

// DELETE /notifications (clear all notifications)
router.delete('/', universalAuth, async (req, res) => {
  try {
    await notificationService.clearAllNotifications({
      recipientType: req.userType,
      recipientId: req.recipientId
    });
    res.json({ success: true, msg: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to clear notifications' });
  }
});

module.exports = router;


const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { User } = require('../models');
const { authenticateToken, getJwtSecret } = require('../middleware/auth');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      getJwtSecret(),
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, email_verified: user.email_verified }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const verification_token = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ email, password: hashedPassword, name, verification_token });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      getJwtSecret(),
      { expiresIn: '24h' }
    );
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, email_verified: user.email_verified },
      verification_token // dev-mode: surface to caller; in prod email this instead.
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /me — current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'email', 'name', 'role', 'email_verified', 'createdAt'] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /password — change current password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'currentPassword and newPassword (min 8 chars) required' });
    }
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /forgot-password — issue a reset token (dev: returned in body; prod: emailed)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    // Always respond identically to avoid user enumeration.
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const reset_token = crypto.randomBytes(32).toString('hex');
    user.reset_token = reset_token;
    user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    res.json({ message: 'If that email exists, a reset link has been sent.', reset_token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /reset-password — consume reset token + set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'token and password (min 8 chars) required' });
    }
    const user = await User.findOne({ where: { reset_token: token } });
    if (!user || !user.reset_token_expires || user.reset_token_expires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    user.password = await bcrypt.hash(password, 10);
    user.reset_token = null;
    user.reset_token_expires = null;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /verify-email — verify the email-verification token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ where: { verification_token: token } });
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });
    user.email_verified = true;
    user.verification_token = null;
    await user.save();
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

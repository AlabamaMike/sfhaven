const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (userId, isAnonymous = false) => {
  return jwt.sign(
    { userId, isAnonymous },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// POST /api/v1/auth/anonymous - Create anonymous account
router.post('/anonymous', async (req, res, next) => {
  try {
    const result = await db.query(
      'INSERT INTO users (is_anonymous) VALUES (true) RETURNING id',
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId, true);

    logger.info('Anonymous user created', { userId });

    res.status(201).json({
      anonymous_id: userId,
      access_token: token,
      expires_in: 2592000 // 30 days in seconds
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/register - Register with phone and PIN
router.post('/register',
  [
    body('phone_number').isMobilePhone().withMessage('Invalid phone number'),
    body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phone_number, pin } = req.body;

      // Check if phone already exists
      const existing = await db.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phone_number]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      // Hash PIN
      const pinHash = await bcrypt.hash(pin, 10);
      const phoneHash = await bcrypt.hash(phone_number, 10);

      // Create user
      const result = await db.query(
        `INSERT INTO users (phone_number, phone_hash, pin_hash, is_anonymous)
         VALUES ($1, $2, $3, false)
         RETURNING id`,
        [phone_number, phoneHash, pinHash]
      );

      const userId = result.rows[0].id;
      const token = generateToken(userId, false);

      logger.info('User registered', { userId });

      res.status(201).json({
        user_id: userId,
        access_token: token,
        refresh_token: token // In production, use separate refresh token
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/login - Login with phone and PIN
router.post('/login',
  [
    body('phone_number').isMobilePhone().withMessage('Invalid phone number'),
    body('pin').isLength({ min: 4, max: 6 }).isNumeric().withMessage('PIN must be 4-6 digits')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { phone_number, pin } = req.body;

      // Find user
      const result = await db.query(
        'SELECT id, pin_hash FROM users WHERE phone_number = $1 AND is_anonymous = false',
        [phone_number]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify PIN
      const isValidPin = await bcrypt.compare(pin, user.pin_hash);
      if (!isValidPin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last active
      await db.query(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const token = generateToken(user.id, false);

      logger.info('User logged in', { userId: user.id });

      res.json({
        user_id: user.id,
        access_token: token,
        refresh_token: token
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/verify - Verify token (health check for auth)
router.post('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, userId: decoded.userId });
  } catch (error) {
    res.status(403).json({ valid: false, error: 'Invalid token' });
  }
});

module.exports = router;

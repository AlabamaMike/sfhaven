const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/v1/housing/applications - Get user's housing applications
router.get('/applications', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT
        id, application_type, status, submitted_at, last_updated,
        waitlist_position, case_manager_id, notes
       FROM housing_applications
       WHERE user_id = $1
       ORDER BY last_updated DESC`,
      [userId]
    );

    res.json({
      count: result.rows.length,
      applications: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/housing/applications - Submit new housing application
router.post('/applications',
  authenticateToken,
  [
    body('application_type').isIn(['coordinated_entry', 'psh', 'transitional', 'emergency']),
    body('notes').optional().isString()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { application_type, notes } = req.body;
      const userId = req.user.userId;

      const result = await db.query(
        `INSERT INTO housing_applications
         (user_id, application_type, status, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, application_type, status, submitted_at`,
        [userId, application_type, 'pending', notes]
      );

      res.status(201).json({
        message: 'Application submitted successfully',
        application: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/housing/resources - Get housing resource information
router.get('/resources', async (req, res, next) => {
  try {
    // Return static housing resources information
    res.json({
      resources: [
        {
          name: 'Coordinated Entry',
          description: 'Central assessment and referral system for homeless services',
          phone: '(415) 355-7555',
          website: 'https://hsh.sfgov.org',
          locations: [
            'Mission Neighborhood Resource Center - 165 Capp Street',
            'Bayview Neighborhood - 1800 Oakdale Avenue'
          ]
        },
        {
          name: 'Navigation Centers',
          description: '24/7 shelter with comprehensive services',
          phone: '(415) 355-7555',
          capacity: 'Varies by location'
        },
        {
          name: 'Emergency Shelter',
          description: 'Immediate temporary shelter',
          phone: '311',
          notes: 'Call for current availability'
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

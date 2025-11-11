const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');

// GET /api/v1/emergency/nearest - Find nearest emergency resources
router.get('/nearest',
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('type').optional().isIn(['shelter', 'medical', 'crisis', 'all'])
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng, type = 'all' } = req.query;

      let queryText = `
        SELECT
          id, name, type, phone, address,
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          available_24_7, description,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) as distance_meters
        FROM emergency_resources
        WHERE is_active = true
      `;

      const params = [parseFloat(lat), parseFloat(lng)];

      if (type !== 'all') {
        queryText += ' AND type = $3';
        params.push(type);
      }

      queryText += ' ORDER BY distance_meters LIMIT 10';

      const result = await db.query(queryText, params);

      res.json({
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        resources: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/emergency/hotlines - Get crisis hotlines (always available offline)
router.get('/hotlines', async (req, res, next) => {
  try {
    // Return static list of crisis hotlines
    res.json({
      hotlines: [
        {
          name: 'SF Mobile Crisis Team',
          phone: '(415) 970-4000',
          description: 'Mental health crisis support',
          available: '24/7'
        },
        {
          name: 'SF Suicide Prevention',
          phone: '(415) 781-0500',
          description: 'Suicide prevention hotline',
          available: '24/7'
        },
        {
          name: 'National Suicide Prevention Lifeline',
          phone: '988',
          description: 'National crisis support',
          available: '24/7'
        },
        {
          name: 'SF Homeless Outreach Team',
          phone: '(415) 355-7555',
          description: 'Street outreach and support',
          available: 'Mon-Fri 8am-5pm'
        },
        {
          name: 'Drug Overdose Prevention',
          phone: '911',
          description: 'Emergency medical services',
          available: '24/7'
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

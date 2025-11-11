const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator');
const db = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

// GET /api/v1/parking/zones - Get parking zones near location
router.get('/zones',
  optionalAuth,
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 10000 })
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng, radius = 1000 } = req.query;

      const result = await db.query(
        `SELECT
          id, zone_type, restrictions, street_cleaning, time_limits,
          ST_AsGeoJSON(geometry)::json as geometry,
          notes
         FROM parking_zones
         WHERE ST_DWithin(
           geometry::geography,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           $3
         )
         AND (effective_date IS NULL OR effective_date <= CURRENT_DATE)
         AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
         ORDER BY zone_type`,
        [parseFloat(lat), parseFloat(lng), parseInt(radius)]
      );

      res.json({
        count: result.rows.length,
        zones: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/parking/check - Check if current location is legal parking
router.get('/check',
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 })
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng } = req.query;

      const result = await db.query(
        'SELECT * FROM check_parking_legality($1, $2, CURRENT_TIMESTAMP)',
        [parseFloat(lat), parseFloat(lng)]
      );

      if (result.rows.length === 0) {
        return res.json({
          is_legal: null,
          status: 'unknown',
          message: 'No parking information available for this location'
        });
      }

      const zone = result.rows[0];

      res.json({
        is_legal: zone.is_legal,
        status: zone.is_legal ? 'safe' : 'restricted',
        zone_type: zone.zone_type,
        restrictions: zone.restrictions,
        time_limit_minutes: zone.time_limit,
        checked_at: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/parking/report - Report parking enforcement or hazard
router.post('/report',
  optionalAuth,
  [
    body('location.lat').isFloat({ min: -90, max: 90 }),
    body('location.lng').isFloat({ min: -180, max: 180 }),
    body('type').isIn(['enforcement', 'safe', 'hazard']),
    body('description').optional().isString()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { location, type, description } = req.body;
      const userId = req.user?.userId || null;

      // Set expiration based on alert type
      const expiresAt = new Date();
      if (type === 'enforcement') {
        expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours
      } else {
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
      }

      const result = await db.query(
        `INSERT INTO parking_alerts
         (location, alert_type, description, reported_by, expires_at)
         VALUES (ST_SetSRID(ST_MakePoint($2, $1), 4326), $3, $4, $5, $6)
         RETURNING id`,
        [location.lat, location.lng, type, description, userId, expiresAt]
      );

      res.status(201).json({
        report_id: result.rows[0].id,
        message: 'Report submitted successfully',
        expires_at: expiresAt.toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/parking/alerts - Get active parking alerts near location
router.get('/alerts',
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 100, max: 5000 })
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng, radius = 2000 } = req.query;

      const result = await db.query(
        `SELECT
          id, alert_type, description, severity,
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          created_at, expires_at,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) as distance_meters
         FROM parking_alerts
         WHERE expires_at > CURRENT_TIMESTAMP
           AND ST_DWithin(
             location::geography,
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
             $3
           )
         ORDER BY distance_meters
         LIMIT 20`,
        [parseFloat(lat), parseFloat(lng), parseInt(radius)]
      );

      res.json({
        count: result.rows.length,
        alerts: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

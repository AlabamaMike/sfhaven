const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/v1/services - Search for services
router.get('/',
  optionalAuth,
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters'),
    query('category').optional().isString(),
    query('open_now').optional().isBoolean()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng, radius = 5000, category, open_now, accessibility, languages } = req.query;

      let queryText = `
        SELECT
          id, name, category, subcategory, description, address,
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          phone, email, website, hours, requirements,
          capacity, current_availability, amenities,
          languages, accessibility_features,
          ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) as distance_meters
        FROM services
        WHERE is_active = true
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
            $3
          )
      `;

      const params = [parseFloat(lat), parseFloat(lng), parseInt(radius)];
      let paramCount = 3;

      if (category) {
        paramCount++;
        queryText += ` AND category = $${paramCount}`;
        params.push(category);
      }

      queryText += ' ORDER BY distance_meters LIMIT 50';

      const result = await db.query(queryText, params);

      // Log activity if user is authenticated
      if (req.user) {
        await db.query(
          `INSERT INTO user_activities (user_id, activity_type, resource_type, location, metadata)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6)`,
          [
            req.user.userId,
            'service_search',
            'service',
            parseFloat(lat),
            parseFloat(lng),
            JSON.stringify({ category, radius })
          ]
        );
      }

      res.json({
        count: result.rows.length,
        services: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/services/:id - Get service details
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id, name, category, subcategory, description, address,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        phone, email, website, hours, requirements,
        capacity, current_availability, amenities,
        languages, accessibility_features, last_updated
       FROM services
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Log activity
    if (req.user) {
      await db.query(
        `INSERT INTO user_activities (user_id, activity_type, resource_type, resource_id)
         VALUES ($1, $2, $3, $4)`,
        [req.user.userId, 'service_view', 'service', id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/services/offline-bundle - Get offline data bundle
router.get('/offline-bundle',
  optionalAuth,
  [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 }),
    query('radius').optional().isInt({ min: 1000, max: 20000 })
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { lat, lng, radius = 10000 } = req.query;

      const result = await db.query(
        `SELECT
          id, name, category, subcategory, description, address,
          ST_Y(location::geometry) as latitude,
          ST_X(location::geometry) as longitude,
          phone, hours, requirements, amenities, languages
         FROM services
         WHERE is_active = true
           AND ST_DWithin(
             location::geography,
             ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
             $3
           )
         ORDER BY category, name`,
        [parseFloat(lat), parseFloat(lng), parseInt(radius)]
      );

      res.json({
        generated_at: new Date().toISOString(),
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius_meters: parseInt(radius),
        services: result.rows,
        version: '1.0'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

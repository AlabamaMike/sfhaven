require('dotenv').config();
const db = require('../config/database');
const logger = require('../utils/logger');

const sampleServices = [
  {
    name: 'St. Anthony Foundation',
    category: 'food',
    subcategory: 'meals',
    description: 'Free meals, clothing, and social services',
    address: '150 Golden Gate Ave, San Francisco, CA 94102',
    lat: 37.7816,
    lng: -122.4145,
    phone: '(415) 592-2700',
    website: 'https://www.stanthonysf.org',
    hours: JSON.stringify({
      monday: '8:00-16:00',
      tuesday: '8:00-16:00',
      wednesday: '8:00-16:00',
      thursday: '8:00-16:00',
      friday: '8:00-16:00',
      saturday: 'Closed',
      sunday: 'Closed'
    }),
    amenities: JSON.stringify(['meals', 'clothing', 'showers', 'medical']),
    languages: ['English', 'Spanish']
  },
  {
    name: 'Glide Memorial Church',
    category: 'food',
    subcategory: 'meals',
    description: 'Daily free meals and comprehensive services',
    address: '330 Ellis St, San Francisco, CA 94102',
    lat: 37.7851,
    lng: -122.4115,
    phone: '(415) 674-6000',
    website: 'https://www.glide.org',
    hours: JSON.stringify({
      monday: '7:00-20:00',
      tuesday: '7:00-20:00',
      wednesday: '7:00-20:00',
      thursday: '7:00-20:00',
      friday: '7:00-20:00',
      saturday: '7:00-20:00',
      sunday: '7:00-20:00'
    }),
    amenities: JSON.stringify(['meals', 'healthcare', 'recovery']),
    languages: ['English', 'Spanish', 'Chinese']
  },
  {
    name: 'MSC South Navigation Center',
    category: 'shelter',
    subcategory: 'navigation_center',
    description: '24/7 shelter with comprehensive services',
    address: '525 5th St, San Francisco, CA 94107',
    lat: 37.7774,
    lng: -122.4015,
    phone: '(415) 355-7555',
    hours: JSON.stringify({ note: '24/7' }),
    capacity: 200,
    current_availability: 15,
    amenities: JSON.stringify(['beds', 'meals', 'showers', 'storage', 'case_management']),
    languages: ['English', 'Spanish']
  },
  {
    name: 'Tom Waddell Urban Health Clinic',
    category: 'healthcare',
    subcategory: 'primary_care',
    description: 'Primary healthcare for homeless individuals',
    address: '230 Golden Gate Ave, San Francisco, CA 94102',
    lat: 37.7820,
    lng: -122.4128,
    phone: '(415) 355-7500',
    hours: JSON.stringify({
      monday: '8:00-17:00',
      tuesday: '8:00-17:00',
      wednesday: '8:00-17:00',
      thursday: '8:00-17:00',
      friday: '8:00-17:00',
      saturday: 'Closed',
      sunday: 'Closed'
    }),
    amenities: JSON.stringify(['primary_care', 'mental_health', 'dental']),
    languages: ['English', 'Spanish', 'Chinese', 'Vietnamese']
  }
];

const sampleParkingZones = [
  {
    zone_type: 'legal',
    // Polygon around Bayview area
    geometry: 'POLYGON((-122.3875 37.7280, -122.3850 37.7280, -122.3850 37.7300, -122.3875 37.7300, -122.3875 37.7280))',
    restrictions: JSON.stringify({ max_days: 3, vehicle_type: 'rv' }),
    notes: 'Designated RV parking area'
  },
  {
    zone_type: 'time_limited',
    geometry: 'POLYGON((-122.4200 37.7750, -122.4180 37.7750, -122.4180 37.7770, -122.4200 37.7770, -122.4200 37.7750))',
    restrictions: JSON.stringify({ prohibited_hours: '2:00-6:00' }),
    time_limits: JSON.stringify({ minutes: 120 }),
    street_cleaning: JSON.stringify({ day: 'tuesday', time: '8:00-10:00' }),
    notes: '2-hour parking limit during daytime'
  }
];

const emergencyResources = [
  {
    name: 'SF Mobile Crisis Team',
    type: 'crisis',
    phone: '(415) 970-4000',
    lat: 37.7749,
    lng: -122.4194,
    address: '1380 Howard St, San Francisco, CA 94103',
    available_24_7: true,
    description: 'Mobile mental health crisis response'
  },
  {
    name: 'SF General Hospital Emergency',
    type: 'medical',
    phone: '(415) 206-8000',
    lat: 37.7560,
    lng: -122.4040,
    address: '1001 Potrero Ave, San Francisco, CA 94110',
    available_24_7: true,
    description: 'Emergency medical services'
  }
];

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Clear existing data
    await db.query('TRUNCATE TABLE services, parking_zones, emergency_resources CASCADE');

    // Insert services
    for (const service of sampleServices) {
      await db.query(
        `INSERT INTO services
         (name, category, subcategory, description, address, location, phone, website, hours, capacity, current_availability, amenities, languages)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326), $8, $9, $10, $11, $12, $13, $14)`,
        [
          service.name,
          service.category,
          service.subcategory,
          service.description,
          service.address,
          service.lat,
          service.lng,
          service.phone,
          service.website,
          service.hours,
          service.capacity || null,
          service.current_availability || null,
          service.amenities,
          service.languages
        ]
      );
    }

    logger.info(`Inserted ${sampleServices.length} services`);

    // Insert parking zones
    for (const zone of sampleParkingZones) {
      await db.query(
        `INSERT INTO parking_zones (zone_type, geometry, restrictions, time_limits, street_cleaning, notes)
         VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5, $6)`,
        [
          zone.zone_type,
          zone.geometry,
          zone.restrictions,
          zone.time_limits || null,
          zone.street_cleaning || null,
          zone.notes
        ]
      );
    }

    logger.info(`Inserted ${sampleParkingZones.length} parking zones`);

    // Insert emergency resources
    for (const resource of emergencyResources) {
      await db.query(
        `INSERT INTO emergency_resources (name, type, phone, location, address, available_24_7, description)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $6, $7, $8)`,
        [
          resource.name,
          resource.type,
          resource.phone,
          resource.lat,
          resource.lng,
          resource.address,
          resource.available_24_7,
          resource.description
        ]
      );
    }

    logger.info(`Inserted ${emergencyResources.length} emergency resources`);

    logger.info('Database seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

# SF Haven API Documentation

Version: 1.0.0
Base URL: `https://api.sfhaven.org/api/v1`

## Table of Contents

- [Authentication](#authentication)
- [Services API](#services-api)
- [Parking API](#parking-api)
- [Emergency API](#emergency-api)
- [Housing API](#housing-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

### Anonymous Authentication

Create an anonymous user account for app usage without registration.

**Endpoint:** `POST /auth/anonymous`

**Response:**
```json
{
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 2592000
}
```

### User Registration

Register with phone number and PIN for persistent account.

**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "phone_number": "+14155551234",
  "pin": "1234"
}
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "phone_number": "+14155551234",
  "pin": "1234"
}
```

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Services API

### Search Services

Find services near a geographic location.

**Endpoint:** `GET /services`

**Query Parameters:**
- `lat` (required): Latitude (-90 to 90)
- `lng` (required): Longitude (-180 to 180)
- `radius` (optional): Search radius in meters (default: 5000, max: 50000)
- `category` (optional): Service category (food, shelter, healthcare, hygiene, housing, jobs)
- `open_now` (optional): Filter to currently open services

**Example:**
```
GET /services?lat=37.7749&lng=-122.4194&radius=5000&category=food
```

**Response:**
```json
{
  "count": 15,
  "services": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "St. Anthony Foundation",
      "category": "food",
      "subcategory": "meals",
      "description": "Free meals, clothing, and social services",
      "address": "150 Golden Gate Ave, San Francisco, CA 94102",
      "latitude": 37.7816,
      "longitude": -122.4145,
      "phone": "(415) 592-2700",
      "email": null,
      "website": "https://www.stanthonysf.org",
      "hours": {
        "monday": "8:00-16:00",
        "tuesday": "8:00-16:00",
        "wednesday": "8:00-16:00",
        "thursday": "8:00-16:00",
        "friday": "8:00-16:00",
        "saturday": "Closed",
        "sunday": "Closed"
      },
      "requirements": null,
      "capacity": null,
      "current_availability": null,
      "amenities": ["meals", "clothing", "showers", "medical"],
      "languages": ["English", "Spanish"],
      "accessibility_features": {},
      "distance_meters": 324.5
    }
  ]
}
```

### Get Service Details

Get detailed information about a specific service.

**Endpoint:** `GET /services/:id`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "St. Anthony Foundation",
  "category": "food",
  "subcategory": "meals",
  "description": "Free meals, clothing, and social services",
  "address": "150 Golden Gate Ave, San Francisco, CA 94102",
  "latitude": 37.7816,
  "longitude": -122.4145,
  "phone": "(415) 592-2700",
  "website": "https://www.stanthonysf.org",
  "hours": {
    "monday": "8:00-16:00",
    "tuesday": "8:00-16:00"
  },
  "amenities": ["meals", "clothing", "showers"],
  "languages": ["English", "Spanish"],
  "last_updated": "2025-11-11T10:30:00Z"
}
```

### Download Offline Bundle

Download compressed service data for offline use.

**Endpoint:** `GET /services/offline-bundle`

**Query Parameters:**
- `lat` (required): Center latitude
- `lng` (required): Center longitude
- `radius` (optional): Coverage radius in meters (default: 10000, max: 20000)

**Response:**
```json
{
  "generated_at": "2025-11-11T10:30:00Z",
  "center": { "lat": 37.7749, "lng": -122.4194 },
  "radius_meters": 10000,
  "version": "1.0",
  "services": [...]
}
```

## Parking API

### Check Parking Legality

Check if a specific location is legal for RV parking.

**Endpoint:** `GET /parking/check`

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Response:**
```json
{
  "is_legal": true,
  "status": "safe",
  "zone_type": "legal",
  "restrictions": {
    "max_days": 3,
    "vehicle_type": "rv"
  },
  "time_limit_minutes": null,
  "checked_at": "2025-11-11T10:30:00Z"
}
```

### Get Parking Zones

Get all parking zones near a location.

**Endpoint:** `GET /parking/zones`

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Search radius in meters (default: 1000)

**Response:**
```json
{
  "count": 5,
  "zones": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "zone_type": "legal",
      "restrictions": {
        "max_days": 3,
        "vehicle_type": "rv"
      },
      "street_cleaning": {
        "day": "tuesday",
        "time": "8:00-10:00"
      },
      "time_limits": null,
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "notes": "Designated RV parking area"
    }
  ]
}
```

### Report Parking Issue

Report parking enforcement or hazards.

**Endpoint:** `POST /parking/report`

**Request:**
```json
{
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "type": "enforcement",
  "description": "Parking enforcement active on this block"
}
```

**Response:**
```json
{
  "report_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Report submitted successfully",
  "expires_at": "2025-11-11T12:30:00Z"
}
```

### Get Parking Alerts

Get active parking alerts near a location.

**Endpoint:** `GET /parking/alerts`

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Search radius in meters (default: 2000)

**Response:**
```json
{
  "count": 3,
  "alerts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "alert_type": "enforcement",
      "description": "Parking enforcement active",
      "severity": "high",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "created_at": "2025-11-11T09:30:00Z",
      "expires_at": "2025-11-11T11:30:00Z",
      "distance_meters": 150
    }
  ]
}
```

## Emergency API

### Find Nearest Emergency Resources

**Endpoint:** `GET /emergency/nearest`

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `type` (optional): Resource type (shelter, medical, crisis, all)

**Response:**
```json
{
  "location": { "lat": 37.7749, "lng": -122.4194 },
  "resources": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "SF Mobile Crisis Team",
      "type": "crisis",
      "phone": "(415) 970-4000",
      "address": "1380 Howard St, San Francisco, CA 94103",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "available_24_7": true,
      "description": "Mobile mental health crisis response",
      "distance_meters": 250
    }
  ]
}
```

### Get Crisis Hotlines

Get list of crisis hotlines (works offline).

**Endpoint:** `GET /emergency/hotlines`

**Response:**
```json
{
  "hotlines": [
    {
      "name": "SF Mobile Crisis Team",
      "phone": "(415) 970-4000",
      "description": "Mental health crisis support",
      "available": "24/7"
    },
    {
      "name": "National Suicide Prevention Lifeline",
      "phone": "988",
      "description": "National crisis support",
      "available": "24/7"
    }
  ]
}
```

## Housing API

### Get Housing Applications

Get user's housing applications (requires authentication).

**Endpoint:** `GET /housing/applications`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "count": 2,
  "applications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "application_type": "coordinated_entry",
      "status": "pending",
      "submitted_at": "2025-11-10T14:00:00Z",
      "last_updated": "2025-11-11T10:00:00Z",
      "waitlist_position": 45,
      "case_manager_id": "CM-12345",
      "notes": "Initial assessment complete"
    }
  ]
}
```

### Submit Housing Application

**Endpoint:** `POST /housing/applications`

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "application_type": "coordinated_entry",
  "notes": "Requesting housing assistance"
}
```

**Response:**
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "application_type": "coordinated_entry",
    "status": "pending",
    "submitted_at": "2025-11-11T10:30:00Z"
  }
}
```

### Get Housing Resources

**Endpoint:** `GET /housing/resources`

**Response:**
```json
{
  "resources": [
    {
      "name": "Coordinated Entry",
      "description": "Central assessment and referral system",
      "phone": "(415) 355-7555",
      "website": "https://hsh.sfgov.org",
      "locations": [
        "Mission Neighborhood Resource Center - 165 Capp Street"
      ]
    }
  ]
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Errors

**Validation Error (400):**
```json
{
  "errors": [
    {
      "field": "lat",
      "message": "Invalid latitude"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "error": "Access token required"
}
```

**Rate Limit Exceeded (429):**
```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

## Rate Limiting

Default rate limits:
- **Anonymous users:** 100 requests/minute
- **Registered users:** 200 requests/minute
- **Service providers:** 500 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699700000
```

## Versioning

The API uses URL versioning. Current version: `v1`

Base URL: `/api/v1`

## Support

For API support, contact: api-support@sfhaven.org

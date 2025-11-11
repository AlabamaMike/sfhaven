# SF Haven

A mobile application designed to assist San Francisco's homeless population in accessing essential services, finding safe RV parking, and connecting with housing resources.

## 🎯 Overview

SF Haven provides:
- **Real-time service location** (food, shelter, healthcare, hygiene)
- **RV parking navigation** with legal zone mapping
- **Emergency resources** with quick access to crisis hotlines
- **Housing support** through Coordinated Entry integration
- **Offline functionality** for critical information
- **Anonymous or registered** account options

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Features (MVP)
- ✅ Service locator with geospatial search
- ✅ RV parking zone mapping and alerts
- ✅ Emergency resource quick access
- ✅ Anonymous authentication
- ✅ Offline data caching
- ✅ Real-time parking status checks
- ✅ Multi-language support ready

### Upcoming Features
- Push notifications for parking alerts
- Case manager messaging
- Document storage for housing applications
- Community forums
- Weather-based emergency shelter alerts

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Mobile App (React Native)       │
│   iOS / Android / Progressive Web   │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      API Gateway (Express)          │
│       Node.js Backend API           │
└─────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌─────────────┐
│ PostgreSQL   │  │    Redis    │
│  + PostGIS   │  │    Cache    │
└──────────────┘  └─────────────┘
```

### Tech Stack

**Backend:**
- Node.js 18+ with Express
- PostgreSQL 15 with PostGIS extension
- Redis for caching
- JWT authentication

**Mobile:**
- React Native (Expo)
- Zustand for state management
- React Navigation
- Async Storage for offline data

**Infrastructure:**
- Docker & Docker Compose
- AWS (ECS, RDS, ElastiCache, S3)
- GitHub Actions for CI/CD

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+ (optional, can use Docker)
- npm or yarn

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sfhaven.git
   cd sfhaven
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

5. **Seed sample data**
   ```bash
   docker-compose exec backend npm run seed
   ```

6. **Access the API**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health

### Local Development (without Docker)

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up PostgreSQL database
createdb sfhaven
psql sfhaven < src/database/schema.sql

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start development server
npm run dev
```

#### Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## 💻 Development

### Project Structure

```
sfhaven/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── database/       # Database schema and migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main server file
│   ├── Dockerfile
│   └── package.json
├── mobile/                  # React Native app
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── stores/         # Zustand stores
│   │   ├── config/         # App configuration
│   │   └── components/     # Reusable components
│   ├── App.js
│   └── package.json
├── infrastructure/          # Infrastructure as Code
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml
└── README.md
```

### Running Tests

**Backend tests:**
```bash
cd backend
npm test
npm run test:coverage
```

**Mobile tests:**
```bash
cd mobile
npm test
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

## 📚 API Documentation

### Base URL

- Development: `http://localhost:3000/api/v1`
- Production: `https://api.sfhaven.org/api/v1`

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Core Endpoints

#### Authentication

```http
POST /api/v1/auth/anonymous
# Create anonymous user account

POST /api/v1/auth/register
Content-Type: application/json
{
  "phone_number": "+14155551234",
  "pin": "1234"
}

POST /api/v1/auth/login
Content-Type: application/json
{
  "phone_number": "+14155551234",
  "pin": "1234"
}
```

#### Services

```http
GET /api/v1/services?lat=37.7749&lng=-122.4194&radius=5000&category=food
# Search for services near location

GET /api/v1/services/:id
# Get service details

GET /api/v1/services/offline-bundle?lat=37.7749&lng=-122.4194&radius=10000
# Download offline service data
```

#### Parking

```http
GET /api/v1/parking/check?lat=37.7749&lng=-122.4194
# Check if location is legal parking

GET /api/v1/parking/zones?lat=37.7749&lng=-122.4194&radius=1000
# Get parking zones near location

POST /api/v1/parking/report
Content-Type: application/json
{
  "location": { "lat": 37.7749, "lng": -122.4194 },
  "type": "enforcement",
  "description": "Parking enforcement active"
}

GET /api/v1/parking/alerts?lat=37.7749&lng=-122.4194
# Get active parking alerts
```

#### Emergency

```http
GET /api/v1/emergency/nearest?lat=37.7749&lng=-122.4194&type=shelter
# Find nearest emergency resources

GET /api/v1/emergency/hotlines
# Get crisis hotline numbers (works offline)
```

For complete API documentation, see [API.md](docs/API.md)

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### AWS Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed AWS deployment instructions.

**Quick deployment:**

1. Configure AWS credentials
2. Push Docker image to ECR
3. Deploy to ECS using GitHub Actions
4. Set up RDS PostgreSQL instance
5. Configure environment variables

### Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint
DB_NAME=sfhaven
DB_USER=postgres
DB_PASSWORD=secure_password
REDIS_HOST=your-redis-endpoint
JWT_SECRET=secure_random_secret
GOOGLE_MAPS_API_KEY=your_api_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
cd mobile
npm run test:e2e
```

### Test Coverage

```bash
npm run test:coverage
```

Coverage targets:
- Lines: 70%
- Functions: 70%
- Branches: 70%

## 📱 Mobile App

### Building for Production

**iOS:**
```bash
cd mobile
expo build:ios
```

**Android:**
```bash
cd mobile
expo build:android
```

### App Store Submission

See [mobile/PUBLISHING.md](mobile/PUBLISHING.md) for app store submission guidelines.

## 🔒 Security

- All API communications use TLS 1.3
- Data encrypted at rest (AES-256)
- JWT tokens with expiration
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- OWASP Top 10 compliance

Report security vulnerabilities to: security@sfhaven.org

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- San Francisco Department of Homelessness and Supportive Housing
- Service provider partners
- Community advocates and beta testers
- Open source contributors

## 📞 Support

- Documentation: https://docs.sfhaven.org
- Issues: https://github.com/yourusername/sfhaven/issues
- Email: support@sfhaven.org
- Community Forum: https://community.sfhaven.org

## 📊 Project Status

**Current Version:** 1.0.0 (MVP)

**Phase 1 (Complete):**
- ✅ Core API infrastructure
- ✅ Database schema with PostGIS
- ✅ Authentication system
- ✅ Service locator
- ✅ Parking zone mapping
- ✅ Emergency resources
- ✅ Mobile app (iOS/Android)
- ✅ Offline functionality

**Phase 2 (In Progress):**
- 🔄 Push notifications
- 🔄 Housing application tracking
- 🔄 Community features
- 🔄 Multi-language support
- 🔄 Advanced analytics

**Phase 3 (Planned):**
- 📋 Case manager portal
- 📋 SMS integration
- 📋 Weather alerts
- 📋 Document storage
- 📋 Regional expansion

---

**Made with ❤️ for the San Francisco community**

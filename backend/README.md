# Pharmalink Backend

A microservices-based backend system for Pharmalink, built with Express.js and Node.js. This system provides pharmaceutical services including drug interaction checking, personalized recommendations, brand comparison, and prescription interpretation.

## 🏗️ Architecture

```
Pharmalink Backend
├── API Gateway (Port 3000)
├── Microservices
│   ├── Drug Interaction Service (Port 3001)
│   ├── Personalized Advisory Service (Port 3002)
│   ├── Cross-Brand Comparator Service (Port 3003)
│   └── Prescription Interpreter Service (Port 3004)
├── Shared Infrastructure
│   ├── File Store
│   ├── Message Queue (RabbitMQ)
│   └── Cache (Redis)
└── Database (MongoDB)
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (running on localhost:27017)
- Redis (optional, for caching)
- RabbitMQ (optional, for message queuing)

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your specific configuration.

4. **Start development servers:**
   ```bash
   npm run start:dev
   ```

## 🔧 Development

### Starting Individual Services

```bash
# Start API Gateway only
npm start

# Start individual microservices
npm run dev:drug-interaction
npm run dev:advisory
npm run dev:comparator
npm run dev:interpreter
```

### Development Mode

```bash
# Start all services in development mode
npm run start:dev

# Or use the development script
node scripts/start-dev.js
```

## 📡 API Endpoints

### API Gateway (Port 3000)

- **Health Check:** `GET /health`
- **Drug Interactions:** `POST /api/drug-interactions/*`
- **Advisory Services:** `POST /api/advisory/*`
- **Brand Comparator:** `POST /api/comparator/*`
- **Prescription Services:** `POST /api/prescription/*`

### Drug Interaction Service (Port 3001)

- **Health Check:** `GET /health`
- **Check Interactions:** `POST /check-interactions`
- **Get Drug Info:** `GET /drug/:drugId`
- **Search Drugs:** `GET /search?query=<term>`

### Personalized Advisory Service (Port 3002)

- **Health Check:** `GET /health`
- **Get Recommendations:** `POST /recommendations`
- **Adherence Analysis:** `POST /adherence`
- **Lifestyle Recommendations:** `POST /lifestyle`
- **Drug Alternatives:** `POST /alternatives`

### Cross-Brand Comparator Service (Port 3003)

- **Health Check:** `GET /health`
- **Compare Brands:** `POST /compare`
- **Price History:** `GET /price-history/:brandName`
- **Cheapest Options:** `POST /cheapest`
- **Insurance Coverage:** `POST /insurance-coverage`
- **Pharmacy Pricing:** `POST /pharmacy-pricing`

### Prescription Interpreter Service (Port 3004)

- **Health Check:** `GET /health`
- **Interpret Prescription:** `POST /interpret` (file upload)
- **Analyze Text:** `POST /analyze-text`
- **Validate Prescription:** `POST /validate`
- **Extract Data:** `POST /extract`
- **Generate Summary:** `POST /summarize`

## 🔌 Example API Calls

### Check Drug Interactions

```bash
curl -X POST http://localhost:3000/api/drug-interactions/check-interactions \
  -H "Content-Type: application/json" \
  -d '{
    "drugs": ["Warfarin", "Aspirin", "Ibuprofen"]
  }'
```

### Get Personalized Recommendations

```bash
curl -X POST http://localhost:3000/api/advisory/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "patientProfile": {
      "id": "patient123",
      "age": 65,
      "conditions": ["diabetes", "hypertension"]
    },
    "medications": ["Metformin", "Lisinopril"],
    "conditions": ["diabetes", "hypertension"]
  }'
```

### Compare Drug Brands

```bash
curl -X POST http://localhost:3000/api/comparator/compare \
  -H "Content-Type: application/json" \
  -d '{
    "genericName": "Lisinopril",
    "location": "New York, NY",
    "insuranceInfo": {
      "provider": "Health Plan A",
      "memberId": "123456789"
    }
  }'
```

### Upload Prescription for Interpretation

```bash
curl -X POST http://localhost:3000/api/prescription/interpret \
  -F "prescription=@/path/to/prescription.jpg" \
  -F "patientInfo={\"name\":\"John Doe\",\"dob\":\"1980-01-01\"}"
```

## 🛠️ Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Microservices Ports
DRUG_INTERACTION_PORT=3001
ADVISORY_PORT=3002
COMPARATOR_PORT=3003
PRESCRIPTION_PORT=3004

# Database
MONGODB_URI=mongodb://localhost:27017/pharmalink

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# Message Queue (RabbitMQ)
RABBITMQ_URL=amqp://localhost:5672

# Security
JWT_SECRET=your_jwt_secret_here
```

## 📁 Project Structure

```
backend/
├── microservices/
│   ├── drug_interaction_microservice/
│   │   ├── index.js
│   │   └── package.json
│   ├── personalized_advisory_microservice/
│   │   ├── index.js
│   │   └── package.json
│   ├── crossbrand_comparator_microservice/
│   │   ├── index.js
│   │   └── package.json
│   └── prescription_interpreter_microservice/
│       ├── index.js
│       └── package.json
├── shared_infrastructure/
│   ├── cache/
│   │   └── index.js
│   ├── message_queue/
│   │   └── index.js
│   ├── file_store/
│   │   └── index.js
│   └── logger.js
├── config/
│   └── database.js
├── scripts/
│   ├── setup-infrastructure.js
│   └── start-dev.js
├── server.js
├── package.json
└── .env
```

## 🔍 Health Monitoring

Check the status of all services:

```bash
# API Gateway
curl http://localhost:3000/health

# Individual microservices
curl http://localhost:3001/health  # Drug Interaction
curl http://localhost:3002/health  # Advisory
curl http://localhost:3003/health  # Comparator
curl http://localhost:3004/health  # Prescription
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run tests for specific microservice
cd microservices/drug_interaction_microservice
npm test
```

## 📝 Logging

Logs are stored in:
- `logs/combined.log` - All log entries
- `logs/error.log` - Error entries only
- Console output in development mode

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Request validation with Joi
- File upload restrictions
- JWT authentication (configured but not implemented in examples)

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper MongoDB, Redis, and RabbitMQ instances
3. Set up proper logging and monitoring
4. Configure load balancers for microservices
5. Set up proper security measures
6. Use process managers like PM2

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include appropriate logging
4. Write tests for new features
5. Update documentation

## 📞 Support

For questions or issues, please refer to the project documentation or contact the development team.

## 📄 License

This project is licensed under the MIT License.
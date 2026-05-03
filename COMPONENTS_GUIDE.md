# PharmaLink - Components Guide

A comprehensive breakdown of the 4 main components in the PharmaLink healthcare management platform, including descriptions, technology stacks, and workflows.

---

## 1. Frontend Component

### Description
The **Frontend** is a modern, responsive web application built with React 19 and Vite. It serves as the primary user interface for doctors, pharmacists, and administrators to interact with the PharmaLink system. The frontend handles authentication, user management, real-time analytics, and provides access to all healthcare management features.

### Technology Stack
- **Framework**: React 19.1.1 with modern hooks and Suspense
- **Build Tool**: Vite 7.1.7 (ultra-fast build system)
- **Styling**: Tailwind CSS 4.1.13 + Emotion
- **UI Components**: Material-UI (MUI) 7.3.4, Hero Icons
- **HTTP Client**: Axios 1.13.2
- **Routing**: React Router DOM 7.9.3
- **OCR Integration**: Tesseract.js 6.0.1
- **PDF Generation**: jsPDF 3.0.4 with autotable
- **File Upload**: React Dropzone 14.3.8
- **Linting**: ESLint 9.36.0

### Key Features
✅ **Authentication System**
- Secure login/registration with role-based access control
- Session persistence with JWT tokens
- Password strength validation

✅ **Interactive Dashboard**
- Real-time analytics and metrics
- User management interface
- System status monitoring

✅ **Drug Interaction Checker**
- Real-time drug interaction verification
- Severity level indicators
- Alternative medication suggestions

✅ **Cross-Brand Comparator**
- Compare drug prices across brands
- Cost optimization recommendations
- Brand-specific information

✅ **Prescription Interpreter**
- AI-powered OCR for handwritten prescriptions
- Tesseract-based image processing
- Prescription parsing and validation

✅ **Personalized Advisory**
- Nutrition recommendations
- Lifestyle suggestions
- User-specific health alerts

### Workflow Architecture

```
User Browser
    ↓
[Frontend Application]
    ├── src/
    │   ├── pages/          → Route components
    │   ├── components/     → Reusable UI components
    │   ├── services/       → API calls (Axios)
    │   ├── contexts/       → State management
    │   ├── utils/          → Helper functions
    │   └── styles/         → Tailwind + Emotion styles
    ├── index.html
    ├── vite.config.js
    └── tailwind.config.js
    ↓
[API Requests via Axios]
    ↓
Backend API Gateway (Port 3000)
```

### Setup & Run Instructions

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Output: Frontend available at http://localhost:5173 (Vite default)
```

### Build for Production
```bash
npm run build    # Creates optimized production build
npm run preview  # Preview production build locally
```

### Key Environment Variables
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENABLE_OCR=true
```

---

## 2. Backend Component

### Description
The **Backend** is a scalable Node.js microservices architecture built with Express.js. It acts as the central hub for all healthcare operations, providing API endpoints for authentication, drug interactions, personalized recommendations, brand comparisons, prescription interpretation, and treatment identification. The backend manages data persistence, security, and orchestrates communication between microservices.

### Technology Stack
- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose ODM 7.6.3
- **Caching**: Redis 4.6.10
- **Message Queue**: RabbitMQ (amqplib 0.10.3)
- **Authentication**: JWT (jsonwebtoken 9.0.2), bcryptjs
- **Security**: Helmet 7.1.0, CORS 2.8.5, Rate Limiting
- **HTTP Proxy**: http-proxy-middleware 2.0.6
- **Validation**: Joi 17.11.0
- **Logging**: Morgan 1.10.0
- **File Upload**: Multer 1.4.5
- **Process Management**: Concurrently (for multi-service startup)
- **Testing**: Jest

### Key Features

✅ **API Gateway (Port 3000)**
- Request routing and aggregation
- Authentication middleware
- Rate limiting and security headers
- Cross-origin resource sharing

✅ **Drug Interaction Microservice (Port 3001)**
- Predicts drug-drug interactions
- Severity level classification
- Alternative medication suggestions
- Knowledge base fallback

✅ **Personalized Advisory Microservice (Port 3002)**
- User profile analysis
- Personalized health recommendations
- Nutrition and lifestyle advice
- Risk assessment

✅ **Cross-Brand Comparator Microservice (Port 3003)**
- Brand price comparison
- Cost-benefit analysis
- Generic vs brand alternatives
- Market data integration

✅ **Prescription Interpreter Microservice (Port 3004)**
- OCR image processing
- Prescription parsing
- Medication extraction
- Dosage interpretation

✅ **Treatment Identifier Microservice (Port 3005)**
- Disease-treatment mapping
- Clinical guideline integration
- Evidence-based recommendations

### Workflow Architecture

```
[User Requests]
        ↓
[API Gateway - server.js : 3000]
        ↓
    ├→ [Authentication Routes]
    ├→ [User Routes]
    ├→ [Drug Routes]
    ├→ [Prescription Routes]
    ├→ [Advisory Routes]
    └→ [Comparison Routes]
        ↓
[Microservices Architecture]
    ├── Drug Interaction Service : 3001
    │   └── models/ → MongoDB interaction data
    │
    ├── Advisory Service : 3002
    │   └── services/ → Recommendation logic
    │
    ├── Comparator Service : 3003
    │   └── services/ → Price comparison logic
    │
    ├── Interpreter Service : 3004
    │   └── services/ → OCR processing
    │
    └── Treatment Service : 3005
        └── models/ → Treatment database
        ↓
[Shared Infrastructure]
    ├── MongoDB Database (localhost:27017)
    ├── Redis Cache (localhost:6379)
    ├── RabbitMQ Message Queue
    └── Shared middleware & utilities
```

### Setup & Run Instructions

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install all dependencies (including microservices)
npm run install:all

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your database and service credentials

# 4. Start all services concurrently
npm run start:dev

# Output:
# - API Gateway: http://localhost:3000
# - Drug Interaction: http://localhost:3001
# - Advisory Service: http://localhost:3002
# - Comparator Service: http://localhost:3003
# - Interpreter Service: http://localhost:3004
# - Treatment Service: http://localhost:3005
```

### Alternative Startup Options

```bash
# Start only API Gateway
npm run dev:gateway-only

# Start Gateway + Drug Interaction service
npm run dev:stack

# Start individual services
npm run dev:drug-interaction
npm run dev:advisory
npm run dev:comparator
npm run dev:interpreter
npm run dev:treatment
```

### Key Microservices Structure

```
backend/
├── server.js                 → Main API Gateway
├── config/                   → Configuration files
├── middleware/               → Authentication, validation, error handling
├── models/                   → MongoDB schemas
├── routes/                   → API route handlers
├── services/                 → Business logic
├── scripts/                  → Setup and utilities
├── shared_infrastructure/    → Shared utilities across services
└── microservices/
    ├── drug_interaction_microservice/
    ├── personalized_advisory_microservice/
    ├── crossbrand_comparator_microservice/
    ├── prescription_interpreter_microservice/
    └── treatment_identifier_microservice/
```

### Database & Infrastructure
- **MongoDB**: Stores user data, drug info, interactions, and prescriptions
- **Redis**: Caches frequent queries and session data
- **RabbitMQ**: Queues async tasks and inter-service communication

---

## 3. ML Service Component

### Description
The **ML Service** is a Python-based machine learning inference engine built with FastAPI. It provides advanced healthcare analytics including drug interaction prediction, food-drug risk assessment, prescription parsing, and treatment recommendations. The service uses pre-trained ML models and falls back to knowledge-based predictions when models are unavailable.

### Technology Stack
- **Framework**: FastAPI 0.104.1 (async Python web framework)
- **Server**: Uvicorn 0.24.0 (ASGI server)
- **ML & Data Processing**: 
  - scikit-learn 1.8.0 (machine learning models)
  - NumPy 1.26.0 (numerical computations)
  - Pandas 2.0.0 (data manipulation)
  - joblib 1.3.2 (model serialization)
- **Deep Learning & NLP**:
  - PyTorch 2.1.0 (neural networks)
  - Transformers 4.36.0 (pre-trained NLP models)
  - Hugging Face models for OCR and Named Entity Recognition (NER)
  - ONNX Runtime 1.16.0 (optimized inference)
- **OCR Engines**:
  - EasyOCR 1.7.0 (multi-language OCR)
  - OpenCV 4.8.0 (image processing)
  - Pillow 10.0.0 (image I/O)
- **Text Processing**:
  - Fuzzy matching (rapidfuzz 3.0.0)
  - Sentence piece (tokenization)
- **Data Sources**:
  - Kaggle API 1.5.16 (dataset downloads)
  - Requests 2.31.0 (HTTP downloads)
- **Visualization**: Matplotlib 3.7.0 (optional)

### Key Features

✅ **Drug Interaction Prediction**
- Binary classification model for drug-drug interactions
- Severity level assessment
- Knowledge base with 10+ documented interactions
- Graceful fallback when models unavailable

✅ **Food-Drug Risk Assessment**
- Predicts food-drug interaction risks
- Risk level classification
- Nutritional compatibility analysis

✅ **Prescription Interpretation**
- Image-to-text OCR using EasyOCR and Transformers
- Medical Named Entity Recognition (NER)
- Medication extraction and standardization
- Dosage parsing and validation

✅ **Text Vectorization & Encoding**
- TF-IDF vectorizer for text similarity
- Category encoding for drug/food classes
- Semantic text embedding

✅ **Model Management System**
- Auto-download production models
- Copy locally trained models from notebooks
- Fallback to knowledge base
- Production-ready with graceful degradation

### Workflow Architecture

```
[Backend Request]
        ↓
[FastAPI ML Service : 5000]
    ├── /predict-interaction
    ├── /predict-food-drug
    ├── /interpret-prescription
    ├── /extract-medications
    └── /health-check
        ↓
[Model Loading System]
    ├── Check ml_service/models/
    ├── Fallback to ../model/ (notebook output)
    ├── Download from remote (if configured)
    └── Use knowledge base (fallback)
        ↓
[ML Model Pipeline]
    ├── [Input Preprocessing]
    │   └── Text cleaning, normalization
    │
    ├── [Feature Extraction]
    │   ├── TF-IDF vectorization
    │   ├── Category encoding
    │   └── Embedding generation
    │
    ├── [Model Inference]
    │   ├── scikit-learn models
    │   ├── Transformers models
    │   └── Knowledge base rules
    │
    └── [Post-processing]
        └── Result formatting, severity classification
        ↓
[Response to Backend]
```

### Directory Structure

```
ml_service/
├── main.py                      → FastAPI application entry
├── model_downloader.py          → Model management system
├── requirements.txt             → Python dependencies
├── models/                      → Production models (auto-created)
│   ├── interaction_binary_model.pkl
│   ├── food_drug_risk_model.pkl
│   ├── tfidf_vectorizer.pkl
│   └── category_encoders.pkl
├── cross_brand_comparison/      → Brand comparison logic
├── drug_interactions/           → Interaction models & knowledge base
├── prescription_interpreter/    → OCR and prescription parsing
├── treatment_identifier/        → Treatment recommendation logic
└── models/                      → Directory for training outputs
    ├── notebooks/               → Jupyter training notebooks
    ├── datasets/                → Training data
    └── outputs/                 → Trained model artifacts
```

### Setup & Run Instructions

```bash
# 1. Navigate to ML service directory
cd ml_service

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Download/Setup models (optional)
python model_downloader.py

# 4. Start the ML service
python main.py

# Output: ML Service available at http://localhost:5000
#         API Docs at http://localhost:5000/docs
```

### Environment Variables
```
ML_SERVICE_PORT=5000
ML_SERVICE_HOST=0.0.0.0
MODEL_PATH=./models
KNOWLEDGE_BASE_PATH=./drug_interactions/knowledge_base.json
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/predict-interaction` | POST | Predict drug-drug interactions |
| `/predict-food-drug` | POST | Assess food-drug risks |
| `/interpret-prescription` | POST | Parse prescription images |
| `/extract-medications` | POST | Extract medications from text |
| `/health-check` | GET | Service health status |
| `/docs` | GET | Interactive API documentation |

---

## 4. Mobile Component

### Description
The **Mobile** component is a cross-platform mobile application built with Expo and React Native. It provides on-the-go access to PharmaLink's healthcare features, allowing users (doctors, pharmacists, patients) to check drug interactions, access prescriptions, and receive personalized health recommendations through iOS, Android, and web platforms.

### Technology Stack
- **Framework**: Expo 54.0.29 (React Native with simplified build process)
- **Runtime**: React Native 0.81.5 + React 19.1.0
- **Routing**: Expo Router 6.0.19 (file-based routing)
- **Navigation**: React Navigation 7.1.8 with bottom tabs
- **HTTP Client**: Axios 1.13.2
- **Storage**: Async Storage 2.2.0 (persistent device storage)
- **UI & Animations**:
  - Expo Linear Gradient 15.0.8
  - Expo Blur 15.0.8
  - React Native Reanimated 4.1.1 (high-performance animations)
  - React Native Gesture Handler 2.28.0
  - Expo Haptics 15.0.8 (haptic feedback)
- **Images & Icons**:
  - Expo Image 3.0.11
  - Expo Vector Icons 15.0.3
  - Expo Symbols 1.0.8
- **Device Features**:
  - Expo Image Picker 17.0.10
  - Expo Linking 8.0.10
  - Expo Web Browser 15.0.10
  - Expo Status Bar 3.0.9
- **Screens & Layout**:
  - React Native Safe Area Context 5.6.0
  - React Native Screens 4.16.0
- **Linting**: ESLint with Expo config
- **TypeScript**: 5.9.2 (type safety)

### Key Features

✅ **Multi-Platform Support**
- iOS native app
- Android native app
- Web (PWA) support
- Share codebase across all platforms

✅ **Authentication & User Management**
- Secure login/registration
- Role-based access (doctor, pharmacist, patient)
- Persistent session with Async Storage
- Biometric authentication support

✅ **Drug Interaction Checker**
- Quick drug interaction lookup
- Severity level alerts
- Offline mode with cached data
- Real-time notifications

✅ **Prescription Management**
- Photograph and store prescriptions
- OCR-based prescription reading
- Medication tracking
- Refill reminders

✅ **Personalized Recommendations**
- Push notifications for health alerts
- Customized medication schedule
- Nutrition and lifestyle tips

✅ **Responsive Design**
- Safe area handling (notches, status bars)
- Gesture-based navigation
- Smooth animations and transitions
- Dark/Light theme support

### Workflow Architecture

```
[Mobile User]
        ↓
[Expo Development Environment]
    ├── iOS Simulator
    ├── Android Emulator
    ├── Expo Go (sandbox)
    └── Web Browser
        ↓
[App Entry Point]
└── expo-router/entry
        ↓
[File-Based Routing System]
    └── app/ directory structure
        ├── index.tsx              → Home screen
        ├── (auth)/                → Authentication screens
        ├── (tabs)/                → Tab-based navigation
        ├── (drawer)/              → Drawer navigation
        └── components/            → Shared UI components
        ↓
[Navigation Stack]
    ├── Bottom Tab Navigation
    ├── Stack Navigation
    └── Drawer Navigation
        ↓
[Screen Components]
    ├── Drug Checker Screen
    ├── Prescription Scanner Screen
    ├── User Profile Screen
    ├── Recommendations Screen
    └── Settings Screen
        ↓
[Services & API Calls]
    ├── API client (Axios)
    ├── Local storage (Async Storage)
    ├── Device APIs (Camera, etc.)
    └── Backend API Gateway : 3000
```

### Directory Structure

```
mobile/
├── app/                             → File-based routing root
│   ├── index.tsx                    → Home screen
│   ├── (auth)/                      → Auth flow screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                      → Tab-based screens
│   │   ├── drugs.tsx
│   │   ├── prescriptions.tsx
│   │   ├── recommendations.tsx
│   │   └── profile.tsx
│   └── components/                  → Shared components
│       ├── ThemedView.tsx
│       ├── ThemedText.tsx
│       └── ...
├── app.json                         → Expo app configuration
├── package.json                     → Dependencies & scripts
├── tailwind.config.js               → Tailwind CSS config
├── tsconfig.json                    → TypeScript config
└── scripts/                         → Build scripts
    └── reset-project.js             → Fresh project setup
```

### Setup & Run Instructions

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Start Expo development server
npm start

# Output will show options:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web browser
# - Press 'j' to open debugger
```

### Platform-Specific Commands

```bash
# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run on web
npm run web

# Reset project to fresh state
npm run reset-project

# Lint code
npm run lint
```

### Key Environment Variables

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_BACKEND_IP:3000/api
EXPO_PUBLIC_ENABLE_BIOMETRIC=true
EXPO_PUBLIC_APP_ENV=development
```

### Building for Production

```bash
# For iOS
eas build --platform ios

# For Android
eas build --platform android

# Both platforms
eas build
```

---

## Integration & Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Web)                      │
│              http://localhost:5173                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─────────────────┬─────────────────┐
             │                 │                 │
             v                 v                 v
┌─────────────────────────┐  ┌──────────────────────────┐
│  Backend (Express)      │  │  Mobile (Expo)           │
│  http://localhost:3000  │  │  http://localhost:8081   │
│                         │  │                          │
│  ├─ Gateway : 3000      │  │  iOS, Android, Web       │
│  ├─ Drug Inter : 3001   │  │  Shared codebase         │
│  ├─ Advisory : 3002     │  │  File-based routing      │
│  ├─ Comparator : 3003   │  │  Cross-platform         │
│  ├─ Interpreter : 3004  │  │                          │
│  └─ Treatment : 3005    │  └──────────────────────────┘
└──────────┬──────────────┘
           │
           v
┌─────────────────────────────────────────────┐
│      ML Service (FastAPI)                   │
│      http://localhost:5000                  │
│                                             │
│  ├─ Drug Interaction Prediction             │
│  ├─ Food-Drug Risk Assessment               │
│  ├─ Prescription Interpretation (OCR)       │
│  ├─ Treatment Recommendations               │
│  └─ Knowledge Base Fallback                 │
└─────────────────────────────────────────────┘
           │
           v
┌────────────────────────────────────────────────┐
│      Data & Infrastructure Layer               │
│                                                │
│  ├─ MongoDB : localhost:27017                  │
│  ├─ Redis : localhost:6379                     │
│  └─ RabbitMQ : localhost:5672                  │
└────────────────────────────────────────────────┘
```

---

## Development Workflow Summary

### 1. **Local Development Setup** (First Time)

```bash
# Clone and navigate
git clone https://github.com/DimuthuAro/PharmaLink.git
cd PharmaLink

# Install backend (with all microservices)
cd backend && npm run install:all

# Install frontend
cd ../frontend && npm install

# Install ML service
cd ../ml_service && pip install -r requirements.txt

# Install mobile
cd ../mobile && npm install
```

### 2. **Start All Services**

```bash
# Terminal 1: Backend & Microservices
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: ML Service
cd ml_service && python main.py

# Terminal 4: Mobile (optional)
cd mobile && npm start
```

### 3. **Access Points**

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web UI |
| Backend Gateway | http://localhost:3000 | API entry point |
| Backend Microservices | :3001-:3005 | Specialized services |
| ML Service | http://localhost:5000 | ML inference |
| ML Docs | http://localhost:5000/docs | API documentation |
| Mobile | Emulator/Device | Native app |

---

## Key Characteristics by Component

| Aspect | Frontend | Backend | ML Service | Mobile |
|--------|----------|---------|-----------|--------|
| **Language** | JavaScript/React | JavaScript/Node | Python | JavaScript/React Native |
| **Architecture** | Single-page app | Microservices | Inference server | Cross-platform app |
| **Database** | N/A | MongoDB | N/A | Async Storage |
| **Main Purpose** | User interface | Business logic | ML predictions | On-the-go access |
| **Scalability** | Horizontal (CDN) | Horizontal (services) | Horizontal (APIs) | Auto-scaling |
| **Testing** | Unit/Integration | Jest/Integration | Model validation | E2E/Unit |
| **Deployment** | Static hosting | Docker/K8s | Docker/K8s | App stores |

---

## Performance Optimization Tips

### Frontend
- Use React.lazy() for code splitting
- Implement image lazy loading
- Cache API responses with Axios interceptors
- Enable Gzip compression in Vite build

### Backend
- Implement Redis caching for database queries
- Use connection pooling for MongoDB
- Implement rate limiting per user
- Queue heavy operations with RabbitMQ

### ML Service
- Cache model predictions with Redis
- Implement batch processing for multiple requests
- Use ONNX Runtime for model optimization
- Preload models at startup

### Mobile
- Implement offline-first architecture with Async Storage
- Use memoization to prevent unnecessary re-renders
- Compress images before upload
- Implement request throttling for network calls


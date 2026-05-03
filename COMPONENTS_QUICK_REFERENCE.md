# PharmaLink - Components Quick Reference

## 📊 Component Overview Matrix

```
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                          PHARMALINK 4-COMPONENT ARCHITECTURE                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND COMPONENT                                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  📍 Location: /frontend                                                                  │
│  🏗️  Type: Single Page Application                                                       │
│  🛠️  Tech Stack: React 19 + Vite + Tailwind CSS 4                                        │
│  🔗 URL: http://localhost:5173                                                          │
│                                                                                           │
│  PURPOSE:                                                                                │
│  Provides the web-based user interface for all PharmaLink features                       │
│  - Interactive dashboards with real-time analytics                                       │
│  - Drug interaction checking interface                                                   │
│  - Brand comparison tools                                                                │
│  - Prescription OCR reader                                                               │
│  - User authentication & profile management                                              │
│                                                                                           │
│  KEY FEATURES:                                                                           │
│  ✓ Responsive design (Tailwind CSS)                                                     │
│  ✓ Material-UI components                                                                │
│  ✓ Real-time data visualization                                                         │
│  ✓ Tesseract OCR integration                                                             │
│  ✓ PDF generation (jsPDF)                                                                │
│  ✓ File upload & dropzone                                                                │
│                                                                                           │
│  QUICK START:                                                                            │
│  $ cd frontend                                                                           │
│  $ npm install                                                                           │
│  $ npm run dev                                                                           │
│                                                                                           │
│  BUILD:                                                                                  │
│  $ npm run build          # Production build                                             │
│  $ npm run lint           # Code quality check                                           │
│  $ npm run preview        # Preview production build                                     │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. BACKEND COMPONENT                                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  📍 Location: /backend                                                                   │
│  🏗️  Type: Microservices Architecture                                                    │
│  🛠️  Tech Stack: Node.js + Express 4 + MongoDB + Redis                                  │
│  🔗 URL: http://localhost:3000 (Gateway)                                                │
│                                                                                           │
│  PURPOSE:                                                                                │
│  Central business logic hub orchestrating all healthcare operations                      │
│  - API gateway routing requests to microservices                                         │
│  - User authentication & authorization                                                   │
│  - Data persistence with MongoDB                                                         │
│  - Performance caching with Redis                                                        │
│  - Async task queuing with RabbitMQ                                                      │
│                                                                                           │
│  MICROSERVICES:                                                                          │
│  ├─ 3000: API Gateway (main entry point)                                               │
│  ├─ 3001: Drug Interaction Service                                                      │
│  ├─ 3002: Personalized Advisory Service                                                 │
│  ├─ 3003: Cross-Brand Comparator Service                                                │
│  ├─ 3004: Prescription Interpreter Service                                              │
│  └─ 3005: Treatment Identifier Service                                                  │
│                                                                                           │
│  KEY FEATURES:                                                                           │
│  ✓ RESTful API design                                                                   │
│  ✓ JWT-based authentication                                                             │
│  ✓ Role-based access control (RBAC)                                                     │
│  ✓ Input validation with Joi                                                            │
│  ✓ Security headers with Helmet                                                         │
│  ✓ Rate limiting                                                                        │
│  ✓ Comprehensive logging                                                                │
│  ✓ Integration testing with Jest                                                        │
│                                                                                           │
│  QUICK START:                                                                            │
│  $ cd backend                                                                            │
│  $ npm run install:all       # Install all microservices                                │
│  $ cp .env.example .env      # Configure environment                                    │
│  $ npm run start:dev         # Start all services                                       │
│                                                                                           │
│  ALTERNATIVE STARTUP:                                                                   │
│  $ npm run dev:gateway-only     # Start only gateway                                    │
│  $ npm run dev:drug-interaction # Start specific service                                │
│  $ npm run dev:advisory                                                                 │
│  $ npm run dev:comparator                                                               │
│  $ npm run dev:interpreter                                                              │
│  $ npm run dev:treatment                                                                │
│                                                                                           │
│  TESTING:                                                                                │
│  $ npm test              # Run unit tests                                                │
│  $ npm run test:integration # Run integration tests                                     │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ML SERVICE COMPONENT                                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  📍 Location: /ml_service                                                                │
│  🏗️  Type: Inference Engine                                                              │
│  🛠️  Tech Stack: Python + FastAPI + scikit-learn + PyTorch                              │
│  🔗 URL: http://localhost:5000                                                          │
│                                                                                           │
│  PURPOSE:                                                                                │
│  Advanced machine learning inference for healthcare predictions                          │
│  - Drug-drug interaction prediction                                                      │
│  - Food-drug risk assessment                                                             │
│  - Prescription interpretation with OCR                                                  │
│  - Medication extraction & standardization                                               │
│  - Treatment recommendations                                                             │
│                                                                                           │
│  ML MODELS PROVIDED:                                                                     │
│  ├─ Drug Interaction Binary Classifier                                                  │
│  ├─ Food-Drug Risk Assessment Model                                                     │
│  ├─ Prescription OCR (Transformers + EasyOCR)                                           │
│  ├─ Medical NER (Named Entity Recognition)                                              │
│  ├─ TF-IDF Vectorizer (text similarity)                                                 │
│  └─ Category Encoders (feature encoding)                                                │
│                                                                                           │
│  KEY FEATURES:                                                                           │
│  ✓ FastAPI async endpoints                                                              │
│  ✓ Automatic model management system                                                    │
│  ✓ Multi-language OCR (easyocr)                                                         │
│  ✓ Hugging Face transformer models                                                      │
│  ✓ ONNX-optimized inference                                                             │
│  ✓ Knowledge base fallback                                                              │
│  ✓ Interactive API docs (/docs)                                                         │
│  ✓ Model auto-download & caching                                                        │
│                                                                                           │
│  QUICK START:                                                                            │
│  $ cd ml_service                                                                         │
│  $ pip install -r requirements.txt    # Install dependencies                            │
│  $ python model_downloader.py         # Download models (optional)                      │
│  $ python main.py                     # Start service                                   │
│                                                                                           │
│  API ENDPOINTS:                                                                          │
│  POST   /predict-interaction          # Drug-drug interaction prediction                │
│  POST   /predict-food-drug            # Food-drug risk assessment                       │
│  POST   /interpret-prescription       # Prescription OCR & parsing                      │
│  POST   /extract-medications          # Medication extraction                           │
│  GET    /health-check                 # Service health status                           │
│  GET    /docs                         # Interactive API documentation                   │
│                                                                                           │
│  MODEL LOCATIONS:                                                                        │
│  ├─ ml_service/models/                # Production models (auto-created)                │
│  ├─ model/                            # Notebook training outputs                       │
│  └─ notebooks/                        # Jupyter training notebooks                      │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. MOBILE COMPONENT                                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  📍 Location: /mobile                                                                    │
│  🏗️  Type: Cross-Platform Mobile App                                                     │
│  🛠️  Tech Stack: Expo + React Native 0.81 + React Router                                │
│  🔗 URL: Emulator/Device                                                                │
│                                                                                           │
│  PURPOSE:                                                                                │
│  On-the-go healthcare access through native mobile apps                                  │
│  - iOS & Android native applications (single codebase)                                   │
│  - Web version (PWA support)                                                             │
│  - Quick drug interaction lookup                                                         │
│  - Prescription capture & management                                                     │
│  - Push notifications for health alerts                                                  │
│  - Offline mode with cached data                                                         │
│                                                                                           │
│  SUPPORTED PLATFORMS:                                                                    │
│  ✓ iOS (Apple App Store)                                                                │
│  ✓ Android (Google Play Store)                                                          │
│  ✓ Web (Browser)                                                                        │
│  ✓ Expo Go (Sandbox testing)                                                            │
│                                                                                           │
│  KEY FEATURES:                                                                           │
│  ✓ File-based routing (app/ directory)                                                  │
│  ✓ Bottom tab & drawer navigation                                                       │
│  ✓ Safe area handling (notches, status bars)                                            │
│  ✓ Gesture-based interactions                                                           │
│  ✓ Smooth animations (Reanimated)                                                       │
│  ✓ Dark/Light theme support                                                             │
│  ✓ Haptic feedback                                                                      │
│  ✓ Persistent storage (AsyncStorage)                                                    │
│  ✓ TypeScript support                                                                   │
│                                                                                           │
│  QUICK START:                                                                            │
│  $ cd mobile                                                                             │
│  $ npm install                                                                           │
│  $ npm start                                                                             │
│                                                                                           │
│  RUN ON SPECIFIC PLATFORM:                                                              │
│  $ npm run android     # Android emulator                                                │
│  $ npm run ios         # iOS simulator                                                   │
│  $ npm run web         # Web browser                                                     │
│                                                                                           │
│  PROJECT STRUCTURE:                                                                      │
│  app/                                                                                    │
│  ├── index.tsx                # Home screen                                             │
│  ├── (auth)/                  # Authentication screens                                  │
│  ├── (tabs)/                  # Tab navigation screens                                  │
│  ├── components/              # Shared UI components                                    │
│  └── _layout.tsx              # Root layout                                             │
│                                                                                           │
│  BUILD FOR PRODUCTION:                                                                  │
│  $ eas build --platform ios        # Build iOS app                                      │
│  $ eas build --platform android    # Build Android app                                  │
│  $ eas build                       # Build both platforms                               │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Diagram

```
WEB USER                          MOBILE USER
    │                                │
    └──────────────┬─────────────────┘
                   │
          [Frontend Web App]
          [React + Vite]
          [localhost:5173]
                   │
                   └──────────────────────────────────┐
                                                      │
                   [Mobile App]                       │
                   [Expo/React Native]                │
                   [Emulator/Device]                  │
                                                      │
                                          ┌───────────┘
                                          │
                                          v
                        ┌─────────────────────────────┐
                        │  BACKEND API GATEWAY        │
                        │  (Express.js)               │
                        │  localhost:3000             │
                        └──────────┬──────────────────┘
                                   │
                ┌──────────────────┼──────────────────┬───────────────────┐
                │                  │                  │                   │
                v                  v                  v                   v
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │Drug Inter    │   │Advisory      │   │Comparator    │   │Interpreter   │
        │Service       │   │Service       │   │Service       │   │Service       │
        │Port: 3001    │   │Port: 3002    │   │Port: 3003    │   │Port: 3004    │
        └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                │                  │                  │                   │
                └──────────────────┼──────────────────┴───────────────────┘
                                   │
                                   v
                        ┌─────────────────────────────┐
                        │  ML SERVICE (FastAPI)       │
                        │  localhost:5000             │
                        │                             │
                        │  ✓ Interaction Prediction   │
                        │  ✓ OCR / NER                │
                        │  ✓ Risk Assessment          │
                        │  ✓ Knowledge Base           │
                        └──────────┬──────────────────┘
                                   │
                ┌──────────────────┼──────────────────┬───────────────────┐
                │                  │                  │                   │
                v                  v                  v                   v
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │ MongoDB      │   │ Redis Cache  │   │ RabbitMQ     │   │ Knowledge    │
        │ Database     │   │ localhost    │   │ Message Q    │   │ Base Files   │
        │ localhost    │   │ :6379        │   │ :5672        │   │              │
        │ :27017       │   │              │   │              │   │ JSON/CSV     │
        └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 📋 Development Command Cheat Sheet

### Setup (First Time Only)
```bash
# Clone repository
git clone https://github.com/DimuthuAro/PharmaLink.git
cd PharmaLink

# Backend setup (with all microservices)
cd backend && npm run install:all && cd ..

# Frontend setup
cd frontend && npm install && cd ..

# ML service setup
cd ml_service && pip install -r requirements.txt && cd ..

# Mobile setup
cd mobile && npm install && cd ..
```

### Start All Services (Open 4 terminals)

**Terminal 1 - Backend:**
```bash
cd backend && npm run start:dev
# Starts: Gateway (3000) + all 5 microservices (3001-3005)
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
# Starts: http://localhost:5173
```

**Terminal 3 - ML Service:**
```bash
cd ml_service && python main.py
# Starts: http://localhost:5000
# API docs: http://localhost:5000/docs
```

**Terminal 4 - Mobile (Optional):**
```bash
cd mobile && npm start
# Press: 'a' for Android, 'i' for iOS, 'w' for web
```

### Individual Component Development

```bash
# Frontend only
cd frontend && npm run dev

# Backend gateway only (no microservices)
cd backend && npm run dev:gateway-only

# Specific microservice
cd backend && npm run dev:drug-interaction
cd backend && npm run dev:advisory
cd backend && npm run dev:comparator
cd backend && npm run dev:interpreter
cd backend && npm run dev:treatment

# ML service with model downloads
cd ml_service
python model_downloader.py
python main.py

# Mobile on specific platform
cd mobile && npm run android      # Android emulator
cd mobile && npm run ios          # iOS simulator
cd mobile && npm run web          # Web browser
```

---

## 🌐 Access Points Summary

| Component | Type | URL | Purpose |
|-----------|------|-----|---------|
| **Frontend** | Web App | `http://localhost:5173` | User interface |
| **Backend Gateway** | API | `http://localhost:3000` | Main API entry point |
| **Drug Interaction** | Microservice | `http://localhost:3001` | Drug predictions |
| **Advisory** | Microservice | `http://localhost:3002` | Recommendations |
| **Comparator** | Microservice | `http://localhost:3003` | Brand comparison |
| **Interpreter** | Microservice | `http://localhost:3004` | OCR processing |
| **Treatment ID** | Microservice | `http://localhost:3005` | Treatment mapping |
| **ML Service** | Python API | `http://localhost:5000` | ML predictions |
| **ML Docs** | Interactive | `http://localhost:5000/docs` | API docs |
| **Mobile** | Native App | Emulator/Device | Mobile access |

---

## 🎯 Component Responsibilities

| Component | Owns | Provides | Consumes |
|-----------|------|----------|----------|
| **Frontend** | UI/UX | User interface | Backend APIs |
| **Backend** | Business Logic | REST APIs | ML Service, Database |
| **ML Service** | ML Models | Predictions | Raw input data |
| **Mobile** | Mobile UX | Mobile app | Backend APIs |

---

## 📱 Technology Comparison

| Aspect | Frontend | Backend | ML Service | Mobile |
|--------|----------|---------|-----------|--------|
| **Language** | JavaScript | JavaScript | Python | JavaScript |
| **Framework** | React 19 | Express 4 | FastAPI | React Native |
| **Build Tool** | Vite | npm | pip | npm/eas |
| **Dev Port** | 5173 | 3000-3005 | 5000 | Emulator |
| **DB** | N/A | MongoDB | N/A | AsyncStorage |
| **Cache** | Browser | Redis | N/A | Device cache |
| **Main Task** | Rendering | Logic | Inference | Mobile UI |

---

## 🚀 Performance Checklist

- [ ] Frontend: Enable code splitting & lazy loading
- [ ] Frontend: Implement image optimization
- [ ] Backend: Setup Redis caching
- [ ] Backend: Configure connection pooling
- [ ] ML Service: Preload models at startup
- [ ] ML Service: Cache predictions
- [ ] Mobile: Use offline-first architecture
- [ ] Mobile: Implement request throttling
- [ ] All: Setup comprehensive logging
- [ ] All: Configure error handling

---

**For detailed information, see [COMPONENTS_GUIDE.md](COMPONENTS_GUIDE.md)**


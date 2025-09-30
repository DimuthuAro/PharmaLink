# 🏥 Pharmalink - Healthcare Management Platform

> **A comprehensive healthcare management platform with AI-powered drug interaction checking, personalized recommendations, and prescription interpretation.**

[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-339933?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.13-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

## 🌟 Features

### 🔐 **Authentication & Security**
- **Secure Login/Registration** with role-based access control
- **Multi-role Support**: Doctors, Pharmacists, Administrators
- **Session Management** with persistent authentication
- **Password Strength Validation** and account lockout protection

### 🏥 **Healthcare Management**
- **Interactive Dashboard** with real-time analytics
- **Drug Interaction Checker** with severity levels and alerts
- **Cross-Brand Comparator** for cost optimization
- **Prescription Interpreter** with AI-powered OCR
- **Personalized Advisory** for nutrition and lifestyle recommendations

### ⚡ **Technical Excellence**
- **Microservices Architecture** for scalability
- **React 19** with modern hooks and Suspense
- **Vite** for lightning-fast development
- **Tailwind CSS** for responsive design
- **Real-time Updates** and interactive components

## 🏗️ System Architecture

```
Pharmalink Platform
├── Frontend (React + Vite)
│   ├── Authentication System
│   ├── Interactive Dashboard
│   ├── User Management
│   └── Real-time Analytics
├── Backend (Node.js + Express)
│   ├── API Gateway (Port 3000)
│   ├── Drug Interaction Service (Port 3001)
│   ├── Personalized Advisory Service (Port 3002)
│   ├── Cross-Brand Comparator Service (Port 3003)
│   └── Prescription Interpreter Service (Port 3004)
└── Infrastructure
    ├── MongoDB (Database)
    ├── Redis (Caching)
    └── RabbitMQ (Message Queue)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (running on localhost:27017)
- **Redis** (optional, for caching)
- **RabbitMQ** (optional, for message queuing)

### 1. Clone the Repository

```bash
git clone https://github.com/DimuthuAro/PharmaLink.git
cd PharmaLink
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

**Frontend will be available at:** http://localhost:3000

### 3. Backend Setup

```bash
cd backend
npm run install:all
cp .env.example .env  # Configure your environment variables
npm run start:dev
```

**Backend API will be available at:** http://localhost:3000/api

### 4. Access the Application

1. **Open your browser** to http://localhost:3000
2. **Use demo credentials** (click any demo button on login page):
   - **Doctor**: doctor@pharmalink.com / pharma123
   - **Admin**: admin@pharmalink.com / admin123
   - **Pharmacist**: pharmacist@pharmalink.com / pharma123

## 📱 Frontend Features

### 🎨 **Modern React Application**
- **React 19** with latest features and optimizations
- **Vite** for fast development and hot module replacement
- **Tailwind CSS** for utility-first styling
- **React Router** for seamless navigation
- **Custom Hooks** for state management and API calls

### 🔑 **Authentication System**
- **Secure Login/Registration** forms with validation
- **Role-based Access Control** (Doctor, Pharmacist, Admin)
- **Password Strength Indicator** and security features
- **Persistent Sessions** with localStorage integration
- **Automatic Redirects** for unauthorized access

### 📊 **Interactive Dashboard**
- **Real-time Statistics** with animated counters
- **Quick Actions** for common healthcare tasks
- **Recent Activity** feed with actionable items
- **System Performance** metrics and monitoring
- **Responsive Design** for all screen sizes

### 🎯 **User Experience**
- **Loading States** and smooth animations
- **Error Handling** with user-friendly messages
- **Keyboard Shortcuts** for power users
- **Accessibility Support** with ARIA labels
- **Mobile-Responsive** design

## 🔧 Backend Services

### 🌐 **API Gateway (Port 3000)**
Central entry point for all client requests with routing and load balancing.

**Endpoints:**
- `GET /health` - Health check
- `POST /api/drug-interactions/*` - Drug interaction services
- `POST /api/advisory/*` - Advisory services
- `POST /api/comparator/*` - Brand comparison services
- `POST /api/prescription/*` - Prescription services

### 💊 **Drug Interaction Service (Port 3001)**
Comprehensive drug interaction checking and analysis.

**Key Features:**
- Multi-drug interaction analysis
- Severity level assessment
- Drug information database
- Search functionality

### 🎯 **Personalized Advisory Service (Port 3002)**
AI-powered personalized healthcare recommendations.

**Key Features:**
- Nutrition recommendations
- Lifestyle advice
- Medication adherence analysis
- Drug alternatives suggestions

### 💰 **Cross-Brand Comparator Service (Port 3003)**
Price comparison and cost optimization for medications.

**Key Features:**
- Multi-brand price comparison
- Insurance coverage analysis
- Pharmacy pricing data
- Cost-saving recommendations

### 📋 **Prescription Interpreter Service (Port 3004)**
OCR-powered prescription reading and interpretation.

**Key Features:**
- Image-to-text conversion
- Handwriting recognition
- Prescription validation
- Data extraction and structuring

## 🔌 API Documentation

### Authentication Example

```javascript
// Login Request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@pharmalink.com',
    password: 'pharma123'
  })
});
```

### Drug Interaction Check

```bash
curl -X POST http://localhost:3000/api/drug-interactions/check-interactions \
  -H "Content-Type: application/json" \
  -d '{
    "drugs": ["Warfarin", "Aspirin", "Ibuprofen"]
  }'
```

### Prescription Upload

```bash
curl -X POST http://localhost:3000/api/prescription/interpret \
  -F "prescription=@/path/to/prescription.jpg" \
  -F "patientInfo={\"name\":\"John Doe\",\"dob\":\"1980-01-01\"}"
```

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Development

```bash
cd backend
npm run start:dev    # Start all services in development
npm start           # Start API Gateway only
npm test            # Run tests
npm run test:integration  # Integration tests
```

### Environment Configuration

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000/api
VITE_AUTH_DEV=development
```

**Backend (.env):**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pharmalink
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_here
```

## 📁 Project Structure

```
PharmaLink/
├── frontend/                    # React Frontend Application
│   ├── src/
│   │   ├── auth/               # Authentication logic
│   │   ├── components/         # Reusable React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.jsx   # Main dashboard
│   │   │   ├── LogIn.jsx      # Login page
│   │   │   └── Register.jsx   # Registration page
│   │   ├── routes/            # Route definitions
│   │   ├── styles/            # Custom CSS styles
│   │   └── utils/             # Utility functions
│   ├── public/                # Static assets
│   ├── package.json
│   └── vite.config.js         # Vite configuration
├── backend/                   # Node.js Backend Services
│   ├── microservices/        # Individual microservices
│   │   ├── drug_interaction_microservice/
│   │   ├── personalized_advisory_microservice/
│   │   ├── crossbrand_comparator_microservice/
│   │   └── prescription_interpreter_microservice/
│   ├── shared_infrastructure/ # Shared components
│   │   ├── cache/
│   │   ├── message_queue/
│   │   └── file_store/
│   ├── config/               # Configuration files
│   ├── scripts/              # Development scripts
│   └── server.js             # API Gateway
├── .gitignore               # Git ignore rules
└── README.md               # This file
```

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Backend Testing
```bash
cd backend
npm test            # Run all tests
npm run test:unit   # Unit tests only
npm run test:integration  # Integration tests only
```

### Manual Testing

1. **Authentication Flow**: Test login/logout with different user roles
2. **Dashboard Functionality**: Verify all interactive elements
3. **API Integration**: Test all microservice endpoints
4. **Responsive Design**: Test on different screen sizes
5. **Error Handling**: Test network failures and invalid inputs

## 🔒 Security Features

### Frontend Security
- **Input Validation** with real-time feedback
- **XSS Protection** with proper sanitization
- **CSRF Protection** with secure headers
- **Session Management** with secure storage
- **Route Protection** for authenticated users only

### Backend Security
- **Helmet.js** for security headers
- **CORS** configuration for cross-origin requests
- **Rate Limiting** to prevent abuse
- **Request Validation** with Joi schemas
- **File Upload Security** with type restrictions
- **JWT Authentication** for stateless sessions

## 🚀 Production Deployment

### Frontend Deployment

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting provider
```

**Recommended Platforms:**
- Vercel
- Netlify  
- AWS S3 + CloudFront
- Azure Static Web Apps

### Backend Deployment

```bash
cd backend
npm install --production
npm start
```

**Recommended Platforms:**
- AWS EC2 + ELB
- Google Cloud Platform
- Microsoft Azure
- Docker + Kubernetes

### Environment Setup

1. **Configure Production Environment Variables**
2. **Set up Database Connections** (MongoDB Atlas recommended)
3. **Configure Redis and RabbitMQ** instances
4. **Set up SSL/TLS Certificates**
5. **Configure Load Balancers** for microservices
6. **Set up Monitoring and Logging**

## 📊 Performance Optimizations

### Frontend Optimizations
- **Code Splitting** with React.lazy()
- **Image Optimization** with proper compression
- **Bundle Analysis** with Vite bundle analyzer
- **Caching Strategies** with service workers
- **CDN Integration** for static assets

### Backend Optimizations
- **Database Indexing** for faster queries
- **Redis Caching** for frequently accessed data
- **Connection Pooling** for database connections
- **Load Balancing** across microservice instances
- **Gzip Compression** for API responses

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Make Your Changes** following our coding standards
4. **Add Tests** for new functionality
5. **Commit Your Changes** (`git commit -m 'Add amazing feature'`)
6. **Push to Your Branch** (`git push origin feature/amazing-feature`)
7. **Create a Pull Request**

### Coding Standards
- **ESLint** configuration for JavaScript/React
- **Prettier** for code formatting
- **Conventional Commits** for commit messages
- **JSDoc** comments for complex functions
- **TypeScript** adoption encouraged

## 📞 Support & Documentation

- **GitHub Issues**: [Report bugs or request features](https://github.com/DimuthuAro/PharmaLink/issues)
- **Discussions**: [Community discussions](https://github.com/DimuthuAro/PharmaLink/discussions)
- **Wiki**: [Detailed documentation](https://github.com/DimuthuAro/PharmaLink/wiki)

## 🗺️ Roadmap

### 🔮 **Upcoming Features**
- [ ] **Mobile Application** (React Native)
- [ ] **Real-time Notifications** (WebSocket integration)
- [ ] **Advanced Analytics** with charts and reports
- [ ] **AI-powered Chatbot** for patient assistance
- [ ] **Integration APIs** for third-party systems
- [ ] **Multi-language Support** (i18n)

### 🎯 **Version 2.0 Goals**
- [ ] **Telemedicine Integration** with video calls
- [ ] **Electronic Health Records** (EHR) system
- [ ] **Pharmacy Management** system
- [ ] **Insurance Claims** processing
- [ ] **Clinical Decision Support** tools

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **Vite Team** for the lightning-fast build tool
- **Tailwind CSS** for the utility-first CSS framework
- **Heroicons** for beautiful icon sets
- **Open Source Community** for inspiration and support

---

<p align="center">
  <strong>Built with ❤️ by the Pharmalink Team</strong><br>
  <em>Revolutionizing Healthcare Management Through Technology</em>
</p>

<p align="center">
  <a href="https://github.com/DimuthuAro/PharmaLink/stargazers">⭐ Star this repository</a> |
  <a href="https://github.com/DimuthuAro/PharmaLink/issues">🐛 Report Bug</a> |
  <a href="https://github.com/DimuthuAro/PharmaLink/issues">✨ Request Feature</a>
</p>
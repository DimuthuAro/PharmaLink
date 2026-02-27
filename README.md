Pharmalink - Healthcare Management Platform
A comprehensive healthcare management platform with AI-powered drug interaction checking, personalized recommendations, and prescription interpretation.

Built with React 19.1.1, Vite 7.1.7, Node.js 16+, Express.js 4.x, and Tailwind CSS 4.1.13

Features
Authentication & Security
Secure Login/Registration with role-based access control

Multi-role Support for Doctors, Pharmacists, and Administrators

Session Management with persistent authentication

Password Strength Validation and account protection

Healthcare Management
Interactive Dashboard with real-time analytics

Drug Interaction Checker with severity levels and alerts

Cross-Brand Comparator for cost optimization

Prescription Interpreter with AI-powered OCR

Personalized Advisory for nutrition and lifestyle recommendations

Technical Features
Microservices Architecture for scalability

React 19 with modern hooks and Suspense

Vite for fast development

Tailwind CSS for responsive design

Real-time Updates and interactive components

System Architecture
text
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
Getting Started
Prerequisites
Node.js (version 16 or higher)

MongoDB (running on localhost:27017)

Redis (optional, for caching)

RabbitMQ (optional, for message queuing)

1. Clone the Repository
bash
git clone https://github.com/DimuthuAro/PharmaLink.git
cd PharmaLink
2. Frontend Setup
bash
cd frontend
npm install
npm run dev
The frontend will be available at: http://localhost:3000

3. Backend Setup
bash
cd backend
npm run install:all
cp .env.example .env  # Configure your environment variables
npm run start:dev
The backend API will be available at: http://localhost:3000/api

4. Access the Application
Open your browser to http://localhost:3000

Use demo credentials (click any demo button on login page):

Doctor: doctor@pharmalink.com / pharma123

Admin: admin@pharmalink.com / admin123

Pharmacist: pharmacist@pharmalink.com / pharma123

Frontend Features
Modern React Application
React 19 with latest features

Vite for fast development

Tailwind CSS for styling

React Router for navigation

Custom Hooks for state management

Authentication System
Secure Login/Registration forms with validation

Role-based Access Control (Doctor, Pharmacist, Admin)

Password Strength Indicator

Persistent Sessions with localStorage

Automatic Redirects for unauthorized access

Interactive Dashboard
Real-time Statistics with animated counters

Quick Actions for common healthcare tasks

Recent Activity feed

System Performance metrics

Responsive Design for all screen sizes

User Experience
Loading States and smooth animations

Error Handling with user-friendly messages

Keyboard Shortcuts

Accessibility Support

Mobile-Responsive design

Backend Services
API Gateway (Port 3000)
Central entry point for all client requests.

Endpoints:

GET /health - Health check

POST /api/drug-interactions/* - Drug interaction services

POST /api/advisory/* - Advisory services

POST /api/comparator/* - Brand comparison services

POST /api/prescription/* - Prescription services

Drug Interaction Service (Port 3001)
Comprehensive drug interaction checking and analysis.

Key Features:

Multi-drug interaction analysis

Severity level assessment

Drug information database

Search functionality

Personalized Advisory Service (Port 3002)
AI-powered personalized healthcare recommendations.

Key Features:

Nutrition recommendations

Lifestyle advice

Medication adherence analysis

Drug alternatives suggestions

Cross-Brand Comparator Service (Port 3003)
Price comparison and cost optimization for medications.

Key Features:

Multi-brand price comparison

Insurance coverage analysis

Pharmacy pricing data

Cost-saving recommendations

Prescription Interpreter Service (Port 3004)
OCR-powered prescription reading and interpretation.

Key Features:

Image-to-text conversion

Handwriting recognition

Prescription validation

Data extraction and structuring

API Documentation
Authentication Example
javascript
// Login Request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@pharmalink.com',
    password: 'pharma123'
  })
});
Drug Interaction Check
bash
curl -X POST http://localhost:3000/api/drug-interactions/check-interactions \
  -H "Content-Type: application/json" \
  -d '{
    "drugs": ["Warfarin", "Aspirin", "Ibuprofen"]
  }'
Prescription Upload
bash
curl -X POST http://localhost:3000/api/prescription/interpret \
  -F "prescription=@/path/to/prescription.jpg" \
  -F "patientInfo={\"name\":\"John Doe\",\"dob\":\"1980-01-01\"}"
Development
Frontend Development
bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
Backend Development
bash
cd backend
npm run start:dev    # Start all services in development
npm start           # Start API Gateway only
npm test            # Run tests
npm run test:integration  # Integration tests
Environment Configuration
Frontend (.env):

text
VITE_API_URL=http://localhost:3000/api
VITE_AUTH_DEV=development
Backend (.env):

text
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pharmalink
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_here
Project Structure
text
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
Testing
Frontend Testing
bash
cd frontend
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
Backend Testing
bash
cd backend
npm test            # Run all tests
npm run test:unit   # Unit tests only
npm run test:integration  # Integration tests only
Manual Testing
Authentication Flow: Test login/logout with different user roles

Dashboard Functionality: Verify all interactive elements

API Integration: Test all microservice endpoints

Responsive Design: Test on different screen sizes

Error Handling: Test network failures and invalid inputs

Security Features
Frontend Security
Input Validation with real-time feedback

XSS Protection with proper sanitization

CSRF Protection with secure headers

Session Management with secure storage

Route Protection for authenticated users only

Backend Security
Helmet.js for security headers

CORS configuration for cross-origin requests

Rate Limiting to prevent abuse

Request Validation with Joi schemas

File Upload Security with type restrictions

JWT Authentication for stateless sessions

Production Deployment
Frontend Deployment
bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting provider
Recommended Platforms:

Vercel

Netlify

AWS S3 + CloudFront

Azure Static Web Apps

Backend Deployment
bash
cd backend
npm install --production
npm start
Recommended Platforms:

AWS EC2 + ELB

Google Cloud Platform

Microsoft Azure

Docker + Kubernetes

Environment Setup
Configure Production Environment Variables

Set up Database Connections (MongoDB Atlas recommended)

Configure Redis and RabbitMQ instances

Set up SSL/TLS Certificates

Configure Load Balancers for microservices

Set up Monitoring and Logging

Performance Optimizations
Frontend Optimizations
Code Splitting with React.lazy()

Image Optimization with proper compression

Bundle Analysis with Vite bundle analyzer

Caching Strategies with service workers

CDN Integration for static assets

Backend Optimizations
Database Indexing for faster queries

Redis Caching for frequently accessed data

Connection Pooling for database connections

Load Balancing across microservice instances

Gzip Compression for API responses

Contributing
We welcome contributions! Please follow these steps:

Fork the Repository

Create a Feature Branch (git checkout -b feature/amazing-feature)

Make Your Changes following our coding standards

Add Tests for new functionality

Commit Your Changes (git commit -m 'Add amazing feature')

Push to Your Branch (git push origin feature/amazing-feature)

Create a Pull Request

Coding Standards
ESLint configuration for JavaScript/React

Prettier for code formatting

Conventional Commits for commit messages

JSDoc comments for complex functions

TypeScript adoption encouraged

Support & Documentation
GitHub Issues: Report bugs or request features

Discussions: Community discussions

Wiki: Detailed documentation

Roadmap
Upcoming Features
Mobile Application (React Native)

Real-time Notifications (WebSocket integration)

Advanced Analytics with charts and reports

AI-powered Chatbot for patient assistance

Integration APIs for third-party systems

Multi-language Support

Version 2.0 Goals
Telemedicine Integration with video calls

Electronic Health Records (EHR) system

Pharmacy Management system

Insurance Claims processing

Clinical Decision Support tools

License
This project is licensed under the MIT License - see the LICENSE file for details.

Acknowledgments
React Team for the amazing framework

Vite Team for the fast build tool

Tailwind CSS for the utility-first CSS framework

Heroicons for beautiful icon sets

Open Source Community for inspiration and support

Built with care by the Pharmalink Team

Revolutionizing Healthcare Management Through Technology

Star this repository | Report Bug | Request Feature

i want in .md formal file to download
We are going to convert the given markdown file into a more humanized version without emojis, as if written by an undergraduate student.
Steps:

Remove all emojis.

Adjust the tone to be more formal and academic, but still accessible.

Keep the structure and technical details, but present them in a way that is clear and straightforward.

Let's break down the original markdown and rewrite each section accordingly.

Note: The original markdown is very long, so we will go section by section.

We are also going to remove the badges at the top and replace them with a simple list of technologies.

We'll start with the title and description, then move through each section.

Pharmalink - Healthcare Management Platform
Overview
A comprehensive healthcare management platform designed to assist medical professionals with AI-powered drug interaction checking, personalized patient recommendations, and prescription interpretation. This system was developed as a final year undergraduate project to demonstrate modern web development practices in healthcare technology.

Technologies Used
Frontend: React 19.1.1, Vite 7.1.7, Tailwind CSS 4.1.13

Backend: Node.js, Express.js 4.x

Database: MongoDB

Additional Tools: Redis, RabbitMQ

Development Tools: Git, npm, ESLint

System Features
1. Authentication & Security
Secure user authentication with role-based access control

Support for multiple user roles: Doctors, Pharmacists, Administrators

Session management with persistent login

Password validation and security features

2. Healthcare Management Tools
Interactive dashboard with analytics

Drug interaction checker with severity assessment

Cross-brand medication comparison for cost optimization

AI-powered prescription interpretation (OCR)

Personalized health advisory system

3. Technical Architecture
Microservices-based architecture for scalability

Modern React frontend with hooks and Suspense

Fast development with Vite build tool

Responsive design using Tailwind CSS

Real-time data updates

Project Structure
text
PharmaLink/
├── frontend/
│   ├── src/
│   │   ├── auth/          # Authentication logic
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── routes/        # Application routing
│   │   ├── styles/        # CSS styles
│   │   └── utils/         # Helper functions
│   └── public/            # Static assets
└── backend/
    ├── microservices/     # Individual service modules
    ├── shared_infrastructure/
    ├── config/            # Configuration files
    └── server.js          # Main server file
Installation Guide
Prerequisites
Node.js version 16 or higher

MongoDB running on localhost:27017

(Optional) Redis for caching

(Optional) RabbitMQ for message queue

Step 1: Clone and Setup
bash
git clone https://github.com/DimuthuAro/PharmaLink.git
cd PharmaLink
Step 2: Frontend Setup
bash
cd frontend
npm install
npm run dev
Frontend will run at: http://localhost:3000

Step 3: Backend Setup
bash
cd backend
npm run install:all
cp .env.example .env
# Edit .env with your configuration
npm run start:dev
Backend API available at: http://localhost:3000/api

Step 4: Test Application
Open browser to http://localhost:3000

Use demo credentials:

Doctor: doctor@pharmalink.com / pharma123

Admin: admin@pharmalink.com / admin123

Pharmacist: pharmacist@pharmalink.com / pharma123

API Documentation
Authentication
javascript
// Login endpoint
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
Drug Interaction Check
bash
curl -X POST http://localhost:3000/api/drug-interactions/check-interactions \
  -H "Content-Type: application/json" \
  -d '{"drugs": ["Medication1", "Medication2"]}'
Prescription Upload
bash
curl -X POST http://localhost:3000/api/prescription/interpret \
  -F "prescription=@prescription.jpg" \
  -F "patientInfo={\"name\":\"Patient Name\"}"
Development Commands
Frontend
bash
npm run dev      # Start development server
npm run build    # Create production build
npm run preview  # Preview production build
npm run lint     # Code linting
Backend
bash
npm run start:dev    # Start all microservices
npm start            # Start API gateway
npm test             # Run tests
Environment Configuration
Frontend (.env)
text
VITE_API_URL=http://localhost:3000/api
VITE_AUTH_DEV=development
Backend (.env)
text
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pharmalink
JWT_SECRET=your_secret_key_here
Testing
Frontend Tests
bash
cd frontend
npm run test      # Unit tests
npm run test:e2e  # End-to-end tests
Backend Tests
bash
cd backend
npm test                 # All tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests
Security Features
Frontend Security
Input validation and sanitization

Protected routes based on user roles

Secure session storage

CSRF protection

Backend Security
JWT-based authentication

Request rate limiting

Input validation with Joi

Security headers with Helmet.js

File upload restrictions

Deployment
Frontend Deployment
Build the application:

bash
cd frontend
npm run build
Deploy the dist folder to your hosting service (Vercel, Netlify, AWS S3, etc.)

Backend Deployment
Install production dependencies:

bash
cd backend
npm install --production
Configure environment variables

Start the server:

bash
npm start
Performance Optimization
Frontend
Code splitting with React.lazy()

Image optimization and compression

Bundle analysis and optimization

Caching strategies

Backend
Database indexing

Redis caching for frequent queries

Connection pooling

Gzip compression for responses

Future Enhancements
Mobile application using React Native

Real-time notifications via WebSocket

Advanced analytics and reporting

Multi-language support

Integration with external healthcare APIs

Project Documentation
Complete project documentation is available in the GitHub repository

API documentation with examples

Setup guides for different environments

Troubleshooting guides

Contributing
Fork the repository

Create a feature branch

Make your changes

Add tests for new features

Submit a pull request

License
This project is licensed under the MIT License. See LICENSE file for details.

Acknowledgments
React and Vite teams for excellent development tools

Tailwind CSS for utility-first styling

Open source community for libraries and inspiration

University faculty for guidance and support

Contact and Support
GitHub Repository: https://github.com/DimuthuAro/PharmaLink

Report issues via GitHub Issues

Documentation available in project wiki

This project was developed as part of an undergraduate computer science program to demonstrate full-stack web development skills with healthcare applications.
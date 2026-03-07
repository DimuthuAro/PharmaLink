// src/pages/LandingPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BandLogo from '../components/brandLogo';
import HeroImage from '../assets/pharmlink-hero.jpeg';
import intearction from '../assets/interaction.jpeg';
import nutrition from '../assets/nutrition.jpeg';
import comparison from '../assets/comparison.jpeg';
import prescription from '../assets/prescription.jpeg';
import Hero from '../assets/Hero.mp4';
import {
  ShieldCheckIcon,
  CommandLineIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  UserGroupIcon,
  HeartIcon,
  BoltIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// ========================================
// ANIMATION STYLES COMPONENT
// ========================================
const AnimationStyles = () => (
  <style>{`
    @keyframes float {
      0%, 100% { transform: translateY(0) translateX(0); }
      25% { transform: translateY(-20px) translateX(10px); }
      50% { transform: translateY(-10px) translateX(-10px); }
      75% { transform: translateY(-25px) translateX(5px); }
    }
    @keyframes morph {
      0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
      25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
      50% { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
      75% { border-radius: 60% 40% 60% 30% / 70% 30% 50% 60%; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.6); }
    }
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes scale-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes typing {
      from { width: 0; }
      to { width: 100%; }
    }
    @keyframes blink {
      50% { border-color: transparent; }
    }
    @keyframes orbit {
      from { transform: rotate(0deg) translateX(100px) rotate(0deg); }
      to { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
    }
    @keyframes ping-slow {
      0% { transform: scale(1); opacity: 1; }
      75%, 100% { transform: scale(2); opacity: 0; }
    }
    .animate-float { animation: float 8s ease-in-out infinite; }
    .animate-morph { animation: morph 20s ease-in-out infinite; }
    .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
    .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
    .animate-gradient { animation: gradient-shift 8s ease infinite; background-size: 200% 200%; }
    .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
    .animate-spin-slow { animation: spin-slow 30s linear infinite; }
    .animate-scale-pulse { animation: scale-pulse 4s ease-in-out infinite; }
    .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
    .animate-slideInLeft { animation: slideInLeft 0.8s ease-out forwards; }
    .animate-slideInRight { animation: slideInRight 0.8s ease-out forwards; }
    .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
  `}</style>
);

// ========================================
// BACKGROUND COMPONENTS
// ========================================
const GradientOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/8 to-teal-500/8 rounded-full blur-3xl"></div>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Force light theme on landing page — independent of user theme preference
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => {
      if (wasDark) root.classList.add('dark');
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      {/* Animation Styles */}
      <AnimationStyles />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <GradientOrbs />
      </div>

      {/* Enhanced Header with Glassmorphism */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
        {/* Gradient Top Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}></div>

        <div className={`mx-4 md:mx-8 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg shadow-black/5 transition-all duration-500 ${scrolled ? 'bg-white/90' : 'bg-white/70'}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                <BandLogo className="relative h-10 w-auto" />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Modules', href: '#modules' },
                { label: 'About', href: '#about' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300"
              >
                Log in
              </button>
              <button
                onClick={() => navigate("/register")}
                className="group relative px-5 py-2.5 rounded-xl text-sm font-bold text-white overflow-hidden shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" style={{ filter: 'brightness(1.1)' }}></span>
                <span className="relative flex items-center gap-2">
                  Get started
                  <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-100 p-4 animate-fadeInUp">
              <nav className="flex flex-col gap-2">
                {['Features', 'Modules', 'About'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-3 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-left"
                >
                  Log in
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        {/* ========================================
            HERO SECTION - Enhanced
        ======================================== */}
        <section className="relative min-h-screen flex items-center pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              {/* Left: Enhanced Text Content */}
              <div className="relative z-20 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
                {/* Badge Pills */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 backdrop-blur-sm">
                    <SparklesIcon className="h-4 w-4" />
                    AI-Powered Clinical Support
                  </span>
                </div>

                {/* Main Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
                  <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                    Smarter, safer
                  </span>
                  <br />
                  <span className="relative">
                    <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      medication journeys
                    </span>
                    {/* Decorative underline */}
                    <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="url(#underline-gradient)" strokeWidth="4" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="50%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                    for every patient.
                  </span>
                </h1>

                {/* Description */}
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                  PharmaLink is an integrated platform for{" "}
                  <span className="font-bold text-blue-600">drug interaction checks</span>,{" "}
                  <span className="font-bold text-emerald-600">nutrition-aware guidance</span>,{" "}
                  <span className="font-bold text-purple-600">cross-brand comparison</span>, and{" "}
                  <span className="font-bold text-amber-600">AI prescription validation</span>.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {[
                    { text: 'Evidence-informed', color: 'emerald', icon: CheckCircleIcon },
                    { text: 'Clinical workflow–ready', color: 'blue', icon: BoltIcon },
                    { text: 'Patient-centric', color: 'amber', icon: HeartIcon },
                  ].map((pill, idx) => (
                    <div
                      key={idx}
                      className={`group flex items-center gap-2 px-4 py-2.5 bg-${pill.color}-50 border border-${pill.color}-200/50 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                    >
                      <pill.icon className={`h-4 w-4 text-${pill.color}-600`} />
                      <span className={`text-sm font-semibold text-${pill.color}-700`}>{pill.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4 mb-10">
                  <button
                    onClick={() => navigate("/register")}
                    className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></span>
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" style={{ filter: 'brightness(1.15)' }}></span>
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[radial-gradient(circle_at_50%_-20%,white,transparent_70%)]"></span>
                    <span className="relative flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5" />
                      Start Free Now
                      <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>

                  <button
                    onClick={() => navigate("/dashboard")}
                    className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-slate-800 bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <PlayIcon className="h-5 w-5 text-blue-600" />
                    View Dashboard
                  </button>
                </div>
              </div>

              {/* Right: Enhanced Hero Visual */}
              <div className="relative animate-slideInRight" style={{ animationDelay: '0.4s' }}>
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-[2.5rem] blur-2xl animate-pulse-glow"></div>

                {/* Main Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl">
                  {/* Top Gradient Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                  {/* Hero Image */}
                  <img
                    src={HeroImage}
                    alt="Doctor and patient using PharmLink"
                    className="w-full h-72 md:h-80 object-cover"
                  />

                  {/* Content Below Image */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <ShieldCheckIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">Real-time Safety Assistant</p>
                          <p className="text-xs text-slate-500">Powered by clinical AI</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/50">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        AI-Active
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      Instantly flags dangerous food–drug or allergy interactions while suggesting safer alternatives and accessible brands.
                    </p>

                    {/* Feature Tags */}
                    <div className="flex flex-wrap gap-2">
                      {['Drug Interactions', 'Allergy Detection', 'Cost Savings', 'AI Validation'].map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </section>

        


        {/* ========================================
            FEATURES SECTION - NEW
        ======================================== */}
        <section id="features" className="relative py-24 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-4">
                <BoltIcon className="h-4 w-4" />
                Why Choose PharmaLink
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
                Built for{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  clinical excellence
                </span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Powerful features designed to support healthcare professionals and protect patients at every step.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: ShieldCheckIcon,
                  title: "Real-time Safety Alerts",
                  description: "Instant notifications for drug interactions, allergies, and contraindications before they become problems.",
                  color: "red",
                  gradient: "from-red-500 to-rose-600"
                },
                {
                  icon: BoltIcon,
                  title: "Lightning Fast Analysis",
                  description: "AI-powered processing delivers results in milliseconds, keeping your workflow smooth and efficient.",
                  color: "amber",
                  gradient: "from-amber-500 to-orange-600"
                },
                {
                  icon: AcademicCapIcon,
                  title: "Evidence-Based Insights",
                  description: "All recommendations backed by peer-reviewed research and clinical guidelines from trusted sources.",
                  color: "blue",
                  gradient: "from-blue-500 to-indigo-600"
                },
                {
                  icon: HeartIcon,
                  title: "Patient-Centric Design",
                  description: "Clear, accessible explanations that empower patients to understand their medication journey.",
                  color: "pink",
                  gradient: "from-pink-500 to-rose-600"
                },
                {
                  icon: GlobeAltIcon,
                  title: "24/7 Availability",
                  description: "Access from anywhere, anytime. Cloud-based platform with 99.9% uptime guarantee.",
                  color: "emerald",
                  gradient: "from-emerald-500 to-teal-600"
                },
                {
                  icon: BeakerIcon,
                  title: "Continuous Learning",
                  description: "Our AI continuously improves with new medical research and real-world clinical feedback.",
                  color: "purple",
                  gradient: "from-purple-500 to-violet-600"
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden backdrop-blur-xl bg-white/80 border border-white/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                >
                  {/* Background Decoration */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}></div>

                  {/* Icon */}
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>

                  {/* Hover Arrow */}
                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                    <span>Learn more</span>
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================
            MODULES SECTION - Enhanced
        ======================================== */}
        <section id="modules" className="relative py-24 px-4 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4">
                <CommandLineIcon className="h-4 w-4" />
                Platform Modules
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
                Four components,{" "}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  one connected experience
                </span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Each module works seamlessly together to provide comprehensive medication safety support.
              </p>
            </div>

            {/* Module Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  num: "01",
                  title: "Drug Interaction & Allergy Detection",
                  description: "Detect potential interactions and allergy risks before prescribing or dispensing, with clear, patient-friendly explanations.",
                  image: intearction,
                  badge: "Safety first",
                  badgeColor: "red",
                  gradient: "from-red-500 to-rose-600",
                  path: "/interaction-check"
                },
                {
                  num: "02",
                  title: "AI-Powered Nutritional Advisory",
                  description: "Align diet with medication plans, suggesting safer food choices based on drug class, nutrient content, and interaction patterns.",
                  image: nutrition,
                  badge: "Diet-aware",
                  badgeColor: "emerald",
                  gradient: "from-emerald-500 to-teal-600",
                  path: "/advisory"
                },
                {
                  num: "03",
                  title: "Cross-Brand Drug Comparator",
                  description: "Compare equivalent medicines across brands to improve affordability and availability, while keeping efficacy and safety in focus.",
                  image: comparison,
                  badge: "Affordability",
                  badgeColor: "sky",
                  gradient: "from-sky-500 to-blue-600",
                  path: "/comparator"
                },
                {
                  num: "04",
                  title: "AI Prescription Interpretation",
                  description: "Interpret handwritten prescriptions, validate doses, and flag potential errors before they reach the patient.",
                  image: prescription,
                  badge: "Handwriting AI",
                  badgeColor: "violet",
                  gradient: "from-violet-500 to-purple-600",
                  path: "/prescription"
                }
              ].map((module, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                  onClick={() => navigate(module.path)}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={module.image}
                      alt={module.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent`}></div>

                    {/* Badge */}
                    <span className={`absolute left-4 top-4 text-xs px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-sm font-bold text-${module.badgeColor}-700 border border-${module.badgeColor}-200/50 shadow-lg`}>
                      {module.badge}
                    </span>

                    {/* Module Number */}
                    <span className={`absolute right-4 top-4 text-4xl font-black text-white/30`}>
                      {module.num}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {module.description}
                    </p>

                    {/* CTA */}
                    <div className={`flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${module.gradient} bg-clip-text text-transparent`}>
                      <span>Explore Module</span>
                      <ArrowRightIcon className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Bottom Gradient Line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${module.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* ========================================
            ABOUT + VIDEO SECTION - Enhanced
        ======================================== */}
        <section id="about" className="relative py-24 px-4 bg-gradient-to-b from-white via-slate-50/50 to-blue-50/30">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-50 via-white to-blue-50 border border-slate-200/70 shadow-2xl">
              {/* Background Decorations */}
              <div className="absolute -inset-3 bg-gradient-to-br from-blue-200/30 via-indigo-100/30 to-purple-100/30 blur-3xl rounded-[3rem] pointer-events-none"></div>

              <div className="relative grid gap-12 lg:grid-cols-2 items-center p-8 md:p-12 lg:p-16">
                {/* LEFT — VIDEO PANEL */}
                <div className="relative">
                  <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-200/50 bg-slate-950">
                    {/* Gradient Top Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10"></div>

                    {/* Video */}
                    <div className="aspect-video">
                      <video
                        src={Hero}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT — ABOUT TEXT */}
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-700 mb-6">
                    <HeartIcon className="h-4 w-4" />
                    About PharmaLink
                  </span>

                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6">
                    Bringing drug safety, nutrition, and accessibility{" "}
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      into one workspace
                    </span>
                  </h2>

                  <p className="text-lg text-slate-600 leading-relaxed mb-4">
                    PharmaLink is an integrated platform built for{" "}
                    <span className="font-bold text-slate-900">pharmacists, clinicians, and patients</span>.
                    We combine AI with curated clinical data to support safer medication
                    journeys — from interaction checks and allergy detection to
                    nutrition-aware advice, brand comparison, and prescription validation.
                  </p>

                  <p className="text-lg text-slate-600 leading-relaxed mb-8">
                    Our goal is simple:{" "}
                    <span className="font-bold text-blue-600">
                      reduce avoidable medication harm while improving affordability and access
                    </span>{" "}
                    in everyday practice.
                  </p>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    {[
                      { text: "Interaction & allergy checks", color: "blue" },
                      { text: "Nutrition-aware recommendations", color: "emerald" },
                      { text: "Cross-brand comparison", color: "sky" },
                      { text: "Prescription AI", color: "violet" }
                    ].map((pill, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center rounded-full bg-${pill.color}-50 text-${pill.color}-700 px-4 py-2 text-sm font-semibold border border-${pill.color}-200/50`}
                      >
                        {pill.text}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate("/register")}
                    className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300"
                  >
                    <SparklesIcon className="h-5 w-5" />
                    Get Started Free
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* ========================================
            CTA SECTION - NEW
        ======================================== */}
        <section className="relative py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 md:p-16 text-center shadow-2xl">
              {/* Background Effects */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
              </div>

              {/* Grid Pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cta-grid)" />
                </svg>
              </div>

              {/* Content */}
              <div className="relative">
                {/* Badge */}
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2 text-sm font-bold text-white mb-6">
                  <SparklesIcon className="h-5 w-5" />
                  Start Your Free Trial Today
                </span>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
                  Ready to explore
                  <br />
                  smarter medication safety?
                </h2>

                <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
                  Use PharmaLink to check drug interactions, compare brands, and interpret prescriptions with AI support.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-10">
                  <button
                    onClick={() => navigate("/register")}
                    className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold text-blue-600 bg-white shadow-2xl hover:shadow-white/30 hover:-translate-y-1 transition-all duration-300"
                  >
                    <SparklesIcon className="h-6 w-6" />
                    Get Started Free
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate("/login")}
                    className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:-translate-y-1 transition-all duration-300"
                  >
                    Log In
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Trust Row */}
                <div className="flex flex-wrap justify-center items-center gap-6">
                  {[
                    { icon: "✓", text: "Free to use" },
                    { icon: "✓", text: "Research-grade AI" },
                    { icon: "✓", text: "Quick setup" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-white/80">
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
            PROFESSIONAL FOOTER - Enhanced
        ======================================== */}
        <footer className="relative mt-auto">
          {/* Gradient Top Border */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          {/* Main Footer */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="footer-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#footer-grid)" />
              </svg>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              {/* Main Footer Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                {/* Brand Section */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur opacity-50"></div>
                      <div className="relative h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <ShieldCheckIcon className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">PharmaLink</h3>
                      <p className="text-xs text-gray-400">Clinical Decision Support</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    AI-powered platform for drug interaction checks, brand comparison, nutrition advisory, and prescription interpretation.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      <ShieldCheckIcon className="h-3.5 w-3.5" /> Secure
                    </span>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quick Links</h4>
                  <ul className="space-y-3">
                    {[
                      { label: 'Drug Interaction Check', path: '/interaction-check' },
                      { label: 'Nutrition Advisory', path: '/advisory' },
                      { label: 'Brand Comparator', path: '/comparator' },
                      { label: 'Prescription AI', path: '/prescription' }
                    ].map((link) => (
                      <li key={link.label}>
                        <button
                          onClick={() => navigate(link.path)}
                          className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group w-full text-left"
                        >
                          <ArrowRightIcon className="h-3.5 w-3.5 text-gray-500 group-hover:text-white transition-colors" />
                          {link.label}
                          <ArrowRightIcon className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-auto" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Resources */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Resources</h4>
                  <ul className="space-y-3">
                    {[
                      { label: 'Documentation' },
                      { label: 'API Reference' },
                      { label: 'Clinical Guidelines' },
                      { label: 'Support Center' }
                    ].map((link) => (
                      <li key={link.label}>
                        <a href="#" className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group">
                          <ArrowRightIcon className="h-3.5 w-3.5 text-gray-500 group-hover:text-white transition-colors" />
                          {link.label}
                          <ArrowRightIcon className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-auto" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Safety Notice */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Medical Disclaimer</h4>
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        This tool is for <span className="text-amber-400 font-semibold">informational purposes only</span>. Always consult a qualified healthcare professional before making any medical decisions.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400">FDA Database</span>
                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400">DrugBank</span>
                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400">Clinical Trials</span>
                  </div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="pt-8 border-t border-white/10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
                    <span>© {new Date().getFullYear()} PharmaLink.</span>
                    <span className="hidden md:inline">•</span>
                    <span>All rights reserved.</span>
                    <span className="hidden md:inline">•</span>
                    <span>Research & Educational Use Only</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      v2.0.0
                    </span>
                    <span className="text-xs text-gray-500">Made by PharmaLink Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;

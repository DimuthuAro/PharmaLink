<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
=======
import React, { useState, useEffect, useCallback, useMemo, Suspense, use } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
import BrandLogo from '../components/brandLogo.jsx';
>>>>>>> origin/main
import { 
  ShieldCheckIcon as ShieldCheck, 
  LightBulbIcon as LightBulb, 
  ScaleIcon as Scale, 
  DocumentTextIcon as DocumentText,
  UserCircleIcon as UserCircle,
  BellIcon as Bell,
  MagnifyingGlassIcon as Search,
  ChartBarIcon as Activity,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowRightOnRectangleIcon,
<<<<<<< HEAD
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Loading component for better UX
const LoadingSpinner = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
  </div>
);

=======
  Cog6ToothIcon,
  SparklesIcon,
  BoltIcon,
  HeartIcon,
  ClockIcon,
  CalendarDaysIcon,
  FireIcon,
  RocketLaunchIcon,
  GlobeAltIcon,
  CpuChipIcon,
  SignalIcon,
  CheckCircleIcon,
  BeakerIcon,
  AcademicCapIcon,
  StarIcon,
  ArrowRightIcon as ArrowRight
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

// ========================================
// ANIMATION STYLES COMPONENT
// ========================================
const AnimationStyles = () => (
  <style>{`
    @keyframes float {
      0%, 100% { transform: translateY(0) translateX(0); }
      25% { transform: translateY(-15px) translateX(8px); }
      50% { transform: translateY(-8px) translateX(-8px); }
      75% { transform: translateY(-20px) translateX(4px); }
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
      50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
    }
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes bounce-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes scale-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-morph { animation: morph 15s ease-in-out infinite; }
    .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
    .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
    .animate-gradient { animation: gradient-shift 8s ease infinite; background-size: 200% 200%; }
    .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
    .animate-spin-slow { animation: spin-slow 20s linear infinite; }
    .animate-scale-pulse { animation: scale-pulse 3s ease-in-out infinite; }
  `}</style>
);

// ========================================
// BACKGROUND COMPONENTS
// ========================================
const GradientOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 via-indigo-500/10 to-purple-400/10 rounded-full blur-3xl animate-morph" style={{ animationDuration: '20s' }}></div>
    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/10 via-teal-500/10 to-emerald-400/10 rounded-full blur-3xl animate-morph" style={{ animationDuration: '25s', animationDelay: '5s' }}></div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-violet-400/5 via-purple-500/5 to-pink-400/5 rounded-full blur-3xl animate-spin-slow"></div>
  </div>
);

const ParticleField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full animate-float"
        style={{
          width: `${4 + Math.random() * 6}px`,
          height: `${4 + Math.random() * 6}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][i % 5],
          opacity: 0.15 + Math.random() * 0.2,
          animationDelay: `${i * 0.4}s`,
          animationDuration: `${12 + Math.random() * 15}s`
        }}
      />
    ))}
  </div>
);

// ========================================
// ENHANCED LOADING COMPONENTS
// ========================================
const LoadingSpinner = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer rounded w-1/2"></div>
  </div>
);

const PremiumLoader = () => (
  <div className="relative w-16 h-16">
    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
    <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-cyan-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse flex items-center justify-center">
      <SparklesIcon className="w-4 h-4 text-white" />
    </div>
  </div>
);

// ========================================
// STAT CARD COMPONENT
// ========================================
const StatCard = ({ stat, index, isLoading }) => {
  const gradients = [
    { bg: 'from-blue-500 to-indigo-600', light: 'from-blue-50 to-indigo-50', icon: Activity },
    { bg: 'from-emerald-500 to-teal-600', light: 'from-emerald-50 to-teal-50', icon: ShieldCheck },
    { bg: 'from-amber-500 to-orange-600', light: 'from-amber-50 to-orange-50', icon: SparklesIcon },
    { bg: 'from-purple-500 to-pink-600', light: 'from-purple-50 to-pink-50', icon: StarIcon }
  ];
  const g = gradients[index % 4];
  const Icon = g.icon;

  return (
    <div className="group relative overflow-hidden backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${g.bg}`}></div>

      {/* Background decoration */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${g.light} rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`}></div>

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.bg} flex items-center justify-center shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${stat.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-xs font-bold`}>
            {stat.isPositive ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
            {stat.change}
          </div>
        </div>

        <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <p className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{stat.value}</p>
        )}

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${g.bg} transition-all duration-1000 ease-out`}
              style={{
                width: isLoading ? '0%' : `${Math.min(100, (index + 1) * 25)}%`,
                transitionDelay: `${index * 200}ms`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// QUICK ACTION CARD COMPONENT
// ========================================
const QuickActionCard = ({ action, onNavigate }) => {
  const gradients = {
    red: { bg: 'from-red-500 to-rose-600', light: 'from-red-50 to-rose-50', border: 'border-red-200/50', hover: 'hover:border-red-300' },
    amber: { bg: 'from-amber-500 to-orange-600', light: 'from-amber-50 to-orange-50', border: 'border-amber-200/50', hover: 'hover:border-amber-300' },
    green: { bg: 'from-emerald-500 to-teal-600', light: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/50', hover: 'hover:border-emerald-300' },
    blue: { bg: 'from-blue-500 to-indigo-600', light: 'from-blue-50 to-indigo-50', border: 'border-blue-200/50', hover: 'hover:border-blue-300' }
  };

  const colorKey = action.color.includes('red') ? 'red' : action.color.includes('amber') ? 'amber' : action.color.includes('green') ? 'green' : 'blue';
  const g = gradients[colorKey];

  return (
    <div
      className={`group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br ${g.light} border-2 ${g.border} ${g.hover} rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2`}
      onClick={() => onNavigate(action.path)}
      tabIndex={0}
      role="button"
    >
      {/* Animated background */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${g.bg} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>

      {/* Priority badge */}
      {action.priority === 'high' && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg animate-pulse">
            <FireIcon className="w-3 h-3" />
            Priority
          </span>
        </div>
      )}

      <div className="relative">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.bg} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
          <action.icon className="h-7 w-7 text-white" />
        </div>

        {/* Stats badge */}
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 shadow-sm mb-3">
          <SparklesIcon className="w-3 h-3 text-amber-500" />
          {action.stats}
        </div>

        <h3 className="font-bold text-gray-900 mb-2 text-lg">{action.title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{action.description}</p>

        {/* CTA */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 group-hover:text-gray-900">
          <span>Get Started</span>
          <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

>>>>>>> origin/main
// Enhanced Dashboard component with performance optimizations
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [stats, setStats] = useState({
    prescriptionsProcessed: 0,
    interactionsChecked: 0,
    costSavings: 0,
    accuracyRate: 0
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Simulated API call with loading state
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        prescriptionsProcessed: 1247,
        interactionsChecked: 8923,
        costSavings: 45600,
        accuracyRate: 98.7
      });
      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Memoized navigation handler
  const handleNavigation = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  // Memoized search handler
  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    // Implement search logic here
  }, []);

  // Memoized tab handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Logout handler
  const handleLogout = useCallback(() => {
    logout();
<<<<<<< HEAD
    navigate('/login');
  }, [logout, navigate]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };
    
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);
=======
    navigate('/');
  }, [logout, navigate]);

  // Close user menu when clicking outside
useEffect(() => {
  if (!showUserMenu) return;

  const onKeyDown = (e) => {
    if (e.key === "Escape") setShowUserMenu(false);
  };

  const onClick = () => setShowUserMenu(false);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("click", onClick);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("click", onClick);
  };
}, [showUserMenu]);
>>>>>>> origin/main

  // Memoized quick actions data for performance
  const quickActions = useMemo(() => [
    {
      id: 1,
      title: 'Drug Interaction Check',
      description: 'Check for potential drug interactions and allergies',
      icon: ShieldCheck,
      path: '/interaction-check',
      color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
      stats: `${stats.interactionsChecked.toLocaleString()} checks`,
      priority: 'high'
    },
    {
      id: 2,
<<<<<<< HEAD
      title: 'Personalized Advisory',
      description: 'Get AI-powered nutrition and lifestyle advice',
=======
      title: 'Drug & Food Interaction Check',
      description: 'Check for potential drug & food interactions quickly',
>>>>>>> origin/main
      icon: LightBulb,
      path: '/advisory',
      color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
      stats: 'AI-Powered',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Cross-Brand Comparator',
      description: 'Compare drug alternatives and costs',
      icon: Scale,
      path: '/comparator',
      color: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
      stats: 'Save up to 80%',
      priority: 'medium'
    },
    {
      id: 4,
      title: 'Prescription Interpreter',
      description: 'AI-powered handwritten prescription analysis',
      icon: DocumentText,
      path: '/prescription',
      color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
      stats: `${stats.accuracyRate}% accuracy`,
      priority: 'high'
    }
  ], [stats]);

  // Enhanced recent activity with better structure
  const recentActivity = useMemo(() => [
    {
      id: 1,
      type: 'prescription',
      description: 'Prescription processed for John Doe',
      time: '2 minutes ago',
      timestamp: Date.now() - 2 * 60 * 1000,
      status: 'success',
      icon: DocumentText,
      actionable: true
    },
    {
      id: 2,
      type: 'interaction',
      description: 'Drug interaction detected - High severity',
      time: '5 minutes ago',
      timestamp: Date.now() - 5 * 60 * 1000,
      status: 'warning',
      icon: ExclamationTriangleIcon,
      actionable: true,
      severity: 'high'
    },
    {
      id: 3,
      type: 'comparison',
      description: 'Cost savings identified: $45.00',
      time: '10 minutes ago',
      timestamp: Date.now() - 10 * 60 * 1000,
      status: 'success',
      icon: Scale,
      actionable: false
    },
    {
      id: 4,
      type: 'advisory',
      description: 'Nutrition advice generated for diabetes patient',
      time: '15 minutes ago',
      timestamp: Date.now() - 15 * 60 * 1000,
      status: 'success',
      icon: LightBulb,
      actionable: true
    }
  ], []);

  // Enhanced system metrics with trend icons
  const systemMetrics = useMemo(() => [
    { 
      name: 'API Response Time', 
      value: '124ms', 
      change: '+2.1%', 
      trend: 'up',
      icon: ArrowTrendingUpIcon,
      color: 'text-red-600', // Higher response time is bad
      bgColor: 'bg-red-50'
    },
    { 
      name: 'Model Accuracy', 
      value: '98.7%', 
      change: '+0.3%', 
      trend: 'up',
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      name: 'Uptime', 
      value: '99.9%', 
      change: '0.0%', 
      trend: 'stable',
      icon: MinusIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    { 
      name: 'Active Users', 
      value: '247', 
      change: '+12.4%', 
      trend: 'up',
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ], []);

  // Memoized stats for performance
  const formattedStats = useMemo(() => [
    { 
      label: 'Prescriptions Processed', 
      value: stats.prescriptionsProcessed.toLocaleString(), 
      change: '+12%',
      isPositive: true
    },
    { 
      label: 'Interactions Checked', 
      value: stats.interactionsChecked.toLocaleString(), 
      change: '+8%',
      isPositive: true
    },
    { 
      label: 'Cost Savings', 
      value: `$${stats.costSavings.toLocaleString()}`, 
      change: '+23%',
      isPositive: true
    },
    { 
      label: 'Accuracy Rate', 
      value: `${stats.accuracyRate}%`, 
      change: '+0.3%',
      isPositive: true
    }
  ], [stats]);

<<<<<<< HEAD
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => handleNavigation('/')}>
                <Activity className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Pharmalink</span>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8" role="navigation" aria-label="Main navigation">
                {['Overview', 'Analytics', 'Patients', 'Settings'].map((item) => (
                  <button
                    key={item}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      activeTab === item.toLowerCase()
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleTabChange(item.toLowerCase())}
=======
  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split("")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const roleLabel = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    if (!r) return "Healthcare Professional";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);
  
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Animation Styles */}
      <AnimationStyles />

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <GradientOrbs />
        <ParticleField />
      </div>

      {/* Enhanced Header with Glassmorphism */}
      <header className="sticky top-0 z-50">
        {/* Gradient Top Bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        <div className="backdrop-blur-xl bg-white/80 border-b border-white/50 shadow-lg shadow-black/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="shrink-0 flex items-center cursor-pointer group" onClick={() => handleNavigation('/')}>
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity"></div>
                    <BrandLogo />
                  </div>
                </div>
                <nav className="hidden md:flex items-center gap-1 ml-6" role="navigation" aria-label="Main navigation">
                  {['Overview', 'Analytics', 'Patients', 'Settings'].map((item) => (
                    <button
                      key={item}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === item.toLowerCase()
                        ? 'text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`}
                      onClick={() => handleTabChange(item.toLowerCase())}
>>>>>>> origin/main
                    aria-current={activeTab === item.toLowerCase() ? 'page' : undefined}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>
            
<<<<<<< HEAD
            <div className="flex items-center space-x-4">
=======
            <div className="flex items-center gap-3">
>>>>>>> origin/main
              <div className="relative hidden sm:block">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medications, patients..."
                  value={searchQuery}
                  onChange={handleSearch}
<<<<<<< HEAD
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 transition-all duration-200"
=======
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72 transition placeholder-gray-300 "
>>>>>>> origin/main
                  aria-label="Search medications and patients"
                />
              </div>
              <button 
                className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 bg-red-400 rounded-full animate-pulse"></span>
              </button>
              {/* User Menu */}
              <div className="relative">
<<<<<<< HEAD
                <button 
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  aria-label="User menu"
                >
                  <UserCircle className="h-8 w-8 text-gray-400" />
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-700">{user?.name || 'User'}</div>
                    <div className="text-xs text-gray-500">{user?.role || 'Healthcare Professional'}</div>
                  </div>
                  <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${
                    showUserMenu ? 'rotate-90' : ''
                  }`} />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-lg">
                            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user?.name || 'User'}</div>
                          <div className="text-sm text-gray-500">{user?.email || 'user@example.com'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <UserCircle className="h-4 w-4 mr-3" />
                        Profile Settings
                      </button>
                      <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <Cog6ToothIcon className="h-4 w-4 mr-3" />
                        Account Settings
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-2">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
=======
                {/* Trigger */}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu((s) => !s);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-bold text-sm">{initials}</span>
                  </div>
              
                  {/* Name + role */}
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold text-slate-900">{user?.name || "User"}</span>
                    <span className="text-xs text-slate-500">{roleLabel}</span>
                  </div>
              
                  {/* Chevron */}
                  <svg
                    className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              
                {/* Dropdown */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-3 w-[320px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Little caret */}
                    <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />
              
                    {/* Header */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
                          {initials}
                        </div>
              
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 truncate">{user?.name || "User"}</p>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Secure
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 truncate">{user?.email || "user@example.com"}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
                        </div>
                      </div>
                    </div>
              
                    {/* Menu items */}
                    <div className="p-2">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/profile"); // change route if needed
                        }}
                        role="menuitem"
                      >
                        <UserCircle className="h-5 w-5 text-slate-400" />
                        Profile
                      </button>
              
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/settings"); // change route if needed
                        }}
                        role="menuitem"
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-slate-400" />
                        Account settings
                      </button>
              
                      <div className="my-2 h-px bg-slate-200" />
              
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                        role="menuitem"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
>>>>>>> origin/main
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
<<<<<<< HEAD
=======
              
              </div>
>>>>>>> origin/main
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
<<<<<<< HEAD
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'doctor' && "Here's what's happening with your patients today."}
            {user?.role === 'pharmacist' && "Monitor prescriptions and drug interactions."}
            {user?.role === 'admin' && "Manage your healthcare platform operations."}
            {(!user?.role || user?.role === 'other') && "Welcome to your healthcare management dashboard."}
          </p>
        </div>

        {/* Enhanced Stats Grid with Loading States */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {formattedStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  )}
                </div>
                <div className="flex items-center ml-2">
                  <span className={`text-xs sm:text-sm font-medium ${
                    stat.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                      isLoading ? 'w-0' : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: isLoading ? '0%' : `${Math.min(100, (index + 1) * 25)}%`,
                      transitionDelay: `${index * 200}ms`
                    }}
                  ></div>
                </div>
              </div>
            </div>
=======
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Welcome Section */}
        <div className="mb-8 relative overflow-hidden backdrop-blur-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 text-xs font-bold bg-white/20 backdrop-blur-sm rounded-full">
                  👋 Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
                </span>
                <span className="px-3 py-1 text-xs font-bold bg-emerald-500/30 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-blue-100 text-lg max-w-xl">
                {user?.role === 'doctor' && "Here's what's happening with your patients today."}
                {user?.role === 'pharmacist' && "Monitor prescriptions and drug interactions."}
                {user?.role === 'admin' && "Manage your healthcare platform operations."}
                {(!user?.role || user?.role === 'other') && "Your healthcare command center is ready."}
              </p>
            </div>

            {/* Quick Stats in Welcome */}
            <div className="flex gap-4">
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[100px]">
                <p className="text-3xl font-black">{stats.prescriptionsProcessed.toLocaleString()}</p>
                <p className="text-xs text-blue-200 mt-1">Prescriptions</p>
              </div>
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[100px]">
                <p className="text-3xl font-black">{stats.accuracyRate}%</p>
                <p className="text-xs text-blue-200 mt-1">Accuracy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {formattedStats.map((stat, index) => (
            <StatCard key={index} stat={stat} index={index} isLoading={isLoading} />
>>>>>>> origin/main
          ))}
        </div>

        {/* Enhanced Quick Actions Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
<<<<<<< HEAD
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
=======
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <RocketLaunchIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-500">Jump right into key features</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
>>>>>>> origin/main
              <span>View all</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {quickActions.map((action) => (
<<<<<<< HEAD
              <div
                key={action.id}
                className={`bg-white rounded-xl shadow-sm border-2 ${action.color} p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                onClick={() => handleNavigation(action.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigation(action.path);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Navigate to ${action.title}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <action.icon className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden="true" />
                  <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white shadow-sm ${
                    action.priority === 'high' ? 'ring-2 ring-red-200' : ''
                  }`}>
                    {action.stats}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{action.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">{action.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs sm:text-sm font-medium text-current">Try now</span>
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  {action.priority === 'high' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Priority
                    </span>
                  )}
                </div>
              </div>
=======
              <QuickActionCard key={action.id} action={action} onNavigate={handleNavigation} />
>>>>>>> origin/main
            ))}
          </div>
        </div>

        {/* Enhanced Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Enhanced Recent Activity */}
<<<<<<< HEAD
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
                <span>View all</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                Array(4).fill(0).map((_, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 mt-2 bg-gray-200 rounded-full animate-pulse"></div>
                    <LoadingSpinner />
                  </div>
                ))
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                    activity.actionable ? 'hover:bg-gray-50 cursor-pointer' : ''
                  }`}>
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.status === 'success' ? 'bg-green-100' : 
                        activity.status === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <activity.icon className={`h-4 w-4 ${
                          activity.status === 'success' ? 'text-green-600' : 
                          activity.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        }`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900 flex-1">{activity.description}</p>
                        {activity.severity === 'high' && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    {activity.actionable && (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
=======
          <div className="relative overflow-hidden backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-xl p-6">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                    <p className="text-xs text-gray-500">Latest updates from your workspace</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <span>View all</span>
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  Array(4).fill(0).map((_, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${activity.actionable
                        ? 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-white cursor-pointer hover:shadow-md'
                        : 'bg-gray-50/50'
                        }`}
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${activity.status === 'success' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                        activity.status === 'warning' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                          'bg-gradient-to-br from-red-400 to-rose-500'
                        }`}>
                        <activity.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-semibold text-gray-900">{activity.description}</p>
                          {activity.severity === 'high' && (
                            <span className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full">
                              <FireIcon className="w-3 h-3" />
                              High
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {activity.time}
                        </p>
                      </div>
                      {activity.actionable && (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                      )}
                    </div>
                  ))
                )}
              </div>
>>>>>>> origin/main
            </div>
          </div>

          {/* Enhanced System Metrics */}
<<<<<<< HEAD
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">System Performance</h2>
            <div className="space-y-4">
              {systemMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.bgColor}`}>
                      <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                      {isLoading ? (
                        <div className="h-6 bg-gray-200 rounded w-16 mt-1 animate-pulse"></div>
                      ) : (
                        <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 ${metric.color}`}>
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Enhanced Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  {isLoading ? (
                    <div className="h-8 bg-blue-200 rounded w-8 mx-auto mb-2 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-blue-900">15</p>
                  )}
                  <p className="text-sm text-blue-700">Active Sessions</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  {isLoading ? (
                    <div className="h-8 bg-green-200 rounded w-8 mx-auto mb-2 animate-pulse"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-900">98%</p>
                  )}
                  <p className="text-sm text-green-700">Satisfaction</p>
=======
          <div className="relative overflow-hidden backdrop-blur-xl bg-white/80 border border-white/50 rounded-2xl shadow-xl p-6">
            {/* Background decoration */}
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <CpuChipIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">System Performance</h2>
                  <p className="text-xs text-gray-500">Real-time health metrics</p>
                </div>
              </div>

              <div className="space-y-3">
                {systemMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metric.bgColor} shadow-md`}>
                        <metric.icon className={`h-6 w-6 ${metric.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                        {isLoading ? (
                          <div className="h-7 bg-gray-200 rounded w-16 mt-1 animate-pulse"></div>
                        ) : (
                          <p className="text-2xl font-black text-gray-900">{metric.value}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${metric.trend === 'up' && metric.name !== 'API Response Time' ? 'bg-emerald-50 text-emerald-700' :
                      metric.trend === 'up' && metric.name === 'API Response Time' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                      <metric.icon className="w-4 h-4" />
                      <span className="text-sm font-bold">{metric.change}</span>
                    </div>
                  </div>
              ))}
              </div>

              {/* Enhanced Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
                    <div className="relative">
                      {isLoading ? (
                        <div className="h-10 bg-blue-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">15</p>
                      )}
                      <p className="text-xs font-semibold text-blue-700">Active Sessions</p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <div className="relative">
                      {isLoading ? (
                        <div className="h-10 bg-emerald-200 rounded w-12 mx-auto mb-2 animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">98%</p>
                      )}
                      <p className="text-xs font-semibold text-emerald-700">Satisfaction</p>
                    </div>
                  </div>
>>>>>>> origin/main
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Emergency Alert */}
<<<<<<< HEAD
        <div className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-800 flex items-center space-x-2">
                  <span>High Priority Alert</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
=======
        <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 border-2 border-red-200 rounded-2xl p-6 shadow-xl">
          {/* Animated background pulse */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg animate-bounce-subtle">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                  High Priority Alert
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
                    <FireIcon className="w-3 h-3" />
>>>>>>> origin/main
                    Urgent
                  </span>
                </h3>
                <button 
<<<<<<< HEAD
                  className="text-red-400 hover:text-red-600 transition-colors duration-200"
=======
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 transition-all"
>>>>>>> origin/main
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-red-700 mt-2">
<<<<<<< HEAD
                <strong>3 potential drug interactions</strong> detected in the last hour requiring immediate review.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button 
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  onClick={() => handleNavigation('/interaction-check')}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Review Interactions
                </button>
                <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                  View Details →
=======
                <strong className="text-red-800">3 potential drug interactions</strong> detected in the last hour requiring immediate review.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button 
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  onClick={() => handleNavigation('/interaction-check')}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Review Interactions
                </button>
                <button className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                  View Details
                  <ChevronRightIcon className="w-4 h-4" />
>>>>>>> origin/main
                </button>
              </div>
            </div>
          </div>
        </div>
<<<<<<< HEAD
=======

        {/* Enhanced Footer */}
        <footer className="mt-auto print:hidden relative">
          {/* Gradient Top Border */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

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

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Main Footer Content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Brand Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur opacity-50"></div>
                      <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">PharmaLink</h3>
                      <p className="text-xs text-gray-400">Drug Interaction Checker</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Advanced AI-powered platform for checking drug interactions, ensuring medication safety with real-time clinical data analysis.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      System Online
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      🔒 HIPAA Compliant
                    </span>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h4>
                  <ul className="space-y-2">
                    {[
                      { label: 'Check Interactions', icon: '💊' },
                      { label: 'View History', icon: '📋' },
                      { label: 'Saved Results', icon: '⭐' },
                      { label: 'Clinical Resources', icon: '📚' }
                    ].map((link) => (
                      <li key={link.label}>
                        <a href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
                          <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
                          {link.label}
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Safety Notice */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Medical Disclaimer</h4>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        This tool is for <span className="text-amber-400 font-semibold">informational purposes only</span>. Always consult a qualified healthcare professional before making any medical decisions.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">FDA Database</span>
                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">DrugBank</span>
                    <span className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-gray-400">Clinical Trials</span>
                  </div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>© {new Date().getFullYear()} PharmaLink.</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">All rights reserved.</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Research & Educational Use Only</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      v2.0.0
                    </span>
                    <span className="text-xs text-gray-500">Made with ❤️ by PharmaLink Team</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
>>>>>>> origin/main
      </main>
    </div>
  );
};

// Wrapped component with Suspense for better loading experience
const DashboardWithSuspense = () => (
  <Suspense fallback={
<<<<<<< HEAD
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
=======
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
      <div className="text-center">
        <PremiumLoader />
        <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
>>>>>>> origin/main
      </div>
    </div>
  }>
    <Dashboard />
  </Suspense>
);

export default DashboardWithSuspense;

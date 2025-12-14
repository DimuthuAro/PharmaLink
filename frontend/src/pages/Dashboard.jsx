import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
import BrandLogo from '../components/brandLogo.jsx';
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
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Loading component for better UX
const LoadingSpinner = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
  </div>
);

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
    navigate('/');
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
      title: 'Drug & Food Interaction Check',
      description: 'Check for potential drug & food interactions quickly',
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="shrink-0 flex items-center cursor-pointer" onClick={() => handleNavigation('/')}>
                <BrandLogo/>
              </div>
              <nav className="hidden md:flex items-center gap-2 ml-6" role="navigation" aria-label="Main navigation">
                {['Overview', 'Analytics', 'Patients', 'Settings'].map((item) => (
                  <button
                    key={item}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      activeTab === item.toLowerCase()
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleTabChange(item.toLowerCase())}
                    aria-current={activeTab === item.toLowerCase() ? 'page' : undefined}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medications, patients..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72 transition placeholder-gray-300 "
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
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
          ))}
        </div>

        {/* Enhanced Quick Actions Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
              <span>View all</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {quickActions.map((action) => (
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
            ))}
          </div>
        </div>

        {/* Enhanced Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Enhanced Recent Activity */}
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
                    <div className="shrink-0">
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
                      <ChevronRightIcon className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enhanced System Metrics */}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Emergency Alert */}
        <div className="mt-8 bg-linear-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-800 flex items-center space-x-2">
                  <span>High Priority Alert</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Urgent
                  </span>
                </h3>
                <button 
                  className="text-red-400 hover:text-red-600 transition-colors duration-200"
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-red-700 mt-2">
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
                </button>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <span>© {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
          <span>Always consult a qualified healthcare professional.</span>
        </footer>
      </main>
    </div>
  );
};

// Wrapped component with Suspense for better loading experience
const DashboardWithSuspense = () => (
  <Suspense fallback={
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  }>
    <Dashboard />
  </Suspense>
);

export default DashboardWithSuspense;

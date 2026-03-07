import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';

import { 
  ShieldCheckIcon as ShieldCheck, 
  LightBulbIcon as LightBulb, 
  ScaleIcon as Scale, 
  DocumentTextIcon as DocumentText,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
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
  const [isLoading, setIsLoading] = useState(true);
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



  // Memoized quick actions data for performance
  const quickActions = useMemo(() => [
    {
      id: 1,
      title: 'Drug Interaction Check',
      description: 'Check for potential drug interactions and allergies',
      icon: ShieldCheck,
      path: '/interaction-check',
      color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50',
      stats: `${stats.interactionsChecked.toLocaleString()} checks`,
      priority: 'high'
    },
    {
      id: 2,
      title: 'Drug & Food Interaction Check',
      description: 'Check for potential drug & food interactions quickly',
      icon: LightBulb,
      path: '/advisory',
      color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50',
      stats: 'AI-Powered',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Cross-Brand Comparator',
      description: 'Compare drug alternatives and costs',
      icon: Scale,
      path: '/comparator',
      color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/50',
      stats: 'Save up to 80%',
      priority: 'medium'
    },
    {
      id: 4,
      title: 'Prescription Interpreter',
      description: 'AI-powered handwritten prescription analysis',
      icon: DocumentText,
      path: '/prescription',
      color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50',
      stats: `${stats.accuracyRate}% accuracy`,
      priority: 'high'
    },
    {
      id: 5,
      title: 'Treatment Identifier',
      description: 'Identify conditions & treatments from medications',
      icon: ClipboardDocumentListIcon,
      path: '/treatment-identifier',
      color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
      stats: 'AI-Powered',
      priority: 'medium'
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
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {user?.role === 'patient' && "Track your prescriptions and medication interactions."}
          {user?.role === 'pharmacist' && "Monitor prescriptions and drug interactions."}
          {user?.role === 'admin' && "Manage your healthcare platform operations."}
          {(!user?.role || user?.role === 'other') && "Welcome to your healthcare management dashboard."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {formattedStats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                )}
              </div>
              <div className="flex items-center ml-2">
                <span className={`text-xs sm:text-sm font-medium ${stat.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${isLoading ? 'w-0' : 'bg-indigo-600 dark:bg-indigo-500'}`}
                  style={{ width: isLoading ? '0%' : `${Math.min(100, (index + 1) * 25)}%`, transitionDelay: `${index * 200}ms` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {quickActions.map((action) => (
            <div
              key={action.id}
              className={`rounded-xl shadow-sm border-2 ${action.color} p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
              onClick={() => handleNavigation(action.path)}
              tabIndex={0}
              role="button"
              aria-label={`Navigate to ${action.title}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigation(action.path); } }}
            >
              <div className="flex items-center justify-between mb-4">
                <action.icon className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white dark:bg-gray-800 shadow-sm">{action.stats}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">{action.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">{action.description}</p>
              <div className="flex items-center space-x-1">
                <span className="text-xs sm:text-sm font-medium">Try now</span>
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {isLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <LoadingSpinner />
                </div>
              ))
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg transition-colors duration-200 ${activity.actionable ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : ''}`}>
                  <div className="shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/40' :
                        activity.status === 'warning' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'
                      }`}>
                      <activity.icon className={`h-4 w-4 ${
                        activity.status === 'success' ? 'text-green-600 dark:text-green-400' :
                          activity.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                        }`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">System Performance</h2>
          <div className="space-y-4">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${metric.bgColor}`}>
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{metric.name}</p>
                    {isLoading ? (
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 mt-1 animate-pulse"></div>
                    ) : (
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-medium ${metric.color}`}>{metric.change}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">15</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">Active Sessions</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <p className="text-2xl font-bold text-green-900 dark:text-green-300">98%</p>
                <p className="text-sm text-green-700 dark:text-green-400">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Alert */}
      <div className="mt-8 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 dark:text-red-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">High Priority Alert</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              <strong>3 potential drug interactions</strong> detected in the last hour requiring immediate review.
            </p>
            <button 
              className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-700 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              onClick={() => handleNavigation('/interaction-check')}
            >
              <ShieldCheck className="h-4 w-4 mr-2" /> Review Interactions
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-10 mb-4 text-[11px] text-slate-500 dark:text-gray-600 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-gray-800 pt-3">
        <span>&copy; {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
        <span>Always consult a qualified healthcare professional.</span>
      </footer>
    </div>
  );
};

const DashboardWithSuspense = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  }>
    <Dashboard />
  </Suspense>
);

export default DashboardWithSuspense;

export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (percentage) => {
  return `${percentage.toFixed(1)}%`;
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-100';
    case 'warning':
      return 'text-amber-600 bg-amber-100';
    case 'error':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getTrendIcon = (trend) => {
  switch (trend) {
    case 'up':
      return '↗';
    case 'down':
      return '↘';
    case 'stable':
      return '→';
    default:
      return '-';
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// API simulation functions
export const fetchDashboardStats = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    prescriptionsProcessed: Math.floor(Math.random() * 1000) + 1000,
    interactionsChecked: Math.floor(Math.random() * 5000) + 8000,
    costSavings: Math.floor(Math.random() * 20000) + 40000,
    accuracyRate: 98.0 + Math.random() * 1.5
  };
};

export const fetchRecentActivity = async () => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const activities = [
    'Prescription processed',
    'Drug interaction detected',
    'Cost savings identified',
    'Nutrition advice generated',
    'Patient alert created',
    'Report generated'
  ];
  
  const patients = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Carol Brown'];
  
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    description: `${activities[Math.floor(Math.random() * activities.length)]} for ${patients[Math.floor(Math.random() * patients.length)]}`,
    time: `${(i + 1) * 5} minutes ago`,
    status: ['success', 'warning', 'success'][Math.floor(Math.random() * 3)],
    actionable: Math.random() > 0.3
  }));
};

export const validateSearchQuery = (query) => {
  return query.trim().length >= 2;
};
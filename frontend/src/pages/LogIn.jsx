import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
  ChartBarIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const LogIn = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      alert('Account temporarily locked. Please try again later.');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic
      const { email, password } = formData;
      
      // Demo credentials
      const validCredentials = [
        { email: 'doctor@pharmalink.com', password: 'pharma123', role: 'doctor', name: 'Dr. Sarah Smith' },
        { email: 'admin@pharmalink.com', password: 'admin123', role: 'admin', name: 'Admin User' },
        { email: 'pharmacist@pharmalink.com', password: 'pharma123', role: 'pharmacist', name: 'John Pharmacist' }
      ];
      
      const user = validCredentials.find(
        cred => cred.email === email && cred.password === password
      );
      
      if (user) {
        // Successful login
        login({
          id: Date.now(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: null,
          lastLogin: new Date().toISOString()
        });
        
        // Save remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('pharmalink_remember', 'true');
          localStorage.setItem('pharmalink_email', email);
        }
        
        navigate('/dashboard');
      } else {
        // Failed login
        setLoginAttempts(prev => prev + 1);
        
        if (loginAttempts >= 2) {
          setIsLocked(true);
          setTimeout(() => setIsLocked(false), 30000); // 30 seconds lockout
          setErrors({ general: 'Too many failed attempts. Account locked for 30 seconds.' });
        } else {
          setErrors({ general: 'Invalid email or password. Please try again.' });
        }
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again later.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = (type) => {
    const credentials = {
      doctor: { email: 'doctor@pharmalink.com', password: 'pharma123' },
      admin: { email: 'admin@pharmalink.com', password: 'admin123' },
      pharmacist: { email: 'pharmacist@pharmalink.com', password: 'pharma123' }
    };
    
    setFormData(prev => ({
      ...prev,
      ...credentials[type]
    }));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Pharmalink
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your healthcare management platform
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h3>
          <div className="space-y-2 text-xs">
            <button
              onClick={() => fillDemoCredentials('doctor')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Doctor:</strong> doctor@pharmalink.com / pharma123
            </button>
            <button
              onClick={() => fillDemoCredentials('admin')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Admin:</strong> admin@pharmalink.com / admin123
            </button>
            <button
              onClick={() => fillDemoCredentials('pharmacist')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Pharmacist:</strong> pharmacist@pharmalink.com / pharma123
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm">{errors.general}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition-all duration-200 ${
                isLoading || isLocked
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <LockClosedIcon className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                )}
              </span>
              {isLoading ? 'Signing in...' : isLocked ? 'Account Locked' : 'Sign in'}
            </button>
          </form>

          {/* Additional Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Pharmalink?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                Create an account
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-x-4 text-sm">
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
            Terms of Service
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/help" className="text-gray-500 hover:text-gray-700 transition-colors">
            Help
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LogIn;

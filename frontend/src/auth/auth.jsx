import { createContext, useContext, useState, useEffect } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for existing session
    const savedAuth = localStorage.getItem('pharmalink_auth');
    return savedAuth ? JSON.parse(savedAuth) : false;
  });
  
  const [user, setUser] = useState(() => {
    // Check localStorage for user data
    const savedUser = localStorage.getItem('pharmalink_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    
    // Persist to localStorage
    localStorage.setItem('pharmalink_auth', 'true');
    localStorage.setItem('pharmalink_user', JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('pharmalink_auth');
    localStorage.removeItem('pharmalink_user');
    localStorage.removeItem('pharmalink_remember');
    localStorage.removeItem('pharmalink_email');
  };

  const contextValue = {
    isAuthenticated,
    setIsAuthenticated,
    user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

const UnauthorizedComponent = () => {
  useEffect(() => {
    // Redirect to login after a short delay
    const timer = setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">You need to log in to access this page.</p>
        <p className="text-sm text-gray-500">Redirecting to login page...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Unauthorized />;
}

const createProtectedRoutes = (routes) => {
  return routes.map(route => ({
    path: route.path,
    element: <ProtectedRoute element={route.element} />
  }));
}

export { AuthProvider, createProtectedRoutes };

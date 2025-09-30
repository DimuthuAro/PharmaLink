// Custom hooks for the Dashboard component
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboardStats, fetchRecentActivity, debounce } from '../utils/dashboardUtils.js';

// Custom hook for dashboard data fetching
export const useDashboardData = () => {
  const [stats, setStats] = useState({
    prescriptionsProcessed: 0,
    interactionsChecked: 0,
    costSavings: 0,
    accuracyRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return { stats, isLoading, error, refetch: fetchData };
};

// Custom hook for recent activity
export const useRecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsLoading(true);
        const data = await fetchRecentActivity();
        setActivities(data);
      } catch (err) {
        console.error('Failed to load activities:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, []);

  return { activities, isLoading };
};

// Custom hook for search functionality
export const useSearch = (initialValue = '') => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock search results
        const mockResults = [
          { id: 1, type: 'medication', name: 'Aspirin 81mg', category: 'Pain Relief' },
          { id: 2, type: 'patient', name: 'John Doe', category: 'Diabetes' },
          { id: 3, type: 'medication', name: 'Metformin 500mg', category: 'Diabetes' }
        ].filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setResults(mockResults);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearch = useCallback((newQuery) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  return {
    query,
    results,
    isSearching,
    handleSearch
  };
};

// Custom hook for local storage
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

// Custom hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts) => {
  const shortcutsRef = useRef(shortcuts);
  
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key, ctrlKey, altKey, shiftKey } = event;
      const shortcut = shortcutsRef.current.find(s => 
        s.key === key && 
        s.ctrl === ctrlKey && 
        s.alt === altKey && 
        s.shift === shiftKey
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};

// Custom hook for window size
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const TownContext = createContext(null);

export const useTown = () => {
  const context = useContext(TownContext);
  if (!context) {
    throw new Error('useTown must be used within a TownProvider');
  }
  return context;
};

export const TownProvider = ({ children }) => {
  const [towns, setTowns] = useState([]);
  const [selectedTown, setSelectedTown] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load towns on mount
  useEffect(() => {
    fetchTowns();
    
    // Load selected town from localStorage
    const savedTown = localStorage.getItem('selectedTown');
    if (savedTown) {
      try {
        setSelectedTown(JSON.parse(savedTown));
      } catch (e) {
        localStorage.removeItem('selectedTown');
      }
    }
  }, []);

  const fetchTowns = async () => {
    try {
      const response = await axios.get(`${API_URL}/towns`);
      setTowns(response.data.towns || []);
    } catch (error) {
      console.error('Failed to fetch towns:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTown = (town) => {
    setSelectedTown(town);
    if (town) {
      localStorage.setItem('selectedTown', JSON.stringify(town));
    } else {
      localStorage.removeItem('selectedTown');
    }
  };

  const clearTown = () => {
    setSelectedTown(null);
    localStorage.removeItem('selectedTown');
  };

  // Get town filter for API calls
  const getTownFilter = () => {
    if (!selectedTown) return {};
    return { town: selectedTown.id };
  };

  // Get town ID for API calls
  const getTownId = () => {
    return selectedTown?.id || null;
  };

  const value = {
    towns,
    selectedTown,
    loading,
    selectTown,
    clearTown,
    getTownFilter,
    getTownId,
    refreshTowns: fetchTowns
  };

  return (
    <TownContext.Provider value={value}>
      {children}
    </TownContext.Provider>
  );
};

export default TownContext;

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
  const [townRequired, setTownRequired] = useState(false);

  // Load towns on mount
  useEffect(() => {
    fetchTowns();
    
    // Load selected town from localStorage
    const savedTown = localStorage.getItem('selectedTown');
    if (savedTown) {
      try {
        const town = JSON.parse(savedTown);
        setSelectedTown(town);
        setTownRequired(false);
      } catch (e) {
        localStorage.removeItem('selectedTown');
        setTownRequired(true);
      }
    }
  }, []);

  const fetchTowns = async () => {
    try {
      const response = await axios.get(`${API_URL}/towns`);
      const townList = response.data.towns || [];
      setTowns(townList);
      
      // If towns exist but none selected, require selection
      if (townList.length > 0 && !localStorage.getItem('selectedTown')) {
        setTownRequired(true);
      }
    } catch (error) {
      console.error('Failed to fetch towns:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTown = (town) => {
    setSelectedTown(town);
    setTownRequired(false);
    if (town) {
      localStorage.setItem('selectedTown', JSON.stringify(town));
    } else {
      localStorage.removeItem('selectedTown');
    }
  };

  const clearTown = () => {
    setSelectedTown(null);
    localStorage.removeItem('selectedTown');
    setTownRequired(true);
  };

  // Check if town context is valid for API calls
  const hasTownContext = () => {
    return selectedTown !== null;
  };

  // Get town ID for API calls
  const getTownId = () => {
    return selectedTown?.id || null;
  };

  // Get town code for API calls
  const getTownCode = () => {
    return selectedTown?.code || null;
  };

  // Add town header to axios requests
  const getTownHeaders = () => {
    if (!selectedTown) return {};
    return {
      'X-Town-ID': selectedTown.id,
      'X-Town-Code': selectedTown.code
    };
  };

  const value = {
    towns,
    selectedTown,
    loading,
    townRequired,
    selectTown,
    clearTown,
    hasTownContext,
    getTownId,
    getTownCode,
    getTownHeaders,
    refreshTowns: fetchTowns
  };

  return (
    <TownContext.Provider value={value}>
      {children}
    </TownContext.Provider>
  );
};

export default TownContext;

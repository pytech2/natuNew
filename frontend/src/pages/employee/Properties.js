import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeLayout from '../../components/EmployeeLayout';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  MapPin, Navigation, FileText, Loader2, RefreshCw, 
  Compass, LocateFixed, Search, X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Create a GeoJSON circle polygon for 100m radius
const createCircleGeoJSON = (centerLat, centerLng, radiusMeters = 100, points = 64) => {
  const coords = [];
  const distanceX = radiusMeters / (111320 * Math.cos(centerLat * Math.PI / 180));
  const distanceY = radiusMeters / 110540;
  
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = centerLng + (distanceX * Math.cos(theta));
    const y = centerLat + (distanceY * Math.sin(theta));
    coords.push([x, y]);
  }
  coords.push(coords[0]); // Close the polygon
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
};

// Calculate distance (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const formatDistance = (meters) => meters < 1000 ? `${Math.round(meters)}m` : `${(meters/1000).toFixed(1)}km`;

// Marker colors based on status and distance
const getMarkerColor = (status, distance = null) => {
  // If within 100m, show BLUE color (reachable)
  if (distance !== null && distance <= 100) {
    return '#3b82f6'; // Blue - within reach
  }
  
  const colors = {
    'Pending': '#ef4444',
    'Completed': '#22c55e',
    'Approved': '#22c55e',
    'In Progress': '#eab308',
    'Rejected': '#f97316',
  };
  return colors[status] || '#ef4444';
};

// Check if property is within 100m reach
const isWithinReach = (distance) => distance !== null && distance <= 100;

export default function Properties() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // GPS & Map state
  const [userLocation, setUserLocation] = useState(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: 29.9695,
    longitude: 76.8783,
    zoom: 17,
    bearing: 0, // This is the rotation!
    pitch: 0
  });
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  // Restore saved position
  useEffect(() => {
    const savedPosition = localStorage.getItem('surveyor_map_position');
    if (savedPosition) {
      try {
        const { lat, lng, zoom, bearing } = JSON.parse(savedPosition);
        setViewState(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          zoom: zoom || 17,
          bearing: bearing || 0
        }));
      } catch (e) {
        console.log('Could not restore map position');
      }
    }
  }, []);

  // Fetch ALL properties - NO LIMIT
  useEffect(() => {
    fetchProperties();
    startGPSTracking();
    startCompass();
    
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const fetchProperties = async () => {
    try {
      // NO LIMIT - fetch ALL assigned properties
      const response = await axios.get(`${API_URL}/map/employee-properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const props = response.data.properties || [];
      setAllProperties(props);
      
      const pending = props.filter(p => p.status === 'Pending').length;
      const completed = props.filter(p => ['Completed', 'Approved', 'In Progress'].includes(p.status)).length;
      setStats({ total: props.length, pending, completed });
      
      // Set initial center if no saved position
      const savedPosition = localStorage.getItem('surveyor_map_position');
      if (!savedPosition && props.length > 0) {
        const firstWithGPS = props.find(p => p.latitude && p.longitude);
        if (firstWithGPS) {
          setViewState(prev => ({
            ...prev,
            latitude: firstWithGPS.latitude,
            longitude: firstWithGPS.longitude
          }));
        }
      }
      
      toast.success(`Loaded ${props.length} properties`);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const startGPSTracking = () => {
    if (!navigator.geolocation) return;
    setGpsTracking(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        const savedPosition = localStorage.getItem('surveyor_map_position');
        if (!savedPosition) {
          setViewState(prev => ({
            ...prev,
            latitude: loc.lat,
            longitude: loc.lng
          }));
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000 }
    );
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation(prev => {
          if (prev) {
            const dist = calculateDistance(prev.lat, prev.lng, pos.coords.latitude, pos.coords.longitude);
            if (dist < 30) return prev;
          }
          return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 60000 }
    );
  };

  const startCompass = () => {
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permission => {
            if (permission === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
  };

  const handleOrientation = useCallback((event) => {
    let heading = event.webkitCompassHeading || (event.alpha !== null ? (360 - event.alpha) % 360 : null);
    if (heading !== null && heading !== undefined) {
      setDeviceHeading(Math.round(heading));
      if (autoRotate) {
        setViewState(prev => ({ ...prev, bearing: heading }));
      }
    }
  }, [autoRotate]);

  // Save position on map move
  const onMoveEnd = useCallback(() => {
    localStorage.setItem('surveyor_map_position', JSON.stringify({
      lat: viewState.latitude,
      lng: viewState.longitude,
      zoom: viewState.zoom,
      bearing: viewState.bearing
    }));
  }, [viewState]);

  const refreshLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setViewState(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        toast.success('Location updated!');
      },
      () => toast.error('Location failed'),
      { enableHighAccuracy: true }
    );
  };

  const toggleAutoRotate = () => {
    if (!autoRotate) {
      setAutoRotate(true);
      setViewState(prev => ({ ...prev, bearing: deviceHeading }));
      toast.success('Auto-rotate ON - follows compass');
    } else {
      setAutoRotate(false);
      toast.info('Auto-rotate OFF');
    }
  };

  const resetNorth = () => {
    setViewState(prev => ({ ...prev, bearing: 0 }));
    setAutoRotate(false);
    toast.info('Reset to North');
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    const searchLower = query.toLowerCase().trim();
    
    // Search by property_id, bill_sr_no, serial_number, owner_name, mobile
    const results = allProperties.filter(p => {
      const propertyId = (p.property_id || '').toLowerCase();
      const billSrNo = String(p.bill_sr_no || '').toLowerCase();
      const serialNo = String(p.serial_number || '').toLowerCase();
      const ownerName = (p.owner_name || '').toLowerCase();
      const mobile = (p.mobile || '').toLowerCase();
      
      return propertyId.includes(searchLower) ||
             billSrNo.includes(searchLower) ||
             serialNo.includes(searchLower) ||
             ownerName.includes(searchLower) ||
             mobile.includes(searchLower);
    }).slice(0, 10); // Limit to 10 results
    
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const selectSearchResult = (property) => {
    // Center map on selected property
    setViewState(prev => ({
      ...prev,
      latitude: property.latitude,
      longitude: property.longitude,
      zoom: 19
    }));
    
    // Select the property to show popup
    setSelectedProperty(property);
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    
    toast.success(`Found: ${property.owner_name}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Filter and sort by distance
  const sortedProperties = useMemo(() => {
    let props = [...allProperties].filter(p => p.latitude && p.longitude);
    
    if (userLocation) {
      props = props.map(p => ({
        ...p,
        distance: calculateDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
      }));
      props.sort((a, b) => {
        const statusOrder = { 'Pending': 0, 'Rejected': 1, 'In Progress': 2, 'Completed': 3, 'Approved': 4 };
        if ((statusOrder[a.status] || 0) !== (statusOrder[b.status] || 0)) {
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        }
        return (a.distance || Infinity) - (b.distance || Infinity);
      });
    }
    
    return props;
  }, [allProperties, userLocation]);

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
            <p className="text-white mt-4">Loading Map...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      {/* FULLSCREEN MAP with native 360° rotation */}
      <div className="fixed inset-0 z-0">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onMoveEnd={onMoveEnd}
          style={{ width: '100%', height: '100%' }}
          mapStyle={{
            version: 8,
            sources: {
              'satellite': {
                type: 'raster',
                tiles: [
                  'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                ],
                tileSize: 256,
                maxzoom: 21
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite',
                minzoom: 0,
                maxzoom: 21
              }
            ]
          }}
          maxZoom={21}
          minZoom={10}
          touchZoomRotate={true}
          touchPitch={false}
          dragRotate={true}
          pitchWithRotate={false}
        >
          {/* 100m Radius Circle around user location */}
          {userLocation && (
            <Source 
              id="radius-circle" 
              type="geojson" 
              data={createCircleGeoJSON(userLocation.lat, userLocation.lng, 100)}
            >
              {/* Fill layer - semi-transparent blue */}
              <Layer
                id="radius-fill"
                type="fill"
                paint={{
                  'fill-color': '#3b82f6',
                  'fill-opacity': 0.2
                }}
              />
              {/* Border layer - solid blue */}
              <Layer
                id="radius-border"
                type="line"
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 3,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}
          
          {/* User GPS dot marker - on top */}
          {userLocation && (
            <Marker 
              latitude={userLocation.lat} 
              longitude={userLocation.lng}
              anchor="center"
            >
              <div className="relative">
                {/* Outer pulsing ring */}
                <div className="absolute -inset-6 bg-blue-500/20 rounded-full animate-ping" />
                {/* Middle glow ring */}
                <div className="absolute -inset-3 bg-blue-400/30 rounded-full" />
                {/* Inner solid dot */}
                <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </Marker>
          )}
          
          {/* Property markers - render ALL */}
          {sortedProperties.map((property, index) => {
            const withinReach = isWithinReach(property.distance);
            const markerColor = getMarkerColor(property.status, property.distance);
            
            return (
            <Marker
              key={property.id}
              latitude={property.latitude}
              longitude={property.longitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedProperty(property);
              }}
            >
              <div 
                className={`flex items-center justify-center rounded-full border-2 shadow-lg cursor-pointer transition-transform hover:scale-110 ${
                  withinReach 
                    ? 'w-10 h-10 border-white animate-pulse' 
                    : index === 0 && userLocation 
                      ? 'w-10 h-10 border-white animate-pulse' 
                      : 'w-8 h-8 border-white'
                }`}
                style={{ 
                  backgroundColor: markerColor,
                  boxShadow: withinReach ? '0 0 15px rgba(59, 130, 246, 0.8)' : undefined
                }}
              >
                <span className="text-white text-xs font-bold">
                  {property.bill_sr_no || property.serial_number || (index + 1)}
                </span>
              </div>
            </Marker>
          )})}
          
          {/* Popup for selected property - Detailed Card View */}
          {selectedProperty && (
            <Popup
              latitude={selectedProperty.latitude}
              longitude={selectedProperty.longitude}
              anchor="bottom"
              onClose={() => setSelectedProperty(null)}
              closeButton={true}
              closeOnClick={false}
              maxWidth="320px"
            >
              <div className="min-w-[280px]">
                {/* Header with Bill Serial Number */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-amber-700 font-medium">BILL SERIAL NUMBER</div>
                      <div className="text-3xl font-bold text-red-500">
                        {selectedProperty.bill_sr_no || selectedProperty.serial_number || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Property ID</div>
                      <div className="text-sm font-semibold text-blue-600">{selectedProperty.property_id}</div>
                    </div>
                  </div>
                </div>
                
                {/* Property Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Owner</div>
                    <div className="font-semibold text-gray-900">{selectedProperty.owner_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Mobile</div>
                    {selectedProperty.mobile ? (
                      <a href={`tel:${selectedProperty.mobile}`} className="font-semibold text-blue-600 underline">
                        {selectedProperty.mobile}
                      </a>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Colony</div>
                    <div className="font-medium text-gray-800">{selectedProperty.colony || selectedProperty.ward || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Category</div>
                    <div className="font-medium text-gray-800">{selectedProperty.category || 'Residential'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Area</div>
                    <div className="font-medium text-gray-800">{selectedProperty.total_area || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Amount</div>
                    <div className="font-bold text-red-600">₹{selectedProperty.amount || '0'}</div>
                  </div>
                </div>
                
                {/* Address */}
                {selectedProperty.address && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="text-sm text-gray-800">{selectedProperty.address}</div>
                  </div>
                )}
                
                {/* GPS & Distance */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-blue-500">GPS Coordinates</div>
                    <div className="text-xs font-mono text-gray-600">
                      {selectedProperty.latitude?.toFixed(6)}, {selectedProperty.longitude?.toFixed(6)}
                    </div>
                  </div>
                  {selectedProperty.distance && (
                    <div className="text-right">
                      <div className="text-xs text-emerald-600">Distance</div>
                      <div className="font-bold text-emerald-700">{formatDistance(selectedProperty.distance)}</div>
                    </div>
                  )}
                </div>
                
                {/* Status Badge */}
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedProperty.status === 'Pending' ? 'bg-red-100 text-red-700' : 
                    selectedProperty.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedProperty.status}
                  </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                    onClick={() => {
                      localStorage.setItem('surveyor_map_position', JSON.stringify({
                        lat: selectedProperty.latitude,
                        lng: selectedProperty.longitude,
                        zoom: viewState.zoom,
                        bearing: viewState.bearing
                      }));
                      navigate(`/employee/survey/${selectedProperty.id}`);
                    }}
                    data-testid="survey-btn"
                  >
                    <FileText className="w-4 h-4" />
                    Survey
                  </button>
                  <button 
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedProperty.latitude},${selectedProperty.longitude}`, '_blank')}
                    data-testid="navigate-btn"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* FIXED UI OVERLAY */}
      <div className="fixed inset-0 z-[1000] pointer-events-none">
        {/* TOP STATUS BAR */}
        <div className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white px-4 py-3 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {gpsTracking && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400">GPS</span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="text-red-400 font-bold">{stats.pending}</span>
                <span className="text-slate-400"> pending</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-green-400 font-bold">{stats.completed}</span>
                <span className="text-slate-400"> done</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Rotation indicator */}
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${autoRotate ? 'bg-green-600' : 'bg-slate-800'}`}
                onClick={toggleAutoRotate}
              >
                <Compass 
                  className="w-5 h-5 text-white"
                  style={{ transform: `rotate(${viewState.bearing}deg)`, transition: 'transform 0.15s ease-out' }}
                />
                <span className="text-xs font-mono">{Math.round(viewState.bearing)}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="absolute top-14 left-3 right-3 pointer-events-auto">
          <div className="relative">
            <div className="flex items-center bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="pl-4">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search Property ID, Serial No, Name..."
                className="flex-1 px-3 py-3 text-gray-800 placeholder-gray-400 outline-none text-sm"
                data-testid="property-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="pr-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
                {searchResults.map((property, index) => (
                  <div
                    key={property.id}
                    onClick={() => selectSearchResult(property)}
                    className={`px-4 py-3 cursor-pointer hover:bg-blue-50 flex items-center gap-3 ${index !== searchResults.length - 1 ? 'border-b border-gray-100' : ''}`}
                    data-testid={`search-result-${index}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getMarkerColor(property.status) }}
                    >
                      {property.bill_sr_no || property.serial_number || '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{property.owner_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="font-mono">{property.property_id}</span>
                        <span>•</span>
                        <span>{property.colony}</span>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      property.status === 'Pending' ? 'bg-red-100 text-red-700' : 
                      property.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {property.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No results message */}
            {showSearchResults && searchResults.length === 0 && searchQuery.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg p-4 text-center text-gray-500 text-sm">
                No properties found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* MAP CONTROLS - Right Side */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
          {/* Center on Location */}
          <Button
            size="sm"
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
            onClick={refreshLocation}
            title="My location"
          >
            <LocateFixed className="w-6 h-6" />
          </Button>
          
          {/* Auto Rotate Toggle */}
          <Button
            size="sm"
            className={`w-12 h-12 rounded-full shadow-lg ${autoRotate ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            onClick={toggleAutoRotate}
            title="Auto-rotate with compass"
          >
            <Compass className="w-6 h-6" />
          </Button>
          
          {/* Reset North */}
          {Math.round(viewState.bearing) !== 0 && (
            <Button
              size="sm"
              className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700 shadow-lg"
              onClick={resetNorth}
              title="Reset to North"
            >
              <span className="text-xs font-bold">N↑</span>
            </Button>
          )}
          
          {/* Refresh Properties */}
          <Button
            size="sm"
            variant="outline"
            className="w-12 h-12 rounded-full bg-white shadow-lg"
            onClick={fetchProperties}
            title="Refresh properties"
          >
            <RefreshCw className="w-5 h-5 text-slate-700" />
          </Button>
        </div>

        {/* BOTTOM INFO BAR */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm text-white px-4 py-3 pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-slate-400">Total: </span>
              <span className="font-bold text-lg">{sortedProperties.length}</span>
              <span className="text-slate-400"> properties</span>
            </div>
            
            {sortedProperties.length > 0 && sortedProperties[0].distance && (
              <div className="flex items-center gap-2 bg-green-600/30 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-sm">
                  Nearest: <strong>{formatDistance(sortedProperties[0].distance)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rotation hint - only show initially */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
          <div className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
            👆👆 Two fingers to rotate 360°
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}

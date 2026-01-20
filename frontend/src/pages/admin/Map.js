import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Map as MapIcon, Search, Filter, Home, User, Phone, 
  MapPin, Layers, Navigation, Building, AreaChart,
  Download, Save, ArrowUpDown, Loader2, Eye, Edit, Check, X,
  Camera, AlertTriangle, Lock, UserX
} from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Function to spread overlapping markers in a spiral pattern
const spreadOverlappingMarkers = (properties) => {
  const coordMap = {};
  const spreadProperties = [];
  const OFFSET = 0.00015; // About 15 meters offset
  
  properties.forEach((prop) => {
    if (!prop.latitude || !prop.longitude) return;
    const key = `${prop.latitude},${prop.longitude}`;
    if (!coordMap[key]) {
      coordMap[key] = [];
    }
    coordMap[key].push(prop);
  });
  
  Object.values(coordMap).forEach((group) => {
    if (group.length === 1) {
      spreadProperties.push({ ...group[0], spreadLat: group[0].latitude, spreadLng: group[0].longitude });
    } else {
      group.forEach((prop, index) => {
        if (index === 0) {
          spreadProperties.push({ ...prop, spreadLat: prop.latitude, spreadLng: prop.longitude });
        } else {
          const angle = (index * 45) * (Math.PI / 180);
          const radius = OFFSET * Math.ceil(index / 8);
          const newLat = prop.latitude + radius * Math.cos(angle);
          const newLng = prop.longitude + radius * Math.sin(angle);
          spreadProperties.push({ ...prop, spreadLat: newLat, spreadLng: newLng });
        }
      });
    }
  });
  
  return spreadProperties;
};

// FAST Simple marker - no gradients or shadows for better performance
const createPropertyIdIcon = (propertyId, status, serialNo = null) => {
  const colors = {
    'Pending': '#ef4444',       // RED
    'In Progress': '#eab308',   // YELLOW
    'Completed': '#eab308',     // YELLOW
    'Approved': '#22c55e',      // GREEN
    'Rejected': '#f97316',      // ORANGE
    'default': '#ef4444'        // RED
  };
  const color = colors[status] || colors['default'];
  const displaySerial = serialNo || '-';
  
  // Simple fast circular marker
  return L.divIcon({
    className: 'fast-marker',
    html: `<div style="
      width:20px;
      height:20px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:9px;
      font-weight:700;
      color:white;
    ">${displaySerial}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

// Keep old numbered icon as fallback
const createNumberedIcon = (number, category) => {
  const colors = {
    'Residential': '#3b82f6',
    'Commercial': '#f97316',
    'Vacant Plot': '#22c55e',
    'Vacant': '#22c55e',
    'Mix Use': '#a855f7',
    'Mixed': '#a855f7',
    'default': '#6b7280'
  };
  
  const normalizedCategory = category?.trim() || 'default';
  const color = colors[normalizedCategory] || colors['default'];
  
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div style="
      background-color: ${color};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 600;
      color: white;
      font-family: Arial, sans-serif;
      line-height: 1;
    ">${number}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9]
  });
};

// Component to fit bounds when properties change
function FitBounds({ properties }) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      const validProps = properties.filter(p => p.latitude && p.longitude);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(
          validProps.map(p => [p.latitude, p.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [properties, map]);
  
  return null;
}

export default function PropertyMap() {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colonies, setColonies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mapType, setMapType] = useState('satellite');
  const [showMap, setShowMap] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false); // NEW: Hide completed properties
  
  // Filters
  const [filters, setFilters] = useState({
    colony: '',
    category: '',
    status: '', // NEW: Status filter (Pending, Completed, Rejected)
    search: ''
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    withGPS: 0,
    pending: 0,
    completed: 0,
    duplicatesRemoved: 0
  });

  // Arrange & Download state
  const [arranging, setArranging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfDialog, setPdfDialog] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    sn_position: 'top-right',
    sn_font_size: 48,
    sn_color: 'red'
  });

  // Survey View/Edit state
  const [surveyDialog, setSurveyDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [surveyData, setSurveyData] = useState(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Default center (Kurukshetra, Haryana)
  const defaultCenter = [29.9506, 76.8378];

  useEffect(() => {
    fetchColonies(); // Only fetch colonies first
  }, []);

  useEffect(() => {
    if (filters.colony) {
      fetchPropertiesByColony(filters.colony);
      setShowMap(true);
    }
  }, [filters.colony]);

  useEffect(() => {
    applyFilters();
  }, [properties, filters]);

  // Fetch only colony list for dropdown - USES CACHED ENDPOINT
  const fetchColonies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/map/colonies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const coloniesData = response.data.colonies || [];
      setColonies(coloniesData.map(c => c.name));
      
      // Set total count
      setStats(prev => ({ ...prev, total: response.data.total || 0 }));
    } catch (error) {
      toast.error('Failed to load colonies');
    } finally {
      setLoading(false);
    }
  };

  // Fetch properties for selected colony only
  const fetchPropertiesByColony = async (colony) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/map/properties?colony=${encodeURIComponent(colony)}&limit=2000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let props = response.data.properties || [];
      props.sort((a, b) => (a.serial_number || 0) - (b.serial_number || 0));
      
      setProperties(props);
      
      const uniqueCategories = [...new Set(props.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
      
      const withGPS = props.filter(p => p.latitude && p.longitude).length;
      setStats({
        total: props.length,
        withGPS,
        residential: props.filter(p => p.category === 'Residential').length,
        commercial: props.filter(p => p.category === 'Commercial').length,
        vacant: props.filter(p => p.category === 'Vacant Plot').length
      });
      
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];
    
    // Colony filter already applied in fetchPropertiesByColony
    
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    
    // NEW: Status filter for Pending, Completed, Rejected, etc.
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.property_id?.toLowerCase().includes(searchLower) ||
        p.owner_name?.toLowerCase().includes(searchLower) ||
        p.address?.toLowerCase().includes(searchLower) ||
        p.mobile?.includes(filters.search)
      );
    }
    
    // Only show properties with valid GPS
    filtered = filtered.filter(p => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0);
    
    // Maintain sort by serial_number
    filtered.sort((a, b) => (a.serial_number || 0) - (b.serial_number || 0));
    
    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setFilters({ colony: '', category: '', status: '', search: '' });
    setShowMap(false);
    setProperties([]);
    setFilteredProperties([]);
  };

  // Arrange properties by GPS route
  const handleArrangeByRoute = async () => {
    setArranging(true);
    try {
      const params = new URLSearchParams();
      if (filters.colony) params.append('ward', filters.colony);
      
      const response = await axios.post(`${API_URL}/admin/properties/arrange-by-route?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(response.data.message || 'Properties arranged by GPS route');
      filters.colony && fetchPropertiesByColony(filters.colony); // Reload to show new order
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to arrange properties');
    } finally {
      setArranging(false);
    }
  };

  // Save arranged data to properties
  const handleSaveArrangedData = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (filters.colony) params.append('ward', filters.colony);
      
      const response = await axios.post(`${API_URL}/admin/properties/save-arranged?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(response.data.message || 'Arranged data saved successfully');
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save arranged data');
    } finally {
      setSaving(false);
    }
  };

  // Download arranged PDF
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (filters.colony) params.append('ward', filters.colony);
      params.append('sn_position', pdfOptions.sn_position);
      params.append('sn_font_size', pdfOptions.sn_font_size);
      params.append('sn_color', pdfOptions.sn_color);
      
      const response = await axios.post(`${API_URL}/admin/properties/download-pdf?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('PDF generated successfully');
      setPdfDialog(false);
      
      // Download the file
      window.open(`${process.env.REACT_APP_BACKEND_URL}${response.data.download_url}`, '_blank');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  // View Survey Data for a property
  const handleViewSurvey = async (property) => {
    setSelectedProperty(property);
    setLoadingSurvey(true);
    setSurveyDialog(true);
    
    try {
      // Direct fetch submission for this property
      const response = await axios.get(`${API_URL}/submission/by-property/${property.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSurveyData(response.data.submission || null);
    } catch (error) {
      toast.error('Failed to load survey data');
      setSurveyData(null);
    } finally {
      setLoadingSurvey(false);
    }
  };

  // Approve survey
  const handleApproveSurvey = async () => {
    if (!surveyData) return;
    
    try {
      await axios.post(`${API_URL}/admin/submissions/approve`, {
        submission_id: surveyData.id,
        action: 'APPROVE'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Survey approved');
      setSurveyDialog(false);
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to approve survey');
    }
  };

  // Reject survey
  const handleRejectSurvey = async () => {
    if (!surveyData || !rejectRemarks.trim()) {
      toast.error('Please provide rejection remarks');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/admin/submissions/approve`, {
        submission_id: surveyData.id,
        action: 'REJECT',
        remarks: rejectRemarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Survey rejected');
      setRejectDialog(false);
      setSurveyDialog(false);
      setRejectRemarks('');
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to reject survey');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Pending': 'bg-red-100 text-red-700',
      'In Progress': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-yellow-100 text-yellow-700',
      'Approved': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const getTileLayer = () => {
    if (mapType === 'satellite') {
      return (
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={21}
        />
      );
    }
    return (
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
    );
  };

  return (
    <AdminLayout title="Property Map">
      <div data-testid="property-map-page" className="space-y-4">
        
        {/* Colony Selection Screen - Show first before map */}
        {!showMap && (
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <MapPin className="w-5 h-5" />
                Select Colony to View Map
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">Please select a colony/area to load properties on the map. This improves loading speed.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colony/Area *</Label>
                  <Select 
                    value={filters.colony} 
                    onValueChange={(v) => setFilters({ ...filters, colony: v })}
                  >
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue placeholder="-- Select Colony --" />
                    </SelectTrigger>
                    <SelectContent>
                      {colonies.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={() => filters.colony && setShowMap(true)}
                    disabled={!filters.colony || loading}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MapIcon className="w-4 h-4 mr-2" />
                    )}
                    Load Map
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500">
                  <strong>{colonies.length}</strong> colonies available • <strong>{stats.total}</strong> total properties
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show Map and Filters only after colony is selected */}
        {showMap && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 opacity-80" />
                    <span className="text-sm opacity-80">Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 opacity-80" />
                    <span className="text-sm opacity-80">With GPS</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.withGPS}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 opacity-80" />
                    <span className="text-sm opacity-80">Residential</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.residential}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 opacity-80" />
                    <span className="text-sm opacity-80">Commercial</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.commercial}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AreaChart className="w-5 h-5 opacity-80" />
                    <span className="text-sm opacity-80">Vacant</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{stats.vacant}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Colony/Area</Label>
                    <Select 
                      value={filters.colony} 
                      onValueChange={(v) => setFilters({ ...filters, colony: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Colonies" />
                      </SelectTrigger>
                      <SelectContent>
                        {colonies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Category</Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(v) => setFilters({ ...filters, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Property ID, Name, Mobile..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Map Type</Label>
                <Select value={mapType} onValueChange={setMapType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="street">Street Map</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
            
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-slate-500">
                Showing <span className="font-semibold text-slate-900">{filteredProperties.length}</span> properties on map
              </p>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div> Residential
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div> Commercial
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Vacant Plot
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div> Mix Use
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3">
              <Button
                onClick={handleArrangeByRoute}
                disabled={arranging || filteredProperties.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {arranging ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                )}
                Arrange by GPS Route
              </Button>

              <Button
                onClick={handleSaveArrangedData}
                disabled={saving || filteredProperties.length === 0}
                variant="outline"
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Arranged Data
              </Button>

              <Button
                onClick={() => setPdfDialog(true)}
                disabled={filteredProperties.length === 0}
                variant="outline"
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Arranged PDF
              </Button>

              <div className="flex-1" />
              
              <span className="text-sm text-slate-500">
                {filteredProperties.length} properties with GPS
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-slate-900 text-white">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapIcon className="w-4 h-4" />
              Property Locations - Click on marker to view details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center bg-slate-100">
                <div className="text-slate-500 animate-pulse">Loading map...</div>
              </div>
            ) : (
              <div style={{ height: '600px', width: '100%' }}>
                <MapContainer
                  center={defaultCenter}
                  zoom={18}
                  minZoom={5}
                  maxZoom={21}
                  maxBounds={[[-85, -180], [85, 180]]}
                  maxBoundsViscosity={1.0}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  {getTileLayer()}
                  <FitBounds properties={filteredProperties} />
                  
                  {/* Property markers with SERIAL NUMBER labels - show ALL for selected colony */}
                  {spreadOverlappingMarkers(filteredProperties).map((property) => (
                    <Marker
                      key={property.id}
                      position={[property.spreadLat, property.spreadLng]}
                      icon={createPropertyIdIcon(
                        property.property_id, 
                        property.status || property.category,
                        property.bill_sr_no || property.serial_number || '-'
                      )}
                    >
                      <Popup maxWidth={350} className="property-popup">
                        <div className="p-2 min-w-[280px]">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              {/* Serial Number prominently */}
                              <span className="text-xl font-bold text-amber-600">
                                Sr: {property.bill_sr_no || property.serial_number || '-'}
                              </span>
                              <p className="font-mono text-sm text-blue-600">{property.property_id}</p>
                            </div>
                            {getStatusBadge(property.status)}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500">Owner</p>
                                <p className="font-medium">{property.owner_name || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500">Mobile</p>
                                <p className="font-mono">{property.mobile || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <Home className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-slate-500">Address</p>
                                <p className="text-slate-700">{property.address || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <p className="text-xs text-slate-500">Area</p>
                                <p className="font-medium">{property.total_area || '-'} Sq.Yard</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Outstanding</p>
                                <p className="font-medium text-red-600">₹{property.amount || '0'}</p>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <p className="text-xs text-slate-400 font-mono">
                                GPS: {property.latitude?.toFixed(6)}, {property.longitude?.toFixed(6)}
                              </p>
                            </div>

                            {/* View Survey Button */}
                            <div className="pt-2 border-t">
                              <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleViewSurvey(property)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Survey Data
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}

        {/* Download PDF Dialog */}
        <Dialog open={pdfDialog} onOpenChange={setPdfDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Arranged PDF</DialogTitle>
              <DialogDescription>
                Generate a PDF with properties arranged by GPS route order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>{filteredProperties.length}</strong> properties will be included in the PDF
                  {filters.colony && ` (Colony: ${filters.colony})`}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Serial Number Position</Label>
                <Select
                  value={pdfOptions.sn_position}
                  onValueChange={(value) => setPdfOptions({ ...pdfOptions, sn_position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Font Size: {pdfOptions.sn_font_size}px</Label>
                <input
                  type="range"
                  min="24"
                  max="72"
                  value={pdfOptions.sn_font_size}
                  onChange={(e) => setPdfOptions({ ...pdfOptions, sn_font_size: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Serial Number Color</Label>
                <Select
                  value={pdfOptions.sn_color}
                  onValueChange={(value) => setPdfOptions({ ...pdfOptions, sn_color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPdfDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Survey View Dialog - with high z-index to appear above map */}
        <Dialog open={surveyDialog} onOpenChange={setSurveyDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto z-[9999]" style={{zIndex: 9999}}>
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center justify-between">
                <span>Survey Data - {selectedProperty?.property_id}</span>
                {surveyData && getStatusBadge(surveyData.status)}
              </DialogTitle>
            </DialogHeader>

            {loadingSurvey ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : surveyData ? (
              <div className="space-y-4">
                {/* Property Info */}
                <Card className="bg-slate-50">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                      <Home className="w-4 h-4" /> Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Serial #</p>
                        <p className="font-medium">{selectedProperty?.serial_na ? 'N/A' : selectedProperty?.serial_number || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Property ID</p>
                        <p className="font-mono font-medium">{selectedProperty?.property_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Owner</p>
                        <p className="font-medium">{selectedProperty?.owner_name || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Conditions */}
                {(surveyData.special_condition || surveyData.self_certified !== undefined) && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        {surveyData.special_condition && (
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                            surveyData.special_condition === 'house_locked' 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {surveyData.special_condition === 'house_locked' ? (
                              <><Lock className="w-4 h-4" /> House Locked</>
                            ) : (
                              <><UserX className="w-4 h-4" /> Owner Denied</>
                            )}
                          </div>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                          surveyData.self_certified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Check className="w-4 h-4" />
                          Self Certified: {surveyData.self_certified ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Survey Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">New Owner Name</p>
                    <p className="font-medium">{surveyData.new_owner_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">New Mobile</p>
                    <p className="font-mono">{surveyData.new_mobile || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Receiver Name</p>
                    <p className="font-medium">{surveyData.receiver_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Relation</p>
                    <p>{surveyData.relation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Submitted By</p>
                    <p className="font-medium">{surveyData.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Submitted At</p>
                    <p>{new Date(surveyData.submitted_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* GPS */}
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <MapPin className="w-4 h-4" />
                    <span className="font-mono text-sm">
                      Lat: {surveyData.latitude?.toFixed(6)}, Long: {surveyData.longitude?.toFixed(6)}
                    </span>
                  </div>
                </div>

                {/* Photos */}
                {surveyData.photos?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Photos
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {surveyData.photos.filter((p, i, self) => 
                        i === self.findIndex(x => x.file_url === p.file_url)
                      ).map((photo, idx) => (
                        <img
                          key={idx}
                          src={`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`}
                          alt={photo.photo_type}
                          className="w-full h-36 object-cover rounded-lg cursor-pointer hover:opacity-90"
                          onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {(!surveyData.status || surveyData.status === 'Pending') && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleApproveSurvey}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setRejectDialog(true)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Show rejection remarks if rejected */}
                {surveyData.status === 'Rejected' && surveyData.review_remarks && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600 font-semibold mb-1">Rejection Reason:</p>
                    <p className="text-red-700">{surveyData.review_remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No survey data found</p>
                <p className="text-sm">Survey has not been submitted for this property yet</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent className="z-[10000]" style={{zIndex: 10000}}>
            <DialogHeader>
              <DialogTitle>Reject Survey</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Enter rejection remarks..."
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectSurvey}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

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
  Camera, AlertTriangle, Lock, UserX, Users
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
  const [colonySearch, setColonySearch] = useState(''); // Colony search filter
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]); // Employees/Surveyors list
  const [mapType, setMapType] = useState('satellite');
  const [showMap, setShowMap] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false); // NEW: Hide completed properties
  
  // Filters
  const [filters, setFilters] = useState({
    colony: '',
    category: '',
    status: '', // Status filter (Pending, Completed, Rejected)
    employee: '', // Employee filter
    search: ''
  });

  // Filtered colonies based on search
  const filteredColonies = colonies.filter(c => 
    c.toLowerCase().includes(colonySearch.toLowerCase())
  );

  // Employee stats for selected colony
  const [employeeStats, setEmployeeStats] = useState(null);

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
  
  // Edit Survey state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    receiver_name: '',
    receiver_mobile: '',
    relation: '',
    new_owner_name: '',
    new_mobile: '',
    special_condition: '',
    self_satisfied: true,
    remarks: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Default center (Kurukshetra, Haryana)
  const defaultCenter = [29.9506, 76.8378];

  useEffect(() => {
    fetchColonies(); // Only fetch colonies first
    fetchEmployees(); // Fetch employees list
    setShowMap(true); // Show map directly on load
  }, []);

  useEffect(() => {
    if (filters.colony) {
      fetchPropertiesByColony(filters.colony);
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

  // Fetch employees/surveyors list
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to get surveyors and field employees
      const empList = (response.data || []).filter(u => u.role !== 'ADMIN');
      setEmployees(empList);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  // Fetch properties for selected colony only
  const fetchPropertiesByColony = async (colony) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/map/properties?colony=${encodeURIComponent(colony)}&limit=5000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let props = response.data.properties || [];
      props.sort((a, b) => (a.serial_number || 0) - (b.serial_number || 0));
      
      setProperties(props);
      
      const uniqueCategories = [...new Set(props.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories.sort());
      
      // Get unique employees assigned to this colony
      const assignedEmployees = [...new Set(props.map(p => p.assigned_employee_id).filter(Boolean))];
      
      // Calculate employee-wise stats for this colony
      const empStats = {};
      props.forEach(p => {
        // Handle single employee assignment
        if (p.assigned_employee_id) {
          if (!empStats[p.assigned_employee_id]) {
            empStats[p.assigned_employee_id] = {
              id: p.assigned_employee_id,
              name: p.assigned_employee_name || 'Unknown',
              total: 0,
              completed: 0,
              pending: 0
            };
          }
          empStats[p.assigned_employee_id].total++;
          if (p.status === 'Completed' || p.status === 'Approved') {
            empStats[p.assigned_employee_id].completed++;
          } else {
            empStats[p.assigned_employee_id].pending++;
          }
        }
        
        // Handle multiple employee assignments (assigned_employee_ids array)
        if (p.assigned_employee_ids && Array.isArray(p.assigned_employee_ids)) {
          p.assigned_employee_ids.forEach((empId, idx) => {
            if (!empStats[empId]) {
              // Get name from assigned_employee_name (comma-separated) if available
              const names = (p.assigned_employee_name || '').split(',').map(n => n.trim());
              empStats[empId] = {
                id: empId,
                name: names[idx] || 'Unknown',
                total: 0,
                completed: 0,
                pending: 0
              };
            }
            empStats[empId].total++;
            if (p.status === 'Completed' || p.status === 'Approved') {
              empStats[empId].completed++;
            } else {
              empStats[empId].pending++;
            }
          });
        }
      });
      setEmployeeStats(empStats);
      
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
    
    // NEW: Employee filter
    if (filters.employee) {
      filtered = filtered.filter(p => p.assigned_employee_id === filters.employee);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchNum = filters.search.trim();
      filtered = filtered.filter(p => 
        p.property_id?.toLowerCase().includes(searchLower) ||
        p.owner_name?.toLowerCase().includes(searchLower) ||
        p.address?.toLowerCase().includes(searchLower) ||
        p.mobile?.includes(filters.search) ||
        // Search by serial number
        String(p.serial_number || '').includes(searchNum) ||
        p.bill_sr_no?.toLowerCase().includes(searchLower)
      );
    }
    
    // Only show properties with valid GPS
    filtered = filtered.filter(p => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0);
    
    // Maintain sort by serial_number
    filtered.sort((a, b) => (a.serial_number || 0) - (b.serial_number || 0));
    
    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setFilters({ colony: '', category: '', status: '', employee: '', search: '' });
    // Keep map visible, just clear properties
    setProperties([]);
    setFilteredProperties([]);
    setEmployeeStats(null);
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
      
      // Download using authenticated endpoint with blob
      const filename = response.data.filename;
      const downloadResponse = await axios.get(
        `${API_URL}/admin/properties/download-pdf/${filename}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
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

  // Approve survey - stays on same position
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
      // Update local state without closing dialog or changing map position
      setSurveyData(prev => ({ ...prev, status: 'Approved' }));
      // Refresh properties in background
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to approve survey');
    }
  };

  // Reject survey - stays on same position
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
      setRejectRemarks('');
      // Update local state without closing main dialog
      setSurveyData(prev => ({ ...prev, status: 'Rejected' }));
      // Refresh properties in background
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to reject survey');
    }
  };

  // Start editing survey
  const handleStartEdit = () => {
    setEditData({
      receiver_name: surveyData?.receiver_name || '',
      receiver_mobile: surveyData?.receiver_mobile || '',
      relation: surveyData?.relation || '',
      new_owner_name: surveyData?.new_owner_name || '',
      new_mobile: surveyData?.new_mobile || '',
      special_condition: surveyData?.special_condition || '',
      self_satisfied: surveyData?.self_satisfied !== false,
      remarks: surveyData?.remarks || ''
    });
    setEditMode(true);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData({
      receiver_name: '',
      receiver_mobile: '',
      relation: '',
      new_owner_name: '',
      new_mobile: '',
      special_condition: '',
      self_satisfied: true,
      remarks: ''
    });
  };

  // Save edited survey data
  const handleSaveEdit = async () => {
    if (!surveyData) return;
    
    setSavingEdit(true);
    try {
      await axios.put(`${API_URL}/admin/submissions/${surveyData.id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setSurveyData({
        ...surveyData,
        ...editData
      });
      
      toast.success('Survey data updated successfully');
      setEditMode(false);
      filters.colony && fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to update survey data');
    } finally {
      setSavingEdit(false);
    }
  };

  // Bulk Unassign Function
  const handleBulkUnassign = async (employeeId = null) => {
    if (!filters.colony) {
      toast.error('Please select a colony first');
      return;
    }
    
    const confirmMsg = employeeId 
      ? `Unassign all properties from this employee in ${filters.colony}?`
      : `Unassign ALL employees from ALL properties in ${filters.colony}?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      const response = await axios.post(`${API_URL}/admin/unassign-bulk`, {
        ward: filters.colony,
        employee_id: employeeId || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Unassigned ${response.data.unassigned_count || response.data.modified_count} properties`);
      fetchPropertiesByColony(filters.colony);
    } catch (error) {
      toast.error('Failed to unassign: ' + (error.response?.data?.detail || 'Unknown error'));
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
        
        {/* Map and Filters - Show directly */}
        {showMap && (
          <>
            {/* Colony Selection Info Banner - Show only when no colony selected */}
            {!filters.colony && (
              <Card className="border-2 border-blue-200 bg-blue-50/50">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Select a Colony to view properties on map</p>
                        <p className="text-sm text-blue-600">{colonies.length} colonies available • {stats.total} total properties</p>
                      </div>
                    </div>
                    <Select 
                      value={filters.colony} 
                      onValueChange={(v) => setFilters({ ...filters, colony: v === 'ALL_AREAS' ? '' : v })}
                    >
                      <SelectTrigger className="w-[250px] h-10 bg-white border-blue-300">
                        <SelectValue placeholder="-- Select Colony --" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="Search colony..."
                            value={colonySearch}
                            onChange={(e) => setColonySearch(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <SelectItem value="ALL_AREAS" className="font-semibold text-blue-600">🌐 All Areas ({colonies.length} colonies)</SelectItem>
                        {filteredColonies.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        {filteredColonies.length === 0 && colonySearch && (
                          <div className="px-2 py-2 text-sm text-slate-500">No colonies found</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards - Show only when colony selected */}
            {filters.colony && (
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
            )}

            {/* Filters - Show only when colony selected */}
            {filters.colony && (
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
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
              
                  {/* Employee/Surveyor Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Surveyor</Label>
                    <Select 
                      value={filters.employee} 
                      onValueChange={(v) => setFilters({ ...filters, employee: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Surveyors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">All Surveyors</SelectItem>
                        {employeeStats && Object.values(employeeStats).map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.completed}/{emp.total})
                          </SelectItem>
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
                  
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Survey Status</Label>
                    <Select 
                      value={filters.status} 
                      onValueChange={(v) => setFilters({ ...filters, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">All Status</SelectItem>
                        <SelectItem value="Pending">🔴 Pending</SelectItem>
                        <SelectItem value="Completed">🟡 Completed</SelectItem>
                        <SelectItem value="Approved">🟢 Approved</SelectItem>
                        <SelectItem value="Rejected">🟠 Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Serial No, ID, Name..."
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
              
                  <Button variant="outline" onClick={clearFilters} size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
            
                {/* Employee Stats Summary when employee selected */}
                {filters.employee && employeeStats && employeeStats[filters.employee] && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-900">
                          {employeeStats[filters.employee].name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          <span className="font-bold text-blue-600">{employeeStats[filters.employee].total}</span>
                          <span className="text-slate-500 ml-1">Total</span>
                        </span>
                        <span className="text-sm">
                          <span className="font-bold text-emerald-600">{employeeStats[filters.employee].completed}</span>
                          <span className="text-slate-500 ml-1">Done</span>
                        </span>
                        <span className="text-sm">
                          <span className="font-bold text-amber-600">{employeeStats[filters.employee].pending}</span>
                          <span className="text-slate-500 ml-1">Pending</span>
                        </span>
                        <span className="text-sm font-bold">
                          {employeeStats[filters.employee].total > 0 
                            ? Math.round((employeeStats[filters.employee].completed / employeeStats[filters.employee].total) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                        style={{ 
                          width: `${employeeStats[filters.employee].total > 0 
                            ? (employeeStats[filters.employee].completed / employeeStats[filters.employee].total) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-sm">
                  <p className="text-slate-500">
                    Showing <span className="font-semibold text-slate-900">{filteredProperties.length}</span> properties on map
                  </p>
                  {/* Status Legend */}
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div> Pending
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div> Completed
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div> Approved
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div> Rejected
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
            )}

        {/* Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-slate-900 text-white">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapIcon className="w-4 h-4" />
              {filters.colony 
                ? `Property Locations - ${filters.colony} (Click marker for details)` 
                : 'Property Map - Select a colony above to load properties'}
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
                      {/* COMPACT POPUP - Small and on top of all layers */}
                      <Popup 
                        maxWidth={220} 
                        minWidth={180}
                        className="compact-popup"
                        autoPan={true}
                        keepInView={true}
                      >
                        <div className="text-xs" style={{ minWidth: '160px' }}>
                          {/* Header - Serial & Status */}
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-200">
                            <span className="text-base font-bold text-red-500">
                              Sr: {property.bill_sr_no || property.serial_number || '-'}
                            </span>
                            {getStatusBadge(property.status)}
                          </div>
                          
                          {/* Property ID - Same size as Serial */}
                          <div className="pb-1 mb-1 border-b border-gray-200">
                            <span className="text-base font-bold text-blue-600">
                              ID: {property.property_id || '-'}
                            </span>
                          </div>
                          
                          {/* Owner & Mobile */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium text-gray-900 truncate">{property.owner_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-blue-400" />
                              <a href={`tel:${property.mobile}`} className="text-blue-600 font-mono">{property.mobile || 'N/A'}</a>
                            </div>
                          </div>
                          
                          {/* Area & Amount - Compact grid */}
                          <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t border-gray-100">
                            <div>
                              <span className="text-gray-400">Area:</span>
                              <span className="ml-1 font-medium">{property.total_area ? `${property.total_area}` : '-'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Amt:</span>
                              <span className="ml-1 font-medium text-red-600">₹{property.amount || '0'}</span>
                            </div>
                          </div>
                          
                          {/* GPS - Tiny */}
                          <div className="mt-1 pt-1 border-t border-gray-100 text-[10px] text-gray-400 font-mono">
                            {property.latitude?.toFixed(6)}, {property.longitude?.toFixed(6)}
                          </div>

                          {/* View Survey Button */}
                          <Button
                            size="sm"
                            className="w-full mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleViewSurvey(property)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Survey Data
                          </Button>
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
          <DialogContent 
            className="max-w-2xl max-h-[85vh] overflow-y-auto z-[9999]" 
            style={{zIndex: 9999}}
            onInteractOutside={() => setSurveyDialog(false)}
          >
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="text-lg font-semibold flex items-center justify-between pr-8">
                <span>Survey Data</span>
                {surveyData && getStatusBadge(surveyData.status)}
              </DialogTitle>
            </DialogHeader>

            {loadingSurvey ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : surveyData ? (
              <div className="space-y-4">
                {/* Property Header - Property ID BIG, Serial Number small */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Property ID</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{selectedProperty?.property_id || '-'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Sr. No:</span>
                    <span className="font-bold text-red-600">{selectedProperty?.bill_sr_no || selectedProperty?.serial_number || '-'}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {getStatusBadge(surveyData.status)}
                </div>

                {/* Property Details Grid - Same as Surveyor Map */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Owner</div>
                    <div className="font-semibold text-gray-900">{selectedProperty?.owner_name || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Owner Mobile</div>
                    {selectedProperty?.mobile ? (
                      <a href={`tel:${selectedProperty.mobile}`} className="font-semibold text-blue-600 underline">
                        {selectedProperty.mobile}
                      </a>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Colony</div>
                    <div className="font-medium text-gray-800">{selectedProperty?.colony || selectedProperty?.ward || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Area</div>
                    <div className="font-medium text-gray-800">{selectedProperty?.total_area || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Category</div>
                    <div className="font-medium text-gray-800">{selectedProperty?.category || 'Residential'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Amount</div>
                    <div className="font-bold text-red-600 text-lg">₹{selectedProperty?.amount || '0'}</div>
                  </div>
                </div>

                {/* Address */}
                {selectedProperty?.address && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Address</div>
                    <div className="text-sm text-gray-800">{selectedProperty.address}</div>
                  </div>
                )}

                {/* Survey Details */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Survey Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Receiver Name</div>
                      <div className="font-medium">{surveyData.receiver_name || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Receiver Mobile</div>
                      <div className="font-mono">{surveyData.receiver_mobile || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Relation</div>
                      <div className="font-medium">{surveyData.relation || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Self Certification</div>
                      <div className="font-medium">{surveyData.self_cert_status || surveyData.self_satisfied || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Employee</div>
                      <div className="font-medium">{surveyData.employee_name}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Submit Date</div>
                      <div className="font-medium text-xs">{new Date(surveyData.submitted_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                {/* Special Condition */}
                {surveyData.special_condition && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs text-amber-600 font-medium">Special Condition</div>
                    <div className="font-semibold text-amber-800">
                      {surveyData.special_condition === 'house_locked' ? 'House Locked' : 
                       surveyData.special_condition === 'owner_denied' ? 'Owner Denied' : 
                       surveyData.special_condition}
                    </div>
                  </div>
                )}

                {/* Combined GPS Coordinates - Original & Survey in ONE line with Distance */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {/* Original GPS */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-slate-500">Original:</span>
                      <span className="font-mono text-blue-700">
                        {selectedProperty?.latitude?.toFixed(5) || 'N/A'}, {selectedProperty?.longitude?.toFixed(5) || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Arrow */}
                    <span className="text-slate-400">→</span>
                    
                    {/* Survey GPS */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-slate-500">Survey:</span>
                      <span className="font-mono text-emerald-700">
                        {surveyData.latitude?.toFixed(5) || 'N/A'}, {surveyData.longitude?.toFixed(5) || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Distance Calculation */}
                    {selectedProperty?.latitude && surveyData.latitude && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 rounded-full">
                        <Navigation className="w-3 h-3 text-amber-600" />
                        <span className="font-semibold text-amber-700">
                          {(() => {
                            const R = 6371000;
                            const lat1 = selectedProperty.latitude * Math.PI / 180;
                            const lat2 = surveyData.latitude * Math.PI / 180;
                            const dLat = (surveyData.latitude - selectedProperty.latitude) * Math.PI / 180;
                            const dLon = (surveyData.longitude - selectedProperty.longitude) * Math.PI / 180;
                            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                      Math.cos(lat1) * Math.cos(lat2) *
                                      Math.sin(dLon/2) * Math.sin(dLon/2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                            const distance = R * c;
                            return distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(2)}km`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                {surveyData.remarks && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Remarks</div>
                    <p className="text-gray-800">{surveyData.remarks}</p>
                  </div>
                )}

                {/* Review Remarks */}
                {surveyData.review_remarks && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-xs text-red-600 font-medium">Rejection Remarks</div>
                    <p className="text-red-800">{surveyData.review_remarks}</p>
                  </div>
                )}

                {/* Photos */}
                {surveyData.photos && surveyData.photos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {surveyData.photos.filter((photo, index, self) => 
                        index === self.findIndex(p => p.file_url === photo.file_url)
                      ).map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={`${API_URL.replace('/api', '')}${photo.file_url}`}
                            alt={photo.photo_type}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                            onClick={() => window.open(`${API_URL.replace('/api', '')}${photo.file_url}`, '_blank')}
                          />
                          <span className="absolute top-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded">
                            {photo.photo_type === 'HOUSE' ? 'PROPERTY' : photo.photo_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {(!surveyData.status || surveyData.status === 'Pending' || surveyData.status === 'Completed') && (
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

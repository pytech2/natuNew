import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  Printer,
  Loader2,
  MapPin,
  Navigation,
  FileText,
  List,
  Map as MapIcon,
  Download,
  Lock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom numbered marker - SAME COLORS AS ADMIN MAP
const createNumberedIcon = (number, status) => {
  const colors = {
    'Pending': '#ef4444',       // RED - same as admin
    'In Progress': '#eab308',   // YELLOW - same as admin
    'Completed': '#eab308',     // YELLOW - same as admin
    'Approved': '#22c55e',      // GREEN - same as admin
    'Rejected': '#f97316',      // ORANGE - same as admin
    'default': '#ef4444'        // RED
  };
  
  const color = colors[status] || colors['default'];
  
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      font-family: Arial, sans-serif;
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// Component to fit map bounds
function FitBounds({ properties }) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      const validProps = properties.filter(p => p.latitude && p.longitude);
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(validProps.map(p => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      }
    }
  }, [properties, map]);
  
  return null;
}

export default function PropertyMap() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    fetchProperties();
    
    // Auto-refresh every 30 seconds to get updated statuses
    const refreshInterval = setInterval(() => {
      fetchProperties();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchProperties = async () => {
    try {
      // Fetch all properties (no pagination limit)
      const response = await axios.get(`${API_URL}/employee/properties?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const props = response.data.properties || [];
      setProperties(props);
      
      // Calculate stats
      const pending = props.filter(p => p.status === 'Pending').length;
      const completed = props.filter(p => ['Completed', 'Approved'].includes(p.status)).length;
      setStats({
        total: props.length,
        pending,
        completed
      });
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  // Get default center from properties or fallback
  const getDefaultCenter = () => {
    const validProps = properties.filter(p => p.latitude && p.longitude);
    if (validProps.length > 0) {
      return [validProps[0].latitude, validProps[0].longitude];
    }
    return [29.9695, 76.8783]; // Default Kurukshetra
  };

  // Download map as A4 PDF
  const handlePrintMap = async () => {
    if (!mapContainerRef.current) {
      toast.error('Map not ready');
      return;
    }

    setDownloading(true);
    toast.info('Generating PDF... Please wait');

    try {
      // Wait for map to fully render
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      
      // Add header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NSTU INDIA PRIVATE LIMITED', pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Property Survey Map', pageWidth / 2, 22, { align: 'center' });
      
      // Add surveyor info
      pdf.setFontSize(10);
      pdf.text(`Surveyor: ${user?.name || '-'}`, margin, 32);
      pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, margin, 38);
      pdf.text(`Total Properties: ${stats.total}`, pageWidth - margin - 50, 32);
      pdf.text(`Pending: ${stats.pending} | Completed: ${stats.completed}`, pageWidth - margin - 50, 38);
      
      // Add map image
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = pageHeight - 60; // Leave space for header and footer
      
      const finalHeight = Math.min(imgHeight, maxImgHeight);
      const finalWidth = (finalHeight === maxImgHeight) ? (canvas.width * finalHeight) / canvas.height : imgWidth;
      
      const xPos = (pageWidth - finalWidth) / 2;
      pdf.addImage(imgData, 'PNG', xPos, 45, finalWidth, finalHeight);
      
      // Add legend
      const legendY = 45 + finalHeight + 5;
      if (legendY < pageHeight - 20) {
        pdf.setFontSize(8);
        pdf.setFillColor(249, 115, 22); // Orange
        pdf.circle(margin + 3, legendY, 2, 'F');
        pdf.text('Pending', margin + 8, legendY + 1);
        
        pdf.setFillColor(34, 197, 94); // Green
        pdf.circle(margin + 35, legendY, 2, 'F');
        pdf.text('Completed', margin + 40, legendY + 1);
      }
      
      // Add footer
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, pageHeight - 10);
      pdf.text('Property Tax Survey System', pageWidth - margin, pageHeight - 10, { align: 'right' });

      // Save PDF
      const filename = `survey_map_${user?.username || 'surveyor'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      toast.success('Map PDF downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[1000]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/employee')}
              className="mr-3 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading font-semibold text-slate-900">Survey Map</h1>
              <p className="text-xs text-slate-500">{stats.total} properties assigned</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/employee/properties')}
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
            <Button
              size="sm"
              onClick={handlePrintMap}
              disabled={downloading || properties.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Print PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar with Color Legend */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-2xl font-bold text-red-500">{stats.pending}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">Done</p>
          </div>
        </div>
        {/* Color Legend - Same as Admin Map */}
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-slate-600">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-600">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-slate-600">Rejected</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1" ref={mapContainerRef}>
        {properties.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No properties assigned</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={getDefaultCenter()}
            zoom={14}
            minZoom={5}
            maxZoom={18}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds properties={properties} />
            
            {properties.filter(p => p.latitude && p.longitude).map((property, index) => (
              <Marker
                key={property.id}
                position={[property.latitude, property.longitude]}
                icon={createNumberedIcon(property.serial_number || index + 1, property.status)}
              >
                <Popup maxWidth={280}>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-blue-600">
                        #{property.serial_number || index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        property.status === 'Pending' ? 'bg-red-100 text-red-700' :
                        property.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        property.status === 'Completed' ? 'bg-yellow-100 text-yellow-700' :
                        property.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        property.status === 'Rejected' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                    
                    <p className="font-semibold text-slate-800">{property.owner_name}</p>
                    <p className="text-xs text-slate-500 mb-2">{property.address || property.colony}</p>
                    
                    {property.mobile && (
                      <p className="text-xs text-slate-600 mb-2">📱 {property.mobile}</p>
                    )}
                    
                    <div className="flex gap-2 mt-2">
                      {property.status === 'Approved' || property.locked ? (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-slate-400 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-blue-600"
                          onClick={() => navigate(`/employee/survey/${property.id}`)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Survey
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`, '_blank');
                        }}
                      >
                        <Navigation className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Bottom Navigation Hint */}
      <div className="bg-white border-t px-4 py-3 text-center">
        <p className="text-xs text-slate-500">
          Tap a marker to view details • Use <strong>Print PDF</strong> for hard copy
        </p>
      </div>
    </div>
  );
}

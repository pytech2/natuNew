import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Camera,
  Navigation,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Send,
  Flag,
  Loader2,
  Lock,
  XCircle,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Function to add watermark to image with GPS, Date, Time
// Fixed for mobile camera images with EXIF orientation handling
// AGGRESSIVE COMPRESSION - Target: Under 100KB file size
const addWatermarkToImage = (file, latitude, longitude) => {
  return new Promise((resolve, reject) => {
    // Create an image element to load the file
    const img = new Image();
    
    // Handle image load
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // COMPRESS: Limit max dimension to 800px for much smaller file size
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        // Set canvas size to compressed dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw the original image (scaled)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Create watermark text
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        const watermarkText = `GPS: ${latitude?.toFixed(6) || 'N/A'}, ${longitude?.toFixed(6) || 'N/A'} | ${dateStr} ${timeStr}`;
        
        // Calculate font size based on image dimensions (responsive)
        const fontSize = Math.max(14, Math.min(width, height) * 0.025);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        
        const textWidth = ctx.measureText(watermarkText).width;
        const padding = 10;
        const x = width - textWidth - padding;
        const y = height - padding;
        
        // Draw background rectangle for better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 8, y - fontSize - 4, textWidth + 16, fontSize + 12);
        
        // Draw watermark text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(watermarkText, x, y);
        
        // Also add a smaller watermark at top-left for extra visibility
        const smallFontSize = Math.max(10, fontSize * 0.7);
        ctx.font = `bold ${smallFontSize}px Arial, sans-serif`;
        const topText = `📍 ${latitude?.toFixed(4) || 'N/A'}, ${longitude?.toFixed(4) || 'N/A'}`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(8, 8, ctx.measureText(topText).width + 16, smallFontSize + 12);
        ctx.fillStyle = '#00ff00';
        ctx.fillText(topText, 16, 8 + smallFontSize + 2);
        
        // Convert canvas to blob with AGGRESSIVE COMPRESSION (0.5 quality = ~50-80KB typical)
        canvas.toBlob((blob) => {
          if (blob) {
            const watermarkedFile = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const sizeKB = (watermarkedFile.size / 1024).toFixed(0);
            console.log(`📸 Compressed: ${watermarkedFile.name} - ${sizeKB}KB`);
            
            // If still too large, try more compression
            if (watermarkedFile.size > 150 * 1024) {
              canvas.toBlob((smallerBlob) => {
                if (smallerBlob) {
                  const smallerFile = new File([smallerBlob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                  console.log(`📸 Extra compressed: ${(smallerFile.size / 1024).toFixed(0)}KB`);
                  resolve(smallerFile);
                } else {
                  resolve(watermarkedFile);
                }
              }, 'image/jpeg', 0.4); // Even more compression if needed
            } else {
              resolve(watermarkedFile);
            }
          } else {
            console.warn('Canvas toBlob returned null, using original file');
            resolve(file);
          }
        }, 'image/jpeg', 0.5); // 0.5 quality for aggressive compression (~50-100KB)
      } catch (err) {
        console.error('Error applying watermark:', err);
        resolve(file);
      }
    };
    
    img.onerror = (err) => {
      console.error('Error loading image for watermark:', err);
      resolve(file);
    };
    
    // Use createObjectURL for better mobile compatibility
    img.src = URL.createObjectURL(file);
  });
};

// Convert dataURL to Blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const RELATION_OPTIONS = [
  'Self',
  'Family Member',
  'Kirayedar',
  'Padosi',
  'Other'
];

// Calculate distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function Survey() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [property, setProperty] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(null);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [location, setLocation] = useState({ latitude: null, longitude: null });

  // Attendance check state
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(true);

  // Form State - Simplified (removed correct_colony_name)
  const [formData, setFormData] = useState({
    receiver_name: '',
    receiver_mobile: '',  // Receiver mobile with 10-digit validation
    relation: '',
    remarks: '',
    self_satisfied: 'yes'  // Default to Yes
  });

  // Self Certification status for non-self-certified properties
  const [selfCertStatus, setSelfCertStatus] = useState(''); // 'done', 'later', 'deny'
  
  // Self Certification OTP state (when selfCertStatus = 'done')
  const [selfCertOtp, setSelfCertOtp] = useState('');
  const [selfCertMobile, setSelfCertMobile] = useState(''); // Mobile used for OTP

  // Special submission conditions - allows bypassing required fields
  const [specialCondition, setSpecialCondition] = useState(''); // 'house_locked' or 'owner_denied'
  
  // 50m radius check
  const [withinRange, setWithinRange] = useState(null);
  const [distanceFromProperty, setDistanceFromProperty] = useState(null);

  // Photo State - Only house photo now (COMPULSORY in all situations)
  const [housePhoto, setHousePhoto] = useState(null);
  const [housePhotoPreview, setHousePhotoPreview] = useState(null);

  // File input refs
  const houseCameraRef = useRef(null);
  const houseGalleryRef = useRef(null);

  // Check if special condition allows skipping required fields (but NOT photo)
  const canSkipRequiredFields = specialCondition === 'house_locked' || specialCondition === 'owner_denied';

  useEffect(() => {
    fetchProperty();
    getLocation();
    checkTodayAttendance();
  }, [propertyId]);

  // Check if attendance is marked for today
  const checkTodayAttendance = async () => {
    setCheckingAttendance(true);
    try {
      const response = await axios.get(`${API_URL}/employee/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceMarked(response.data.marked || false);
    } catch (error) {
      // If endpoint doesn't exist or error, assume attendance not required
      setAttendanceMarked(true);
    } finally {
      setCheckingAttendance(false);
    }
  };

  useEffect(() => {
    if (location.latitude && location.longitude && property?.latitude && property?.longitude) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        property.latitude,
        property.longitude
      );
      setDistanceFromProperty(Math.round(distance));
      setWithinRange(distance <= 50);
    }
  }, [location, property]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API_URL}/employee/property/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperty(response.data.property);
      setSubmission(response.data.submission);

      // Check if property is self-certified - if yes, lock self_satisfied to 'yes'
      const isSelfCertified = response.data.property?.self_certified === true;

      if (response.data.submission) {
        const sub = response.data.submission;
        setFormData({
          receiver_name: sub.receiver_name || '',
          receiver_mobile: sub.receiver_mobile || '',
          relation: sub.relation || '',
          correct_colony_name: sub.correct_colony_name || '',
          remarks: sub.remarks || '',
          self_satisfied: isSelfCertified ? 'yes' : (sub.self_satisfied || 'yes')
        });
      } else if (isSelfCertified) {
        // Pre-set self_satisfied to 'yes' for self-certified properties
        setFormData(prev => ({ ...prev, self_satisfied: 'yes' }));
      }
    } catch (error) {
      toast.error('Failed to load property');
      navigate('/employee/properties');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    setGpsStatus('loading');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      toast.error('GPS not supported on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsStatus('success');
        toast.success('GPS location captured!');
      },
      (error) => {
        setGpsStatus('error');
        toast.error('Failed to get GPS. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handlePhotoCapture = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(type);
    console.log('Photo captured, file:', file.name, file.size, file.type);

    try {
      // For mobile: try to get fresh GPS location if not available
      let lat = location.latitude;
      let lng = location.longitude;
      
      if (!lat || !lng) {
        console.log('GPS not available, attempting to fetch...');
        // Try to get GPS one more time
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          console.log('GPS fetched for watermark:', lat, lng);
        } catch (gpsErr) {
          console.warn('Could not get GPS for watermark:', gpsErr);
        }
      }

      if (lat && lng) {
        console.log('Applying watermark with GPS:', lat, lng);
        const watermarkedFile = await addWatermarkToImage(file, lat, lng);
        if (type === 'house') {
          setHousePhoto(watermarkedFile);
          const previewUrl = URL.createObjectURL(watermarkedFile);
          setHousePhotoPreview(previewUrl);
        }
        toast.success('Photo captured with GPS & timestamp watermark!');
      } else {
        console.warn('No GPS available for watermark');
        if (type === 'house') {
          setHousePhoto(file);
          setHousePhotoPreview(URL.createObjectURL(file));
        }
        toast.warning('Photo captured (no GPS watermark - location not available)');
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      toast.error('Error processing photo');
    } finally {
      setProcessingPhoto(null);
    }
  };

  const validateMobile = (mobile) => {
    return /^\d{10}$/.test(mobile);
  };

  const handleSubmit = async () => {
    // Check attendance first
    if (!attendanceMarked) {
      toast.error('Please mark your attendance before starting survey');
      return;
    }
    
    // Validations - GPS check still required
    if (withinRange === false) {
      toast.error('You must be within 50 meters of the property to submit');
      return;
    }

    // If special condition is selected (House Locked or Owner Denied), skip other validations
    if (canSkipRequiredFields) {
      // Only GPS location is required for special conditions
      if (!location.latitude || !location.longitude) {
        toast.error('GPS location is required');
        return;
      }
    } else {
      // Normal validation for regular submissions
      if (!formData.receiver_name || !formData.relation) {
        toast.error('Receiver name and relation are required');
        return;
      }

      if (!formData.receiver_mobile || !validateMobile(formData.receiver_mobile)) {
        toast.error('Please enter a valid 10-digit receiver mobile number');
        return;
      }

      // For NON-self-certified properties, selfCertStatus is required
      if (property?.self_certified !== true) {
        if (!selfCertStatus) {
          toast.error('Please select self-certification status');
          return;
        }
        
        // If "Done" is selected, OTP is required
        if (selfCertStatus === 'done') {
          if (!selfCertMobile || selfCertMobile.length !== 10) {
            toast.error('Please enter valid 10-digit mobile number for self-certification');
            return;
          }
          if (!selfCertOtp || selfCertOtp.length < 4) {
            toast.error('Please enter OTP received from ULB Haryana portal');
            return;
          }
        }
      }
    }

    // Photo is ALWAYS compulsory - even for special conditions
    if (!housePhoto) {
      toast.error('Property photo is required');
      return;
    }

    setSubmitting(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('receiver_name', formData.receiver_name || (specialCondition === 'house_locked' ? 'House Locked' : specialCondition === 'owner_denied' ? 'Owner Denied' : ''));
      formDataObj.append('receiver_mobile', formData.receiver_mobile || '');
      formDataObj.append('relation', formData.relation || (canSkipRequiredFields ? 'N/A' : ''));
      formDataObj.append('remarks', formData.remarks || (specialCondition ? `Special Condition: ${specialCondition === 'house_locked' ? 'House Locked' : 'Owner Denied'}` : ''));
      formDataObj.append('special_condition', specialCondition || '');
      formDataObj.append('latitude', location.latitude);
      formDataObj.append('longitude', location.longitude);
      
      // Self Certification data
      if (property?.self_certified !== true) {
        // Non-self-certified: send status and OTP if done
        formDataObj.append('self_cert_status', selfCertStatus || ''); // done, later, deny
        if (selfCertStatus === 'done') {
          formDataObj.append('self_cert_mobile', selfCertMobile || '');
          formDataObj.append('self_cert_otp', selfCertOtp || '');
        }
        formDataObj.append('self_satisfied', selfCertStatus === 'done' ? 'yes' : 'no');
      } else {
        formDataObj.append('self_cert_status', 'already_certified');
        formDataObj.append('self_satisfied', 'yes'); // Self-certified properties are auto-satisfied
      }
      
      // Photo is compulsory - always append
      formDataObj.append('house_photo', housePhoto);
      
      formDataObj.append('authorization', `Bearer ${token}`);

      await axios.post(`${API_URL}/employee/submit/${propertyId}`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Survey submitted successfully!');
      navigate('/employee/properties');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    const remarks = prompt('Please enter reason for flagging:');
    if (!remarks) return;

    try {
      const formDataObj = new FormData();
      formDataObj.append('remarks', remarks);
      formDataObj.append('authorization', `Bearer ${token}`);

      await axios.post(`${API_URL}/employee/flag/${propertyId}`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Property flagged');
      navigate('/employee/properties');
    } catch (error) {
      toast.error('Failed to flag property');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isCompleted = property?.status === 'Completed';

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header with Serial Number */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-30">
        <div className="flex items-center px-4 h-16">
          <button
            onClick={() => navigate('/employee/properties')}
            className="mr-3 text-white/80 hover:text-white"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-semibold">
                {isCompleted ? 'View Survey' : 'Survey Form'}
              </h1>
              {/* Serial Number Badge in Header */}
              <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold">
                Sr: {property?.bill_sr_no || property?.serial_number || '-'}
              </span>
            </div>
            <p className="text-xs text-white/70">{property?.property_id} • {property?.owner_name}</p>
          </div>
          {!isCompleted && (
            <button onClick={handleFlag} className="text-white/80 hover:text-white p-2" data-testid="flag-btn">
              <Flag className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="p-4 space-y-4" data-testid="survey-form">
        {/* Attendance Lock Screen */}
        {checkingAttendance ? (
          <Card className="border-2 border-blue-200">
            <CardContent className="py-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-2" />
              <p className="text-slate-600">Checking attendance status...</p>
            </CardContent>
          </Card>
        ) : !attendanceMarked && !isCompleted ? (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="py-8 text-center">
              <Lock className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-red-700 mb-2">Survey Locked</h3>
              <p className="text-red-600 mb-4">Please mark your attendance before starting survey</p>
              <Button 
                onClick={() => navigate('/employee/attendance')}
                className="bg-red-600 hover:bg-red-700"
              >
                Mark Attendance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Property Info Card - Property ID BIG, Serial Number small */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-mono uppercase tracking-wider">
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm pt-3">
            {/* Property ID - BIG and prominent */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <span className="text-blue-600 text-xs font-semibold">PROPERTY ID</span>
              <p className="text-2xl font-bold text-blue-700">{property?.property_id || '-'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 text-xs">Sr. No:</span>
                <span className="font-medium text-gray-700">{property?.bill_sr_no || property?.serial_number || '-'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 text-xs">Owner</span>
                <p className="font-medium">{property?.owner_name || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Mobile</span>
                <p className="font-mono">{property?.mobile || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Colony</span>
                <p className="font-medium">{property?.colony || property?.ward || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Category</span>
                <p className="font-medium">{property?.category || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Total Area</span>
                <p className="font-medium">{property?.total_area || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Total Amount</span>
                <p className="font-medium text-red-600">₹{property?.amount || '0'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 text-xs">Address</span>
                <p className="font-medium text-xs">{property?.address || '-'}</p>
              </div>
            </div>
            {property?.latitude && property?.longitude && (
              <div className="pt-2 border-t">
                <span className="text-slate-500 text-xs">GPS Coordinates</span>
                <p className="font-mono text-xs">{property?.latitude?.toFixed(6)}, {property?.longitude?.toFixed(6)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPS Status */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  gpsStatus === 'success' ? 'bg-emerald-100' :
                  gpsStatus === 'error' ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  <MapPin className={`w-5 h-5 ${
                    gpsStatus === 'success' ? 'text-emerald-600' :
                    gpsStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {gpsStatus === 'loading' ? 'Getting location...' :
                     gpsStatus === 'success' ? 'Location captured' :
                     gpsStatus === 'error' ? 'Location failed' : 'GPS Status'}
                  </p>
                  {gpsStatus === 'success' && (
                    <p className="text-xs text-slate-500 font-mono">
                      {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={getLocation} disabled={gpsStatus === 'loading'}>
                <Navigation className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            {/* Distance Check */}
            {property?.latitude && property?.longitude && distanceFromProperty !== null && (
              <div className={`mt-3 p-3 rounded-lg ${withinRange ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {withinRange ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${withinRange ? 'text-emerald-700' : 'text-red-700'}`}>
                      {withinRange ? 'Within range' : 'Out of range'} - {distanceFromProperty}m from property
                    </p>
                    <p className="text-xs text-slate-600">
                      {withinRange ? 'You can submit the survey' : 'Move closer to the property (within 50m)'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isCompleted && (
          <>
            {/* Special Conditions - House Locked / Owner Denied */}
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  Special Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-amber-700">
                  Select if you cannot complete normal survey due to one of these conditions:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSpecialCondition(specialCondition === 'house_locked' ? '' : 'house_locked')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      specialCondition === 'house_locked'
                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
                    }`}
                    data-testid="house-locked-btn"
                  >
                    <Lock className={`w-6 h-6 ${specialCondition === 'house_locked' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">House Locked</span>
                    {specialCondition === 'house_locked' && (
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecialCondition(specialCondition === 'owner_denied' ? '' : 'owner_denied')}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      specialCondition === 'owner_denied'
                        ? 'border-red-500 bg-red-100 text-red-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'
                    }`}
                    data-testid="owner-denied-btn"
                  >
                    <XCircle className={`w-6 h-6 ${specialCondition === 'owner_denied' ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">Owner Denied</span>
                    {specialCondition === 'owner_denied' && (
                      <CheckCircle className="w-4 h-4 text-red-600" />
                    )}
                  </button>
                </div>
                {canSkipRequiredFields && (
                  <div className="p-3 bg-white rounded-lg border border-amber-300">
                    <p className="text-xs text-amber-800 font-medium">
                      ✓ You can submit without photo, signature, and receiver details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notice Receiver Details - Only show if no special condition */}
            {!canSkipRequiredFields && (
              <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Notice Receiver Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Receiver Name *</Label>
                  <Input
                    value={formData.receiver_name}
                    onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                    placeholder="Name of person receiving notice"
                    data-testid="receiver-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receiver Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={formData.receiver_mobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, receiver_mobile: value });
                      }}
                      placeholder="10-digit mobile number"
                      className="pl-10"
                      maxLength={10}
                      data-testid="receiver-mobile-input"
                    />
                  </div>
                  {formData.receiver_mobile && !validateMobile(formData.receiver_mobile) && (
                    <p className="text-xs text-red-500">Please enter a valid 10-digit mobile number</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Relation with Owner *</Label>
                  <Select
                    value={formData.relation}
                    onValueChange={(value) => setFormData({ ...formData, relation: value })}
                  >
                    <SelectTrigger data-testid="relation-select">
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Self Certification Section - Conditional based on property.self_certified */}
                {property?.self_certified === true ? (
                  /* SELF-CERTIFIED PROPERTIES: Already done - show success */
                  <div className="p-3 bg-green-100 border-2 border-green-400 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">Property Already Self-Certified ✓</p>
                        <p className="text-xs text-green-700">This property is pre-verified. No additional self-certification required.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NON-SELF-CERTIFIED PROPERTIES: Show radio options */
                  <Card className="border-2 border-orange-300 bg-orange-50">
                    <CardContent className="py-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-orange-800">Self Certification Status *</p>
                          <p className="text-xs text-orange-700 mt-1">
                            Select the self-certification status for this property
                          </p>
                        </div>
                      </div>
                      
                      {/* Radio Button Options */}
                      <div className="space-y-2">
                        {/* Option 1: Self Certified - Done */}
                        <label 
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selfCertStatus === 'done' 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 bg-white hover:border-green-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selfCertStatus"
                            value="done"
                            checked={selfCertStatus === 'done'}
                            onChange={(e) => setSelfCertStatus(e.target.value)}
                            className="w-5 h-5 text-green-600"
                            data-testid="self-cert-done"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-green-700">Self Certified - Done</span>
                            <p className="text-xs text-gray-500">Owner completed self-certification on portal</p>
                          </div>
                          <CheckCircle className={`w-5 h-5 ${selfCertStatus === 'done' ? 'text-green-600' : 'text-gray-300'}`} />
                        </label>
                        
                        {/* Option 2: Owner do later */}
                        <label 
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selfCertStatus === 'later' 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'border-gray-200 bg-white hover:border-yellow-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selfCertStatus"
                            value="later"
                            checked={selfCertStatus === 'later'}
                            onChange={(e) => setSelfCertStatus(e.target.value)}
                            className="w-5 h-5 text-yellow-600"
                            data-testid="self-cert-later"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-yellow-700">Owner Do Later</span>
                            <p className="text-xs text-gray-500">Owner will complete self-certification later</p>
                          </div>
                          <AlertTriangle className={`w-5 h-5 ${selfCertStatus === 'later' ? 'text-yellow-600' : 'text-gray-300'}`} />
                        </label>
                        
                        {/* Option 3: Deny */}
                        <label 
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selfCertStatus === 'deny' 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 bg-white hover:border-red-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selfCertStatus"
                            value="deny"
                            checked={selfCertStatus === 'deny'}
                            onChange={(e) => setSelfCertStatus(e.target.value)}
                            className="w-5 h-5 text-red-600"
                            data-testid="self-cert-deny"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-red-700">Deny</span>
                            <p className="text-xs text-gray-500">Owner denied/refused self-certification</p>
                          </div>
                          <XCircle className={`w-5 h-5 ${selfCertStatus === 'deny' ? 'text-red-600' : 'text-gray-300'}`} />
                        </label>
                      </div>
                      
                      {/* Show OTP fields only when "Done" is selected */}
                      {selfCertStatus === 'done' && (
                        <div className="pt-3 border-t border-orange-200 space-y-3">
                          {/* External Link */}
                          <a 
                            href="https://property.ulbharyana.gov.in/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            data-testid="ulb-portal-link"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open ULB Haryana Portal
                          </a>
                          
                          <p className="text-xs text-orange-700 font-medium">
                            Enter OTP details received from portal:
                          </p>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-orange-700">Mobile Number *</Label>
                              <Input
                                value={selfCertMobile}
                                onChange={(e) => setSelfCertMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="10-digit mobile"
                                maxLength={10}
                                className="h-9 border-orange-300 focus:border-orange-500"
                                data-testid="self-cert-mobile"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-orange-700">OTP Code *</Label>
                              <Input
                                value={selfCertOtp}
                                onChange={(e) => setSelfCertOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="6-digit OTP"
                                maxLength={6}
                                className="h-9 border-orange-300 focus:border-orange-500 font-mono text-center tracking-widest"
                                data-testid="self-cert-otp"
                              />
                            </div>
                          </div>
                          
                          {selfCertMobile.length === 10 && selfCertOtp.length >= 4 && (
                            <div className="p-2 bg-green-100 rounded-lg flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">OTP recorded ✓</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Any additional comments..."
                    rows={2}
                    data-testid="remarks-input"
                  />
                </div>
              </CardContent>
            </Card>
            )}

            {/* Property Photo - Optional if special condition */}
            <Card className={canSkipRequiredFields ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Property Photo {!canSkipRequiredFields && '*'}
                  {canSkipRequiredFields && <span className="text-xs text-amber-600 font-normal">(Optional)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  ref={houseCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoCapture(e, 'house')}
                />
                <input
                  ref={houseGalleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoCapture(e, 'house')}
                />

                {housePhotoPreview ? (
                  <div className="relative">
                    <img
                      src={housePhotoPreview}
                      alt="Property"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {/* Show file size badge */}
                    {housePhoto && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        📷 {(housePhoto.size / 1024).toFixed(0)} KB
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setHousePhoto(null);
                        setHousePhotoPreview(null);
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Retake
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-24"
                      onClick={() => houseCameraRef.current?.click()}
                      disabled={processingPhoto === 'house'}
                    >
                      {processingPhoto === 'house' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Take Photo
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-24"
                      onClick={() => houseGalleryRef.current?.click()}
                      disabled={processingPhoto === 'house'}
                    >
                      Gallery
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Completed Submission View */}
        {isCompleted && submission && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                Survey Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {submission.special_condition && (
                <div className={`p-3 rounded-lg ${
                  submission.special_condition === 'house_locked' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium flex items-center gap-2 ${
                    submission.special_condition === 'house_locked' ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {submission.special_condition === 'house_locked' ? (
                      <><Lock className="w-4 h-4" /> House was Locked</>
                    ) : (
                      <><XCircle className="w-4 h-4" /> Owner Denied</>
                    )}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 text-xs">Receiver</p>
                  <p className="font-medium">{submission.receiver_name || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Receiver Mobile</p>
                  <p className="font-mono">{submission.receiver_mobile || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Relation</p>
                  <p className="font-medium">{submission.relation || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Satisfied</p>
                  <p className="font-medium">{submission.self_satisfied === 'yes' ? 'Yes' : submission.self_satisfied === 'no' ? 'No' : '-'}</p>
                </div>
              </div>
              {submission.correct_colony_name && (
                <div>
                  <p className="text-slate-500 text-xs">Corrected Colony</p>
                  <p className="font-medium">{submission.correct_colony_name}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-xs">Submitted At</p>
                <p className="font-medium">{new Date(submission.submitted_at).toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </main>

      {/* Submit Button */}
      {!isCompleted && attendanceMarked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
            onClick={handleSubmit}
            disabled={submitting || withinRange === false}
            data-testid="submit-survey-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Survey
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

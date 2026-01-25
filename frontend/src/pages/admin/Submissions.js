import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
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
  ClipboardCheck, MapPin, Camera, ChevronLeft, ChevronRight, 
  Eye, Check, X, Edit, User, Phone, Home, Hash, CreditCard, 
  Building, Users, FileText, Pen, Image as ImageIcon, Save,
  ExternalLink, Trash2, Plus, AlertTriangle, Lock, UserX, CheckCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Image compression function to reduce file size before upload
const compressImage = (file, maxSize = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Resize if needed
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
          console.log(`Compressed: ${(file.size/1024).toFixed(0)}KB → ${(compressedFile.size/1024).toFixed(0)}KB`);
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

const RELATION_OPTIONS = [
  'Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother',
  'Brother', 'Sister', 'Tenant', 'Caretaker', 'Other'
];

export default function Submissions() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [colonyFilter, setColonyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [colonies, setColonies] = useState([]);
  const [editData, setEditData] = useState({});
  const [editPropertyData, setEditPropertyData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editPhotos, setEditPhotos] = useState([]);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Check permissions based on role
  const canEdit = user?.role === 'ADMIN';
  const canApproveReject = user?.role === 'ADMIN';

  const employeeIdFilter = searchParams.get('employee_id') || '';

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [pagination.page, statusFilter, employeeFilter, colonyFilter, dateFilter, employeeIdFilter]);

  const fetchFilters = async () => {
    try {
      const [empRes, areasRes] = await Promise.all([
        axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/wards`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { wards: [] } }))
      ]);
      setEmployees(empRes.data.filter(u => u.role !== 'ADMIN'));
      setColonies(areasRes.data.wards || []);
    } catch (error) {
      console.error('Failed to fetch filters');
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', 20);
      if (statusFilter) params.append('status', statusFilter);
      if (employeeIdFilter || employeeFilter) params.append('employee_id', employeeIdFilter || employeeFilter);
      if (colonyFilter) params.append('colony', colonyFilter);
      if (dateFilter) params.append('date_from', dateFilter);

      const response = await axios.get(`${API_URL}/admin/submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSubmissions(response.data.submissions);
      setPagination(prev => ({
        ...prev,
        pages: response.data.pages,
        total: response.data.total
      }));
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = (submission) => {
    setSelectedSubmission(submission);
    setDetailDialog(true);
  };

  const handleApprove = async (submissionId) => {
    try {
      await axios.post(`${API_URL}/admin/submissions/approve`, {
        submission_id: submissionId,
        action: 'APPROVE'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Submission approved');
      fetchSubmissions();
      setDetailDialog(false);
    } catch (error) {
      toast.error('Failed to approve submission');
    }
  };

  const openRejectDialog = (submission) => {
    setSelectedSubmission(submission);
    setRejectRemarks('');
    setRejectDialog(true);
  };

  const handleReject = async () => {
    if (!rejectRemarks.trim()) {
      toast.error('Remarks are required for rejection');
      return;
    }

    try {
      await axios.post(`${API_URL}/admin/submissions/approve`, {
        submission_id: selectedSubmission.id,
        action: 'REJECT',
        remarks: rejectRemarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Submission rejected');
      fetchSubmissions();
      setRejectDialog(false);
      setDetailDialog(false);
    } catch (error) {
      toast.error('Failed to reject submission');
    }
  };

  const openEditDialog = (submission) => {
    setSelectedSubmission(submission);
    // Submission data - matching Survey.js fields
    setEditData({
      receiver_name: submission.receiver_name || '',
      receiver_mobile: submission.receiver_mobile || '',
      relation: submission.relation || '',
      correct_colony_name: submission.correct_colony_name || '',
      remarks: submission.remarks || '',
      self_satisfied: submission.self_satisfied || '',
      latitude: submission.latitude || '',
      longitude: submission.longitude || ''
    });
    // Property data
    setEditPropertyData({
      property_id: submission.property_id || '',
      owner_name: submission.property_owner_name || '',
      mobile: submission.property_mobile || '',
      address: submission.property_address || '',
      amount: submission.property_amount || '',
      ward: submission.property_ward || ''
    });
    // Photos - filter duplicates
    const uniquePhotos = submission.photos?.filter((photo, index, self) => 
      index === self.findIndex(p => p.file_url === photo.file_url)
    ) || [];
    setEditPhotos(uniquePhotos);
    setEditDialog(true);
  };

  const handleEdit = async () => {
    setSavingEdit(true);
    try {
      // Update submission with new data and updated photos
      const updateData = {
        ...editData,
        photos: editPhotos
      };
      
      await axios.put(`${API_URL}/admin/submissions/${selectedSubmission.id}`, updateData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      toast.success('Survey submission updated successfully');
      fetchSubmissions();
      setEditDialog(false);
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePhoto = (photoIndex) => {
    const newPhotos = editPhotos.filter((_, idx) => idx !== photoIndex);
    setEditPhotos(newPhotos);
    toast.success('Photo removed. Click Save to apply changes.');
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, 1200, 0.7);
      
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('submission_id', selectedSubmission.id);
      formData.append('photo_type', 'HOUSE');
      
      const response = await axios.post(`${API_URL}/admin/submissions/upload-photo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add new photo to list
      const newPhoto = {
        file_url: response.data.file_url,
        file_id: response.data.file_id,
        photo_type: 'HOUSE'
      };
      setEditPhotos([...editPhotos, newPhoto]);
      toast.success('Photo added successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Pending': 'bg-amber-100 text-amber-700',
      'Approved': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-slate-100 text-slate-700'}`}>
        {status || 'Pending'}
      </span>
    );
  };

  return (
    <AdminLayout title="Survey Submissions">
      <div data-testid="admin-submissions" className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Employee</label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Status</SelectItem>
                    <SelectItem value="Pending">Pending Review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Colony Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Colony</label>
                <Select value={colonyFilter} onValueChange={setColonyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Colonies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Colonies</SelectItem>
                    {colonies.map(colony => (
                      <SelectItem key={colony} value={colony}>{colony}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Filter */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-10"
                />
              </div>
              
              {/* Total Count */}
              <div className="text-sm text-slate-500 flex items-center">
                Total: <span className="font-semibold ml-1">{pagination.total}</span> submissions
                {employeeIdFilter && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Filtered by employee</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse-slow text-slate-500">Loading...</div>
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No submissions yet</h3>
              <p className="text-slate-500">Survey submissions from employees will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-lg border-0">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Sr. No</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Property ID</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Owner</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Owner Mobile</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Colony</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Receiver</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Receiver Mobile</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Relation</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Submit Date</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-3 py-3 font-bold text-red-600">{sub.bill_sr_no || sub.serial_number || '-'}</td>
                        <td className="px-3 py-3 font-mono font-medium text-blue-600">{sub.property_id}</td>
                        <td className="px-3 py-3">{sub.property_owner_name || '-'}</td>
                        <td className="px-3 py-3 font-mono text-xs">{sub.property_mobile || '-'}</td>
                        <td className="px-3 py-3 text-xs">{sub.colony || sub.property_ward || '-'}</td>
                        <td className="px-3 py-3">{sub.receiver_name || '-'}</td>
                        <td className="px-3 py-3 font-mono text-xs">{sub.receiver_mobile || '-'}</td>
                        <td className="px-3 py-3 text-xs">{sub.relation || '-'}</td>
                        <td className="px-3 py-3 text-xs">{sub.employee_name}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {new Date(sub.submitted_at).toLocaleDateString('en-IN')} {new Date(sub.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-3">{getStatusBadge(sub.status)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewDetail(sub)}
                              title="View Details"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(sub)}
                                title="Edit"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Detail View Dialog */}
        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center justify-between">
                <span>Submission Details - {selectedSubmission?.property_id}</span>
                {selectedSubmission && getStatusBadge(selectedSubmission.status)}
              </DialogTitle>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4">
                {/* Property Info Header - Same format as Surveyor Map */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Property ID</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{selectedSubmission.property_id || '-'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Sr. No:</span>
                    <span className="font-bold text-red-600">{selectedSubmission.bill_sr_no || selectedSubmission.serial_number || '-'}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    selectedSubmission.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                    selectedSubmission.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedSubmission.status === 'Approved' ? '✓ ' : ''}
                    {selectedSubmission.status}
                  </span>
                </div>

                {/* Property Details Grid - Same as Surveyor Map */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Owner</div>
                    <div className="font-semibold text-gray-900">{selectedSubmission.property_owner_name || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Owner Mobile</div>
                    {selectedSubmission.property_mobile ? (
                      <a href={`tel:${selectedSubmission.property_mobile}`} className="font-semibold text-blue-600 underline">
                        {selectedSubmission.property_mobile}
                      </a>
                    ) : (
                      <div className="text-gray-400">-</div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Colony</div>
                    <div className="font-medium text-gray-800">{selectedSubmission.colony || selectedSubmission.property_ward || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Area</div>
                    <div className="font-medium text-gray-800">{selectedSubmission.total_area || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Category</div>
                    <div className="font-medium text-gray-800">{selectedSubmission.category || 'Residential'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Amount</div>
                    <div className="font-bold text-red-600 text-lg">₹{selectedSubmission.property_amount || '0'}</div>
                  </div>
                </div>

                {/* Receiver Details */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Survey Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Receiver Name</div>
                      <div className="font-medium">{selectedSubmission.receiver_name || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Receiver Mobile</div>
                      <div className="font-mono">{selectedSubmission.receiver_mobile || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Relation</div>
                      <div className="font-medium">{selectedSubmission.relation || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Self Certification</div>
                      <div className="font-medium">{selectedSubmission.self_cert_status || selectedSubmission.self_satisfied || '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Employee</div>
                      <div className="font-medium">{selectedSubmission.employee_name}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Submit Date</div>
                      <div className="font-medium text-xs">{new Date(selectedSubmission.submitted_at).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                {/* Special Condition */}
                {selectedSubmission.special_condition && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs text-amber-600 font-medium">Special Condition</div>
                    <div className="font-semibold text-amber-800">
                      {selectedSubmission.special_condition === 'house_locked' ? 'House Locked' : 
                       selectedSubmission.special_condition === 'owner_denied' ? 'Owner Denied' : 
                       selectedSubmission.special_condition}
                    </div>
                  </div>
                )}

                {/* GPS */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">GPS Location</span>
                  </div>
                  <p className="font-mono text-sm text-gray-700">
                    {selectedSubmission.latitude?.toFixed(6)}, {selectedSubmission.longitude?.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${selectedSubmission.latitude},${selectedSubmission.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View on Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Remarks */}
                {selectedSubmission.remarks && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Remarks</div>
                    <p className="text-gray-800">{selectedSubmission.remarks}</p>
                  </div>
                )}

                {/* Review Remarks */}
                {selectedSubmission.review_remarks && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-600 font-medium">Rejection Remarks</div>
                    <p className="mt-1 text-red-800">{selectedSubmission.review_remarks}</p>
                  </div>
                )}

                {/* Photos */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 block">Photos</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Filter out duplicate photos (same file_url) and show only unique photos */}
                    {selectedSubmission.photos?.filter((photo, index, self) => 
                      index === self.findIndex(p => p.file_url === photo.file_url)
                    ).map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`}
                          alt={photo.photo_type}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90"
                          onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`, '_blank')}
                        />
                        <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${
                          photo.photo_type === 'HOUSE' ? 'bg-blue-100 text-blue-700' :
                          photo.photo_type === 'GATE' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {photo.photo_type === 'HOUSE' ? 'PROPERTY' : photo.photo_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                {selectedSubmission.signature_url && (
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 block">Property Holder Signature</label>
                    <div className="border rounded-lg bg-white p-4">
                      <img
                        src={`${process.env.REACT_APP_BACKEND_URL}${selectedSubmission.signature_url}`}
                        alt="Signature"
                        className="w-full h-24 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {canEdit && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailDialog(false);
                        openEditDialog(selectedSubmission);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Details
                    </Button>
                  )}
                  {canApproveReject && (!selectedSubmission.status || selectedSubmission.status === 'Pending') && (
                    <>
                      <Button
                        onClick={() => handleApprove(selectedSubmission.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openRejectDialog(selectedSubmission)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Reject Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">Please provide a reason for rejection (mandatory):</p>
              <Textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Full Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  Edit Submission - {selectedSubmission?.property_id}
                </span>
                {selectedSubmission && getStatusBadge(selectedSubmission.status)}
              </DialogTitle>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-6">
                {/* Property Details Section - READ ONLY */}
                <Card className="border-slate-200 bg-slate-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        PROPERTY DETAILS (Excel Data - Read Only)
                      </span>
                      <span className="text-xs font-normal bg-slate-200 text-slate-600 px-2 py-1 rounded">Cannot Edit</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-slate-500">Serial Number</Label>
                        <p className="font-mono font-medium text-slate-800">
                          {selectedSubmission.property_serial_na ? (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">N/A</span>
                          ) : (
                            selectedSubmission.property_serial_number || '-'
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Property ID</Label>
                        <p className="font-mono font-medium text-slate-800">{selectedSubmission.property_id || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Owner Name</Label>
                        <p className="font-medium text-slate-800">{selectedSubmission.property_owner_name || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Mobile</Label>
                        <p className="font-mono text-slate-800">{selectedSubmission.property_mobile || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-slate-500">Address</Label>
                        <p className="text-slate-800">{selectedSubmission.property_address || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Amount</Label>
                        <p className="font-mono font-semibold text-emerald-700">₹{selectedSubmission.property_amount || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Conditions - same as Survey Form */}
                {(selectedSubmission.special_condition || selectedSubmission.self_certified !== undefined) && (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                        <AlertTriangle className="w-4 h-4" />
                        SPECIAL CONDITIONS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedSubmission.special_condition && (
                          <div className="col-span-2">
                            <Label className="text-xs text-slate-500">Special Condition</Label>
                            <div className={`mt-1 px-3 py-2 rounded-lg flex items-center gap-2 ${
                              selectedSubmission.special_condition === 'house_locked' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {selectedSubmission.special_condition === 'house_locked' ? (
                                <>
                                  <Lock className="w-4 h-4" />
                                  <span className="font-semibold">House Locked</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-4 h-4" />
                                  <span className="font-semibold">Owner Denied</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-slate-500">Self Certified</Label>
                          <div className={`mt-1 px-3 py-2 rounded-lg flex items-center gap-2 ${
                            selectedSubmission.self_certified 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-semibold">{selectedSubmission.self_certified ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Survey Submission Details - EDITABLE */}
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between text-emerald-700">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        SURVEY SUBMISSION DETAILS (Surveyor Data)
                      </span>
                      <span className="text-xs font-normal bg-emerald-200 text-emerald-700 px-2 py-1 rounded">Editable</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Receiver Name
                        </Label>
                        <Input
                          value={editData.receiver_name}
                          onChange={(e) => setEditData({ ...editData, receiver_name: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Receiver Mobile
                        </Label>
                        <Input
                          value={editData.receiver_mobile}
                          onChange={(e) => setEditData({ ...editData, receiver_mobile: e.target.value })}
                          className="bg-white font-mono"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600">Relation with Owner</Label>
                        <Select
                          value={editData.relation}
                          onValueChange={(value) => setEditData({ ...editData, relation: value })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select relation" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATION_OPTIONS.map((rel) => (
                              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 flex items-center gap-1">
                          <Building className="w-3 h-3" /> Correct Colony Name
                        </Label>
                        <Input
                          value={editData.correct_colony_name}
                          onChange={(e) => setEditData({ ...editData, correct_colony_name: e.target.value })}
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600">Self Satisfied</Label>
                        <Select
                          value={editData.self_satisfied}
                          onValueChange={(value) => setEditData({ ...editData, self_satisfied: value })}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* GPS Coordinates */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Latitude
                        </Label>
                        <Input
                          value={editData.latitude}
                          onChange={(e) => setEditData({ ...editData, latitude: e.target.value })}
                          className="bg-white font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Longitude
                        </Label>
                        <Input
                          value={editData.longitude}
                          onChange={(e) => setEditData({ ...editData, longitude: e.target.value })}
                          className="bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600">Remarks</Label>
                      <Textarea
                        value={editData.remarks}
                        onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Photos Section - with Delete and Add */}
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-700">
                      <span className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        PHOTOS (with GPS Watermark)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="h-7 text-xs"
                      >
                        {uploadingPhoto ? (
                          <>Uploading...</>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add Photo
                          </>
                        )}
                      </Button>
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        onChange={handleAddPhoto}
                        className="hidden"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editPhotos?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {editPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`}
                              alt={photo.photo_type}
                              className="w-full h-40 object-cover rounded-lg border-2 border-white shadow cursor-pointer"
                              onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`, '_blank')}
                            />
                            <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold shadow ${
                              photo.photo_type === 'HOUSE' ? 'bg-blue-500 text-white' :
                              photo.photo_type === 'GATE' ? 'bg-amber-500 text-white' :
                              'bg-slate-500 text-white'
                            }`}>
                              {photo.photo_type}
                            </span>
                            {/* Delete Button - Always visible with red background */}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-600 hover:bg-red-700 shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Are you sure you want to delete this photo?')) {
                                  handleDeletePhoto(idx);
                                }
                              }}
                              title="Delete Photo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-2 right-2 h-7 text-xs bg-white/90 hover:bg-white shadow"
                              onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${photo.file_url}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> View Full
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No photos available</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => photoInputRef.current?.click()}
                          className="mt-2"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Photo
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Signature Section */}
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-700">
                      <Pen className="w-4 h-4" />
                      PROPERTY HOLDER SIGNATURE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSubmission.signature_url ? (
                      <div className="bg-white border-2 border-dashed border-purple-200 rounded-lg p-4">
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}${selectedSubmission.signature_url}`}
                          alt="Signature"
                          className="max-h-28 mx-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Pen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No signature available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Submission Info */}
                <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
                  <span>Submitted by: <strong>{selectedSubmission.employee_name}</strong></span>
                  <span>Date: <strong>{new Date(selectedSubmission.submitted_at).toLocaleString()}</strong></span>
                  <span>Status: {getStatusBadge(selectedSubmission.status)}</span>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4 pt-4 border-t flex-wrap gap-2">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={savingEdit} className="bg-blue-600 hover:bg-blue-700">
                  {savingEdit ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
              {canApproveReject && (!selectedSubmission?.status || selectedSubmission?.status === 'Pending') && (
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    onClick={() => {
                      setEditDialog(false);
                      handleApprove(selectedSubmission.id);
                    }}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setEditDialog(false);
                      openRejectDialog(selectedSubmission);
                    }}
                    variant="destructive"
                    className="flex-1 sm:flex-none"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

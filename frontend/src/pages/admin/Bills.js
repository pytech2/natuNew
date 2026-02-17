import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  CheckCircle,
  Download,
  Map,
  Users,
  ArrowUpDown,
  Edit,
  Trash2,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Copy,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function BillsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [colonies, setColonies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [batchStats, setBatchStats] = useState(null);  // Batch skip statistics
  const [colonyStats, setColonyStats] = useState(null);  // Colony statistics
  const [towns, setTowns] = useState([]);  // Towns list
  
  // Filters
  const [filters, setFilters] = useState({
    batch_id: '',
    colony: '',
    town: '',
    search: ''
  });
  
  // Upload state - now supports multiple files
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [batchName, setBatchName] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);
  
  // Edit state
  const [editDialog, setEditDialog] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  
  // Generate PDF state
  const [generateDialog, setGenerateDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    sn_position: 'top-right',
    sn_font_size: 48,
    sn_color: 'red',
    bills_per_page: '1',
    print_serial: true,
    self_certified_filter: 'all',
    skip_na_names: true,
    skip_vacant: true
  });
  
  // Split by employee state
  const [splitDialog, setSplitDialog] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [generatedFiles, setGeneratedFiles] = useState([]);

  // Delete all state
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete by colony state
  const [deleteColonyDialog, setDeleteColonyDialog] = useState(false);
  const [selectedColonyToDelete, setSelectedColonyToDelete] = useState('');
  const [colonyBillCount, setColonyBillCount] = useState(0);

  // Copy to properties state
  const [copyDialog, setCopyDialog] = useState(false);
  const [copying, setCopying] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [skipVacantPlots, setSkipVacantPlots] = useState(false);
  const [skipNaNames, setSkipNaNames] = useState(false);
  const [skipDuplicateGPS, setSkipDuplicateGPS] = useState(false);

  // Excel Export state
  const [excelDialog, setExcelDialog] = useState(false);
  const [excelFilter, setExcelFilter] = useState('all'); // 'all', 'self_certified', 'not_self_certified'
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // Self-Certification Upload state
  const [selfCertDialog, setSelfCertDialog] = useState(false);
  const [selfCertFile, setSelfCertFile] = useState(null);
  const [uploadingSelfCert, setUploadingSelfCert] = useState(false);
  const [selfCertStats, setSelfCertStats] = useState(null);

  // GPS Arrangement confirmation dialog
  const [gpsArrangeDialog, setGpsArrangeDialog] = useState(false);
  const [arranging, setArranging] = useState(false);

  // Generated PDFs state - for downloading previously generated PDFs
  const [generatedPdfs, setGeneratedPdfs] = useState([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [downloadPdfDialog, setDownloadPdfDialog] = useState(false);
  const [selectedColonyForDownload, setSelectedColonyForDownload] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchColonies();
    fetchTowns();
    fetchEmployees();
    fetchGeneratedPdfs(); // Fetch previously generated PDFs
  }, []);

  useEffect(() => {
    fetchBills();
  }, [filters, pagination.page]);

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/batches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pdfBatches = (response.data || []).filter(b => b.type === 'PDF_BILLS');
      setBatches(pdfBatches);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchTowns = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/towns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTowns(response.data.towns || []);
    } catch (error) {
      console.error('Failed to fetch towns:', error);
    }
  };

  const fetchBatchStats = async (batchId) => {
    if (!batchId) {
      setBatchStats(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/admin/bills/batch-stats/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatchStats(response.data);
    } catch (error) {
      console.error('Failed to fetch batch stats:', error);
      setBatchStats(null);
    }
  };

  const fetchColonyStats = async (colonyName) => {
    if (!colonyName || colonyName.trim() === '') {
      setColonyStats(null);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/admin/bills/colony-stats/${encodeURIComponent(colonyName.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColonyStats(response.data);
    } catch (error) {
      console.error('Failed to fetch colony stats:', error);
      setColonyStats(null);
    }
  };

  const fetchColonies = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/bills/colonies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColonies(response.data.colonies || []);
    } catch (error) {
      console.error('Failed to fetch colonies:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to get surveyors and other field employees
      const empList = (response.data || []).filter(u => u.role !== 'ADMIN');
      setEmployees(empList);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  // Fetch previously generated PDFs grouped by colony
  const fetchGeneratedPdfs = async () => {
    setLoadingPdfs(true);
    try {
      const response = await axios.get(`${API_URL}/admin/generated-pdfs/by-colony`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedPdfs(response.data.colonies || []);
    } catch (error) {
      console.error('Failed to fetch generated PDFs:', error);
    } finally {
      setLoadingPdfs(false);
    }
  };

  // Download a previously generated PDF
  const handleDownloadPreviousPdf = async (filename) => {
    try {
      const response = await axios.get(
        `${API_URL}/admin/generated-pdfs/download/${filename}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.batch_id) params.append('batch_id', filters.batch_id);
      if (filters.colony) params.append('colony', filters.colony);
      if (filters.town) params.append('town', filters.town);
      params.append('page', pagination.page);
      params.append('limit', 20);

      const response = await axios.get(`${API_URL}/admin/bills?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(response.data.bills || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        pages: response.data.pages
      }));
    } catch (error) {
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      // Filter only PDF files
      const pdfFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
      const nonPdfCount = selectedFiles.length - pdfFiles.length;
      
      if (nonPdfCount > 0) {
        toast.warning(`${nonPdfCount} non-PDF file(s) skipped`);
      }
      
      if (pdfFiles.length === 0) {
        toast.error('Please select PDF files only');
        return;
      }
      
      setFiles(pdfFiles);
      if (!batchName && pdfFiles.length === 1) {
        setBatchName(pdfFiles[0].name.replace('.pdf', ''));
      } else if (!batchName && pdfFiles.length > 1) {
        setBatchName(`Bulk Upload ${new Date().toLocaleDateString('en-IN')}`);
      }
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !batchName) {
      toast.error('Please select file(s) and enter batch name');
      return;
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    let totalBills = 0;
    let totalSkipped = 0;
    let failedFiles = [];

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          // Use file name as batch name for multiple files, else use user-provided batch name
          const currentBatchName = files.length > 1 ? file.name.replace('.pdf', '') : batchName;
          formData.append('batch_name', currentBatchName);
          formData.append('authorization', `Bearer ${token}`);

          const response = await axios.post(`${API_URL}/admin/bills/upload-pdf`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          totalBills += response.data.total_bills || 0;
          totalSkipped += response.data.skipped_bills || 0;
        } catch (error) {
          failedFiles.push(file.name);
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      // Show summary message
      if (failedFiles.length === 0) {
        if (totalSkipped > 0) {
          toast.success(`✅ Uploaded ${totalBills} bills from ${files.length} file(s). ⚠️ Skipped ${totalSkipped} records with NA/empty owner names.`, {
            duration: 5000
          });
        } else {
          toast.success(`✅ Successfully uploaded ${totalBills} bills from ${files.length} file(s)!`);
        }
      } else {
        toast.warning(`Uploaded ${totalBills} bills. Failed files: ${failedFiles.join(', ')}`, {
          duration: 7000
        });
      }
      
      setUploadDialog(false);
      setFiles([]);
      setBatchName('');
      setUploadProgress({ current: 0, total: 0 });
      fetchBatches();
      fetchColonies();
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleExcelDownload = async () => {
    setDownloadingExcel(true);
    try {
      const params = new URLSearchParams();
      if (filters.batch_id && filters.batch_id.trim()) {
        params.append('batch_id', filters.batch_id.trim());
      }
      if (filters.colony && filters.colony.trim()) {
        params.append('colony', filters.colony.trim());
      }
      if (excelFilter !== 'all') {
        params.append('self_cert_filter', excelFilter);
      }

      const response = await axios.get(`${API_URL}/admin/bills/export-excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'bills_export.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel file downloaded successfully');
      setExcelDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to download Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleArrangeByRoute = () => {
    // Show confirmation dialog instead of immediately arranging
    setGpsArrangeDialog(true);
  };

  const confirmGpsArrangement = async () => {
    setArranging(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);

      const response = await axios.post(`${API_URL}/admin/bills/arrange-by-route`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      fetchBills();
      setGpsArrangeDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to arrange bills');
    } finally {
      setArranging(false);
    }
  };

  const [generatingSerial, setGeneratingSerial] = useState(false);

  const handleGenerateSerialByGps = async () => {
    if (!window.confirm('GPS ke basis par sabhi bills ko naye serial numbers (1, 2, 3...) assign karein? NA serial wale bills ko bhi serial milega.')) return;
    setGeneratingSerial(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);

      const response = await axios.post(`${API_URL}/admin/bills/generate-serial-by-gps`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate serial numbers');
    } finally {
      setGeneratingSerial(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);
      formData.append('bills_per_page', pdfOptions.bills_per_page || '1');
      formData.append('print_serial', pdfOptions.print_serial ? 'true' : 'false');
      formData.append('self_certified_filter', pdfOptions.self_certified_filter || 'all');
      formData.append('skip_na_names', pdfOptions.skip_na_names ? 'true' : 'false');
      formData.append('skip_vacant', pdfOptions.skip_vacant ? 'true' : 'false');

      const response = await axios.post(`${API_URL}/admin/bills/generate-pdf`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setGenerateDialog(false);
      
      // Auto download PDF immediately
      if (response.data.filename) {
        toast.info('Starting download...');
        
        try {
          // Direct download using blob
          const downloadResponse = await axios.get(
            `${API_URL}/uploads/${response.data.filename}`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'blob',
              timeout: 120000 // 2 minute timeout for large files
            }
          );
          
          // Create download link
          const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success('PDF downloaded successfully!');
        } catch (downloadError) {
          console.error('Blob download failed:', downloadError);
          // Fallback: Open in new tab
          const directUrl = `${process.env.REACT_APP_BACKEND_URL}/api/uploads/${response.data.filename}`;
          window.open(directUrl, '_blank');
          toast.info('PDF opened in new tab - please save it manually');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleSplitByEmployee = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setSplitting(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);
      formData.append('employee_ids', selectedEmployees.join(','));
      formData.append('sn_font_size', pdfOptions.sn_font_size);
      formData.append('sn_color', pdfOptions.sn_color);
      formData.append('skip_na_names', pdfOptions.skip_na_names ? 'true' : 'false');
      formData.append('skip_vacant', pdfOptions.skip_vacant ? 'true' : 'false');

      const response = await axios.post(`${API_URL}/admin/bills/split-by-employees`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setGeneratedFiles(response.data.files);
      
      // Save each generated file to database for future downloads
      if (response.data.files && response.data.files.length > 0) {
        for (const file of response.data.files) {
          try {
            const saveFormData = new FormData();
            saveFormData.append('colony', `${filters.colony || 'All'} - ${file.employee_name}`);
            saveFormData.append('filename', file.filename);
            saveFormData.append('download_url', file.download_url);
            saveFormData.append('pdf_type', 'split_by_employee');
            saveFormData.append('total_records', file.bill_count || 0);
            
            await axios.post(`${API_URL}/admin/generated-pdfs/save`, saveFormData, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            });
          } catch (saveError) {
            console.error('Failed to save PDF record:', saveError);
          }
        }
        fetchGeneratedPdfs(); // Refresh the list
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to split PDF');
    } finally {
      setSplitting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);

      const response = await axios.post(`${API_URL}/admin/bills/delete-all`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setDeleteAllDialog(false);
      fetchBills();
      fetchBatches();
      fetchColonies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete bills');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteByColony = async () => {
    if (!selectedColonyToDelete) {
      toast.error('Please select a colony to delete');
      return;
    }
    
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.append('colony', selectedColonyToDelete);

      const response = await axios.post(`${API_URL}/admin/bills/delete-all`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setDeleteColonyDialog(false);
      setSelectedColonyToDelete('');
      setColonyBillCount(0);
      fetchBills();
      fetchBatches();
      fetchColonies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete colony bills');
    } finally {
      setDeleting(false);
    }
  };

  const fetchColonyBillCount = async (colonyName) => {
    try {
      const params = new URLSearchParams();
      params.append('colony', colonyName);
      params.append('page', 1);
      params.append('limit', 1);
      
      const response = await axios.get(`${API_URL}/admin/bills?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColonyBillCount(response.data.total || 0);
    } catch (error) {
      setColonyBillCount(0);
    }
  };

  const handleCopyToProperties = async () => {
    setCopying(true);
    try {
      const formData = new FormData();
      if (filters.batch_id) formData.append('batch_id', filters.batch_id);
      if (filters.colony) formData.append('colony', filters.colony);
      formData.append('skip_duplicates', skipDuplicates.toString());
      formData.append('skip_vacant_plots', skipVacantPlots.toString());
      formData.append('skip_na_names', skipNaNames.toString());
      formData.append('skip_duplicate_gps', skipDuplicateGPS.toString());

      const response = await axios.post(`${API_URL}/admin/bills/copy-to-properties`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setCopyDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to copy bills to properties');
    } finally {
      setCopying(false);
    }
  };

  // Self-Certification Upload Handler
  const handleUploadSelfCert = async () => {
    if (!selfCertFile) {
      toast.error('Please select an Excel file');
      return;
    }

    setUploadingSelfCert(true);
    try {
      const formData = new FormData();
      formData.append('file', selfCertFile);

      const response = await axios.post(`${API_URL}/admin/upload-self-certification`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message);
      setSelfCertStats(response.data);
      setSelfCertFile(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload self-certification data');
    } finally {
      setUploadingSelfCert(false);
    }
  };

  // Fetch self-certification stats
  const fetchSelfCertStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/self-certification-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelfCertStats(response.data);
    } catch (error) {
      console.error('Failed to fetch self-cert stats');
    }
  };

  const handleEditBill = (bill) => {
    setEditingBill({ ...bill });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const formData = new FormData();
      Object.keys(editingBill).forEach(key => {
        if (editingBill[key] !== null && editingBill[key] !== undefined) {
          formData.append(key, editingBill[key]);
        }
      });

      await axios.put(`${API_URL}/admin/bills/${editingBill.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Bill updated successfully');
      setEditDialog(false);
      fetchBills();
    } catch (error) {
      toast.error('Failed to update bill');
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  return (
    <AdminLayout title="PDF Bills Management">
      <div data-testid="bills-page" className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900">PDF Bills</h1>
            <p className="text-slate-500">Upload, process, and manage property tax bills</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setUploadDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="upload-pdf-btn"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
          </div>
        </div>


        {/* Main Content - Full Width */}
        <div className="space-y-6">
            {/* Filters & Actions */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={filters.batch_id}
                    onValueChange={(value) => {
                      setFilters({ ...filters, batch_id: value });
                      fetchBatchStats(value.trim());
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">All Batches</SelectItem>
                      {batches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.colony}
                onValueChange={(value) => {
                  setFilters({ ...filters, colony: value });
                  fetchColonyStats(value.trim());
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Colony" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Colonies</SelectItem>
                  {colonies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.town}
                onValueChange={(value) => setFilters({ ...filters, town: value })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select Town" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Towns</SelectItem>
                  {towns.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <Button
                variant="outline"
                onClick={handleArrangeByRoute}
                disabled={pagination.total === 0}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Arrange by GPS Route
              </Button>

              <Button
                variant="outline"
                onClick={handleGenerateSerialByGps}
                disabled={pagination.total === 0 || generatingSerial}
                className="border-purple-400 text-purple-600 hover:bg-purple-50"
                data-testid="generate-serial-gps-btn"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {generatingSerial ? 'Generating...' : 'Generate Serial by GPS'}
              </Button>

              <Button
                variant="outline"
                onClick={() => setGenerateDialog(true)}
                disabled={pagination.total === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSplitDialog(true);
                  setSelectedEmployees([]);
                  setGeneratedFiles([]);
                }}
                disabled={pagination.total === 0}
              >
                <Users className="w-4 h-4 mr-2" />
                Split by Employee
              </Button>

              <Button
                variant="outline"
                onClick={() => setExcelDialog(true)}
                disabled={pagination.total === 0}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
            </div>

            {/* Second row of actions */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <Button
                variant="outline"
                onClick={() => setCopyDialog(true)}
                disabled={pagination.total === 0}
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Properties
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setDeleteColonyDialog(true);
                  setSelectedColonyToDelete('');
                  setColonyBillCount(0);
                }}
                disabled={colonies.length === 0}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete by Colony
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSelfCertDialog(true);
                  fetchSelfCertStats();
                }}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Self-Certification
              </Button>

              <Button
                variant="outline"
                onClick={() => setDeleteAllDialog(true)}
                disabled={pagination.total === 0}
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>

              <div className="flex-1" />

              <span className="text-sm text-slate-500">
                {pagination.total} bills total
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Colony Stats - Show when a colony is selected */}
        {colonyStats && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Colony Statistics: {colonyStats.colony}</h3>
              </div>
              
              {/* Upload Messages */}
              {colonyStats.upload_messages && colonyStats.upload_messages.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">📤 PDF Upload History:</p>
                  {colonyStats.upload_messages.map((um, idx) => (
                    <p key={idx} className="text-sm text-amber-700">
                      <span className="font-medium">{um.batch_name}:</span> {um.message}
                    </p>
                  ))}
                </div>
              )}
              
              {/* Add to Properties Messages */}
              {colonyStats.add_to_properties_messages && colonyStats.add_to_properties_messages.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800 mb-2">📋 Add to Properties History:</p>
                  {colonyStats.add_to_properties_messages.map((apm, idx) => (
                    <p key={idx} className="text-sm text-emerald-700">
                      <span className="font-medium">{apm.batch_name}:</span> {apm.message}
                    </p>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{colonyStats.total_bills || 0}</p>
                  <p className="text-xs text-slate-500">Total Bills</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-emerald-600">{colonyStats.valid_serial_count || 0}</p>
                  <p className="text-xs text-slate-500">Valid Serial</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-amber-600">{colonyStats.na_serial_count || 0}</p>
                  <p className="text-xs text-slate-500">N/A Serial</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">{colonyStats.with_gps || 0}</p>
                  <p className="text-xs text-slate-500">With GPS</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-red-600">{colonyStats.skip_stats?.skipped_na_empty || 0}</p>
                  <p className="text-xs text-slate-500">Skipped (NA/Empty)</p>
                </div>
              </div>
              {colonyStats.category_breakdown && colonyStats.category_breakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">Category Breakdown:</p>
                  <div className="flex flex-wrap gap-2">
                    {colonyStats.category_breakdown.map((cat, idx) => (
                      <span key={idx} className="bg-white rounded-full px-3 py-1 text-sm shadow-sm">
                        <span className="font-medium">{cat.category}</span>
                        <span className="text-slate-500 ml-1">({cat.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Batch Skip Stats - Show when a batch is selected */}
        {batchStats && batchStats.skip_stats && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Upload Statistics for: {batchStats.batch?.name}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{batchStats.batch?.total_records || 0}</p>
                  <p className="text-xs text-slate-500">Total Uploaded</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-amber-600">{batchStats.skip_stats?.skipped_na_empty || 0}</p>
                  <p className="text-xs text-slate-500">Skipped (NA/Empty)</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-orange-600">{batchStats.skip_stats?.skipped_vacant || 0}</p>
                  <p className="text-xs text-slate-500">Skipped (Vacant)</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-2xl font-bold text-purple-600">{batchStats.skip_stats?.na_serial_count || 0}</p>
                  <p className="text-xs text-slate-500">N/A Serial Numbers</p>
                </div>
              </div>
              {batchStats.colony_stats && batchStats.colony_stats.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">Colony-wise Breakdown:</p>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {batchStats.colony_stats.map((cs, idx) => (
                        <div key={idx} className="bg-white rounded px-3 py-2 text-sm flex justify-between items-center">
                          <span className="font-medium truncate">{cs.colony}</span>
                          <span className="text-slate-500 ml-2">
                            {cs.total_bills} bills ({cs.na_serial_bills} N/A)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-blue-600">{pagination.total}</p>
              <p className="text-sm text-slate-500">Total Bills</p>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-emerald-600">{colonies.length}</p>
              <p className="text-sm text-slate-500">Colonies</p>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-purple-600">{batches.length}</p>
              <p className="text-sm text-slate-500">Batches</p>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-amber-600">
                {bills.filter(b => b.latitude && b.longitude).length}
              </p>
              <p className="text-sm text-slate-500">With GPS</p>
            </div>
          </Card>
        </div>

        {/* Bills Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : bills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="font-heading font-semibold text-slate-900 mb-2">No bills found</h3>
              <p className="text-slate-500 mb-4">Upload a PDF to get started</p>
              <Button onClick={() => setUploadDialog(true)} className="bg-blue-600">
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>SR</th>
                    <th>Property ID</th>
                    <th>Owner Name</th>
                    <th>Mobile</th>
                    <th>Colony</th>
                    <th>Category</th>
                    <th>Outstanding</th>
                    <th>GPS</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className={bill.serial_na ? 'bg-amber-50' : ''}>
                      <td>
                        {bill.serial_na ? (
                          <span className="inline-flex items-center justify-center px-2 h-8 bg-amber-100 text-amber-700 font-bold rounded text-xs">
                            N/A
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-bold rounded-full">
                            {bill.serial_number}
                          </span>
                        )}
                      </td>
                      <td className="font-mono">{bill.property_id || '-'}</td>
                      <td className="max-w-[150px] truncate">{bill.owner_name || '-'}</td>
                      <td className="font-mono">{bill.mobile || '-'}</td>
                      <td>{bill.colony || '-'}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${
                          bill.category?.includes('Vacant') ? 'bg-green-100 text-green-700' :
                          bill.category?.includes('Commercial') ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {bill.category || '-'}
                        </span>
                      </td>
                      <td className="font-mono">₹{bill.total_outstanding || '0'}</td>
                      <td>
                        {bill.latitude && bill.longitude ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditBill(bill)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-slate-500">
                Showing {bills.length} of {pagination.total} bills
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

          </div>{/* End of main content */}

        {/* Upload Dialog */}
        <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload PDF Bills</DialogTitle>
              <DialogDescription>
                Upload a multi-page PDF where each page is a property tax bill
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Batch Name</Label>
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., Akash Nagar Bills 2025-26"
                />
              </div>
              <div className="space-y-2">
                <Label>PDF File</Label>
                <div
                  className={`photo-upload-area ${file ? 'has-image' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-600">Click to select PDF file</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !file || !batchName}
                className="bg-blue-600"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Extract
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Bill Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Bill Data</DialogTitle>
              <DialogDescription>
                Update bill information. Changes will be reflected in generated PDFs.
              </DialogDescription>
            </DialogHeader>
            {editingBill && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={editingBill.owner_name || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, owner_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={editingBill.mobile || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Plot Address</Label>
                  <Input
                    value={editingBill.plot_address || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, plot_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colony</Label>
                  <Input
                    value={editingBill.colony || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, colony: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editingBill.category || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Area</Label>
                  <Input
                    value={editingBill.total_area || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, total_area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Outstanding</Label>
                  <Input
                    value={editingBill.total_outstanding || ''}
                    onChange={(e) => setEditingBill({ ...editingBill, total_outstanding: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-blue-600">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate PDF Dialog - with bills per page option */}
        <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate PDF</DialogTitle>
              <DialogDescription>
                Generate PDF in original sequence.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  PDF will keep original sequence from uploaded file.
                  Serial numbers are from original PDF (N/A if missing).
                </p>
              </div>
              
              {/* Bills per page option */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bills per A4 Page</Label>
                <Select value={pdfOptions.bills_per_page || '1'} onValueChange={(val) => setPdfOptions({...pdfOptions, bills_per_page: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Bill per Page (Full Size)</SelectItem>
                    <SelectItem value="2">2 Bills per Page</SelectItem>
                    <SelectItem value="3">3 Bills per Page (Compact)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {pdfOptions.bills_per_page === '1' 
                    ? 'Each bill on separate page (full size)' 
                    : pdfOptions.bills_per_page === '2'
                    ? '2 bills stacked on each A4 page'
                    : '3 bills stacked on each A4 page (compact)'}
                </p>
              </div>
              
              {/* Print Serial Number option */}
              <div className="flex items-center space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="printSerial"
                  checked={pdfOptions.print_serial}
                  onChange={(e) => setPdfOptions({...pdfOptions, print_serial: e.target.checked})}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300"
                />
                <label htmlFor="printSerial" className="text-sm">
                  <span className="font-medium text-amber-800">Print Serial Number on PDF</span>
                  <p className="text-xs text-amber-600">
                    Adds serial number (like N34, N54) in red color on top-right of each bill
                  </p>
                </label>
              </div>

              {/* Self-Certified Filter option */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data Filter (Self Certified)</Label>
                <Select 
                  value={pdfOptions.self_certified_filter || 'all'} 
                  onValueChange={(val) => setPdfOptions({...pdfOptions, self_certified_filter: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Data</SelectItem>
                    <SelectItem value="self_certified">Self Certified Data Only</SelectItem>
                    <SelectItem value="not_self_certified">Not Self Certified Data Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {pdfOptions.self_certified_filter === 'all' 
                    ? 'Include all bills in the PDF' 
                    : pdfOptions.self_certified_filter === 'self_certified'
                    ? 'Only include self-certified properties'
                    : 'Only include properties that are NOT self-certified'}
                </p>
              </div>

              {/* Skip Filter Checkboxes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Skip Filters</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={pdfOptions.skip_na_names}
                      onChange={(e) => setPdfOptions({...pdfOptions, skip_na_names: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium">Skip NA/Empty Owner Names</span>
                      <p className="text-xs text-slate-500">Owner name NA, N/A, empty wale bills hata dega</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={pdfOptions.skip_vacant}
                      onChange={(e) => setPdfOptions({...pdfOptions, skip_vacant: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium">Skip Vacant/Empty Plots</span>
                      <p className="text-xs text-slate-500">Vacant plot, empty plot wale bills hata dega</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePdf}
                disabled={generating}
                className="bg-blue-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate & Download
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Split by Employee Dialog */}
        <Dialog open={splitDialog} onOpenChange={setSplitDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Split Bills by Employee</DialogTitle>
              <DialogDescription>
                Select employees to distribute bills and generate separate PDFs for each
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-lg font-semibold text-slate-900">
                  Total Bills: <span className="text-blue-600">{pagination.total}</span>
                </p>
                {selectedEmployees.length > 0 && (
                  <p className="text-sm text-slate-500">
                    {pagination.total} bills ÷ {selectedEmployees.length} employees = ~{Math.ceil(pagination.total / selectedEmployees.length)} bills per employee
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Employees ({selectedEmployees.length} selected)</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {employees.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No employees found. Create employees first.
                    </p>
                  ) : (
                    employees.map((emp) => (
                      <div
                        key={emp.id}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-slate-50 ${
                          selectedEmployees.includes(emp.id) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => toggleEmployeeSelection(emp.id)}
                      >
                        <Checkbox
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{emp.name}</p>
                          <p className="text-sm text-slate-500">
                            {emp.username} • {emp.role}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {generatedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Generated Files</Label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {generatedFiles.map((file) => (
                      <div key={file.employee_id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div>
                          <p className="font-medium text-emerald-900">
                            {file.employee_name}
                          </p>
                          <p className="text-sm text-emerald-600">
                            {file.bill_range} ({file.total_bills} bills)
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${file.download_url}`, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setSplitDialog(false);
                setGeneratedFiles([]);
                setSelectedEmployees([]);
              }}>
                Close
              </Button>
              <Button
                onClick={handleSplitByEmployee}
                disabled={splitting || selectedEmployees.length === 0}
                className="bg-blue-600"
              >
                {splitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Generate Employee PDFs
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete All Confirmation Dialog */}
        <AlertDialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete All Bills?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{pagination.total}</strong> bills
                {filters.colony && ` from ${filters.colony}`}
                {filters.batch_id && ` in the selected batch`}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Copy to Properties Confirmation Dialog */}
        <AlertDialog open={copyDialog} onOpenChange={setCopyDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add Bills to Properties?</AlertDialogTitle>
              <AlertDialogDescription>
                This will copy <strong>{pagination.total}</strong> bills
                {filters.colony && ` from ${filters.colony}`}
                {filters.batch_id && ` in the selected batch`} to the Properties database.
                A new batch will be created for these properties.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {/* Options */}
            <div className="py-4 border-t border-b space-y-4">
              {/* Skip Duplicates Option */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="skipDuplicates" className="text-sm">
                  <span className="font-medium">Skip duplicate entries</span>
                  <p className="text-xs text-slate-500">
                    {skipDuplicates 
                      ? "Properties with same ID or owner+mobile will be skipped" 
                      : "All bills will be added (recommended for new colonies)"}
                  </p>
                </label>
              </div>
              
              {/* Skip Vacant Plots Option */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="skipVacantPlots"
                  checked={skipVacantPlots}
                  onChange={(e) => setSkipVacantPlots(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300"
                />
                <label htmlFor="skipVacantPlots" className="text-sm">
                  <span className="font-medium">Skip Vacant/Empty Plots</span>
                  <p className="text-xs text-slate-500">
                    {skipVacantPlots 
                      ? "Vacant plots and empty plots will be skipped" 
                      : "All entries including vacant plots will be added"}
                  </p>
                </label>
              </div>

              {/* Skip NA/Empty Names Option */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="skipNaNames"
                  checked={skipNaNames}
                  onChange={(e) => setSkipNaNames(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-gray-300"
                />
                <label htmlFor="skipNaNames" className="text-sm">
                  <span className="font-medium">Skip NA/Empty Owner Names</span>
                  <p className="text-xs text-slate-500">
                    {skipNaNames 
                      ? "Owner name NA, N/A, empty wale entries skip honge" 
                      : "All entries including NA owner names will be added"}
                  </p>
                </label>
              </div>

              {/* Skip Duplicate GPS Option */}
              <div className="flex items-center space-x-3 mt-3">
                <input
                  type="checkbox"
                  id="skipDuplicateGPS"
                  checked={skipDuplicateGPS}
                  onChange={(e) => setSkipDuplicateGPS(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="skipDuplicateGPS" className="text-sm">
                  <span className="font-medium">Skip Duplicate GPS Coordinates</span>
                  <p className="text-xs text-slate-500">
                    {skipDuplicateGPS 
                      ? "Properties with same latitude/longitude will be skipped (only first one kept)" 
                      : "All properties will be added including duplicate GPS locations"}
                  </p>
                </label>
              </div>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCopyToProperties}
                disabled={copying}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add All to Properties
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete by Colony Dialog */}
        <Dialog open={deleteColonyDialog} onOpenChange={setDeleteColonyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-orange-600">Delete Bills by Colony</DialogTitle>
              <DialogDescription>
                Select a colony to delete all its bills. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Colony to Delete</Label>
                <Select
                  value={selectedColonyToDelete}
                  onValueChange={(value) => {
                    setSelectedColonyToDelete(value);
                    if (value) fetchColonyBillCount(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a colony..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colonies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedColonyToDelete && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-orange-800">
                    <strong>{colonyBillCount}</strong> bills will be permanently deleted from 
                    <strong> {selectedColonyToDelete}</strong>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDeleteColonyDialog(false);
                setSelectedColonyToDelete('');
                setColonyBillCount(0);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteByColony}
                disabled={deleting || !selectedColonyToDelete}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Colony Bills
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GPS Arrangement Confirmation Dialog */}
        <AlertDialog open={gpsArrangeDialog} onOpenChange={setGpsArrangeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arrange Bills by GPS Route?</AlertDialogTitle>
              <AlertDialogDescription>
                This will rearrange <strong>{pagination.total}</strong> bills
                {filters.colony && ` from ${filters.colony}`}
                {filters.batch_id && ` in the selected batch`} based on their GPS coordinates to optimize the route.
                This action will update the serial numbers of the bills.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmGpsArrangement}
                disabled={arranging}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {arranging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Arranging...
                  </>
                ) : (
                  <>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Arrange by Route
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Self-Certification Upload Dialog */}
        <Dialog open={selfCertDialog} onOpenChange={setSelfCertDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-blue-600 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Self-Certification Data
              </DialogTitle>
              <DialogDescription>
                Upload an Excel file containing Property IDs that are already self-certified.
                When adding bills to properties, matching IDs will be marked as self-certified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Current Stats */}
              {selfCertStats && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>{selfCertStats.total_self_certified_pids || selfCertStats.total_in_database || 0}</strong> self-certified PIDs in database
                  </p>
                </div>
              )}

              {/* Download Sample Button */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Need the correct format?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Create sample Excel data
                    const sampleData = [
                      ['PID (C)', 'Owner Name', 'Area'],
                      ['3UYE8N55', 'Sample Owner 1', 'Sector 5'],
                      ['3UUOCQ65', 'Sample Owner 2', 'Sector 5'],
                      ['3UBVBM48', 'Sample Owner 3', 'T.P.S 8 A'],
                      ['3U2KG128', 'Sample Owner 4', 'T.P.S 8 A'],
                    ];
                    
                    // Create CSV content (Excel compatible)
                    const csvContent = sampleData.map(row => row.join(',')).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'self_certification_sample.csv';
                    link.click();
                    window.URL.revokeObjectURL(url);
                    toast.success('Sample file downloaded');
                  }}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample Excel
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  File must have a column named &quot;PID&quot; or &quot;Property ID&quot;
                </p>
              </div>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Select Excel File (.xlsx or .csv)</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSelfCertFile(e.target.files[0])}
                  className="cursor-pointer"
                />
              </div>

              {selfCertFile && (
                <div className="p-2 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
                  Selected: {selfCertFile.name}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelfCertDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUploadSelfCert}
                disabled={uploadingSelfCert || !selfCertFile}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploadingSelfCert ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Excel Download Dialog */}
        <Dialog open={excelDialog} onOpenChange={setExcelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-green-600 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Download Excel
              </DialogTitle>
              <DialogDescription>
                Download bills data as Excel file with optional filtering.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Current Selection:</p>
                <p className="font-medium">
                  {filters.colony?.trim() ? filters.colony : 'All Colonies'}
                  {filters.batch_id?.trim() ? ` • Batch Selected` : ''}
                </p>
                <p className="text-sm text-slate-500 mt-1">{pagination.total} bills will be exported</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Self-Certification:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="excelFilter"
                      value="all"
                      checked={excelFilter === 'all'}
                      onChange={(e) => setExcelFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>All Bills</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="excelFilter"
                      value="self_certified"
                      checked={excelFilter === 'self_certified'}
                      onChange={(e) => setExcelFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-emerald-600">Self-Certified Only</span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({colonyStats?.self_certified_count || 0} bills)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="excelFilter"
                      value="not_self_certified"
                      checked={excelFilter === 'not_self_certified'}
                      onChange={(e) => setExcelFilter(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-amber-600">Not Self-Certified Only</span>
                    <span className="text-xs text-slate-500 ml-1">
                      ({colonyStats?.not_self_certified_count || pagination.total} bills)
                    </span>
                  </label>
                </div>
              </div>
              
              {excelFilter === 'self_certified' && (colonyStats?.self_certified_count || 0) === 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    No self-certified bills found in this colony. Please upload self-certification data first.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExcelDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExcelDownload}
                disabled={downloadingExcel || (excelFilter === 'self_certified' && (colonyStats?.self_certified_count || 0) === 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                {downloadingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

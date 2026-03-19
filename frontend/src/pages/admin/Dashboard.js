import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  FileSpreadsheet, CheckCircle, Clock, Users, FolderOpen,
  MapPin, TrendingUp, XCircle, Eye, Trash2, Loader2, Download,
  ClipboardCheck, Calendar, Home, Building, Landmark, TreePine,
  UserX, Phone, Layers
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const COLORS = ['#059669', '#f59e0b', '#3b82f6', '#ef4444'];
const ROLE_LABELS = {
  'SURVEYOR': 'Surveyor',
  'SUPERVISOR': 'Supervisor',
  'MC_OFFICER': 'MC Officer',
  'EMPLOYEE': 'Surveyor'
};

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [submissionStats, setSubmissionStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [employeeProgress, setEmployeeProgress] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0 });
  const [townStats, setTownStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [colonyDialog, setColonyDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [colonyProgress, setColonyProgress] = useState([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [removeDialog, setRemoveDialog] = useState(false);
  const [colonyToRemove, setColonyToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => { fetchData(); }, [viewMode, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const dateParam = viewMode === 'today' ? `?date=${selectedDate}` : '';
      const [statsRes, progressRes, attendanceRes, submissionsRes, townStatsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard${dateParam}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/employee-progress${dateParam}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/admin/attendance?date=${todayDate}&limit=100`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { attendance: [], total: 0 } })),
        axios.get(`${API_URL}/admin/submission-stats${dateParam}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total: 0, pending: 0, approved: 0, rejected: 0 } })),
        axios.get(`${API_URL}/admin/town-stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { towns: [] } }))
      ]);
      setStats(statsRes.data);
      setEmployeeProgress(progressRes.data);
      setSubmissionStats(submissionsRes.data);
      setTownStats(townStatsRes.data.towns || []);
      const attendanceTotal = attendanceRes.data?.attendance?.length || 0;
      const totalEmployees = progressRes.data?.length || 0;
      setAttendanceStats({ present: attendanceTotal, total: totalEmployees });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const downloadTodayReport = () => {
    const dateForReport = viewMode === 'today' ? selectedDate : new Date().toISOString().split('T')[0];
    const headers = ['Employee', 'Role', 'Assigned', 'Today Completed', 'Overall Completed', 'Pending', 'Progress %', 'Colonies'];
    const sortedData = [...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0));
    const rows = sortedData.map(emp => {
      const pct = emp.total_assigned > 0 ? Math.round((emp.completed / emp.total_assigned) * 100) : 0;
      return [emp.employee_name, ROLE_LABELS[emp.role] || emp.role, emp.total_assigned || 0, emp.today_completed || 0, emp.completed || 0, emp.pending || 0, pct + '%', (emp.assigned_colonies || []).join('; ')];
    });
    const totalAssigned = sortedData.reduce((s, e) => s + (e.total_assigned || 0), 0);
    const totalToday = sortedData.reduce((s, e) => s + (e.today_completed || 0), 0);
    const totalCompleted = sortedData.reduce((s, e) => s + (e.completed || 0), 0);
    const totalPending = sortedData.reduce((s, e) => s + (e.pending || 0), 0);
    rows.push(['', '', '', '', '', '', '', '']);
    rows.push(['TOTAL', '', totalAssigned, totalToday, totalCompleted, totalPending, totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) + '%' : '0%', '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surveyor_report_${dateForReport}.csv`;
    a.click();
    toast.success(`Downloaded surveyor report for ${dateForReport}`);
  };

  const handleViewColonyProgress = async (employee) => {
    setSelectedEmployee(employee);
    setColonyDialog(true);
    setLoadingColonies(true);
    try {
      const response = await axios.get(`${API_URL}/admin/employee-progress/${employee.employee_id}/colonies`, { headers: { Authorization: `Bearer ${token}` } });
      setColonyProgress(response.data.colonies || []);
    } catch (error) { toast.error('Failed to load colony progress'); }
    finally { setLoadingColonies(false); }
  };

  const handleOpenRemoveDialog = (colony) => { setColonyToRemove(colony); setRemoveDialog(true); };

  const handleRemoveFromColony = async () => {
    if (!selectedEmployee || !colonyToRemove) return;
    setRemoving(true);
    try {
      const formData = new FormData();
      formData.append('employee_id', selectedEmployee.employee_id);
      formData.append('colony', colonyToRemove.colony);
      const response = await axios.post(`${API_URL}/admin/employee/remove-from-colony`, formData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setRemoveDialog(false);
      handleViewColonyProgress(selectedEmployee);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to remove from colony'); }
    finally { setRemoving(false); }
  };

  const pieData = stats ? [
    { name: 'Approved', value: stats.approved },
    { name: 'Pending', value: stats.pending },
    { name: 'Rejected', value: stats.rejected }
  ].filter(d => d.value > 0) : [];

  // Progress calculations
  const billProgress = stats?.total > 0 ? Math.round(((stats.total - stats.pending) / stats.total) * 100) : 0;
  const surveyProgress = stats?.total > 0 ? Math.round((submissionStats.total / stats.total) * 100) : 0;

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div data-testid="admin-dashboard" className="space-y-5">
        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm">
            <button data-testid="view-mode-all" onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              All Time
            </button>
            <button data-testid="view-mode-today" onClick={() => { setViewMode('today'); setSelectedDate(new Date().toISOString().split('T')[0]); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'today' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Calendar className="w-4 h-4 inline mr-1" /> Today Report
            </button>
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'today' && (
              <input type="date" data-testid="date-picker" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500" />
            )}
            <Button size="sm" variant="outline" data-testid="download-today-report" className="flex items-center gap-2" onClick={downloadTodayReport}>
              <Download className="w-4 h-4" /> {viewMode === 'today' ? 'Download Day Report' : 'Download Report'}
            </Button>
          </div>
        </div>

        {viewMode === 'today' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Showing report for: <strong>{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</strong>
          </div>
        )}

        {/* ===== TOP ROW: Total Property (big) + Pending (big) ===== */}
        <div className="grid grid-cols-2 gap-4">
          <Card data-testid="stat-total-properties" className="bg-gradient-to-br from-slate-700 to-slate-900 text-white border-0 shadow-lg">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-slate-300 font-medium">Total Property</p>
                  <p className="text-4xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-pending-properties" className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-amber-100 font-medium">Pending Property</p>
                  <p className="text-4xl font-bold">{stats?.pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== SMALL STAT BLOCKS: Colony, Categories, Owner NA, Mobile NA ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
          <div data-testid="stat-total-colony" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <FolderOpen className="w-5 h-5 mx-auto text-purple-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.colonies || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Total Colony</p>
          </div>
          <div data-testid="stat-residential" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Home className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.residential || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Residential</p>
          </div>
          <div data-testid="stat-commercial" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Building className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.commercial || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Commercial</p>
          </div>
          <div data-testid="stat-vacant-plot" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Layers className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.vacant_plot || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Vacant Plot</p>
          </div>
          <div data-testid="stat-mix-use" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Layers className="w-5 h-5 mx-auto text-teal-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.mix_use || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Mix Use</p>
          </div>
          <div data-testid="stat-industrial" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Building className="w-5 h-5 mx-auto text-gray-600 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.industrial || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Industrial</p>
          </div>
          <div data-testid="stat-institutional" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Landmark className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.institutional || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Institutional</p>
          </div>
          <div data-testid="stat-special-category" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow">
            <Landmark className="w-5 h-5 mx-auto text-pink-500 mb-1" />
            <p className="text-xl font-bold text-slate-800">{stats?.category?.special_category || 0}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Special Cat.</p>
          </div>
          <div data-testid="stat-owner-na" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow border-red-100">
            <UserX className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <p className="text-xl font-bold text-red-600">{stats?.owner_na || 0}</p>
            <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Owner NA</p>
          </div>
          <div data-testid="stat-mobile-na" className="bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow transition-shadow border-red-100">
            <Phone className="w-5 h-5 mx-auto text-red-400 mb-1" />
            <p className="text-xl font-bold text-red-600">{stats?.mobile_na || 0}</p>
            <p className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Mobile NA</p>
          </div>
        </div>

        {/* ===== BILL DISTRIBUTION STATUS ===== */}
        <Card className="shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Bill Distribution Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div data-testid="stat-total-bill-dist" className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-slate-500 font-medium">Total Bill Distribution</p>
                <p className="text-2xl font-bold text-blue-600">{submissionStats.total || 0}</p>
              </div>
              <div data-testid="stat-pending-bill-dist" className="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
                <p className="text-xs text-amber-600 font-medium">Pending Bill Distribution</p>
                <p className="text-2xl font-bold text-amber-600">{submissionStats.pending || 0}</p>
              </div>
              <div data-testid="stat-approved-bill-dist" className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
                <p className="text-xs text-green-600 font-medium">Approved Bill Distribution</p>
                <p className="text-2xl font-bold text-green-600">{submissionStats.approved || 0}</p>
              </div>
              <div data-testid="stat-rejected-bill-dist" className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
                <p className="text-xs text-red-600 font-medium">Rejected Bill Distribution</p>
                <p className="text-2xl font-bold text-red-600">{submissionStats.rejected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== EMPLOYEE + ATTENDANCE (single row) ===== */}
        <Card data-testid="employee-attendance-card" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/attendance')}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Employees</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.employees || 0}</p>
                  </div>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div>
                  <p className="text-xs text-slate-500">Today Attendance (This Town)</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {attendanceStats.present} <span className="text-base font-normal text-slate-400">/ {attendanceStats.total}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">
                    {attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-slate-500">Attendance Rate</p>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== PROGRESS REPORTS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Town Bill Progress */}
          <Card data-testid="town-bill-progress" className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Town Bill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-bold text-indigo-700">{billProgress}%</span>
                <span className="text-sm text-slate-500 mb-1">{stats?.total - stats?.pending || 0} / {stats?.total || 0}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${billProgress}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Distributed: {stats?.total - stats?.pending || 0}</span>
                <span>Pending: {stats?.pending || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Survey Progress */}
          <Card data-testid="survey-progress" className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                Survey Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-bold text-emerald-700">{Math.min(surveyProgress, 100)}%</span>
                <span className="text-sm text-slate-500 mb-1">{submissionStats.total || 0} / {stats?.total || 0}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(surveyProgress, 100)}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Surveyed: {submissionStats.total || 0}</span>
                <span>Remaining: {Math.max((stats?.total || 0) - (submissionStats.total || 0), 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Employee Work Progress */}
          <Card data-testid="employee-work-progress" className="shadow-md border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Employee Work Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[140px] overflow-y-auto">
                {employeeProgress.length > 0 ? (
                  [...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0)).slice(0, 5).map((emp, idx) => {
                    const pct = emp.total_assigned > 0 ? Math.round((emp.completed / emp.total_assigned) * 100) : 0;
                    return (
                      <div key={emp.employee_id} className="flex items-center gap-2 text-xs">
                        <span className="w-20 truncate font-medium text-slate-700">{emp.employee_name}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-slate-500 w-10 text-right">{pct}%</span>
                        <span className="text-emerald-600 font-semibold w-8 text-right">+{emp.today_completed || 0}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No employee data</p>
                )}
              </div>
              {employeeProgress.length > 5 && (
                <p className="text-[10px] text-slate-400 text-center mt-1">...and {employeeProgress.length - 5} more employees</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== TOWN-WISE PROGRESS ===== */}
        {townStats.length > 0 && (
          <Card className="shadow-md border-0 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Town-wise Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {townStats.map((town, index) => {
                  const completionRate = town.total > 0 ? Math.round((town.completed / town.total) * 100) : 0;
                  const pendingRate = town.total > 0 ? Math.round((town.pending / town.total) * 100) : 0;
                  return (
                    <div key={town.name || index}
                      className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/admin/properties?town=${encodeURIComponent(town.name)}`)}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-800 truncate" title={town.name}>{town.name || 'Unknown'}</h4>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{town.total} properties</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full flex">
                          <div className="bg-green-500 transition-all" style={{ width: `${completionRate}%` }} />
                          <div className="bg-amber-400 transition-all" style={{ width: `${pendingRate}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600 font-medium"><CheckCircle className="w-3 h-3 inline mr-1" />{town.completed} Done</span>
                        <span className="text-amber-600 font-medium"><Clock className="w-3 h-3 inline mr-1" />{town.pending} Pending</span>
                        <span className="text-slate-500">{completionRate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== CHARTS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Employee Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeeProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={employeeProgress} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis type="category" dataKey="employee_name" stroke="#94a3b8" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="today_completed" fill="#10b981" name="Today" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="overall_completed" fill="#3b82f6" name="Overall" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">No employee data available</div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-600" /> Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={65} fill="#8884d8" dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== EMPLOYEE PROGRESS TABLE ===== */}
        <Card className="shadow-md border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> Employee Progress Report
              </CardTitle>
              <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={() => {
                const headers = ['Employee', 'Role', 'Assigned', 'Today', 'Completed', 'Pending', 'Progress %'];
                const sortedData = [...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0));
                const rows = sortedData.map(emp => {
                  const pct = emp.total_assigned > 0 ? Math.round((emp.completed / emp.total_assigned) * 100) : 0;
                  return [emp.employee_name, ROLE_LABELS[emp.role] || emp.role, emp.total_assigned || 0, emp.today_completed, emp.completed, emp.pending, pct + '%'];
                });
                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a');
                a.href = url; a.download = `employee_progress_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                toast.success('Downloaded employee progress report');
              }}>
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employeeProgress.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-emerald-600 uppercase bg-emerald-50">Today</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assigned</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Completed</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pending</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Progress</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0)).map((emp, idx) => {
                      const pct = emp.total_assigned > 0 ? Math.round((emp.completed / emp.total_assigned) * 100) : 0;
                      return (
                        <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${['bg-blue-500','bg-emerald-500','bg-purple-500','bg-amber-500','bg-rose-500'][idx % 5]}`}>
                                {emp.employee_name?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-slate-900 text-sm block">{emp.employee_name}</span>
                                <span className="text-[10px] text-slate-400">{emp.employee_mobile || ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                              emp.role === 'SUPERVISOR' ? 'bg-purple-100 text-purple-700' :
                              emp.role === 'MC_OFFICER' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>{ROLE_LABELS[emp.role] || emp.role}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-emerald-50">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-lg">
                              {emp.today_completed}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-700">{emp.total_assigned || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-blue-600">{emp.completed}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-amber-600">{emp.pending}</span>
                          </td>
                          <td className="px-4 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 w-8">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" onClick={() => handleViewColonyProgress(emp)} title="View Colonies">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-slate-600 hover:bg-slate-50 h-8 w-8 p-0" onClick={() => navigate(`/admin/submissions?employee_id=${emp.employee_id}`)} title="View Submissions">
                                <ClipboardCheck className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" /> No employee data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Colony Progress Dialog */}
      <Dialog open={colonyDialog} onOpenChange={setColonyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {selectedEmployee?.employee_name?.charAt(0)}
              </div>
              <div>
                <span className="text-lg">{selectedEmployee?.employee_name}</span>
                <p className="text-sm text-slate-500 font-normal">Colony-wise Progress</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {loadingColonies ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : colonyProgress.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No colonies assigned</p></div>
          ) : (
            <div className="space-y-3">
              {colonyProgress.map((colony, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-900">{colony.colony}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleOpenRemoveDialog(colony)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${colony.percentage >= 80 ? 'bg-emerald-500' : colony.percentage >= 50 ? 'bg-blue-500' : colony.percentage >= 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${colony.percentage}%` }} />
                    </div>
                    <span className={`text-sm font-bold ${colony.percentage >= 80 ? 'text-emerald-600' : colony.percentage >= 50 ? 'text-blue-600' : colony.percentage >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                      {colony.percentage}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded"><p className="text-lg font-bold text-slate-700">{colony.total}</p><p className="text-xs text-slate-500">Total</p></div>
                    <div className="p-2 bg-emerald-50 rounded"><p className="text-lg font-bold text-emerald-600">{colony.completed}</p><p className="text-xs text-emerald-600">Done</p></div>
                    <div className="p-2 bg-amber-50 rounded"><p className="text-lg font-bold text-amber-600">{colony.pending}</p><p className="text-xs text-amber-600">Pending</p></div>
                    <div className="p-2 bg-red-50 rounded"><p className="text-lg font-bold text-red-600">{colony.rejected}</p><p className="text-xs text-red-600">Rejected</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setColonyDialog(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Colony Confirmation */}
      <AlertDialog open={removeDialog} onOpenChange={setRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" /> Remove from Colony</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedEmployee?.employee_name}</strong> from <strong>{colonyToRemove?.colony}</strong>?
              <br /><br />This will unassign <strong>{colonyToRemove?.total}</strong> properties ({colonyToRemove?.completed} completed, {colonyToRemove?.pending} pending).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFromColony} disabled={removing} className="bg-red-600 hover:bg-red-700">
              {removing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing...</>) : 'Yes, Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

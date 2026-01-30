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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  FolderOpen,
  CalendarCheck,
  MapPin,
  TrendingUp,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  Download,
  ClipboardCheck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const COLORS = ['#059669', '#f59e0b', '#3b82f6', '#ef4444'];

const ROLE_LABELS = {
  'SURVEYOR': 'Surveyor',
  'SUPERVISOR': 'Supervisor',
  'MC_OFFICER': 'MC Officer',
  'EMPLOYEE': 'Surveyor'  // Backward compatibility - old employees show as Surveyor
};

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [submissionStats, setSubmissionStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [employeeProgress, setEmployeeProgress] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Employee Colony Detail Dialog
  const [colonyDialog, setColonyDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [colonyProgress, setColonyProgress] = useState([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  
  // Remove from Colony Dialog
  const [removeDialog, setRemoveDialog] = useState(false);
  const [colonyToRemove, setColonyToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      
      const [statsRes, progressRes, attendanceRes, submissionsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/employee-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // Fetch today's attendance for the attendance card
        axios.get(`${API_URL}/admin/attendance?date=${todayDate}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { attendance: [], total: 0 } })),
        axios.get(`${API_URL}/admin/submission-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { total: 0, pending: 0, approved: 0, rejected: 0 } }))
      ]);
      setStats(statsRes.data);
      setEmployeeProgress(progressRes.data);
      setSubmissionStats(submissionsRes.data);
      
      // Calculate attendance stats - use attendance array length for present count
      const attendanceTotal = attendanceRes.data?.attendance?.length || 0;
      const totalEmployees = progressRes.data?.length || 0;
      setAttendanceStats({
        present: attendanceTotal,
        total: totalEmployees
      });
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // View employee's colony-wise progress
  const handleViewColonyProgress = async (employee) => {
    setSelectedEmployee(employee);
    setColonyDialog(true);
    setLoadingColonies(true);
    
    try {
      const response = await axios.get(
        `${API_URL}/admin/employee-progress/${employee.employee_id}/colonies`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setColonyProgress(response.data.colonies || []);
    } catch (error) {
      toast.error('Failed to load colony progress');
    } finally {
      setLoadingColonies(false);
    }
  };

  // Open remove from colony confirmation
  const handleOpenRemoveDialog = (colony) => {
    setColonyToRemove(colony);
    setRemoveDialog(true);
  };

  // Remove employee from colony
  const handleRemoveFromColony = async () => {
    if (!selectedEmployee || !colonyToRemove) return;
    
    setRemoving(true);
    try {
      const formData = new FormData();
      formData.append('employee_id', selectedEmployee.employee_id);
      formData.append('colony', colonyToRemove.colony);
      
      const response = await axios.post(
        `${API_URL}/admin/employee/remove-from-colony`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message);
      setRemoveDialog(false);
      
      // Refresh colony progress
      handleViewColonyProgress(selectedEmployee);
      // Refresh main data
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove from colony');
    } finally {
      setRemoving(false);
    }
  };

  const pieData = stats ? [
    { name: 'Completed', value: stats.completed },
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.in_progress },
    { name: 'Rejected', value: stats.rejected }
  ].filter(d => d.value > 0) : [];

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse-slow text-slate-500">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div data-testid="admin-dashboard" className="space-y-6">
        {/* Main Stats - Property Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card border-l-4 border-l-slate-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Total Properties</p>
                <p className="text-2xl font-bold font-heading text-slate-700">{stats?.total || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="stat-card border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Approved</p>
                <p className="text-2xl font-bold font-heading text-green-600">{stats?.approved || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="stat-card border-l-4 border-l-amber-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Pending</p>
                <p className="text-2xl font-bold font-heading text-amber-600">{stats?.pending || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="stat-card border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Rejected</p>
                <p className="text-2xl font-bold font-heading text-red-600">{stats?.rejected || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Survey Submissions Stats */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-50 to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Survey Submissions Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-xs text-slate-500 font-medium">Total Surveys</p>
                <p className="text-2xl font-bold text-blue-600">{submissionStats.total || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
                <p className="text-xs text-amber-600 font-medium">Portal Pending</p>
                <p className="text-2xl font-bold text-amber-600">{submissionStats.pending || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
                <p className="text-xs text-green-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-600">{submissionStats.approved || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
                <p className="text-xs text-red-600 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{submissionStats.rejected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/attendance')}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Today&apos;s Attendance</p>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {attendanceStats.present} / {attendanceStats.total}
                    <span className="text-sm font-normal text-slate-500 ml-2">employees present</span>
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
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Count */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold font-heading text-blue-600">{stats?.employees || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FolderOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Total Colonies</p>
                <p className="text-2xl font-bold font-heading text-purple-600">{stats?.colonies || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Performance Bar Chart */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                Employee Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employeeProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={employeeProgress} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="employee_name" 
                      stroke="#94a3b8"
                      width={80}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Bar dataKey="today_completed" fill="#10b981" name="Today" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="overall_completed" fill="#3b82f6" name="Overall" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  No employee data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution Pie Chart */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-purple-600" />
                </div>
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={65}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employee Progress Report Table - Modern Style */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                Employee Progress Report
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // Download as CSV
                  const headers = ['Employee', 'Role', 'Assigned', 'Today', 'Completed', 'Pending', 'Progress %'];
                  const sortedData = [...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0));
                  const rows = sortedData.map(emp => {
                    const percentage = emp.total_assigned > 0 ? Math.round((emp.completed / emp.total_assigned) * 100) : 0;
                    return [emp.employee_name, ROLE_LABELS[emp.role] || emp.role, emp.total_assigned || 0, emp.today_completed, emp.completed, emp.pending, percentage + '%'];
                  });
                  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `employee_progress_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  toast.success('Downloaded employee progress report');
                }}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {employeeProgress.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50">Today</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...employeeProgress].sort((a, b) => (b.today_completed || 0) - (a.today_completed || 0)).map((emp, idx) => {
                      const percentage = emp.total_assigned > 0 
                        ? Math.round((emp.completed / emp.total_assigned) * 100) 
                        : 0;
                      return (
                        <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'][idx % 5]
                              }`}>
                                {emp.employee_name?.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-900">{emp.employee_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                              emp.role === 'SUPERVISOR' ? 'bg-purple-100 text-purple-700' :
                              emp.role === 'MC_OFFICER' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {ROLE_LABELS[emp.role] || emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center bg-emerald-50">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-lg shadow-sm">
                              {emp.today_completed}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold">
                              {emp.total_assigned || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold">
                              {emp.completed}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-bold">
                              {emp.pending}
                            </span>
                          </td>
                          <td className="px-6 py-4 w-40">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 w-10">{percentage}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleViewColonyProgress(emp)}
                                title="View Colony Progress"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                                onClick={() => navigate(`/admin/submissions?employee_id=${emp.employee_id}`)}
                                title="View Submissions"
                              >
                                →
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
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                No employee data available
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : colonyProgress.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No colonies assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {colonyProgress.map((colony, idx) => (
                <div 
                  key={idx}
                  className="p-4 border rounded-lg hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-900">{colony.colony}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleOpenRemoveDialog(colony)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          colony.percentage >= 80 ? 'bg-emerald-500' :
                          colony.percentage >= 50 ? 'bg-blue-500' :
                          colony.percentage >= 25 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${colony.percentage}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${
                      colony.percentage >= 80 ? 'text-emerald-600' :
                      colony.percentage >= 50 ? 'text-blue-600' :
                      colony.percentage >= 25 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {colony.percentage}%
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-lg font-bold text-slate-700">{colony.total}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded">
                      <p className="text-lg font-bold text-emerald-600">{colony.completed}</p>
                      <p className="text-xs text-emerald-600">Done</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <p className="text-lg font-bold text-amber-600">{colony.pending}</p>
                      <p className="text-xs text-amber-600">Pending</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-lg font-bold text-red-600">{colony.rejected}</p>
                      <p className="text-xs text-red-600">Rejected</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setColonyDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Colony Confirmation Dialog */}
      <AlertDialog open={removeDialog} onOpenChange={setRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Remove from Colony
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedEmployee?.employee_name}</strong> from <strong>{colonyToRemove?.colony}</strong>?
              <br /><br />
              This will unassign <strong>{colonyToRemove?.total}</strong> properties ({colonyToRemove?.completed} completed, {colonyToRemove?.pending} pending).
              <br /><br />
              <span className="text-amber-600">⚠️ This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromColony}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700"
            >
              {removing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing...</>
              ) : (
                'Yes, Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

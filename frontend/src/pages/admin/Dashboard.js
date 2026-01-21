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
  Loader2
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
    try {
      const [statsRes, progressRes, attendanceRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/employee-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/attendance?date=${new Date().toISOString().split('T')[0]}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { records: [] } }))
      ]);
      setStats(statsRes.data);
      setEmployeeProgress(progressRes.data);
      
      // Calculate attendance stats
      const records = attendanceRes.data?.records || [];
      const totalEmployees = progressRes.data?.length || 0;
      setAttendanceStats({
        present: records.length,
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
        {/* Today's Stats - Highlighted */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Today Completed Properties</p>
                  <p className="text-4xl font-heading font-bold">{stats?.today_completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium">Completed Colony</p>
                  <p className="text-4xl font-heading font-bold">{stats?.today_wards || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/attendance')}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Today's Attendance</p>
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

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Total</p>
                <p className="text-2xl font-bold font-heading text-slate-900">{stats?.total_properties || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Completed</p>
                <p className="text-2xl font-bold font-heading text-emerald-600">{stats?.completed || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="stat-card">
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

          <Card className="stat-card">
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

          <Card className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Employees</p>
                <p className="text-2xl font-bold font-heading text-blue-600">{stats?.employees || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section FIRST - Modern Card Style */}
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
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              Employee Progress Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employeeProgress.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Today</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeProgress.map((emp, idx) => {
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
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                              {emp.today_completed}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold">
                              {emp.overall_completed}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => navigate(`/admin/submissions?employee_id=${emp.employee_id}`)}
                            >
                              View →
                            </Button>
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
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeLayout from '../../components/EmployeeLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle, Clock, AlertTriangle, ArrowRight, FileSpreadsheet, TrendingUp, XCircle, CalendarCheck, Camera } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function EmployeeDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAttendance, setHasAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    fetchProgress();
    checkTodayAttendance();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API_URL}/employee/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgress(response.data);
    } catch (error) {
      toast.error('Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const response = await axios.get(`${API_URL}/employee/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHasAttendance(response.data.has_attendance);
      setAttendanceData(response.data.attendance);
    } catch (error) {
      console.error('Failed to check attendance:', error);
    }
  };

  const percentage = progress?.total_assigned > 0
    ? Math.round((progress.completed / progress.total_assigned) * 100)
    : 0;

  if (loading) {
    return (
      <EmployeeLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse-slow text-slate-500">Loading...</div>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout title="Dashboard">
      <div data-testid="employee-dashboard" className="space-y-6">
        {/* Welcome */}
        <div className="text-center py-4">
          <h2 className="text-xl font-heading font-bold text-slate-900">
            Ram Ram, {user?.name}!
          </h2>
          <p className="text-slate-500 mt-1">Ready for today&apos;s surveys?</p>
        </div>

        {/* Attendance Status Card */}
        {!hasAttendance ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">Mark Your Attendance</p>
                    <p className="text-sm text-amber-600">Required before starting surveys</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => navigate('/employee/attendance')}
                  data-testid="mark-attendance-btn"
                >
                  <Camera className="w-4 h-4 mr-1" />
                  Mark Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">✓ Attendance Marked</p>
                  <p className="text-sm text-emerald-600">
                    {attendanceData?.marked_at && new Date(attendanceData.marked_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Progress Card */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-300">Today&apos;s Progress</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {progress?.today_completed || 0} surveys
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-heading font-bold text-blue-400">{percentage}%</p>
                <p className="text-sm text-slate-300">Overall</p>
              </div>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {/* Total Completed - Below Today Progress */}
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-300">Total Complete Data</span>
              </div>
              <span className="text-xl font-bold text-emerald-400">{progress?.total_completed || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center py-4">
            <CardContent className="p-0">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-slate-900">{progress?.pending || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
            </CardContent>
          </Card>

          <Card className="text-center py-4">
            <CardContent className="p-0">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-slate-900">{progress?.completed || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Approved</p>
            </CardContent>
          </Card>

          <Card className="text-center py-4">
            <CardContent className="p-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-slate-900">{progress?.in_progress || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">In Review</p>
            </CardContent>
          </Card>

          <Card className="text-center py-4">
            <CardContent className="p-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-slate-900">{progress?.rejected || 0}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/employee/properties')}
            className="mobile-action-btn"
            data-testid="view-properties-btn"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            View Assigned Properties
            <ArrowRight className="w-5 h-5 ml-auto" />
          </Button>

          {progress?.pending > 0 && (
            <p className="text-center text-sm text-slate-500">
              You have {progress.pending} properties pending survey
            </p>
          )}
        </div>

        {/* Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <h4 className="font-semibold text-blue-900 mb-2">Survey Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enable GPS on your device before starting</li>
              <li>• Take clear photos of gate and property</li>
              <li>• Verify owner details before submitting</li>
              <li>• Flag properties if owner is unavailable</li>
              <li>• You must be within 50m of property to submit</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}

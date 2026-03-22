import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeLayout from '../../components/EmployeeLayout';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CheckCircle, Clock, ArrowRight, FileSpreadsheet, TrendingUp,
  XCircle, CalendarCheck, Camera, Loader2, ChevronLeft, ChevronRight,
  BarChart3, Lock, UserX, MapPinOff, AlertTriangle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAttendance, setHasAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchProgress();
    checkTodayAttendance();
  }, []);

  useEffect(() => {
    fetchDailyProgress();
  }, [selectedMonth, selectedYear]);

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

  const fetchDailyProgress = async () => {
    try {
      const res = await axios.get(`${API_URL}/employee/daily-progress?month=${selectedMonth}&year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyData(res.data);
    } catch { }
  };

  const changeMonth = (dir) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const percentage = progress?.total_assigned > 0
    ? Math.round((progress.completed / progress.total_assigned) * 100)
    : 0;

  const maxDaily = dailyData ? Math.max(...dailyData.daily.map(d => d.count), 1) : 1;
  const todayDay = new Date().getDate();
  const isCurrentMonth = selectedMonth === (new Date().getMonth() + 1) && selectedYear === new Date().getFullYear();

  if (loading) {
    return (
      <EmployeeLayout title="Dashboard">
        <div className="flex items-center justify-center h-64" style={{background: '#0a0e27'}}>
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout title="Dashboard">
      <div data-testid="employee-dashboard" className="space-y-4 pb-4" style={{background: 'linear-gradient(180deg, #0a0e27, #0d1137)', margin: '-1rem', padding: '1rem', minHeight: '100vh'}}>
        
        {/* Greeting */}
        <div className="text-center pt-2 pb-1">
          <h2 className="text-xl font-bold text-white" style={{textShadow: '0 0 20px rgba(0,245,212,0.2)'}}>
            Ram Ram, {user?.name}!
          </h2>
          <p className="text-cyan-300/40 text-sm">Aaj ke surveys ke liye taiyaar?</p>
        </div>

        {/* Attendance Card */}
        {!hasAttendance ? (
          <div className="rounded-xl border border-amber-500/30 p-4" style={{background: 'rgba(245, 158, 11, 0.1)', backdropFilter: 'blur(10px)'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background: 'rgba(245, 158, 11, 0.2)'}}>
                  <CalendarCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-300 text-sm">Attendance Lagao</p>
                  <p className="text-xs text-amber-400/60">Survey se pehle zaroori hai</p>
                </div>
              </div>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/employee/attendance')} data-testid="mark-attendance-btn">
                <Camera className="w-4 h-4 mr-1" /> Mark
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 p-3" style={{background: 'rgba(16, 185, 129, 0.1)'}}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background: 'rgba(16, 185, 129, 0.2)'}}>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-300 text-sm">Attendance Done</p>
                <p className="text-xs text-emerald-400/50">
                  {attendanceData?.marked_at && new Date(attendanceData.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Today's Progress + Overall */}
        <div className="rounded-xl border border-cyan-500/20 p-4" style={{background: 'rgba(13,17,55,0.7)', backdropFilter: 'blur(12px)'}}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-cyan-300/50">Aaj Ka Kaam</p>
              <p className="text-3xl font-bold text-white" style={{textShadow: '0 0 15px rgba(0,245,212,0.3)'}}>
                {progress?.today_completed || 0} <span className="text-base font-normal text-cyan-300/40">surveys</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-cyan-400" style={{textShadow: '0 0 15px rgba(0,245,212,0.3)'}}>{percentage}%</p>
              <p className="text-xs text-cyan-300/40">Overall</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{background: 'rgba(0,245,212,0.1)'}}>
            <div className="h-full rounded-full transition-all duration-700" style={{width: `${percentage}%`, background: 'linear-gradient(90deg, #00f5d4, #4cc9f0)', boxShadow: '0 0 10px rgba(0,245,212,0.4)'}} />
          </div>
          <div className="mt-3 pt-3 flex items-center justify-between" style={{borderTop: '1px solid rgba(0,245,212,0.1)'}}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-cyan-300/60">Total Complete</span>
            </div>
            <span className="text-lg font-bold text-emerald-400" style={{textShadow: '0 0 10px rgba(16,185,129,0.3)'}}>{progress?.total_completed || 0}</span>
          </div>
        </div>

        {/* Stats Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Pending', value: progress?.pending || 0, icon: Clock, color: '#ffd60a', bg: 'rgba(255,214,10,0.1)', border: 'rgba(255,214,10,0.25)' },
            { label: 'Approved', value: progress?.completed || 0, icon: CheckCircle, color: '#00f5d4', bg: 'rgba(0,245,212,0.1)', border: 'rgba(0,245,212,0.25)' },
            { label: 'In Review', value: progress?.in_progress || 0, icon: FileSpreadsheet, color: '#4cc9f0', bg: 'rgba(76,201,240,0.1)', border: 'rgba(76,201,240,0.25)' },
            { label: 'Rejected', value: progress?.rejected || 0, icon: XCircle, color: '#f72585', bg: 'rgba(247,37,133,0.1)', border: 'rgba(247,37,133,0.25)' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border p-4 text-center" style={{background: item.bg, borderColor: item.border}}>
              <item.icon className="w-6 h-6 mx-auto mb-1" style={{color: item.color, filter: `drop-shadow(0 0 6px ${item.color}50)`}} />
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider font-medium" style={{color: `${item.color}cc`}}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Date-wise Progress */}
        <div className="rounded-xl border border-cyan-500/20 overflow-hidden" style={{background: 'rgba(13,17,55,0.7)', backdropFilter: 'blur(12px)'}}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cyan-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Date-wise Progress
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-cyan-200 min-w-[80px] text-center">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
              <button onClick={() => changeMonth(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Monthly Total */}
          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-xs text-cyan-300/40">Monthly Total</span>
            <span className="text-lg font-bold text-cyan-400">{dailyData?.total || 0}</span>
          </div>

          {/* Date Grid */}
          {dailyData && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[9px] text-cyan-400/40 font-medium py-1">{d}</div>
                ))}
                
                {/* Empty cells for first day offset */}
                {(() => {
                  const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
                  return Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />);
                })()}
                
                {/* Day cells */}
                {dailyData.daily.map(({ day, count }) => {
                  const isToday = isCurrentMonth && day === todayDay;
                  const intensity = count > 0 ? Math.max(0.2, count / maxDaily) : 0;
                  return (
                    <div key={day} className={`rounded-lg text-center py-1.5 relative ${isToday ? 'ring-1 ring-cyan-400/50' : ''}`}
                      style={{background: count > 0 ? `rgba(0, 245, 212, ${intensity * 0.4})` : 'rgba(255,255,255,0.03)'}}>
                      <div className="text-[9px] text-cyan-300/40">{day}</div>
                      <div className={`text-xs font-bold ${count > 0 ? 'text-cyan-300' : 'text-cyan-500/20'}`}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Condition Summary */}
          {dailyData && dailyData.total > 0 && (
            <div className="px-4 pb-4 pt-2" style={{borderTop: '1px solid rgba(0,245,212,0.08)'}}>
              <p className="text-[10px] text-cyan-300/40 uppercase tracking-wider mb-2">Survey Conditions</p>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: 'Normal', value: dailyData.conditions?.normal || 0, icon: CheckCircle, color: '#00f5d4' },
                  { label: 'Locked', value: dailyData.conditions?.locked || 0, icon: Lock, color: '#ffd60a' },
                  { label: 'Denied', value: dailyData.conditions?.denied || 0, icon: UserX, color: '#f72585' },
                  { label: 'Vacant', value: dailyData.conditions?.vacant || 0, icon: MapPinOff, color: '#7209b7' },
                  { label: 'Wrong', value: dailyData.conditions?.wrong || 0, icon: AlertTriangle, color: '#ef233c' },
                ].map((c) => (
                  <div key={c.label} className="text-center rounded-lg p-1.5" style={{background: 'rgba(0,0,0,0.2)'}}>
                    <c.icon className="w-3 h-3 mx-auto" style={{color: c.color}} />
                    <p className="text-sm font-bold text-white mt-0.5">{c.value}</p>
                    <p className="text-[8px] uppercase" style={{color: `${c.color}99`}}>{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action */}
        <Button
          onClick={() => navigate('/employee/properties')}
          className="w-full h-12 rounded-xl border border-cyan-400/30 text-white font-semibold flex items-center justify-between px-5"
          style={{background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 0 20px rgba(0,245,212,0.15)'}}
          data-testid="view-properties-btn"
        >
          <span className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Properties Dekho</span>
          <ArrowRight className="w-5 h-5" />
        </Button>

        {progress?.pending > 0 && (
          <p className="text-center text-xs text-cyan-300/40">
            {progress.pending} properties pending survey
          </p>
        )}
      </div>
    </EmployeeLayout>
  );
}

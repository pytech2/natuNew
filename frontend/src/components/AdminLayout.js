import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Upload,
  ClipboardCheck,
  Download,
  LogOut,
  Menu,
  X,
  Map,
  FileText,
  Calendar
} from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// All navigation items with permission keys
const allNavItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
  { path: '/admin/employees', icon: Users, label: 'Employees', permission: 'employees' },
  { path: '/admin/attendance', icon: Calendar, label: 'Attendance', permission: 'attendance' },
  { path: '/admin/upload', icon: Upload, label: 'Upload Data', permission: 'upload' },
  { path: '/admin/bills', icon: FileText, label: 'PDF Bills', permission: 'bills' },
  { path: '/admin/properties', icon: FileSpreadsheet, label: 'Properties', permission: 'properties' },
  { path: '/admin/map', icon: Map, label: 'Property Map', permission: 'map' },
  { path: '/admin/submissions', icon: ClipboardCheck, label: 'Submissions', permission: 'submissions' },
  { path: '/admin/export', icon: Download, label: 'Export', permission: 'export' },
];

const ROLE_DISPLAY = {
  'ADMIN': 'Super Admin',
  'SUPERVISOR': 'Supervisor',
  'MC_OFFICER': 'MC Officer'
};

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState(null);
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch user permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserPermissions(response.data.permissions);
        } catch (error) {
          console.error('Failed to fetch permissions');
        }
      }
    };
    fetchPermissions();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine which nav items to show based on role and permissions
  const getNavItems = () => {
    // Admin gets all items
    if (user?.role === 'ADMIN') {
      return allNavItems;
    }
    
    // For SUPERVISOR and MC_OFFICER, filter based on permissions
    if (userPermissions) {
      return allNavItems.filter(item => {
        // Check specific permission keys
        const permKey = item.permission;
        if (permKey === 'dashboard') return userPermissions.can_view_dashboard;
        if (permKey === 'employees') return userPermissions.can_view_employees;
        if (permKey === 'attendance') return userPermissions.can_view_attendance;
        if (permKey === 'upload') return userPermissions.can_upload;
        if (permKey === 'bills') return userPermissions.can_view_bills;
        if (permKey === 'properties') return userPermissions.can_view_properties;
        if (permKey === 'map') return userPermissions.can_view_map;
        if (permKey === 'submissions') return userPermissions.can_view_submissions;
        if (permKey === 'export') return userPermissions.can_export;
        return false;
      });
    }
    
    // Default: show basic items while permissions are loading
    return allNavItems.filter(item => 
      ['dashboard', 'properties', 'map'].includes(item.permission)
    );
  };

  const navItems = getNavItems();
        return mcOfficerNavItems;
      default:
        return adminNavItems;
    }
  };
  
  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <img 
              src="/nstu-logo.png" 
              alt="NSTU INDIA PRIVATE LIMITED" 
              className="w-14 h-14 object-contain rounded-lg bg-white p-1"
            />
            <div>
              <h1 className="font-heading font-bold text-white text-xs leading-tight">NSTU INDIA PRIVATE LIMITED</h1>
              <p className="text-[10px] text-slate-400">Property Tax Manager</p>
            </div>
          </div>
        </div>

        <nav className="mt-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400">{ROLE_DISPLAY[user?.role] || user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 text-sm h-8"
            onClick={handleLogout}
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="font-heading font-bold text-slate-900">{title}</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-with-sidebar pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-slate-900 mb-6 hidden lg:block">
            {title}
          </h1>
          {children}
        </div>
      </main>
    </div>
  );
}

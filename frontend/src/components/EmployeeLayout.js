import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  LogOut
} from 'lucide-react';

const navItems = [
  { path: '/employee', icon: LayoutDashboard, label: 'Home' },
  { path: '/employee/properties', icon: FileSpreadsheet, label: 'Properties' },
];

export default function EmployeeLayout({ children, title, showBackButton = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <img 
              src="/nstu-logo.png" 
              alt="National Services Technical Unit" 
              className="w-12 h-12 object-contain rounded-lg bg-white p-1"
            />
            <h1 className="font-heading font-semibold text-slate-900">{title}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-700"
            data-testid="employee-logout-btn"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

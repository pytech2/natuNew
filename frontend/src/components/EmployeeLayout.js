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
    <div className="min-h-screen pb-20" style={{background: 'linear-gradient(180deg, #0a0e27 0%, #0d1137 100%)'}}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b" style={{background: 'rgba(13, 17, 55, 0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,245,212,0.12)'}}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <img 
              src="/nstu-logo.png" 
              alt="National Services Technical Unit" 
              className="w-10 h-10 object-contain rounded-lg"
              style={{filter: 'drop-shadow(0 0 8px rgba(0,245,212,0.2))'}}
            />
            <h1 className="font-semibold text-cyan-100 text-sm">{title}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400/60 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors"
            data-testid="employee-logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t flex items-center justify-around px-4 py-2" style={{background: 'rgba(13, 17, 55, 0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,245,212,0.12)'}}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-cyan-400' 
                  : 'text-cyan-500/40 hover:text-cyan-400/70'
              }`}
              style={isActive ? {background: 'rgba(0,245,212,0.1)', boxShadow: '0 0 12px rgba(0,245,212,0.1)'} : {}}
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

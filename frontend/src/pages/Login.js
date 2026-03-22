import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapPin, Lock, User, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.post(`${API_URL}/init-admin`).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'ADMIN' ? '/admin' : '/employee');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = await login(username, password);
      toast.success(`Welcome back, ${userData.name}!`);
      navigate(userData.role === 'ADMIN' ? '/admin' : '/employee');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const glassStyle = {
    background: 'rgba(13, 17, 55, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20" style={{background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)', filter: 'blur(80px)'}} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, #f72585 0%, transparent 70%)', filter: 'blur(80px)'}} />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10" style={{background: 'radial-gradient(circle, #7209b7 0%, transparent 70%)', filter: 'blur(60px)'}} />

      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Glass Card */}
        <div className="rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 overflow-hidden" style={glassStyle}>
          
          {/* Logo + Title */}
          <div className="text-center pt-8 pb-4 px-8">
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full opacity-30" style={{background: 'radial-gradient(circle, #00f5d4 0%, transparent 70%)', filter: 'blur(20px)'}} />
              <img 
                src="/nstu-logo.png" 
                alt="National Services Technical Unit" 
                className="w-32 h-32 object-contain mx-auto relative z-10 drop-shadow-lg"
                style={{filter: 'drop-shadow(0 0 15px rgba(0, 245, 212, 0.3))'}}
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide" style={{textShadow: '0 0 20px rgba(0, 245, 212, 0.2)'}}>
              National Services Technical Unit
            </h1>
            <p className="text-cyan-300/50 text-sm mt-1">Property Survey & Notice Distribution System</p>
          </div>

          {/* Divider */}
          <div className="mx-8 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(0,245,212,0.3), transparent)'}} />

          {/* Login Form */}
          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium text-cyan-300/70 uppercase tracking-wider">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                  <Input
                    id="username"
                    data-testid="login-username-input"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 border-cyan-500/20 text-cyan-100 placeholder:text-cyan-500/30 focus:border-cyan-400/50 focus:ring-cyan-400/20 rounded-xl"
                    style={{background: 'rgba(10, 14, 39, 0.6)'}}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-cyan-300/70 uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-cyan-500/20 text-cyan-100 placeholder:text-cyan-500/30 focus:border-cyan-400/50 focus:ring-cyan-400/20 rounded-xl"
                    style={{background: 'rgba(10, 14, 39, 0.6)'}}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                data-testid="login-submit-btn"
                className="w-full h-12 font-semibold text-white rounded-xl border border-cyan-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
                style={{background: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)', boxShadow: '0 0 20px rgba(0, 245, 212, 0.15)'}}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  <><Shield className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            </form>
            
            {/* Footer */}
            <div className="mt-6 pt-5" style={{borderTop: '1px solid rgba(0,245,212,0.1)'}}>
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-400/40">
                <MapPin className="w-3 h-3" />
                <span>National Services Technical Unit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

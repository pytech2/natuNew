import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MapPin, Lock, User } from 'lucide-react';
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
    // Initialize admin user on first load
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

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80"></div>
      
      <Card className="w-full max-w-md relative z-10 animate-fadeIn border-0 shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto">
            <img 
              src="/nstu-logo.png" 
              alt="National Services Technical Unit" 
              className="w-48 h-48 object-contain mx-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading font-bold text-slate-900">
              National Services Technical Unit
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              Property Survey & Notice Distribution System
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="username"
                  data-testid="login-username-input"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            
            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>National Services Technical Unit</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

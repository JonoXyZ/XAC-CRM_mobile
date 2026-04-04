import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Barbell } from '@phosphor-icons/react';
import { BrandingContext } from '../App';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Login = ({ setUser }) => {
  const { companyName, appName } = useContext(BrandingContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const company = JSON.parse(localStorage.getItem('company') || '{}');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/1f8cd556-26ce-4a6e-9e7c-fac0f1e1bc1f/images/2dc13ba2f25b982f50c5aa00d9411ea4fa0df903963f275c02218c7413eb2e14.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-lime-400/20 to-cyan-500/20"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-zinc-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img src="/assets/xac-logo.png" alt="XAC" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="login-title">
              {appName}
            </h1>
            <p className="mt-2 text-base text-zinc-400">{companyName} Lead Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@revivalfitness.com"
                required
                data-testid="login-email-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50 focus:ring-2 focus:ring-lime-400 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-wider uppercase font-bold text-zinc-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                data-testid="login-password-input"
                className="bg-zinc-950 border-zinc-800 text-zinc-50 focus:ring-2 focus:ring-lime-400 focus:border-transparent"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-lime-400 text-zinc-950 font-bold rounded-md px-4 py-6 hover:bg-lime-500 active:scale-95"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-zinc-500">
            <p>Forgot your password? Send <strong>.XACPASS</strong> to your linked WhatsApp.</p>
          </div>

          <div className="border-t border-zinc-800 pt-6 mt-4">
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Contact Us</h3>
              <a
                href="mailto:Xac@Xyzservices.co.za"
                className="text-sm text-lime-400 hover:text-lime-300 font-semibold transition-colors"
                data-testid="contact-email-link"
              >
                Xac@Xyzservices.co.za
              </a>
              <p className="text-xs text-zinc-600">More details to follow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

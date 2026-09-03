import { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0e0c0a] flex items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10" />
      
      <div className="relative z-10 w-full max-w-md bg-[#171412] rounded-3xl p-8 border border-[#e8a33d]/20 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#e8a33d] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#e8a33d]/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#f4f2ee]">Admin Portal</h1>
          <p className="text-[#f4f2ee]/60 mt-2">Sign in to manage The Bagichi</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#f4f2ee]/80 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f4f2ee]/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0e0c0a] border border-[#e8a33d]/20 rounded-xl py-3 pl-12 pr-4 text-[#f4f2ee] focus:outline-none focus:border-[#e8a33d] transition-colors"
                placeholder="admin@thebagichi.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f4f2ee]/80 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f4f2ee]/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0e0c0a] border border-[#e8a33d]/20 rounded-xl py-3 pl-12 pr-4 text-[#f4f2ee] focus:outline-none focus:border-[#e8a33d] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#e8a33d] hover:bg-[#d69536] text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-[#f4f2ee]/40">
          <p>For demonstration, you can create a user in Firebase Auth</p>
        </div>
      </div>
    </motion.div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Shield } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--color-background) 0%, #E2E8F0 100%)' }}>
      
      <div className="card shadow-xl" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', borderRadius: '24px' }}>
        <div className="flex justify-center mb-6">
          <div style={{ background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Tail Spend Control</h1>
          <p className="text-secondary text-sm">Select your role to continue</p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            className="btn btn-outline" 
            style={{ padding: '1.25rem', justifyContent: 'flex-start', fontSize: '1rem', height: 'auto', borderRadius: '16px' }}
            onClick={() => navigate('/user')}
          >
            <div className="p-2 rounded-full mr-3" style={{ background: 'var(--color-surface-hover)' }}>
              <User size={24} style={{ color: 'var(--color-text)' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>Login as User</div>
              <div className="text-xs text-secondary mt-0.5">Access the centralized purchase platform</div>
            </div>
          </button>

          <button 
            className="btn btn-outline" 
            style={{ padding: '1.25rem', justifyContent: 'flex-start', fontSize: '1rem', height: 'auto', borderRadius: '16px' }}
            onClick={() => navigate('/admin/dashboard')}
          >
            <div className="p-2 rounded-full mr-3" style={{ background: 'var(--color-primary-light)' }}>
              <Shield size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>Login as Admin</div>
              <div className="text-xs text-secondary mt-0.5">Manage tail spend and compliance</div>
            </div>
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default Login;

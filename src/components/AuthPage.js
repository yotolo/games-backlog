import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [tab, setTab]           = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Controlla la tua email per il link di conferma!');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-content">

        <div className="auth-logo">
          <span className="auth-logo-icon">🎮</span>
          <h1 className="auth-logo-title">GAME VAULT</h1>
          <p className="auth-logo-sub">Alessio's Backlog</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login'    ? 'active' : ''}`} onClick={() => switchTab('login')}>Accedi</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>Registrati</button>
          </div>

          <div className="auth-card-body">
            {error   && <div className="auth-msg auth-error">{error}</div>}
            {success && <div className="auth-msg auth-success">{success}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn-save auth-submit" disabled={loading}>
                {loading ? '...' : tab === 'login' ? 'Accedi' : 'Crea account'}
              </button>
            </form>

            <div className="auth-divider"><span>oppure</span></div>

            <button className="btn-google" onClick={handleGoogle} type="button">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continua con Google
            </button>
          </div>
        </div>

        <p className="auth-footer">Game Vault · Il tuo backlog personale</p>
      </div>
    </div>
  );
}

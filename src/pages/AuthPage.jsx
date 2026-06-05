import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, User, Mail, Lock, ShieldAlert } from 'lucide-react';

export default function AuthPage() {
  const { login, register, loginAnonymous } = useContext(AuthContext);

  // Mode state: 'login' | 'register' | 'anonymous'
  const [mode, setMode] = useState('login');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  
  // Feedback
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Profile avatar options (Dicebear Bottts with different seeds)
  const avatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Buster',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Rusty'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (mode === 'login' && (!email || !password)) {
      setError('Please fill in email and password.');
      return;
    }
    if (mode === 'register' && (!username || !email || !password)) {
      setError('All fields are required.');
      return;
    }
    if (mode === 'anonymous' && !username.trim()) {
      setError('Please enter a nickname.');
      return;
    }

    setSubmitting(true);
    let res;
    
    try {
      if (mode === 'login') {
        res = await login(email, password);
      } else if (mode === 'register') {
        res = await register(username.trim(), email, password, avatars[selectedAvatar]);
      } else {
        res = await loginAnonymous(username.trim(), avatars[selectedAvatar]);
      }

      if (res && !res.success) {
        setError(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px'
      }}>
        {/* Logo and Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            boxShadow: 'var(--active-glow)',
            marginBottom: '4px'
          }}>
            <MessageSquare size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', color: '#fff' }}>ChatSphere</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {mode === 'login' && 'Sign in to access your chat rooms'}
            {mode === 'register' && 'Create an account to start chatting'}
            {mode === 'anonymous' && 'Enter a temporary nickname to join instantly'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#fca5a5',
            fontSize: '13.5px'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Mode Toggle Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '10px',
          padding: '4px'
        }}>
          {['login', 'register', 'anonymous'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                border: 'none',
                background: mode === m ? 'var(--primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                padding: '8px 4px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {m === 'anonymous' ? 'Guest' : m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Nickname / Username */}
          {mode !== 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {mode === 'register' ? 'Username' : 'Guest Nickname'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. AstroCoder"
                  className="glass-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 38px', fontSize: '14px' }}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          {mode !== 'anonymous' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="e.g. astro@space.com"
                  className="glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 38px', fontSize: '14px' }}
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          {mode !== 'anonymous' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 38px', fontSize: '14px' }}
                  required
                />
              </div>
            </div>
          )}

          {/* Avatar Selector Grid */}
          {mode !== 'login' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Choose Your Avatar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {avatars.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(idx)}
                    style={{
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '50%',
                      padding: '4px',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: selectedAvatar === idx ? 'var(--cyan-glow)' : 'none',
                      outline: selectedAvatar === idx ? '2px solid var(--secondary)' : 'none'
                    }}
                  >
                    <img src={avatar} alt={`avatar-${idx}`} style={{ width: '100%', height: 'auto', borderRadius: '50%' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="glass-button"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              marginTop: '10px'
            }}
          >
            {submitting ? 'Authenticating...' : (mode === 'login' ? 'Sign In' : mode === 'register' ? 'Sign Up' : 'Join Chat Lobby')}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { X, User, Check } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useContext(AuthContext);

  const [username, setUsername] = useState(user?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    const avatars = [
      'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Buster',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Rusty'
    ];
    const index = avatars.indexOf(user?.photoURL);
    return index !== -1 ? index : 0;
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const avatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Buster',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Rusty'
  ];

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateProfile(username.trim(), avatars[selectedAvatar]);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1000);
      } else {
        setError(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Edit Profile</h2>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '8px', color: '#a7f3d0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Avatar select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid var(--secondary)',
              boxShadow: 'var(--cyan-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px'
            }}>
              <img src={avatars[selectedAvatar]} alt="preview" style={{ width: '100%', height: 'auto', borderRadius: '50%' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', width: '100%', marginTop: '8px' }}>
              {avatars.map((avatar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(idx)}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%',
                    padding: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: selectedAvatar === idx ? '2px solid var(--secondary)' : 'none',
                    boxShadow: selectedAvatar === idx ? 'var(--cyan-glow)' : 'none'
                  }}
                >
                  <img src={avatar} alt={`choice-${idx}`} style={{ width: '100%', height: 'auto', borderRadius: '50%' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Username / Nickname</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 32px', fontSize: '13.5px' }}
                maxLength={20}
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={onClose}
              className="glass-button glass-button-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="glass-button"
              disabled={submitting || success}
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

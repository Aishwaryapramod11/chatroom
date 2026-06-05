import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/firebase';
import { Plus, Search, LogOut, MessageSquare, Calendar, ChevronRight, User, Hash, Settings } from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

export default function RoomSelector({ onSelectRoom }) {
  const { user, logout } = useContext(AuthContext);

  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load Rooms list dynamically
  useEffect(() => {
    const unsubscribe = dbService.getRoomsList((roomsList) => {
      setRooms(roomsList);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newRoomName.trim()) {
      setError('Room name is required.');
      return;
    }

    setCreating(true);
    try {
      const roomId = await dbService.createRoom(
        newRoomName.trim(),
        newRoomDesc.trim(),
        user.displayName || user.uid
      );
      
      setNewRoomName('');
      setNewRoomDesc('');
      setDialogOpen(false);
      
      // Auto-join the newly created room
      onSelectRoom(roomId);
    } catch (err) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px 16px'
    }} className="animate-fade-in">
      
      {/* Top Header Panel */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* User Badge */}
        <div 
          onClick={() => setProfileOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Click to edit profile"
        >
          <div style={{
            position: 'relative',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--cyan-glow)'
          }}>
            <img src={user.photoURL} alt="User Profile" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #0f172a'
            }} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{user.displayName}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {user.isAnonymous ? 'Guest Account' : user.email}
            </p>
          </div>
        </div>

        {/* Branding Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: { xs: 'none', md: 'flex' } }}>
          <MessageSquare size={22} color="var(--primary)" />
          <h1 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>ChatSphere</h1>
        </div>

        {/* Logout button */}
        <button 
          onClick={logout}
          className="glass-button glass-button-secondary"
          style={{
            padding: '10px 14px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>
      </div>

      {/* Lobby Dashboard Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px', minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search chat rooms..."
            className="glass-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13.5px' }}
          />
        </div>

        {/* Create Room Button */}
        <button
          onClick={() => setDialogOpen(true)}
          className="glass-button"
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={16} />
          <span>Create New Room</span>
        </button>
      </div>

      {/* Grid of Available Rooms */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        flexGrow: 1,
        alignContent: 'start',
        paddingBottom: '40px'
      }}>
        {filteredRooms.length === 0 ? (
          <div className="glass-panel" style={{
            gridColumn: '1 / -1',
            padding: '60px 40px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Hash size={36} color="var(--text-muted)" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>No active rooms found</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '400px' }}>
              Adjust your search keywords or click "Create New Room" to launch a new chat workspace.
            </p>
          </div>
        ) : (
          filteredRooms.map(room => (
            <div 
              key={room.id}
              className="glass-panel glass-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                minHeight: '200px',
                cursor: 'pointer'
              }}
              onClick={() => onSelectRoom(room.id)}
            >
              {/* Room Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(129, 140, 248, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    #
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {room.name}
                  </h3>
                </div>

                <p style={{
                  fontSize: '13.5px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  marginBottom: '20px',
                  maxHeight: '3.8em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {room.description || 'No description provided for this room.'}
                </p>
              </div>

              {/* Room Footer Details */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '14px',
                fontSize: '11px',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} />
                  <span>By: {room.createdBy}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Room Dialog Modal */}
      {dialogOpen && (
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
          zIndex: '999',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Launch a Chat Room</h2>
            
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Room Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Movie Buffs"
                  className="glass-input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px' }}
                  maxLength={30}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Description (Optional)</label>
                <textarea 
                  placeholder="What is this channel about?"
                  className="glass-input"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13.5px', minHeight: '80px', resize: 'vertical' }}
                  maxLength={150}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => { setDialogOpen(false); setError(''); }}
                  className="glass-button glass-button-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="glass-button"
                  disabled={creating}
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  {creating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Editor Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

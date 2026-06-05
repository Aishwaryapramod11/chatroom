import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { dbService } from '../services/firebase';
import { 
  ArrowLeft, Send, Smile, Paperclip, Search, Users, Info, 
  Menu, X, MessageSquare, Image, Bell, Hash, Moon, Settings
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

export default function ChatRoom({ roomId, onBack, onSelectRoom }) {
  const { user } = useContext(AuthContext);

  // Core Data States
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [presenceList, setPresenceList] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // UI & Input States
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMemberSidebar, setShowMemberSidebar] = useState(true);
  const [showRoomSidebar, setShowRoomSidebar] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Image attachments
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevMessagesLengthRef = useRef({});

  // Emojis array for built-in picker
  const emojiList = [
    '😀', '😂', '😍', '👍', '🔥', '🎉', '❤️', '👏', 
    '🤔', '🙌', '🚀', '✨', '😎', '💡', '😢', '💯', 
    '👀', '👋', '🎨', '🍕', '🐱', '🌈', '⚡', '🎈'
  ];

  // 1. Monitor Screen Size to fold sidebars automatically on Mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowRoomSidebar(false);
        setShowMemberSidebar(false);
      } else {
        setShowRoomSidebar(true);
        setShowMemberSidebar(true);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Fetch all Rooms (for switching left panel & handling other rooms notifications)
  useEffect(() => {
    const unsubscribe = dbService.getRoomsList((roomsList) => {
      setRooms(roomsList);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 3. Main Message Listener for the Active Room
  useEffect(() => {
    if (!roomId) return;
    
    // Reset inputs on room switch
    setInputText('');
    setSearchQuery('');
    
    const unsubscribe = dbService.getMessagesList(roomId, (msgList) => {
      setMessages(msgList);
      scrollToBottom();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [roomId]);

  // 4. Typing Status Listener
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = dbService.getTypingUsers(roomId, (users) => {
      // Exclude self from typing indicators
      setTypingUsers(users.filter(u => u.userId !== user.uid));
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      // Reset typing on leave
      dbService.setTypingStatus(roomId, user, false);
    };
  }, [roomId, user]);

  // 5. Presence (Online status) Listener & Registration
  useEffect(() => {
    if (!roomId || !user) return;

    // Set online
    dbService.setUserPresence(roomId, user, true);

    const unsubscribe = dbService.getRoomPresence(roomId, (users) => {
      setPresenceList(users);
    });

    return () => {
      dbService.setUserPresence(roomId, user, false);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [roomId, user]);

  // 6. Cross-Room In-App Toast Notifications
  // Set up listeners for rooms other than the active one
  useEffect(() => {
    if (rooms.length === 0) return;
    
    const unsubscribes = [];
    
    rooms.forEach(room => {
      // Don't notify for the current room
      if (room.id === roomId) return;
      
      const unsub = dbService.getMessagesList(room.id, (msgList) => {
        // Track the previous lengths to detect new messages
        const prevLength = prevMessagesLengthRef.current[room.id];
        prevMessagesLengthRef.current[room.id] = msgList.length;
        
        // If it's not the first load and a new message arrived
        if (prevLength !== undefined && msgList.length > prevLength) {
          const newMsg = msgList[msgList.length - 1];
          // Exclude self messages
          if (newMsg.senderId !== user.uid) {
            triggerToast(room.name, newMsg.senderName, newMsg.text || 'Shared an image');
          }
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [rooms, roomId, user]);

  const triggerToast = (roomName, senderName, textPreview) => {
    const id = Date.now();
    const newToast = { id, roomName, senderName, text: textPreview };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 7. Input Handlers
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    // Set typing status to true
    dbService.setTypingStatus(roomId, user, true);
    
    // Clear previous timeout and set new one to clear typing status
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      dbService.setTypingStatus(roomId, user, false);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    dbService.setTypingStatus(roomId, user, false);

    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    
    await dbService.sendMessage(roomId, text, null, user);
    scrollToBottom();
  };

  // 8. Image Upload (Base64 conversion)
  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      await dbService.sendMessage(roomId, null, base64Data, user);
      scrollToBottom();
    };
    reader.readAsDataURL(file);
    
    // Clear input
    e.target.value = null;
  };

  const addEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const currentRoom = rooms.find(r => r.id === roomId) || {};

  // Filter messages for search query
  const searchedMessages = searchQuery.trim() === ''
    ? messages
    : messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden'
    }} className="animate-fade-in">
      
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontSize: '11px', fontWeight: 'bold' }}>
              <Bell size={12} />
              <span>#{toast.roomName}</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{toast.senderName}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {toast.text}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEFT PANEL: Room Switcher Sidebar (Collapsible)               */}
      {/* ------------------------------------------------------------- */}
      {showRoomSidebar && (
        <div className="glass-panel" style={{
          width: '260px',
          height: '100%',
          borderRadius: '0',
          borderRight: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: '98'
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Active Rooms</h3>
            </div>
            {/* Close sidebar on mobile */}
            <button 
              className="glass-button glass-button-secondary"
              onClick={() => setShowRoomSidebar(false)}
              style={{ display: window.innerWidth < 768 ? 'flex' : 'none', padding: '4px', borderRadius: '6px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Rooms List Switcher */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rooms.map(room => {
              const isSelected = room.id === roomId;
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    if (window.innerWidth < 768) setShowRoomSidebar(false);
                    onSelectRoom(room.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    border: 'none',
                    background: isSelected ? 'rgba(129, 140, 248, 0.15)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  className={!isSelected ? 'glass-card' : ''}
                >
                  <span style={{ fontWeight: 'bold' }}>#</span>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                    {room.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* User Profile Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <img src={user.photoURL} alt="My Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--secondary)' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={user.displayName}>
                {user.displayName}
              </span>
            </div>
            <button 
              onClick={() => setProfileOpen(true)}
              className="glass-button glass-button-secondary"
              style={{ padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Edit Profile"
            >
              <Settings size={14} />
            </button>
          </div>

          {/* Go Back Lobby Button */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <button
              onClick={onBack}
              className="glass-button glass-button-secondary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Lobby</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CENTER PANEL: Main Chat Feed & Message Inputs                 */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative'
      }}>
        {/* Chat Room Header */}
        <div className="glass-panel" style={{
          borderRadius: '0',
          borderBottom: '1px solid var(--panel-border)',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: '90'
        }}>
          {/* Header Left (Navigation & Title) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setShowRoomSidebar(!showRoomSidebar)}
              className="glass-button glass-button-secondary"
              style={{ padding: '8px', borderRadius: '8px' }}
            >
              <Menu size={16} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--secondary)', fontWeight: 'bold', fontSize: '18px' }}>#</span>
                <h2 style={{ fontSize: '16.5px', fontWeight: '800', color: '#fff' }}>{currentRoom.name || 'Loading...'}</h2>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', display: { xs: 'none', sm: 'block' } }}>
                {currentRoom.description || 'Channel chatroom'}
              </p>
            </div>
          </div>

          {/* Header Right (Actions) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setShowMemberSidebar(!showMemberSidebar)}
              className="glass-button glass-button-secondary"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Users size={15} />
              <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>Room Info</span>
            </button>
          </div>
        </div>

        {/* Message Feed Container */}
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {searchedMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Hash size={40} style={{ opacity: 0.15, marginBottom: '8px' }} />
              <p style={{ fontSize: '14px' }}>
                {searchQuery ? 'No messages matches your search query.' : 'This is the start of the chat history. Say hello!'}
              </p>
            </div>
          ) : (
            searchedMessages.map(msg => {
              const isOwnMessage = msg.senderId === user.uid;
              const sentTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                    maxWidth: '75%'
                  }}
                >
                  {/* Sender Avatar */}
                  <img 
                    src={msg.senderAvatar} 
                    alt={msg.senderName} 
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: isOwnMessage ? '2px solid var(--primary)' : '2px solid var(--secondary)' }} 
                  />

                  {/* Message Bubble Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwnMessage ? 'flex-end' : 'flex-start', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isOwnMessage ? 'row-reverse' : 'row' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{msg.senderName}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sentTime}</span>
                    </div>
                    
                    {/* The Bubble */}
                    <div style={{
                      background: isOwnMessage ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: isOwnMessage ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      padding: '10px 14px',
                      color: '#fff',
                      fontSize: '13.5px',
                      lineHeight: '1.45',
                      wordBreak: 'break-word',
                      boxShadow: isOwnMessage ? 'var(--active-glow)' : 'none'
                    }}>
                      {/* Text */}
                      {msg.text && <p>{msg.text}</p>}
                      {/* Image Inline */}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="shared-inline" 
                          style={{
                            maxWidth: '100%',
                            maxHeight: '280px',
                            borderRadius: '8px',
                            marginTop: msg.text ? '8px' : '0',
                            display: 'block'
                          }} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Notification Banner */}
        {typingUsers.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '76px',
            left: '20px',
            fontSize: '12px',
            color: 'var(--secondary)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="typing-dots" style={{ display: 'flex', gap: '3px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0].username} is typing...` 
                : `${typingUsers.map(u => u.username).join(', ')} are typing...`}
            </span>
          </div>
        )}

        {/* Emoji Selector Panel */}
        {showEmojiPicker && (
          <div className="glass-panel" style={{
            position: 'absolute',
            bottom: '76px',
            left: '20px',
            padding: '12px',
            maxWidth: '220px',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
            zIndex: '100',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            {emojiList.map(emoji => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                style={{
                  fontSize: '20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'transform 0.1s'
                }}
                className="glass-card"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.2)', borderTop: '1px solid var(--panel-border)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Attachment Button */}
            <button 
              type="button" 
              onClick={handleImageClick}
              className="glass-button glass-button-secondary" 
              style={{ padding: '10px', borderRadius: '10px' }}
              title="Share Image"
            >
              <Paperclip size={16} />
            </button>
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />

            {/* Emoji Button */}
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="glass-button glass-button-secondary" 
              style={{ padding: '10px', borderRadius: '10px', color: showEmojiPicker ? 'var(--primary)' : 'inherit' }}
            >
              <Smile size={16} />
            </button>

            {/* Text Input */}
            <input 
              type="text"
              placeholder="Type your message..."
              className="glass-input"
              value={inputText}
              onChange={handleInputChange}
              style={{ flexGrow: 1, padding: '10px 14px', fontSize: '13.5px' }}
            />

            {/* Send Button */}
            <button 
              type="submit" 
              className="glass-button" 
              style={{ padding: '10px 16px', borderRadius: '10px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT PANEL: Room Info & Online Users Sidebar                 */}
      {/* ------------------------------------------------------------- */}
      {showMemberSidebar && (
        <div className="glass-panel" style={{
          width: '260px',
          height: '100%',
          borderRadius: '0',
          borderLeft: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          zIndex: '97'
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="var(--secondary)" />
              <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Room Details</h3>
            </div>
            <button 
              className="glass-button glass-button-secondary"
              onClick={() => setShowMemberSidebar(false)}
              style={{ display: window.innerWidth < 768 ? 'flex' : 'none', padding: '4px', borderRadius: '6px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Search Message Box */}
          <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search messages..."
                className="glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Description Block */}
          <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.02em' }}>About</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {currentRoom.description || 'Welcome to this chat channel! Have fun communicating.'}
            </p>
          </div>

          {/* Bots Block */}
          <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.02em' }}>Chat Bots</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Astro" alt="AstroBot" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--primary)', background: 'rgba(255, 255, 255, 0.05)' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>AstroBot 🚀</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Try `@astro fact` or `@astro trivia`</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Joke" alt="JokeBot" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--secondary)', background: 'rgba(255, 255, 255, 0.05)' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>JokeBot 🤖</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Try `@joke` to hear a joke</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Echo" alt="EchoBot" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #10b981', background: 'rgba(255, 255, 255, 0.05)' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>EchoBot 📣</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Try `@echo hello` or `@echo reverse`</div>
                </div>
              </div>
            </div>
          </div>

          {/* Online Users List */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Users size={14} color="var(--primary)" />
              <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Online Members ({presenceList.length})
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {presenceList.map(member => (
                <div key={member.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Member Avatar */}
                  <div style={{
                    position: 'relative',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)'
                  }}>
                    <img src={member.avatar} alt={member.username} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '1px solid #1e293b'
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {member.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

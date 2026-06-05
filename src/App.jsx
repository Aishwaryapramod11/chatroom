import React, { useState, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import RoomSelector from './pages/RoomSelector';
import ChatRoom from './pages/ChatRoom';

function AppContent() {
  const { user } = useContext(AuthContext);
  const [activeRoomId, setActiveRoomId] = useState(null);

  // If user is not authenticated, render login/signup/guest access
  if (!user) {
    return <AuthPage />;
  }

  // If authenticated but no room selected, render the lobby selector
  if (!activeRoomId) {
    return <RoomSelector onSelectRoom={setActiveRoomId} />;
  }

  // Otherwise, load the active ChatRoom interface
  return (
    <ChatRoom 
      roomId={activeRoomId} 
      onBack={() => setActiveRoomId(null)} 
      onSelectRoom={setActiveRoomId} 
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

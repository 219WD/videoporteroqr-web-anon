import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { CallPage } from './pages/CallPage';
import { QrPage } from './pages/QrPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/qr/:code" element={<QrPage />} />
      <Route path="/chat/:callId" element={<ChatPage />} />
      <Route path="/call/:callId" element={<CallPage />} />
      <Route path="/messages/:callId" element={<ChatPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { QrPage } from './pages/QrPage';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WebSocketBridge } from './components/WebSocketBridge';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <WebSocketBridge />
      {showSplash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          aria-hidden="true"
        >
          <img
            src="/splash/logotipo-color.png"
            alt=""
            className="w-[240px] max-w-[72vw] select-none object-contain"
            draggable={false}
          />
        </div>
      )}

      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/qr/:code" element={<QrPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </>
  );
}

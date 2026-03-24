import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-8xl mb-4">🏛️</div>
        <h1 className="text-6xl font-black text-primary-700 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary">← Go Home</button>
      </div>
    </div>
  );
}

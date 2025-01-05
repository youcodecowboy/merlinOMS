import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DevDashboard } from '../pages/DevDashboard';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* ... existing routes ... */}
      <Route path="/dev" element={<DevDashboard />} />
    </Routes>
  );
}; 
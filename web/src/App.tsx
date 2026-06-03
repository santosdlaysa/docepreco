import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import AdminApp from './admin/AdminApp';
import UserApp from './user/UserApp';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<UserApp />} />
      <Route path="/app/:slug" element={<UserApp />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

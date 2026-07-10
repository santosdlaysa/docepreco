import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DownloadPage } from './pages/DownloadPage';
import AdminApp from './admin/AdminApp';
import UserApp from './user/UserApp';
import { LojaPage } from './pages/LojaPage';
import { LojasPage } from './pages/LojasPage';
import { MeusPedidosPage } from './pages/MeusPedidosPage';
import { ExplorarPage } from './pages/ExplorarPage';
import { PerfilPage } from './pages/PerfilPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/app" element={<UserApp />} />
      <Route path="/app/:slug" element={<UserApp />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="/lojas" element={<LojasPage />} />
      <Route path="/explorar" element={<ExplorarPage />} />
      <Route path="/meus-pedidos" element={<MeusPedidosPage />} />
      <Route path="/perfil" element={<PerfilPage />} />
      <Route path="/loja/:slug" element={<LojaPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

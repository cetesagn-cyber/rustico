import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Agenda from './pages/Agenda';
import Clientes from './pages/Clientes';
import Perfil from './pages/Perfil';

function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const cargarPerfil = useAuthStore(s => s.cargarPerfil);
  const logout = useAuthStore(s => s.logout);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  useEffect(() => {
    window.addEventListener('rustico:auth-expired', logout);
    return () => window.removeEventListener('rustico:auth-expired', logout);
  }, [logout]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/agenda" replace />} />
          <Route path="agenda"   element={<Agenda />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="perfil"   element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clientes from './pages/Clientes';
import Barberos from './pages/Barberos';
import Catalogo from './pages/Catalogo';
import Financiero    from './pages/Financiero';
import Estadisticas  from './pages/Estadisticas';
import Adelantos     from './pages/Adelantos';
import Whatsapp      from './pages/Whatsapp';
import Usuarios      from './pages/Usuarios';
import Confirmar     from './pages/Confirmar';

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
        <Route path="/c/:token" element={<Confirmar />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="agenda"   element={<Agenda />} />
          <Route path="clientes" element={<ProtectedRoute roles={['admin', 'recepcion']}><Clientes /></ProtectedRoute>} />
          <Route path="barberos"    element={<ProtectedRoute roles={['admin']}><Barberos /></ProtectedRoute>} />
          <Route path="catalogo"    element={<ProtectedRoute roles={['admin']}><Catalogo /></ProtectedRoute>} />
          <Route path="financiero"   element={<ProtectedRoute roles={['admin']}><Financiero /></ProtectedRoute>} />
          <Route path="estadisticas" element={<ProtectedRoute roles={['admin']}><Estadisticas /></ProtectedRoute>} />
          <Route path="adelantos"    element={<ProtectedRoute roles={['admin', 'recepcion']}><Adelantos /></ProtectedRoute>} />
          <Route path="whatsapp"     element={<ProtectedRoute roles={['admin']}><Whatsapp /></ProtectedRoute>} />
          <Route path="usuarios"     element={<ProtectedRoute roles={['admin']}><Usuarios /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

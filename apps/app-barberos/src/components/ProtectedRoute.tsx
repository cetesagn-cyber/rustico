import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { token, usuario } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;

  // La app de barberos es exclusiva para ese rol.
  if (usuario && usuario.rol !== 'barbero') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Acceso restringido</h2>
        <p>Esta app es para barberos. Usa el portal de administración para gestión interna.</p>
        <button onClick={() => useAuthStore.getState().logout()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

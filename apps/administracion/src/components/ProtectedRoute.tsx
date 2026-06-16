import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

type Rol = 'admin' | 'barbero' | 'recepcion';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Rol[];
}) {
  const token = useAuthStore(s => s.token);
  const usuario = useAuthStore(s => s.usuario);
  if (!token) return <Navigate to="/login" replace />;
  if (roles && usuario && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

import { useAuthStore } from '../store/auth.store';
import { LogOut, User, Scissors } from 'lucide-react';

export default function Perfil() {
  const { usuario, logout } = useAuthStore();

  return (
    <div className="page perfil-mobile">
      <div className="perfil-header">
        <div className="perfil-avatar">
          <Scissors size={36} />
        </div>
        <h2>{usuario?.nombre}</h2>
        <span className="perfil-rol">{usuario?.rol}</span>
        <span className="perfil-email">{usuario?.email}</span>
      </div>

      <div className="perfil-card">
        <div className="perfil-row">
          <User size={18} />
          <span>{usuario?.nombre}</span>
        </div>
      </div>

      <button className="btn-logout" onClick={logout}>
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </div>
  );
}

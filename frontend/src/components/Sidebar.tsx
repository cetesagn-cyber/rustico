import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Users, Scissors, LayoutDashboard, LogOut, User, TrendingUp, BarChart2, Tag, Wallet, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin', 'recepcion', 'barbero'] },
  { to: '/agenda',       icon: Calendar,        label: 'Agenda',       roles: ['admin', 'recepcion', 'barbero'] },
  { to: '/clientes',     icon: Users,           label: 'Clientes',     roles: ['admin', 'recepcion'] },
  { to: '/barberos',     icon: Scissors,        label: 'Barberos',     roles: ['admin'] },
  { to: '/catalogo',     icon: Tag,             label: 'Catálogo',     roles: ['admin'] },
  { to: '/adelantos',    icon: Wallet,          label: 'Adelantos',    roles: ['admin', 'recepcion'] },
  { to: '/usuarios',     icon: ShieldCheck,     label: 'Usuarios',     roles: ['admin'] },
  { to: '/whatsapp',     icon: MessageCircle,   label: 'WhatsApp',     roles: ['admin'] },
  { to: '/financiero',   icon: TrendingUp,      label: 'Financiero',   roles: ['admin'] },
  { to: '/estadisticas', icon: BarChart2,       label: 'Estadísticas', roles: ['admin'] },
];

export default function Sidebar() {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="rustico-sidebar" style={{
      width: 'var(--sidebar-w)',
      minHeight: '100vh',
      background: [
        'repeating-linear-gradient(-45deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 20px)',
        'repeating-linear-gradient( 45deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 20px)',
        'radial-gradient(ellipse at 50% 0%, rgba(212,146,26,0.12) 0%, transparent 60%)',
        'linear-gradient(180deg, #253F68 0%, #1E3354 55%, #192E4E 100%)',
      ].join(', '),
      borderRight: '1px solid rgba(212,146,26,0.15)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{
        padding: '10px 10px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        background: '#1E3354',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          padding: '8px 10px 6px',
          borderBottom: '2px solid #D4921A',
          boxShadow: '0 2px 8px rgba(212,146,26,0.18)',
        }}>
          <img
            src="/logo-nuevo-2.png"
            alt="Rústico Barber & Concept Shop"
            style={{ width: '100%', display: 'block' }}
          />
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: 7,
          marginBottom: 2,
          fontSize: 8,
          color: 'rgba(212,146,26,0.8)',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Panel de Administración
        </div>
      </div>

      {/* Navegación */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '16px 8px' }}>
        {NAV.filter(item => item.roles.includes(usuario?.rol || '')).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 2,
              color: isActive ? '#fff' : '#A8C0D8',
              background: isActive ? 'var(--verde)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
            })}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="sidebar-user" style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={14} color="#A8C0D8" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#D0E4F8' }}>
              {usuario?.nombre}
            </div>
            <div style={{ fontSize: 11, color: '#A8C0D8', textTransform: 'capitalize' }}>
              {usuario?.rol}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: '#A8C0D8',
            fontSize: 13, transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#E86060';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#E86060';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#A8C0D8';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

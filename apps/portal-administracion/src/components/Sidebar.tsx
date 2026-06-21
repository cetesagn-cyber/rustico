import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Users, Scissors, LayoutDashboard, LogOut, User, TrendingUp, BarChart2, Tag, Wallet, MessageCircle, ShieldCheck, KeyRound, X } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api/client';

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
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const cerrarPassword = () => { setPasswordOpen(false); setActual(''); setNueva(''); setConfirmacion(''); setError(''); };
  const guardarPassword = async () => {
    if (nueva !== confirmacion) { setError('Las contraseñas no coinciden.'); return; }
    setGuardando(true); setError('');
    try { await api.post('/auth/password', { actual, password: nueva }); cerrarPassword(); }
    catch (err: any) { setError(err.message || 'No se pudo actualizar la contraseña.'); }
    finally { setGuardando(false); }
  };

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
          onClick={() => setPasswordOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 6, marginBottom: 7,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.035)', color: '#B9CEE2', fontSize: 13, transition: 'all 0.15s',
          }}
        >
          <KeyRound size={14} />
          Cambiar contraseña
        </button>
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
      {passwordOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,20,34,.58)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.28)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <div><strong style={{ color: '#253F68' }}>Cambiar contraseña</strong><div style={{ color: '#718096', fontSize: 12, marginTop: 3 }}>Mantén tu acceso protegido.</div></div>
              <button type="button" onClick={cerrarPassword} style={{ border: 0, background: 'transparent', color: '#718096', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {[['Contraseña actual', actual, setActual], ['Nueva contraseña', nueva, setNueva], ['Confirmar contraseña', confirmacion, setConfirmacion]].map(([label, value, setter]) => (
              <label key={label as string} style={{ display: 'block', color: '#52657A', fontSize: 12, fontWeight: 600, marginBottom: 11 }}>{label as string}
                <input type="password" value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '9px 10px', borderRadius: 7, border: '1px solid #D9E1E8', outline: 'none' }} />
              </label>
            ))}
            {error && <div style={{ color: '#B53A3A', fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={cerrarPassword} style={{ border: 0, background: 'transparent', color: '#61758A', cursor: 'pointer', padding: '8px 10px' }}>Cancelar</button>
              <button type="button" onClick={guardarPassword} disabled={guardando} style={{ border: 0, borderRadius: 7, padding: '8px 12px', background: 'var(--verde)', color: '#fff', cursor: 'pointer' }}>{guardando ? 'Guardando…' : 'Actualizar'}</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

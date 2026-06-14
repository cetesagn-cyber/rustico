import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const [email, setEmail]   = useState('admin@rustico.co');
  const [password, setPass] = useState('');
  const [error, setError]   = useState('');
  const { login, cargando } = useAuthStore();
  const navigate            = useNavigate();

  /* Fuerza el fondo marino oscuro en html + body para toda la página */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const ph = html.style.background;
    const pb = body.style.background;
    html.style.background = '#141E30';
    body.style.background = '#141E30';
    return () => { html.style.background = ph; body.style.background = pb; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try { await login(email, password); navigate('/'); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #141E30 0%, #1E3354 55%, #192840 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 28px 12px',
          marginBottom: 6,
          borderBottom: '3px solid #D4921A',
          boxShadow: '0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(212,146,26,0.18)',
        }}>
          <img
            src="/logo-nuevo-2.png"
            alt="Rústico Barber & Concept Shop"
            style={{ width: '100%', maxWidth: 380, display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Subtítulo dorado */}
        <p style={{
          textAlign: 'center',
          fontSize: 10,
          color: 'rgba(212,146,26,0.85)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 28,
          marginTop: 10,
        }}>
          Panel de administración
        </p>

        {/* ── Card formulario ───────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(212,146,26,0.22)',
          borderRadius: 14,
          padding: '30px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.28)',
        }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-email" style={labelSt}>
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                title="Correo electrónico"
                placeholder="correo@rustico.co"
                style={inputSt}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="login-password" style={labelSt}>
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                required
                title="Contraseña de acceso"
                placeholder="••••••••"
                style={inputSt}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(170,40,40,0.15)', border: '1px solid rgba(170,40,40,0.4)',
                color: '#F08080', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              style={{
                width: '100%', padding: '13px',
                background: cargando ? '#2A4A6A' : '#D4921A',
                border: 'none', borderRadius: 9,
                color: '#fff', fontSize: 14, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'background 0.15s, box-shadow 0.15s',
                cursor: cargando ? 'not-allowed' : 'pointer',
                boxShadow: cargando ? 'none' : '0 2px 14px rgba(212,146,26,0.4)',
              }}
            >
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 24,
          fontSize: 11, color: 'rgba(168,192,216,0.55)',
          letterSpacing: '0.06em',
        }}>
          Cra. 13 #78-17, Bogotá · Est. 2018
        </p>
      </div>
    </div>
  );
}

/* ── estilos compartidos ───────────────────────────────────────────────────── */
const labelSt: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--texto-suave)',
  marginBottom: 6,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const inputSt: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#f6f8f6',
  border: '1px solid #d4e0d0',
  borderRadius: 8,
  color: 'var(--texto)',
  fontSize: 14,
  outline: 'none',
};

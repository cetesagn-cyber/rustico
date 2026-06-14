import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../api/client';
import { formatAgendaHora } from '../utils/agendaDate';

interface Resumen {
  total_citas: string;
  completadas: string;
  pendientes: string;
  no_shows: string;
  ingresos_cop: string;
}

interface Cita {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_cop: number;
  cliente_nombre: string;
  servicio_nombre: string;
  barbero_nombre: string;
  barbero_color: string;
}

function formatHora(iso: string) {
  return formatAgendaHora(iso);
}

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
}

function hoy() { return new Date().toISOString().split('T')[0]; }

export default function Dashboard() {
  const [resumen, setResumen]   = useState<Resumen | null>(null);
  const [citas, setCitas]       = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fecha = hoy();
    Promise.all([
      api.get<Resumen>(`/agenda/resumen?fecha=${fecha}`),
      api.get<Cita[]>(`/agenda?fecha=${fecha}`),
    ]).then(([r, c]) => {
      setResumen(r);
      setCitas(c);
    }).finally(() => setCargando(false));
  }, []);

  const tarjetas = [
    { label: 'Citas hoy',    valor: resumen?.total_citas || '0', icon: Calendar,    color: 'var(--verde)' },
    { label: 'Completadas',  valor: resumen?.completadas || '0', icon: CheckCircle,  color: 'var(--exito)' },
    { label: 'Pendientes',   valor: resumen?.pendientes || '0',  icon: Clock,        color: 'var(--pendiente)' },
    { label: 'No-shows',     valor: resumen?.no_shows || '0',    icon: XCircle,      color: 'var(--error)' },
    { label: 'Ingresos',     valor: formatCOP(parseInt(resumen?.ingresos_cop || '0')), icon: TrendingUp, color: 'var(--cobre)' },
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)' }}>Dashboard</h1>
        <p style={{ color: 'var(--texto-suave)', marginTop: 4 }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Bogota' })}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {tarjetas.map(({ label, valor, icon: Icon, color }) => (
          <div key={label} style={{
            background: 'var(--superficie)', border: '1px solid var(--borde)',
            borderRadius: 10, padding: '20px 18px', display: 'flex',
            alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)', lineHeight: 1 }}>{cargando ? '—' : valor}</div>
              <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Citas del día */}
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--blanco)' }}>Citas de hoy</h2>
          <Link to="/agenda" style={{ fontSize: 13, color: 'var(--verde)', fontWeight: 500 }}>Ver agenda completa →</Link>
        </div>

        {cargando ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-suave)' }}>Cargando…</div>
        ) : citas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-suave)' }}>Sin citas agendadas hoy.</div>
        ) : (
          <div>
            {citas.map(cita => (
              <div key={cita.id} style={{
                padding: '14px 20px', borderBottom: '1px solid var(--borde)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ width: 4, height: 40, borderRadius: 2, background: cita.barbero_color, flexShrink: 0 }} />
                <div style={{ minWidth: 70 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blanco)' }}>{formatHora(cita.inicio)}</div>
                  <div style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{formatHora(cita.fin)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--texto)' }}>
                    {cita.cliente_nombre || 'Sin cliente'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
                    {cita.servicio_nombre} · {cita.barbero_nombre}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge badge-${cita.estado}`}>{cita.estado}</span>
                  <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 4 }}>{formatCOP(cita.precio_cop)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

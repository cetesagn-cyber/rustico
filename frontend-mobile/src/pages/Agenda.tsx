import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface Cita {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_cop: number;
  notas: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  servicio_nombre: string;
  barbero_nombre: string;
  barbero_id: string;
  token_confirmacion: string | null;
}

function fechaStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
}

function formatFechaLabel(d: Date) {
  const hoy = fechaStr(new Date());
  const manana = fechaStr(addDias(new Date(), 1));
  const f = fechaStr(d);
  if (f === hoy) return 'Hoy';
  if (f === manana) return 'Mañana';
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
}

const ESTADO_ICON: Record<string, React.ReactNode> = {
  confirmada:  <CheckCircle size={16} className="estado-icon confirmada" />,
  pendiente:   <Clock size={16} className="estado-icon pendiente" />,
  completada:  <CheckCircle size={16} className="estado-icon completada" />,
  cancelada:   <XCircle size={16} className="estado-icon cancelada" />,
};

export default function Agenda() {
  const usuario = useAuthStore(s => s.usuario);
  const [fecha, setFecha] = useState(new Date());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    // /mis-citas resuelve el barbero_id desde el JWT en el backend — evita filtrado client-side
    api.get<Cita[]>(`/agenda/mis-citas?fecha=${fechaStr(fecha)}`)
      .then(data => setCitas(Array.isArray(data) ? data : []))
      .catch(() => setCitas([]))
      .finally(() => setCargando(false));
  }, [fecha, usuario]);

  const misCitas = [...citas].sort((a, b) => a.inicio.localeCompare(b.inicio));

  function abrirWhatsApp(cita: Cita) {
    if (!cita.cliente_telefono) return;
    const tel = cita.cliente_telefono.replace(/\D/g, '');
    const hora = formatHora(cita.inicio);
    const msg = encodeURIComponent(`Hola ${cita.cliente_nombre}, te recuerdo tu cita de ${cita.servicio_nombre} hoy a las ${hora}. ¡Te esperamos! 💈`);
    window.open(`https://wa.me/57${tel}?text=${msg}`, '_blank');
  }

  return (
    <div className="page agenda-mobile">
      <div className="fecha-nav">
        <button className="icon-btn" onClick={() => setFecha(d => addDias(d, -1))}>
          <ChevronLeft size={20} />
        </button>
        <span className="fecha-label">{formatFechaLabel(fecha)}</span>
        <button className="icon-btn" onClick={() => setFecha(d => addDias(d, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      {cargando && <p className="loading-text">Cargando...</p>}

      {!cargando && misCitas.length === 0 && (
        <div className="empty-state">
          <p>Sin citas para este día</p>
        </div>
      )}

      <div className="citas-list">
        {misCitas.map(cita => (
          <div key={cita.id} className={`cita-card estado-${cita.estado}`}>
            <div className="cita-hora">
              <span>{formatHora(cita.inicio)}</span>
              <span className="cita-estado">
                {ESTADO_ICON[cita.estado] ?? null}
                {cita.estado}
              </span>
            </div>
            <div className="cita-info">
              <strong>{cita.cliente_nombre}</strong>
              <span>{cita.servicio_nombre}</span>
              <span className="cita-precio">{formatCOP(cita.precio_cop)}</span>
            </div>
            {cita.cliente_telefono && (
              <button className="wa-btn" onClick={() => abrirWhatsApp(cita)} title="Enviar recordatorio WhatsApp">
                <MessageCircle size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

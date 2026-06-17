import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Scissors, Calendar, Clock, DollarSign } from 'lucide-react';

const API = '/api/v1';

interface CitaPublica {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  precio_cop: number;
  cliente_nombre: string;
  servicio_nombre: string;
  barbero_nombre: string;
  barbero_color: string;
  duracion_min: number;
}

function formatFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Bogota',
  });
}
function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota', hour12: true,
  });
}
function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
}

export default function Confirmar() {
  const { token } = useParams<{ token: string }>();
  const [cita, setCita]         = useState<CitaPublica | null>(null);
  const [estado, setEstado]     = useState<'cargando' | 'listo' | 'confirmando' | 'confirmada' | 'error'>('cargando');
  const [mensaje, setMensaje]   = useState('');

  useEffect(() => {
    fetch(`${API}/agenda/confirmar/${token}`)
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') { setCita(r.data); setEstado('listo'); }
        else { setMensaje(r.message || 'Enlace no válido.'); setEstado('error'); }
      })
      .catch(() => { setMensaje('No se pudo conectar. Intenta de nuevo.'); setEstado('error'); });
  }, [token]);

  const confirmar = async () => {
    setEstado('confirmando');
    try {
      const r = await fetch(`${API}/agenda/confirmar/${token}`, { method: 'PATCH' }).then(r => r.json());
      if (r.status === 'success') { setCita(r.data); setEstado('confirmada'); }
      else { setMensaje(r.message || 'No se pudo confirmar.'); setEstado('error'); }
    } catch {
      setMensaje('No se pudo conectar. Intenta de nuevo.'); setEstado('error');
    }
  };

  const yaConfirmada = cita?.estado === 'confirmada' && estado === 'listo';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1F3D2E 0%, #254530 60%, #1F3D2E 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Logo / Marca */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <img src="/logo-rustico.png" alt="Rústico Barber" style={{ height: 72, width: 'auto', filter: 'contrast(1.1) saturate(1.1)' }} />
      </div>

      {/* Tarjeta */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#27503A',
        border: '1px solid #3E6852',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Estado: cargando */}
        {estado === 'cargando' && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Loader size={32} color="#2E7A55" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#74A088', marginTop: 16 }}>Cargando tu cita…</p>
          </div>
        )}

        {/* Estado: error */}
        {estado === 'error' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <XCircle size={48} color="#E86060" />
            <h2 style={{ color: '#C0DCC8', fontSize: 20, fontWeight: 700, marginTop: 16 }}>Enlace no disponible</h2>
            <p style={{ color: '#74A088', marginTop: 8, lineHeight: 1.5 }}>{mensaje}</p>
          </div>
        )}

        {/* Estado: confirmada exitosamente */}
        {estado === 'confirmada' && cita && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(42,94,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={40} color="#50C878" />
            </div>
            <h2 style={{ color: '#C0DCC8', fontSize: 22, fontWeight: 700 }}>¡Cita confirmada!</h2>
            <p style={{ color: '#74A088', marginTop: 8, lineHeight: 1.5 }}>
              Te esperamos el <strong style={{ color: '#C0DCC8' }}>{formatFechaLarga(cita.inicio)}</strong>
            </p>
            <div style={{
              marginTop: 24, padding: '16px 20px',
              background: 'rgba(42,94,68,0.1)', borderRadius: 12,
              border: '1px solid rgba(42,94,68,0.3)', textAlign: 'left',
            }}>
              <CitaDetalle cita={cita} />
            </div>
            <p style={{ color: '#CC9040', fontSize: 13, marginTop: 20, fontWeight: 600 }}>
              💈 Rústico Barber &amp; Concept Shop
            </p>
          </div>
        )}

        {/* Estado: listo — mostrar cita y botón */}
        {(estado === 'listo' || estado === 'confirmando') && cita && (
          <>
            {/* Header de la tarjeta */}
            <div style={{
              padding: '24px 24px 20px',
              background: 'linear-gradient(135deg, #1F5238, #27503A)',
              borderBottom: '1px solid #3E6852',
            }}>
              <div style={{ fontSize: 12, color: '#CC9040', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                Tu cita en Rústico Barber
              </div>
              <h2 style={{ color: '#C0DCC8', fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>
                {yaConfirmada ? '¡Tu cita ya está confirmada!' : 'Confirma tu asistencia'}
              </h2>
            </div>

            {/* Detalle de la cita */}
            <div style={{ padding: '20px 24px' }}>
              <CitaDetalle cita={cita} />
            </div>

            {/* CTA */}
            <div style={{ padding: '0 24px 28px' }}>
              {yaConfirmada ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
                  padding: '14px', borderRadius: 12,
                  background: 'rgba(75,184,114,0.1)', border: '1px solid rgba(75,184,114,0.3)',
                  color: '#4BB872', fontSize: 15, fontWeight: 600,
                }}>
                  <CheckCircle size={20} />
                  Asistencia confirmada
                </div>
              ) : (
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={estado === 'confirmando'}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 12,
                    background: estado === 'confirmando' ? '#1F5238' : '#2E7A55',
                    border: 'none', color: '#C0DCC8', fontSize: 16, fontWeight: 700,
                    cursor: estado === 'confirmando' ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'background 0.15s',
                    boxShadow: '0 4px 20px rgba(42,94,68,0.4)',
                  }}
                >
                  {estado === 'confirmando' ? (
                    <><Loader size={18} /> Confirmando…</>
                  ) : (
                    <><CheckCircle size={18} /> Confirmar mi asistencia</>
                  )}
                </button>
              )}
              <p style={{ color: '#74A088', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                Si no puedes asistir, por favor comunícate con nosotros.
              </p>
            </div>
          </>
        )}
      </div>

      <p style={{ color: '#3E6852', fontSize: 11, marginTop: 24, letterSpacing: '0.05em' }}>
        © 2026 RÚSTICO BARBER &amp; CONCEPT SHOP · BOGOTÁ
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CitaDetalle({ cita }: { cita: CitaPublica }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DetalleItem icon={<Calendar size={16} />} label={formatFechaLarga(cita.inicio)} />
      <DetalleItem icon={<Clock size={16} />}    label={`${formatHora(cita.inicio)} – ${formatHora(cita.fin)}`} />
      <DetalleItem icon={<Scissors size={16} />} label={`${cita.servicio_nombre} con ${cita.barbero_nombre}`} />
      <DetalleItem icon={<DollarSign size={16} />} label={formatCOP(cita.precio_cop)} />
    </div>
  );
}

function DetalleItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ color: '#CC9040', flexShrink: 0 }}>{icon}</div>
      <span style={{ color: '#C0DCC8', fontSize: 15, lineHeight: 1.3, textTransform: 'capitalize' }}>{label}</span>
    </div>
  );
}

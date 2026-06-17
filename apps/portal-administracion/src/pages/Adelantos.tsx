import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Check, AlertCircle, Wallet, TrendingUp, ArrowDownCircle, CircleDollarSign } from 'lucide-react';
import { api } from '../api/client';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface ResumenBarbero {
  barbero_id: string;
  nombre: string;
  porcentaje_comision: number;
  color_agenda: string;
  ventas_dia: number;
  comision_dia: number;
  total_adelantos: number;
  disponible: number;
}
interface Adelanto {
  id: string;
  barbero_id: string;
  barbero_nombre: string;
  monto_cop: number;
  fecha: string;
  notas: string | null;
  estado: 'activo' | 'anulado';
  created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const hoyISO = () => new Date().toISOString().slice(0, 10);

const labelFecha = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const horaCorta = (dt: string) => {
  const d = new Date(dt);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// ─── componente ──────────────────────────────────────────────────────────────
export default function Adelantos() {
  const [fecha, setFecha]         = useState(hoyISO());
  const [resumen, setResumen]     = useState<ResumenBarbero[]>([]);
  const [adelantos, setAdelantos] = useState<Adelanto[]>([]);
  const [cargando, setCargando]   = useState(false);

  // modal
  const [modalId, setModalId]     = useState<string | null>(null);   // barbero_id
  const [monto, setMonto]         = useState('');
  const [nota, setNota]           = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');

  // toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── carga ──────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [res, adv] = await Promise.all([
        api.get<ResumenBarbero[]>(`/adelantos/resumen?fecha=${fecha}`),
        api.get<Adelanto[]>(`/adelantos?fecha=${fecha}`),
      ]);
      setResumen(Array.isArray(res) ? res : []);
      setAdelantos(Array.isArray(adv) ? adv : []);
    } catch { /* silent */ }
    finally { setCargando(false); }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── navegación de fecha ─────────────────────────────────────────────────
  const navFecha = (dias: number) => {
    const d = new Date(fecha + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().slice(0, 10));
  };
  const esHoy = fecha === hoyISO();

  // ─── acciones ────────────────────────────────────────────────────────────
  const abrirModal = (barberoId: string) => {
    setModalId(barberoId);
    setMonto(''); setNota(''); setErrorMsg('');
  };
  const cerrarModal = () => setModalId(null);

  const registrarAdelanto = async () => {
    const val = parseInt(monto.replace(/\D/g, ''), 10);
    if (!val || val <= 0) { setErrorMsg('Ingresa un monto válido.'); return; }
    const barbero = resumen.find(b => b.barbero_id === modalId);
    if (barbero && val > barbero.disponible) {
      setErrorMsg(`Excede lo disponible (${COP(barbero.disponible)}). ¿Confirmar de todas formas?`);
    }
    setGuardando(true); setErrorMsg('');
    try {
      await api.post('/adelantos', { barbero_id: modalId, monto_cop: val, fecha, notas: nota || undefined });
      cerrarModal();
      await cargar();
      showToast('Adelanto registrado');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al registrar.');
    } finally { setGuardando(false); }
  };

  const anularAdelanto = async (id: string) => {
    try {
      await api.delete(`/adelantos/${id}`);
      await cargar();
      showToast('Adelanto anulado');
    } catch { showToast('No se pudo anular', false); }
  };

  // ─── derivados ───────────────────────────────────────────────────────────
  const totalAdelantado = adelantos.reduce((s, a) => s + a.monto_cop, 0);
  const adelantosDe = (barberoId: string) => adelantos.filter(a => a.barbero_id === barberoId);
  const modalBarbero = resumen.find(b => b.barbero_id === modalId);

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 920 }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)', marginBottom: 4 }}>
            Adelantos del Día
          </h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
            Anticipa el pago de comisiones a cada barbero
          </p>
        </div>

        {/* Navegación de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => navFecha(-1)} style={btnNav}><ChevronLeft size={16} /></button>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)', textTransform: 'capitalize' }}>
              {labelFecha(fecha)}
            </div>
            {!esHoy && (
              <button type="button" onClick={() => setFecha(hoyISO())} style={{ fontSize: 11, color: 'var(--verde)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Ir a hoy
              </button>
            )}
          </div>
          <button type="button" onClick={() => navFecha(1)} disabled={esHoy} style={{ ...btnNav, opacity: esHoy ? 0.4 : 1 }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Resumen del día */}
      {totalAdelantado > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(212,146,26,0.08)', border: '1px solid rgba(212,146,26,0.25)', borderRadius: 10 }}>
          <Wallet size={16} style={{ color: 'var(--cobre)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--cobre)', fontWeight: 600 }}>
            Total adelantado hoy: {COP(totalAdelantado)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--texto-suave)', marginLeft: 4 }}>
            · {adelantos.length} registro{adelantos.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {cargando && (
        <p style={{ color: 'var(--texto-suave)', textAlign: 'center', padding: 40, fontSize: 13 }}>Cargando…</p>
      )}

      {/* Cards por barbero */}
      {!cargando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {resumen.map(b => {
            const avances = adelantosDe(b.barbero_id);
            const sinActividad = b.ventas_dia === 0;
            const excedido = b.disponible < 0;
            return (
              <div key={b.barbero_id} style={{
                background: 'var(--superficie)', borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--borde)',
                borderLeft: `4px solid ${b.color_agenda}`,
              }}>
                {/* Cabecera del barbero */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: b.color_agenda + '22', border: `2px solid ${b.color_agenda}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: b.color_agenda }}>
                      {b.nombre.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>{b.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{b.porcentaje_comision}% comisión</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirModal(b.barbero_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: b.color_agenda, border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Adelanto
                  </button>
                </div>

                {/* Estadísticas del día */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--borde)', borderBottom: avances.length > 0 ? '1px solid var(--borde)' : 'none' }}>
                  {[
                    { label: 'Ventas del día', valor: b.ventas_dia, Icon: TrendingUp, color: '#2A5080' },
                    { label: `Comisión ${b.porcentaje_comision}%`, valor: b.comision_dia, Icon: CircleDollarSign, color: '#2A7048' },
                    { label: 'Adelantado', valor: b.total_adelantos, Icon: ArrowDownCircle, color: '#D4921A' },
                    { label: 'Disponible', valor: b.disponible, Icon: Wallet, color: excedido ? '#AA2828' : '#2A7048' },
                  ].map(({ label, valor, Icon, color }) => (
                    <div key={label} style={{ padding: '12px 16px', borderRight: '1px solid var(--borde)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <Icon size={12} color={color} strokeWidth={2} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: sinActividad && label !== 'Disponible' ? 'var(--texto-suave)' : color }}>
                        {COP(valor)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lista de adelantos del día */}
                {avances.length > 0 && (
                  <div style={{ padding: '8px 16px 12px' }}>
                    {avances.map((a, idx) => (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8, marginTop: idx === 0 ? 4 : 6,
                        background: 'var(--superficie2)',
                      }}>
                        <span style={{ fontSize: 11, color: 'var(--texto-suave)', flexShrink: 0 }}>
                          {horaCorta(a.created_at)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cobre)', flexShrink: 0 }}>
                          {COP(a.monto_cop)}
                        </span>
                        {a.notas && (
                          <span style={{ fontSize: 12, color: 'var(--texto-suave)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{a.notas}"
                          </span>
                        )}
                        <button type="button" title="Anular adelanto" onClick={() => anularAdelanto(a.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 3, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {sinActividad && avances.length === 0 && (
                  <div style={{ padding: '8px 20px 12px' }}>
                    <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>Sin actividad este día</span>
                  </div>
                )}
              </div>
            );
          })}

          {resumen.length === 0 && !cargando && (
            <p style={{ color: 'var(--texto-suave)', textAlign: 'center', padding: 48, fontSize: 13 }}>
              No hay barberos activos.
            </p>
          )}
        </div>
      )}

      {/* ── Modal nuevo adelanto ───────────────────────────────────────────── */}
      {modalId && modalBarbero && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>

            {/* Cabecera modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--blanco)' }}>Nuevo adelanto</h2>
                <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 2 }}>{modalBarbero.nombre}</p>
              </div>
              <button type="button" title="Cerrar" onClick={cerrarModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Info disponible */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--superficie2)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Comisión del día</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2A7048' }}>{COP(modalBarbero.comision_dia)}</div>
              </div>
              <div style={{ background: 'var(--superficie2)', borderRadius: 9, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Disponible</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: modalBarbero.disponible <= 0 ? 'var(--error)' : '#2A7048' }}>
                  {COP(modalBarbero.disponible)}
                </div>
              </div>
            </div>

            {/* Campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>Monto a adelantar (COP)</label>
                <input
                  type="number" min={1} autoFocus placeholder="Ej: 50000"
                  value={monto} onChange={e => setMonto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && registrarAdelanto()}
                  style={inputSt}
                />
              </div>
              <div>
                <label style={labelSt}>Nota (opcional)</label>
                <input
                  type="text" placeholder="Ej: Para el almuerzo"
                  value={nota} onChange={e => setNota(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && registrarAdelanto()}
                  style={inputSt}
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: '8px 12px', background: '#FAEAEA', border: '1px solid #E8C0C0', borderRadius: 7 }}>
                <AlertCircle size={14} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--error)' }}>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={cerrarModal} style={btnCancelar}>Cancelar</button>
              <button type="button" onClick={registrarAdelanto} disabled={guardando} style={btnVerde}>
                <Check size={14} /> {guardando ? 'Guardando…' : 'Registrar adelanto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? '#1E3A22' : '#3A1E1E',
          border: `1px solid ${toast.ok ? '#2A6034' : '#6B2525'}`,
          color: toast.ok ? '#7EE49A' : '#F4A0A0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── estilos locales ──────────────────────────────────────────────────────────
const btnNav: React.CSSProperties = {
  background: 'var(--superficie)', border: '1px solid var(--borde)',
  borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--texto-suave)',
  display: 'flex', alignItems: 'center',
};
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--texto-suave)', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 5,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--superficie2)', border: '1px solid var(--borde)',
  borderRadius: 7, color: 'var(--texto)', fontSize: 14, outline: 'none',
};
const btnVerde: React.CSSProperties = {
  flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'var(--verde)', border: 'none', borderRadius: 8,
  padding: '10px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnCancelar: React.CSSProperties = {
  flex: 1, padding: '10px', borderRadius: 8,
  border: '1px solid var(--borde)', background: 'transparent',
  color: 'var(--texto-suave)', fontSize: 13, cursor: 'pointer',
};

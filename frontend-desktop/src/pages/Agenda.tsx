import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, MessageCircle, Bell, List, LayoutGrid } from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}
import { api } from '../api/client';
import { agendaTimeParts, diffAgendaMinutes, formatAgendaFecha, formatAgendaHora } from '../utils/agendaDate';

interface Barbero { id: string; nombre: string; color_agenda: string; }
interface Servicio { id: string; nombre: string; duracion_min: number; precio_cop: number; }
interface Cliente  { id: string; nombre: string; telefono: string; }
type MetodoPago = 'efectivo' | 'datafono' | 'mixto';
interface Cita {
  id: string; inicio: string; fin: string;
  estado: string; precio_cop: number; notas: string;
  metodo_pago: MetodoPago;
  cliente_nombre: string; cliente_telefono: string | null;
  servicio_nombre: string; barbero_nombre: string;
  barbero_id: string; barbero_color: string; duracion_min: number;
  token_confirmacion: string | null; recordatorio_enviado: number;
}

const HORA_INICIO = 8;
const HORA_FIN    = 21;
const SLOT_MIN    = 30;
const SLOTS       = ((HORA_FIN - HORA_INICIO) * 60) / SLOT_MIN;
const PX_POR_SLOT = 52;

function fechaStr(d: Date) { return d.toISOString().split('T')[0]; }
function addDias(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function horaDeSlot(slot: number): string {
  const total = HORA_INICIO * 60 + slot * SLOT_MIN;
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function slotDeCita(inicio: string): number {
  const { hour, minute } = agendaTimeParts(inicio);
  return Math.round(((hour * 60 + minute) - HORA_INICIO * 60) / SLOT_MIN);
}

function duracionEnSlots(inicio: string, fin: string): number {
  return Math.max(1, Math.round(diffAgendaMinutes(inicio, fin) / SLOT_MIN));
}

function formatHora(iso: string) {
  return formatAgendaHora(iso);
}

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
}

function formatFechaWA(iso: string) {
  return formatAgendaFecha(iso);
}

function waLinkConfirmacion(cita: Cita): string | null {
  if (!cita.cliente_telefono) return null;
  const tel = cita.cliente_telefono.replace(/[^0-9]/g, '');
  const appUrl = window.location.origin;
  const enlace = cita.token_confirmacion ? `${appUrl}/c/${cita.token_confirmacion}` : '';
  const msg = [
    `Hola ${cita.cliente_nombre || 'cliente'} 👋`,
    '',
    `Tu cita en *Rústico Barber* está agendada:`,
    `📅 ${formatFechaWA(cita.inicio)}`,
    `🕐 ${formatHora(cita.inicio)} – ${formatHora(cita.fin)}`,
    `✂️ ${cita.servicio_nombre} con ${cita.barbero_nombre}`,
    `💰 ${formatCOP(cita.precio_cop)}`,
    ...(enlace ? ['', `✅ Confirma tu asistencia:`, enlace] : []),
    '',
    '¡Te esperamos! 💈 *Rústico Barber*',
  ].join('\n');
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

function waLinkRecordatorio(cita: Cita): string | null {
  if (!cita.cliente_telefono) return null;
  const tel = cita.cliente_telefono.replace(/[^0-9]/g, '');
  const msg = [
    `⏰ Hola ${cita.cliente_nombre || 'cliente'}, te recordamos tu cita en *Rústico Barber* en *3 horas*:`,
    '',
    `🕐 Hoy a las ${formatHora(cita.inicio)}`,
    `✂️ ${cita.servicio_nombre} con ${cita.barbero_nombre}`,
    `💰 ${formatCOP(cita.precio_cop)}`,
    '',
    '¡Te esperamos! 💈 *Rústico Barber*',
  ].join('\n');
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default function Agenda() {
  const isMobile                                = useIsMobile();
  const [vistaLista, setVistaLista]             = useState(false);
  const [fecha, setFecha]         = useState(new Date());
  const [barberos, setBarberos]   = useState<Barbero[]>([]);
  const [citas, setCitas]         = useState<Cita[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [modal, setModal]                       = useState(false);
  const [servicios, setServicios]               = useState<Servicio[]>([]);
  const [clientes, setClientes]                 = useState<Cliente[]>([]);
  const [form, setForm]                         = useState({ barbero_id: '', servicio_id: '', cliente_id: '', inicio: '', notas: '', metodo_pago: 'efectivo' as MetodoPago });
  const [guardando, setGuardando]               = useState(false);
  const [errorForm, setErrorForm]               = useState('');
  const [recordatorios, setRecordatorios]       = useState<Cita[]>([]);
  const [bannerAbierto, setBannerAbierto]       = useState(true);
  const pollingRef                              = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const f = fechaStr(fecha);
    const [b, c] = await Promise.all([
      api.get<Barbero[]>('/barberos'),
      api.get<Cita[]>(`/agenda?fecha=${f}`),
    ]);
    setBarberos(b);
    setCitas(c);
    setCargando(false);
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarRecordatorios = useCallback(async () => {
    try {
      const data = await api.get<Cita[]>('/agenda/recordatorios-pendientes');
      setRecordatorios(data);
      if (data.length > 0) setBannerAbierto(true);
    } catch {}
  }, []);

  useEffect(() => {
    cargarRecordatorios();
    pollingRef.current = setInterval(cargarRecordatorios, 2 * 60 * 1000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [cargarRecordatorios]);

  const marcarEnviado = async (id: string) => {
    await api.patch(`/agenda/${id}/recordatorio-enviado`, {});
    setRecordatorios(r => r.filter(c => c.id !== id));
  };

  const abrirModal = async () => {
    if (servicios.length === 0) {
      const [s, c] = await Promise.all([api.get<Servicio[]>('/servicios'), api.get<{ clientes: Cliente[] }>('/clientes?limite=200')]);
      setServicios(s);
      setClientes(c.clientes);
    }
    setForm({ barbero_id: barberos[0]?.id || '', servicio_id: servicios[0]?.id || '', cliente_id: '', inicio: '', notas: '', metodo_pago: 'efectivo' });
    setErrorForm('');
    setModal(true);
  };

  const crearCita = async () => {
    if (!form.barbero_id || !form.servicio_id || !form.inicio) {
      setErrorForm('Barbero, servicio y hora de inicio son requeridos.');
      return;
    }
    setGuardando(true);
    setErrorForm('');
    try {
      const f = fechaStr(fecha);
      const inicioISO = `${f}T${form.inicio}:00-05:00`;
      await api.post('/agenda', { ...form, inicio: inicioISO, cliente_id: form.cliente_id || undefined });
      setModal(false);
      cargar();
    } catch (err: any) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await api.patch(`/agenda/${id}/estado`, { estado });
    cargar();
  };

  const citasDeBarbero = (barberoId: string) => citas.filter(c => c.barbero_id === barberoId);

  const fechaLabel = fecha.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Barra superior */}
      <div style={{
        position: 'relative',
        borderBottom: '1px solid var(--borde)',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1E3354 0%, #2A5080 45%, #1E3354 100%)',
      }}>
        {/* Sello Rústico como watermark derecho */}
        <img
          src="/sello-rustico.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -18,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 110,
            width: 'auto',
            opacity: 0.07,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
        {/* Línea cobre inferior */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(to right, var(--cobre) 0%, rgba(184,115,51,0.4) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Contenido */}
        <div style={{
          position: 'relative',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" aria-label="Día anterior" title="Día anterior"
              onClick={() => setFecha(d => addDias(d, -1))}
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--borde)', borderRadius: 6, padding: '6px 8px', color: 'var(--texto-suave)' }}>
              <ChevronLeft size={16} />
            </button>

            <div style={{ textAlign: 'center', minWidth: 240 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'capitalize', letterSpacing: '0.01em' }}>
                {fechaLabel}
              </div>
              <div style={{ fontSize: 10, color: 'var(--cobre)', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 2, opacity: 0.85 }}>
                Rústico · Barber &amp; Concept Shop
              </div>
            </div>

            <button type="button" aria-label="Día siguiente" title="Día siguiente"
              onClick={() => setFecha(d => addDias(d, 1))}
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--borde)', borderRadius: 6, padding: '6px 8px', color: 'var(--texto-suave)' }}>
              <ChevronRight size={16} />
            </button>

            <button type="button" onClick={() => setFecha(new Date())}
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--borde)', borderRadius: 6, padding: '6px 14px', color: 'var(--texto-suave)', fontSize: 13 }}>
              Hoy
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Toggle vista lista / grilla en móvil */}
            <button
              type="button"
              title={vistaLista ? 'Ver grilla' : 'Ver lista'}
              onClick={() => setVistaLista(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.25)', border: '1px solid var(--borde)',
                borderRadius: 6, padding: '6px 8px', color: 'var(--texto-suave)',
              }}
            >
              {vistaLista ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>

            <button
              type="button"
              onClick={abrirModal}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--verde)', border: 'none', borderRadius: 8,
                padding: '8px 18px', color: '#fff', fontWeight: 600, fontSize: 14,
                boxShadow: '0 2px 14px rgba(43,87,65,0.45)',
              }}
            >
              <Plus size={15} /> {isMobile ? '' : 'Nueva cita'}
            </button>
          </div>
        </div>
      </div>

      {/* Banner recordatorios */}
      {recordatorios.length > 0 && bannerAbierto && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(184,115,51,0.12), rgba(184,115,51,0.06))',
          borderBottom: '1px solid rgba(184,115,51,0.25)',
          flexShrink: 0,
        }}>
          <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#CF9050', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              <Bell size={14} />
              {recordatorios.length === 1 ? '1 recordatorio por enviar' : `${recordatorios.length} recordatorios por enviar`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              {recordatorios.map(c => {
                const link = waLinkRecordatorio(c);
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(184,115,51,0.1)', border: '1px solid rgba(184,115,51,0.2)',
                    borderRadius: 8, padding: '5px 10px',
                  }}>
                    <span style={{ fontSize: 12, color: '#EBF1EC' }}>
                      {c.cliente_nombre || 'Sin cliente'} · {formatHora(c.inicio)}
                    </span>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: '#25D366', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                        onClick={() => marcarEnviado(c.id)}
                      >
                        <MessageCircle size={11} /> Enviar
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" title="Cerrar recordatorios" aria-label="Cerrar recordatorios"
              onClick={() => setBannerAbierto(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(184,115,51,0.5)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Calendario / Lista */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {cargando ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--texto-suave)' }}>Cargando agenda…</div>
        ) : (isMobile || vistaLista) ? (
          /* ── Vista lista móvil ─────────────────────────────────────────── */
          <div style={{ padding: '12px 8px' }}>
            {citas.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-suave)' }}>
                Sin citas para este día.
              </div>
            ) : (
              [...citas]
                .sort((a, b) => a.inicio.localeCompare(b.inicio))
                .map(cita => {
                  const barbero = barberos.find(b => b.id === cita.barbero_id);
                  const waLink  = waLinkConfirmacion(cita);
                  return (
                    <div key={cita.id} style={{
                      background: 'var(--superficie)',
                      border: '1px solid var(--borde)',
                      borderLeft: `4px solid ${barbero?.color_agenda ?? '#888'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      marginBottom: 10,
                    }}>
                      {/* Hora + estado */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--verde)' }}>
                          {formatHora(cita.inicio)} – {formatHora(cita.fin)}
                        </div>
                        <span className={`badge badge-${cita.estado}`}>{cita.estado}</span>
                      </div>

                      {/* Cliente + servicio */}
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto)', marginBottom: 2 }}>
                        {cita.cliente_nombre || 'Sin cliente'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 10 }}>
                        {cita.servicio_nombre} · {cita.barbero_nombre}
                        <span style={{ marginLeft: 8 }}>
                          {cita.metodo_pago === 'efectivo' ? '💵' : cita.metodo_pago === 'datafono' ? '💳' : '🔀'}
                        </span>
                      </div>

                      {/* Precio */}
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cobre)', marginBottom: 12 }}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cita.precio_cop)}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {cita.estado !== 'completada' && (
                          <button type="button" onClick={() => cambiarEstado(cita.id, 'completada')}
                            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--exito)', color: '#fff', fontSize: 13, fontWeight: 600, flex: 1 }}>
                            ✓ Completar
                          </button>
                        )}
                        {cita.estado !== 'cancelada' && (
                          <button type="button" onClick={() => cambiarEstado(cita.id, 'cancelada')}
                            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--error)', color: '#fff', fontSize: 13, fontWeight: 600, flex: 1 }}>
                            ✗ Cancelar
                          </button>
                        )}
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', flex: 1 }}>
                            <MessageCircle size={14} /> WA
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        ) : (
          /* ── Vista grilla escritorio ───────────────────────────────────── */
          <div style={{ display: 'flex', minWidth: 800 }}>

            {/* Columna de horas */}
            <div style={{ width: 60, flexShrink: 0, paddingTop: 48 }}>
              {Array.from({ length: SLOTS }).map((_, i) => (
                <div key={i} style={{ height: PX_POR_SLOT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 4 }}>
                  {i % 2 === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{horaDeSlot(i)}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Columnas por barbero */}
            {barberos.map(barbero => (
              <div key={barbero.id} style={{ flex: 1, minWidth: 160, borderLeft: '1px solid var(--borde)' }}>

                {/* Encabezado barbero */}
                <div style={{
                  height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid var(--borde)',
                  background: 'var(--superficie)',
                  position: 'sticky', top: 0, zIndex: 2,
                  gap: 8,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: barbero.color_agenda }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{barbero.nombre}</span>
                </div>

                {/* Grid de slots */}
                <div style={{ position: 'relative', height: SLOTS * PX_POR_SLOT }}>
                  {Array.from({ length: SLOTS }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', top: i * PX_POR_SLOT, left: 0, right: 0,
                        height: PX_POR_SLOT,
                        borderBottom: i % 2 === 0
                          ? '1px solid var(--borde)'
                          : '1px dashed var(--superficie2)',
                      }}
                    />
                  ))}

                  {/* Citas */}
                  {citasDeBarbero(barbero.id).map(cita => {
                    const slotTop = slotDeCita(cita.inicio);
                    const slotH   = duracionEnSlots(cita.inicio, cita.fin);
                    if (slotTop < 0 || slotTop >= SLOTS) return null;
                    return (
                      <div
                        key={cita.id}
                        style={{
                          position: 'absolute',
                          top: slotTop * PX_POR_SLOT + 2,
                          left: 3, right: 3,
                          height: Math.max(1, slotH) * PX_POR_SLOT - 4,
                          background: `${barbero.color_agenda}22`,
                          border: `1px solid ${barbero.color_agenda}66`,
                          borderLeft: `3px solid ${barbero.color_agenda}`,
                          borderRadius: 6,
                          padding: '4px 7px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          zIndex: 1,
                        }}
                        title={`${cita.cliente_nombre || 'Sin cliente'} — ${cita.servicio_nombre}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blanco)', lineHeight: 1.3 }}>
                            {formatHora(cita.inicio)} {cita.cliente_nombre || 'Sin cliente'}
                          </div>
                          <span title={cita.metodo_pago === 'efectivo' ? 'Efectivo' : cita.metodo_pago === 'datafono' ? 'Datáfono' : 'Mixto'}
                            style={{ fontSize: 10, flexShrink: 0, marginLeft: 3 }}>
                            {cita.metodo_pago === 'efectivo' ? '💵' : cita.metodo_pago === 'datafono' ? '💳' : '🔀'}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--texto-suave)', marginTop: 2 }}>
                          {cita.servicio_nombre}
                        </div>
                        {slotH >= 2 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {cita.estado !== 'completada' && (
                              <button type="button" title="Marcar como completada"
                                onClick={() => cambiarEstado(cita.id, 'completada')}
                                style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'var(--exito)', color: '#fff', cursor: 'pointer' }}
                              >
                                ✓ Completar
                              </button>
                            )}
                            {cita.estado !== 'cancelada' && (
                              <button type="button" title="Cancelar cita"
                                onClick={() => cambiarEstado(cita.id, 'cancelada')}
                                style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'var(--error)', color: '#fff', cursor: 'pointer' }}
                              >
                                ✗ Cancelar
                              </button>
                            )}
                            {(() => {
                              const waLink = waLinkConfirmacion(cita);
                              return waLink ? (
                                <a href={waLink} target="_blank" rel="noopener noreferrer"
                                  title={`Enviar confirmación a ${cita.cliente_nombre} por WhatsApp`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  <MessageCircle size={9} aria-hidden="true" /> WA
                                </a>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nueva cita */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'var(--superficie)', border: '1px solid var(--borde)',
            borderRadius: 12, width: '100%', maxWidth: 440, padding: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blanco)' }}>Nueva cita</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {[
              { label: 'BARBERO', key: 'barbero_id', options: barberos.map(b => ({ v: b.id, l: b.nombre })) },
              { label: 'SERVICIO', key: 'servicio_id', options: servicios.map(s => ({ v: s.id, l: `${s.nombre} (${s.duracion_min} min — ${formatCOP(s.precio_cop)})` })) },
              { label: 'CLIENTE (opcional)', key: 'cliente_id', options: [{ v: '', l: '— Sin cliente —' }, ...clientes.map(c => ({ v: c.id, l: `${c.nombre} ${c.telefono || ''}` }))] },
            ].map(({ label, key, options }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
                <select
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)', fontSize: 14 }}
                >
                  {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 5, letterSpacing: '0.05em' }}>HORA DE INICIO</label>
              <input
                type="time"
                value={form.inicio}
                onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)', fontSize: 14 }}
              />
            </div>

            {/* Método de pago */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 8, letterSpacing: '0.05em' }}>MÉTODO DE PAGO</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { v: 'efectivo',  l: '💵 Efectivo',  color: '#2A7048', bg: 'rgba(42,112,72,0.12)'  },
                  { v: 'datafono',  l: '💳 Datáfono',  color: '#2A5080', bg: 'rgba(42,80,128,0.12)'  },
                  { v: 'mixto',     l: '🔀 Mixto',     color: '#D4921A', bg: 'rgba(212,146,26,0.12)' },
                ] as const).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setForm(f => ({ ...f, metodo_pago: opt.v }))}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: `2px solid ${form.metodo_pago === opt.v ? opt.color : 'var(--borde)'}`,
                      background: form.metodo_pago === opt.v ? opt.bg : 'transparent',
                      color: form.metodo_pago === opt.v ? opt.color : 'var(--texto-suave)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 5, letterSpacing: '0.05em' }}>NOTAS (opcional)</label>
              <textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)', fontSize: 14, resize: 'vertical' }}
              />
            </div>

            {errorForm && (
              <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 16, background: '#2e1a1a', border: '1px solid #5a2020', color: 'var(--error)', fontSize: 13 }}>
                {errorForm}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--borde)', background: 'transparent', color: 'var(--texto-suave)', fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={crearCita} disabled={guardando} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--verde)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                {guardando ? 'Guardando…' : 'Crear cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Send, Check, AlertCircle, PhoneCall, ToggleLeft, ToggleRight, Loader2, MessageCircle, Calendar } from 'lucide-react';
import { api } from '../api/client';

// ─── tipos ────────────────────────────────────────────────────────────────────
type WaEstado = 'desconectado' | 'qr_pendiente' | 'cargando' | 'conectado';

interface WaStatus {
  estado: WaEstado;
  qr:     string | null;
  info:   { nombre: string; phone: string } | null;
}
interface BarberWa {
  barbero_id: string;
  nombre: string;
  telefono: string | null;
  whatsapp_activo: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10);

// ─── componente ──────────────────────────────────────────────────────────────
export default function Whatsapp() {
  const [status,   setStatus]   = useState<WaStatus | null>(null);
  const [barberos, setBarberos] = useState<BarberWa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  // edición de teléfonos
  const [editTel,     setEditTel]     = useState<Record<string, string>>({});
  const [savingTel,   setSavingTel]   = useState<Record<string, boolean>>({});

  // prueba manual
  const [testPhone,   setTestPhone]   = useState('');
  const [testMsg,     setTestMsg]     = useState('');
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);

  // agenda manual
  const [fechaAgenda, setFechaAgenda] = useState(hoy());
  const [enviandoAgenda, setEnviandoAgenda] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── carga de estado ────────────────────────────────────────────────────
  const cargarEstado = useCallback(async () => {
    try {
      const data = await api.get<WaStatus>('/whatsapp/estado');
      setStatus(data);
    } catch { /* silent */ }
  }, []);

  const cargarBarberos = useCallback(async () => {
    try {
      const data = await api.get<BarberWa[]>('/whatsapp/barberos');
      setBarberos(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    cargarEstado();
    cargarBarberos();
  }, [cargarEstado, cargarBarberos]);

  // Polling del QR mientras está desconectado o en qr_pendiente
  useEffect(() => {
    const estado = status?.estado;
    if (estado === 'conectado') return;
    const t = setInterval(cargarEstado, 4000);
    return () => clearInterval(t);
  }, [status?.estado, cargarEstado]);

  // ─── acciones ────────────────────────────────────────────────────────────
  const conectar = async () => {
    setCargando(true);
    try {
      await api.post('/whatsapp/conectar', {});
      showToast('Iniciando conexión…');
      setTimeout(cargarEstado, 2000);
    } catch (e: any) { showToast(e.message, false); }
    finally { setCargando(false); }
  };

  const desconectar = async () => {
    setCargando(true);
    try {
      await api.post('/whatsapp/desconectar', {});
      setStatus(s => s ? { ...s, estado: 'desconectado', qr: null, info: null } : null);
      showToast('WhatsApp desconectado');
    } catch (e: any) { showToast(e.message, false); }
    finally { setCargando(false); }
  };

  const toggleBarbero = async (b: BarberWa) => {
    const nuevo = b.whatsapp_activo ? 0 : 1;
    setBarberos(prev => prev.map(x => x.barbero_id === b.barbero_id ? { ...x, whatsapp_activo: nuevo } : x));
    try {
      await api.patch(`/whatsapp/barberos/${b.barbero_id}`, { whatsapp_activo: nuevo === 1 });
    } catch (e: any) {
      setBarberos(prev => prev.map(x => x.barbero_id === b.barbero_id ? { ...x, whatsapp_activo: b.whatsapp_activo } : x));
      showToast(e.message, false);
    }
  };

  const guardarTelefono = async (barberoId: string) => {
    const tel = editTel[barberoId];
    if (tel === undefined) return;
    setSavingTel(p => ({ ...p, [barberoId]: true }));
    try {
      await api.patch(`/whatsapp/barberos/${barberoId}/tel`, { telefono: tel });
      setBarberos(prev => prev.map(b => b.barbero_id === barberoId ? { ...b, telefono: tel } : b));
      setEditTel(p => { const c = { ...p }; delete c[barberoId]; return c; });
      showToast('Teléfono actualizado');
    } catch (e: any) { showToast(e.message, false); }
    finally { setSavingTel(p => ({ ...p, [barberoId]: false })); }
  };

  const enviarPrueba = async () => {
    if (!testPhone) return;
    setEnviandoPrueba(true);
    try {
      await api.post('/whatsapp/mensaje-prueba', { telefono: testPhone, mensaje: testMsg || undefined });
      showToast('Mensaje de prueba enviado ✓');
      setTestPhone(''); setTestMsg('');
    } catch (e: any) { showToast(e.message, false); }
    finally { setEnviandoPrueba(false); }
  };

  const enviarAgenda = async () => {
    setEnviandoAgenda(true);
    try {
      const data = await api.post<{ enviados: number; errores: string[] }>('/whatsapp/agenda-dia', { fecha: fechaAgenda });
      showToast(`Agenda enviada a ${data.enviados} barbero(s) ✓`);
    } catch (e: any) { showToast(e.message, false); }
    finally { setEnviandoAgenda(false); }
  };

  // ─── estado visual ───────────────────────────────────────────────────────
  const estado = status?.estado ?? 'desconectado';
  const ESTADO_LABEL: Record<WaEstado, string> = {
    desconectado: 'Desconectado',
    qr_pendiente: 'Escanea el código QR',
    cargando:     'Conectando…',
    conectado:    'Conectado',
  };
  const ESTADO_COLOR: Record<WaEstado, string> = {
    desconectado: '#AA2828',
    qr_pendiente: '#D4921A',
    cargando:     '#2A5080',
    conectado:    '#2A7048',
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <MessageCircle size={22} color="#25D366" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)' }}>WhatsApp</h1>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
            background: ESTADO_COLOR[estado] + '22',
            color: ESTADO_COLOR[estado], border: `1px solid ${ESTADO_COLOR[estado]}44`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {estado === 'conectado' ? <Wifi size={11} /> : <WifiOff size={11} />}
            {ESTADO_LABEL[estado]}
          </span>
        </div>
        <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
          Envía la agenda del día a cada barbero y notificaciones de citas automáticamente
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Conexión WhatsApp ── */}
        <div style={card}>
          <h2 style={cardTit}>Conexión</h2>

          {estado === 'conectado' && status?.info && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(42,112,72,0.08)', border: '1px solid rgba(42,112,72,0.25)', borderRadius: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25D36622', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={18} color="#25D366" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>{status.info.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>+{status.info.phone}</div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          {estado === 'qr_pendiente' && status?.qr && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <img src={status.qr} alt="QR WhatsApp" style={{ width: 220, height: 220, border: '4px solid #25D366', borderRadius: 12 }} />
              <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 8 }}>
                Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
              </p>
            </div>
          )}

          {estado === 'cargando' && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--texto-suave)' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>Iniciando WhatsApp…</p>
            </div>
          )}

          {estado === 'desconectado' && (
            <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 16 }}>
              Conecta un número de WhatsApp para enviar notificaciones automáticas a los barberos y clientes.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {estado !== 'conectado' && (
              <button type="button" onClick={conectar} disabled={cargando || estado === 'cargando'} style={btnVerde}>
                {cargando ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={13} />}
                {estado === 'qr_pendiente' ? 'Refrescar QR' : 'Conectar WhatsApp'}
              </button>
            )}
            {estado === 'conectado' && (
              <button type="button" onClick={desconectar} disabled={cargando} style={btnRojo}>
                <WifiOff size={13} /> Desconectar
              </button>
            )}
            <button type="button" onClick={cargarEstado} style={btnSecundario} title="Actualizar estado">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ── Enviar agenda ── */}
        <div style={card}>
          <h2 style={cardTit}>Enviar agenda del día</h2>
          <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginBottom: 14 }}>
            Envía el resumen de citas del día a cada barbero con WhatsApp activo. También se envía automáticamente a las <strong>7:00 am</strong>.
          </p>
          <label style={labelSt}>Fecha</label>
          <input type="date" title="Fecha de la agenda" value={fechaAgenda} onChange={e => setFechaAgenda(e.target.value)} style={{ ...inputSt, marginBottom: 12 }} />
          <button type="button" onClick={enviarAgenda} disabled={enviandoAgenda || !status?.info} style={{ ...btnVerde, opacity: !status?.info ? 0.5 : 1 }}>
            {enviandoAgenda ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Calendar size={13} />}
            Enviar agenda ahora
          </button>
          {!status?.info && <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 8 }}>Conecta WhatsApp primero</p>}
        </div>
      </div>

      {/* ── Barberos: teléfonos y activación ── */}
      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={cardTit}>Barberos — configuración de notificaciones</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {barberos.map(b => {
            const telEdit  = editTel[b.barbero_id];
            const editando = telEdit !== undefined;
            const saving   = savingTel[b.barbero_id];
            return (
              <div key={b.barbero_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--superficie2)', borderRadius: 9 }}>
                {/* Nombre */}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)', flex: '0 0 170px' }}>{b.nombre}</span>

                {/* Teléfono */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PhoneCall size={12} style={{ color: 'var(--texto-suave)', flexShrink: 0 }} />
                  {editando ? (
                    <>
                      <input type="tel" placeholder="+57 300 000 0000" value={telEdit}
                        onChange={e => setEditTel(p => ({ ...p, [b.barbero_id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') guardarTelefono(b.barbero_id); if (e.key === 'Escape') setEditTel(p => { const c = { ...p }; delete c[b.barbero_id]; return c; }); }}
                        style={{ ...inputSt, flex: 1 }} autoFocus />
                      <button type="button" title="Guardar" onClick={() => guardarTelefono(b.barbero_id)} disabled={saving} style={iconBtn}>
                        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} color="var(--verde)" />}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setEditTel(p => ({ ...p, [b.barbero_id]: b.telefono ?? '' }))}
                      style={{ ...inputSt, flex: 1, textAlign: 'left', cursor: 'pointer', color: b.telefono ? 'var(--texto)' : 'var(--texto-suave)', fontSize: 13 }}>
                      {b.telefono || 'Sin teléfono — clic para editar'}
                    </button>
                  )}
                </div>

                {/* Toggle WhatsApp */}
                <button type="button" title={b.whatsapp_activo ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                  onClick={() => toggleBarbero(b)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {b.whatsapp_activo
                    ? <ToggleRight size={22} color="#25D366" />
                    : <ToggleLeft  size={22} color="var(--texto-suave)" />
                  }
                  <span style={{ fontSize: 11, color: b.whatsapp_activo ? '#25D366' : 'var(--texto-suave)', fontWeight: 600, minWidth: 52 }}>
                    {b.whatsapp_activo ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mensaje de prueba ── */}
      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={cardTit}>Mensaje de prueba</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={labelSt}>Teléfono</label>
            <input type="tel" placeholder="+57 300 000 0000" value={testPhone} onChange={e => setTestPhone(e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Mensaje (opcional)</label>
            <input type="text" placeholder="Mensaje de prueba de Rústico…" value={testMsg} onChange={e => setTestMsg(e.target.value)} style={inputSt} />
          </div>
          <button type="button" onClick={enviarPrueba} disabled={enviandoPrueba || !testPhone || !status?.info} style={{ ...btnVerde, opacity: !testPhone || !status?.info ? 0.5 : 1, alignSelf: 'flex-end' }}>
            {enviandoPrueba ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
            Enviar
          </button>
        </div>
        {!status?.info && <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 8 }}>Conecta WhatsApp primero</p>}
      </div>

      {/* ── Automatizaciones activas ── */}
      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={cardTit}>Automatizaciones</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '📅', title: 'Agenda diaria a las 7:00 am', desc: 'Cada barbero recibe su lista de citas del día', activo: true },
            { icon: '✂️', title: 'Nueva cita', desc: 'Notifica al barbero cuando se agenda una nueva cita', activo: true },
            { icon: '⏰', title: 'Recordatorio 30 min antes', desc: 'Recuerda al barbero y al cliente antes de la cita', activo: true },
            { icon: '❌', title: 'Cita cancelada', desc: 'Avisa al barbero si una cita es cancelada', activo: true },
          ].map(a => (
            <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--superficie2)', borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{a.desc}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2A7048', background: 'rgba(42,112,72,0.1)', border: '1px solid rgba(42,112,72,0.2)', borderRadius: 6, padding: '2px 8px' }}>
                Activo
              </span>
            </div>
          ))}
        </div>
      </div>

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

// ─── estilos ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12, padding: '18px 20px',
};
const cardTit: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 14,
};
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--texto-suave)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'var(--superficie2)',
  border: '1px solid var(--borde)', borderRadius: 7, color: 'var(--texto)', fontSize: 13,
};
const btnVerde: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366',
  border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnRojo: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, background: '#AA2828',
  border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnSecundario: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent',
  border: '1px solid var(--borde)', borderRadius: 7, padding: '7px 10px', color: 'var(--texto-suave)', fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: '3px 4px',
  cursor: 'pointer', color: 'var(--texto-suave)', display: 'flex', alignItems: 'center', borderRadius: 4,
};

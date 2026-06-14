import { useEffect, useState, useCallback } from 'react';
import { Scissors, Clock, TrendingUp, Star, Plus, X, Edit2, ToggleLeft, ToggleRight, Eye, EyeOff, Trash2 } from 'lucide-react';
import { api } from '../api/client';

interface Barbero {
  id: string; nombre: string; email: string; telefono: string;
  especialidad: string; porcentaje_comision: number; color_agenda: string;
  horario_inicio: string; horario_fin: string; activo: boolean;
}
interface Stats {
  total_citas: string; completadas: string;
  ingresos_cop: string; ticket_promedio: string;
}

const COLORES = ['#2A5E44','#B87333','#4A80A8','#7C4DA0','#C0392B','#27AE60','#1A5276','#D35400'];

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
}

const FORM_VACIO = {
  nombre: '', email: '', telefono: '', password: '',
  especialidad: '', porcentaje_comision: 40,
  color_agenda: '#2A5E44', horario_inicio: '08:00', horario_fin: '20:00',
};

export default function Barberos() {
  const [barberos, setBarberos]     = useState<Barbero[]>([]);
  const [stats, setStats]           = useState<Record<string, Stats>>({});
  const [cargando, setCargando]     = useState(true);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [modal, setModal]           = useState<'nuevo' | 'editar' | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm]             = useState({ ...FORM_VACIO });
  const [guardando, setGuardando]   = useState(false);
  const [errorForm, setErrorForm]   = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const bs = await api.get<Barbero[]>(`/barberos?todos=${mostrarInactivos ? '1' : '0'}`);
    setBarberos(bs);
    const entries = await Promise.all(
      bs.filter(b => b.activo).map(async b => {
        const s = await api.get<Stats>(`/barberos/${b.id}/estadisticas`);
        return [b.id, s] as [string, Stats];
      })
    );
    setStats(Object.fromEntries(entries));
    setCargando(false);
  }, [mostrarInactivos]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setForm({ ...FORM_VACIO });
    setErrorForm('');
    setEditandoId(null);
    setModal('nuevo');
  };

  const abrirEditar = (b: Barbero) => {
    setForm({
      nombre: b.nombre, email: b.email, telefono: b.telefono || '',
      password: '', especialidad: b.especialidad || '',
      porcentaje_comision: b.porcentaje_comision,
      color_agenda: b.color_agenda,
      horario_inicio: b.horario_inicio?.slice(0, 5) || '08:00',
      horario_fin:    b.horario_fin?.slice(0, 5)    || '20:00',
    });
    setErrorForm('');
    setEditandoId(b.id);
    setModal('editar');
  };

  const guardar = async () => {
    if (!form.nombre || !form.email) { setErrorForm('Nombre y email son requeridos.'); return; }
    if (modal === 'nuevo' && !form.password) { setErrorForm('La contraseña es requerida para nuevos barberos.'); return; }
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = { ...form, porcentaje_comision: Number(form.porcentaje_comision) };
      if (modal === 'nuevo') {
        await api.post('/barberos', payload);
      } else {
        const { password, ...rest } = payload;
        await api.put(`/barberos/${editandoId}`, password ? payload : rest);
      }
      setModal(null);
      cargar();
    } catch (err: any) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (b: Barbero) => {
    await api.patch(`/barberos/${b.id}/activo`, { activo: !b.activo });
    cargar();
  };

  const eliminar = async (b: Barbero) => {
    try {
      await api.delete(`/barberos/${b.id}`);
      cargar();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activos   = barberos.filter(b => b.activo);
  const inactivos = barberos.filter(b => !b.activo);

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)', marginBottom: 4 }}>Equipo</h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
            {activos.length} activo{activos.length !== 1 ? 's' : ''}
            {inactivos.length > 0 && ` · ${inactivos.length} inactivo${inactivos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button"
            title={mostrarInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
            onClick={() => setMostrarInactivos(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              background: mostrarInactivos ? 'var(--superficie2)' : 'transparent',
              border: '1px solid var(--borde)', color: 'var(--texto-suave)', fontSize: 13,
            }}
          >
            {mostrarInactivos ? <Eye size={14} /> : <EyeOff size={14} />}
            {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
          </button>
          <button type="button"
            onClick={abrirNuevo}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
              background: 'var(--verde)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 14,
              boxShadow: '0 2px 12px rgba(42,94,68,0.4)',
            }}
          >
            <Plus size={15} /> Nuevo barbero
          </button>
        </div>
      </div>

      {cargando ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--texto-suave)' }}>Cargando…</div>
      ) : (
        <>
          {/* Barberos activos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {activos.map(b => <TarjetaBarbero key={b.id} b={b} stats={stats[b.id]} onEditar={abrirEditar} onToggle={toggleActivo} onEliminar={eliminar} />)}
          </div>

          {/* Barberos inactivos */}
          {mostrarInactivos && inactivos.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--borde)' }} />
                <span style={{ fontSize: 12, color: 'var(--texto-suave)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Inactivos
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--borde)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, opacity: 0.6 }}>
                {inactivos.map(b => <TarjetaBarbero key={b.id} b={b} stats={undefined} onEditar={abrirEditar} onToggle={toggleActivo} onEliminar={eliminar} />)}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
        }}>
          <div style={{
            background: 'var(--superficie)', border: '1px solid var(--borde)',
            borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto',
          }}>
            {/* Header modal */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--borde)',
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--blanco)' }}>
                {modal === 'nuevo' ? 'Nuevo barbero' : 'Editar barbero'}
              </h2>
              <button type="button" title="Cerrar" onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Campos texto */}
              {[
                { label: 'NOMBRE', key: 'nombre', type: 'text', placeholder: 'Carlos Medina' },
                { label: 'EMAIL', key: 'email', type: 'email', placeholder: 'carlos@rustico.co' },
                { label: 'TELÉFONO', key: 'telefono', type: 'tel', placeholder: '+573001112233' },
                { label: modal === 'nuevo' ? 'CONTRASEÑA' : 'NUEVA CONTRASEÑA (dejar vacío para no cambiar)', key: 'password', type: 'password', placeholder: '••••••••' },
                { label: 'ESPECIALIDAD', key: 'especialidad', type: 'text', placeholder: 'Corte clásico y barba' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 5, letterSpacing: '0.05em', fontWeight: 600 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', background: 'var(--superficie2)',
                      border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)', fontSize: 14,
                    }}
                  />
                </div>
              ))}

              {/* Comisión y horarios */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  { label: 'COMISIÓN %', key: 'porcentaje_comision', type: 'number' },
                  { label: 'INICIO', key: 'horario_inicio', type: 'time' },
                  { label: 'FIN', key: 'horario_fin', type: 'time' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 5, letterSpacing: '0.05em', fontWeight: 600 }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{
                        width: '100%', padding: '9px 10px', background: 'var(--superficie2)',
                        border: '1px solid var(--borde)', borderRadius: 8, color: 'var(--texto)', fontSize: 14,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Color agenda */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>
                  COLOR EN AGENDA
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORES.map(c => (
                    <button type="button" key={c} title={c} onClick={() => setForm(f => ({ ...f, color_agenda: c }))}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                        outline: form.color_agenda === c ? `3px solid ${c}` : 'none',
                        outlineOffset: 2,
                        boxShadow: form.color_agenda === c ? '0 0 0 2px var(--superficie), 0 0 0 4px ' + c : 'none',
                      }}
                    />
                  ))}
                  <input type="color" value={form.color_agenda}
                    onChange={e => setForm(f => ({ ...f, color_agenda: e.target.value }))}
                    title="Color personalizado" aria-label="Color personalizado"
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--borde)', padding: 2, background: 'var(--superficie2)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {errorForm && (
                <div style={{ padding: '10px 14px', background: 'rgba(212,79,79,0.12)', border: '1px solid rgba(212,79,79,0.3)', borderRadius: 8, color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>
                  {errorForm}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setModal(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--borde)', background: 'transparent', color: 'var(--texto-suave)', fontSize: 14 }}>
                  Cancelar
                </button>
                <button type="button" onClick={guardar} disabled={guardando}
                  style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    background: guardando ? 'var(--verde-oscuro)' : 'var(--verde)',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: guardando ? 'default' : 'pointer',
                  }}>
                  {guardando ? 'Guardando…' : modal === 'nuevo' ? 'Crear barbero' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaBarbero({ b, stats: s, onEditar, onToggle, onEliminar }: {
  b: Barbero; stats?: Stats;
  onEditar: (b: Barbero) => void;
  onToggle: (b: Barbero) => void;
  onEliminar: (b: Barbero) => void;
}) {
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  return (
    <div style={{
      background: 'var(--superficie)', border: '1px solid var(--borde)',
      borderRadius: 12, overflow: 'hidden',
      opacity: b.activo ? 1 : 0.7,
    }}>
      <div style={{ height: 5, background: b.color_agenda }} />
      <div style={{ padding: '18px 18px 14px' }}>

        {/* Info barbero */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: `${b.color_agenda}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Scissors size={18} color={b.color_agenda} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blanco)', display: 'flex', alignItems: 'center', gap: 7 }}>
              {b.nombre}
              {!b.activo && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--superficie2)', color: 'var(--texto-suave)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  INACTIVO
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.especialidad || b.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Clock size={10} color="var(--texto-suave)" />
              <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>
                {b.horario_inicio?.slice(0, 5)} – {b.horario_fin?.slice(0, 5)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--cobre)', marginLeft: 6, fontWeight: 600 }}>
                {b.porcentaje_comision}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {s && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { icon: Star, label: 'Citas mes', val: s.total_citas || '0' },
              { icon: TrendingUp, label: 'Completadas', val: s.completadas || '0' },
              { icon: TrendingUp, label: 'Ingresos mes', val: formatCOP(parseInt(s.ingresos_cop || '0')) },
              { icon: TrendingUp, label: 'Ticket prom.', val: formatCOP(parseInt(s.ticket_promedio || '0')) },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} style={{ background: 'var(--superficie2)', borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: 'var(--texto-suave)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blanco)' }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--borde)', paddingTop: 12 }}>
          <button type="button" title="Editar barbero" onClick={() => onEditar(b)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px', borderRadius: 7, border: '1px solid var(--borde)',
              background: 'transparent', color: 'var(--texto-suave)', fontSize: 12, cursor: 'pointer',
            }}>
            <Edit2 size={13} /> Editar
          </button>
          <button type="button"
            title={b.activo ? 'Deshabilitar barbero' : 'Habilitar barbero'}
            onClick={() => onToggle(b)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px', borderRadius: 7, border: 'none', fontSize: 12, cursor: 'pointer',
              background: b.activo ? 'rgba(212,79,79,0.12)' : 'rgba(75,184,114,0.12)',
              color: b.activo ? 'var(--error)' : 'var(--exito)',
            }}>
            {b.activo ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
            {b.activo ? 'Deshabilitar' : 'Habilitar'}
          </button>

          {/* Eliminar — confirmación inline de dos pasos */}
          {confirmarEliminar ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" title="Cancelar eliminación" onClick={() => setConfirmarEliminar(false)}
                style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid var(--borde)', background: 'transparent', color: 'var(--texto-suave)', fontSize: 11, cursor: 'pointer' }}>
                <X size={13} />
              </button>
              <button type="button" title="Confirmar eliminación permanente"
                onClick={() => { setConfirmarEliminar(false); onEliminar(b); }}
                style={{ padding: '7px 10px', borderRadius: 7, border: 'none', background: 'var(--error)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ¿Eliminar?
              </button>
            </div>
          ) : (
            <button type="button" title="Eliminar barbero"
              onClick={() => setConfirmarEliminar(true)}
              style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(212,79,79,0.3)', background: 'transparent', color: 'var(--error)', fontSize: 12, cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

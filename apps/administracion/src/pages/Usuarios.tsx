import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, KeyRound, ToggleLeft, ToggleRight, X, Check, AlertCircle, Shield, User, PhoneCall, Mail } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ─── tipos ────────────────────────────────────────────────────────────────────
type Rol = 'admin' | 'barbero' | 'recepcion';
interface Usuario {
  id: string; nombre: string; email: string;
  telefono: string | null; rol: Rol;
  activo: number; created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const ROL_LABEL: Record<Rol, string>  = { admin: 'Admin', barbero: 'Barbero', recepcion: 'Recepción' };
const ROL_COLOR: Record<Rol, string>  = { admin: '#D4921A', barbero: '#2A5080', recepcion: '#2A7048' };
const ROL_BG:    Record<Rol, string>  = { admin: 'rgba(212,146,26,.12)', barbero: 'rgba(42,80,128,.12)', recepcion: 'rgba(42,112,72,.12)' };
const ROLES: Rol[] = ['admin', 'barbero', 'recepcion'];

function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

const FORM_VACIO = () => ({ nombre: '', email: '', telefono: '', rol: 'recepcion' as Rol, password: '', confirmar: '' });

// ─── componente ──────────────────────────────────────────────────────────────
export default function Usuarios() {
  const yo     = useAuthStore(s => s.usuario);
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [cargando,   setCargando]   = useState(false);
  const [filtroRol,  setFiltroRol]  = useState<string>('todos');
  const [filtroText, setFiltroText] = useState('');

  // modales
  const [modalForm, setModalForm]   = useState<'nuevo' | 'editar' | null>(null);
  const [modalPass, setModalPass]   = useState<Usuario | null>(null);
  const [editando,  setEditando]    = useState<Usuario | null>(null);
  const [form,      setForm]        = useState(FORM_VACIO());
  const [guardando, setGuardando]   = useState(false);
  const [errorMsg,  setErrorMsg]    = useState('');

  // toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  // ─── carga ─────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await api.get<Usuario[]>('/auth/usuarios');
      setUsuarios(Array.isArray(data) ? data : []);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── filtros ────────────────────────────────────────────────────────────
  const lista = usuarios.filter(u => {
    const matchRol  = filtroRol  === 'todos' || u.rol === filtroRol;
    const matchText = !filtroText || u.nombre.toLowerCase().includes(filtroText.toLowerCase()) || u.email.toLowerCase().includes(filtroText.toLowerCase());
    return matchRol && matchText;
  });

  // ─── acciones ───────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setForm(FORM_VACIO()); setEditando(null); setErrorMsg(''); setModalForm('nuevo');
  };
  const abrirEditar = (u: Usuario) => {
    setForm({ nombre: u.nombre, email: u.email, telefono: u.telefono || '', rol: u.rol, password: '', confirmar: '' });
    setEditando(u); setErrorMsg(''); setModalForm('editar');
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrorMsg('El nombre es obligatorio.'); return; }
    if (!form.email.trim())  { setErrorMsg('El correo es obligatorio.'); return; }
    if (modalForm === 'nuevo') {
      if (!form.password)          { setErrorMsg('La contraseña es obligatoria.'); return; }
      if (form.password.length < 6) { setErrorMsg('Mínimo 6 caracteres.'); return; }
      if (form.password !== form.confirmar) { setErrorMsg('Las contraseñas no coinciden.'); return; }
    }
    setGuardando(true); setErrorMsg('');
    try {
      if (modalForm === 'nuevo') {
        await api.post('/auth/register', { nombre: form.nombre, email: form.email, telefono: form.telefono || undefined, rol: form.rol, password: form.password });
        showToast('Usuario creado correctamente');
      } else {
        await api.put(`/auth/usuarios/${editando!.id}`, { nombre: form.nombre, email: form.email, telefono: form.telefono || undefined, rol: form.rol });
        showToast('Usuario actualizado');
      }
      setModalForm(null);
      await cargar();
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setGuardando(false); }
  };

  const toggleActivo = async (u: Usuario) => {
    try {
      await api.patch(`/auth/usuarios/${u.id}/activo`, { activo: !u.activo });
      await cargar();
      showToast(u.activo ? 'Usuario desactivado' : 'Usuario activado');
    } catch (e: any) { showToast(e.message, false); }
  };

  const eliminar = async (u: Usuario) => {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/auth/usuarios/${u.id}`);
      await cargar();
      showToast('Usuario eliminado');
    } catch (e: any) { showToast(e.message, false); }
  };

  const cambiarPassword = async () => {
    if (!form.password || form.password.length < 6) { setErrorMsg('Mínimo 6 caracteres.'); return; }
    if (form.password !== form.confirmar)            { setErrorMsg('Las contraseñas no coinciden.'); return; }
    setGuardando(true); setErrorMsg('');
    try {
      await api.post(`/auth/usuarios/${modalPass!.id}/password`, { password: form.password });
      setModalPass(null);
      showToast('Contraseña actualizada');
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setGuardando(false); }
  };

  // ─── render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)', marginBottom: 4 }}>Usuarios</h1>
          <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Gestiona accesos, roles y contraseñas del sistema</p>
        </div>
        <button type="button" onClick={abrirNuevo} style={btnVerde}>
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Buscar por nombre o correo…" value={filtroText} onChange={e => setFiltroText(e.target.value)}
          style={{ ...inputSt, flex: 1, minWidth: 200 }} />
        <div style={{ display: 'flex', border: '1px solid var(--borde)', borderRadius: 8, overflow: 'hidden' }}>
          {(['todos', ...ROLES] as const).map(r => (
            <button key={r} type="button" onClick={() => setFiltroRol(r)} style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: filtroRol === r ? 'var(--verde)' : 'transparent',
              color:      filtroRol === r ? '#fff' : 'var(--texto-suave)',
            }}>
              {r === 'todos' ? 'Todos' : ROL_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total', valor: usuarios.length, color: 'var(--texto)' },
          { label: 'Administradores', valor: usuarios.filter(u => u.rol === 'admin').length,      color: ROL_COLOR.admin },
          { label: 'Barberos',        valor: usuarios.filter(u => u.rol === 'barbero').length,    color: ROL_COLOR.barbero },
          { label: 'Recepción',       valor: usuarios.filter(u => u.rol === 'recepcion').length,  color: ROL_COLOR.recepcion },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 9, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Encabezado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 110px 90px 80px', padding: '10px 18px', background: 'var(--superficie2)', borderBottom: '1px solid var(--borde)', fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          <span>Usuario</span><span>Correo / Teléfono</span><span>Rol</span><span style={{ textAlign: 'center' }}>Estado</span><span style={{ textAlign: 'right' }}>Acciones</span>
        </div>

        {cargando && <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: 32, fontSize: 13 }}>Cargando…</p>}

        {!cargando && lista.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: 32, fontSize: 13 }}>No hay usuarios con ese filtro.</p>
        )}

        {lista.map((u, idx) => {
          const esSelf = u.id === yo?.id;
          return (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 200px 110px 90px 80px',
              padding: '13px 18px', alignItems: 'center',
              borderBottom: idx < lista.length - 1 ? '1px solid var(--borde)' : 'none',
              opacity: u.activo ? 1 : 0.55,
              background: esSelf ? 'rgba(212,146,26,0.03)' : 'transparent',
            }}>

              {/* Avatar + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: ROL_BG[u.rol], border: `2px solid ${ROL_COLOR[u.rol]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ROL_COLOR[u.rol], flexShrink: 0 }}>
                  {iniciales(u.nombre)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto)' }}>{u.nombre}</span>
                    {esSelf && <span style={{ fontSize: 10, background: 'rgba(212,146,26,0.15)', color: 'var(--cobre)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Tú</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 1 }}>
                    Desde {new Date(u.created_at).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--texto)' }}>
                  <Mail size={11} style={{ color: 'var(--texto-suave)', flexShrink: 0 }} />{u.email}
                </div>
                {u.telefono && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>
                    <PhoneCall size={10} style={{ flexShrink: 0 }} />{u.telefono}
                  </div>
                )}
              </div>

              {/* Rol badge */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: ROL_BG[u.rol], color: ROL_COLOR[u.rol], border: `1px solid ${ROL_COLOR[u.rol]}33` }}>
                <Shield size={10} />{ROL_LABEL[u.rol]}
              </span>

              {/* Estado */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: u.activo ? 'rgba(42,112,72,0.1)' : 'var(--superficie2)', color: u.activo ? '#2A7048' : 'var(--texto-suave)', border: `1px solid ${u.activo ? 'rgba(42,112,72,0.25)' : 'var(--borde)'}` }}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button type="button" title="Editar" onClick={() => abrirEditar(u)} style={iconBtn}><Pencil size={13} /></button>
                <button type="button" title="Cambiar contraseña" onClick={() => { setForm(FORM_VACIO()); setErrorMsg(''); setModalPass(u); }} style={iconBtn}><KeyRound size={13} /></button>
                <button type="button" title={u.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(u)} style={iconBtn}>
                  {u.activo ? <ToggleRight size={15} color="var(--verde)" /> : <ToggleLeft size={15} />}
                </button>
                {!esSelf && (
                  <button type="button" title="Eliminar" onClick={() => eliminar(u)} style={{ ...iconBtn, color: 'var(--error)' }}><Trash2 size={13} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal crear/editar ───────────────────────────────────────────────── */}
      {modalForm && (
        <Modal titulo={modalForm === 'nuevo' ? 'Nuevo usuario' : `Editar — ${editando?.nombre}`} onClose={() => setModalForm(null)}>
          <Campo label="Nombre completo">
            <input style={inputSt} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Cristian Villamil" autoFocus />
          </Campo>
          <Campo label="Correo electrónico">
            <input type="email" style={inputSt} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@rustico.co" />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Teléfono (opcional)">
              <input type="tel" style={inputSt} value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+57 300 000 0000" />
            </Campo>
            <Campo label="Rol">
              <select style={inputSt} value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value as Rol }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
              </select>
            </Campo>
          </div>

          {/* Preview del rol seleccionado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: ROL_BG[form.rol], border: `1px solid ${ROL_COLOR[form.rol]}33` }}>
            <Shield size={13} color={ROL_COLOR[form.rol]} />
            <span style={{ fontSize: 12, color: ROL_COLOR[form.rol], fontWeight: 600 }}>
              {form.rol === 'admin' && 'Acceso total al sistema'}
              {form.rol === 'barbero' && 'Acceso a agenda y su perfil'}
              {form.rol === 'recepcion' && 'Acceso a agenda, clientes y adelantos'}
            </span>
          </div>

          {modalForm === 'nuevo' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="Contraseña">
                <input type="password" style={inputSt} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </Campo>
              <Campo label="Confirmar contraseña">
                <input type="password" style={inputSt} value={form.confirmar} onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repetir contraseña" />
              </Campo>
            </div>
          )}

          {errorMsg && <ErrorBox msg={errorMsg} />}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setModalForm(null)} style={btnCancelar}>Cancelar</button>
            <button type="button" onClick={guardar} disabled={guardando} style={{ ...btnVerde, flex: 2, justifyContent: 'center' }}>
              <Check size={14} /> {guardando ? 'Guardando…' : modalForm === 'nuevo' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal contraseña ─────────────────────────────────────────────────── */}
      {modalPass && (
        <Modal titulo={`Cambiar contraseña — ${modalPass.nombre}`} onClose={() => setModalPass(null)}>
          <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
            El usuario podrá iniciar sesión con la nueva contraseña de inmediato.
          </p>
          <Campo label="Nueva contraseña">
            <input type="password" style={inputSt} value={form.password} autoFocus
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </Campo>
          <Campo label="Confirmar contraseña">
            <input type="password" style={inputSt} value={form.confirmar}
              onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && cambiarPassword()} placeholder="Repetir contraseña" />
          </Campo>
          {errorMsg && <ErrorBox msg={errorMsg} />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setModalPass(null)} style={btnCancelar}>Cancelar</button>
            <button type="button" onClick={cambiarPassword} disabled={guardando} style={{ ...btnVerde, flex: 2, justifyContent: 'center' }}>
              <KeyRound size={14} /> {guardando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: toast.ok ? '#1E3A22' : '#3A1E1E', border: `1px solid ${toast.ok ? '#2A6034' : '#6B2525'}`, color: toast.ok ? '#7EE49A' : '#F4A0A0', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 14, padding: '24px 28px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--blanco)' }}>{titulo}</h2>
          <button type="button" title="Cerrar" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-suave)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 7, background: '#FAEAEA', border: '1px solid #E8C0C0' }}>
      <AlertCircle size={14} style={{ color: 'var(--error)', flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: 'var(--error)' }}>{msg}</span>
    </div>
  );
}

// ─── estilos ──────────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'var(--superficie2)', border: '1px solid var(--borde)',
  borderRadius: 7, color: 'var(--texto)', fontSize: 13, outline: 'none',
};
const btnVerde: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--verde)', border: 'none', borderRadius: 8,
  padding: '8px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnCancelar: React.CSSProperties = {
  flex: 1, padding: '10px', borderRadius: 8,
  border: '1px solid var(--borde)', background: 'transparent',
  color: 'var(--texto-suave)', fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: '4px 5px',
  cursor: 'pointer', color: 'var(--texto-suave)', display: 'flex',
  alignItems: 'center', borderRadius: 5,
};

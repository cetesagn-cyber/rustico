import { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, X, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle,
  UserRound, Users, AlertTriangle, Clock, FileText, Edit3,
} from 'lucide-react';
import { api } from '../api/client';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas_privadas?: string | null;
  segmento: string;
  total_visitas: number;
  ticket_promedio: number;
  ultimo_servicio: string | null;
  created_at: string;
}

interface Historial {
  id: string;
  inicio: string;
  estado: string;
  precio_cop: number;
  servicio: string;
  barbero: string;
}

interface ResumenCRM {
  total: number;
  conTelefono: number;
  conEmail: number;
  importadosExcel: number;
  porSegmento: Array<{ segmento: string; total: number }>;
}

const SEGMENTO_LABEL: Record<string, string> = {
  todos: 'Todos',
  vip: 'VIP',
  frecuente: 'Frecuentes',
  nuevo: 'Nuevos',
  en_riesgo: 'En riesgo',
  inactivo: 'Inactivos',
};

const SEGMENTO_COLOR: Record<string, string> = {
  vip: '#D4921A',
  frecuente: '#2A7048',
  nuevo: '#2A5080',
  en_riesgo: '#8A6818',
  inactivo: '#5A6858',
};

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v || 0);
}

function formatFecha(s?: string | null) {
  if (!s) return 'Sin fecha';
  return new Date(s).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'CL';
}

function whatsappUrl(cliente: Cliente) {
  const phone = (cliente.telefono || '').replace(/\D/g, '');
  if (!phone) return '#';
  const normalized = phone.startsWith('57') ? phone : `57${phone}`;
  const text = encodeURIComponent(`Hola ${cliente.nombre}, te escribimos de Rustico para ayudarte con tu proxima cita.`);
  return `https://wa.me/${normalized}?text=${text}`;
}

function parseNotas(notas?: string | null) {
  if (!notas) return [];
  return notas
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [key, ...rest] = part.split(':');
      return { key: key.trim(), value: rest.join(':').trim() || part };
    });
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumen, setResumen] = useState<ResumenCRM | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPag, setTotalPag] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [segmento, setSegmento] = useState('todos');
  const [contacto, setContacto] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<Cliente | null>(null);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', notas_privadas: '', segmento: 'nuevo' });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargarResumen = useCallback(async () => {
    const data = await api.get<ResumenCRM>('/clientes/resumen');
    setResumen(data);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const filtroSegmento = segmento === 'todos' ? '' : `&segmento=${encodeURIComponent(segmento)}`;
      const filtroContacto = contacto === 'todos' ? '' : `&contacto=${encodeURIComponent(contacto)}`;
      const data = await api.get<{ clientes: Cliente[]; total: number; totalPaginas: number }>(
        `/clientes?page=${pagina}&q=${encodeURIComponent(busqueda)}&limite=50${filtroSegmento}${filtroContacto}`,
      );
      setClientes(data.clientes || []);
      setTotal(data.total || 0);
      setTotalPag(Math.max(1, data.totalPaginas || 1));
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el CRM.');
    } finally {
      setCargando(false);
    }
  }, [pagina, busqueda, segmento, contacto]);

  useEffect(() => { cargarResumen().catch(() => undefined); }, [cargarResumen]);
  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (c: Cliente) => {
    setDetalle(c);
    setHistorial([]);
    try {
      const h = await api.get<Historial[]>(`/clientes/${c.id}/historial`);
      setHistorial(h || []);
    } catch {
      setHistorial([]);
    }
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', telefono: '', email: '', notas_privadas: '', segmento: 'nuevo' });
    setModal(true);
    setErrorForm('');
  };

  const abrirEditar = (cliente: Cliente) => {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      notas_privadas: cliente.notas_privadas || '',
      segmento: cliente.segmento || 'nuevo',
    });
    setModal(true);
    setErrorForm('');
  };

  const guardarCliente = async () => {
    if (!form.nombre.trim()) { setErrorForm('El nombre es requerido.'); return; }
    setGuardando(true);
    setErrorForm('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        notas_privadas: form.notas_privadas.trim() || undefined,
        segmento: form.segmento,
      };
      const saved = editando
        ? await api.put<Cliente>(`/clientes/${editando.id}`, payload)
        : await api.post<Cliente>('/clientes', payload);
      setModal(false);
      setEditando(null);
      setForm({ nombre: '', telefono: '', email: '', notas_privadas: '', segmento: 'nuevo' });
      if (detalle?.id === saved?.id) setDetalle(saved);
      await Promise.all([cargar(), cargarResumen()]);
    } catch (err: any) {
      setErrorForm(err.message || 'No se pudo guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const segmentCount = (key: string) => {
    if (key === 'todos') return resumen?.total ?? total;
    return Number(resumen?.porSegmento?.find(item => item.segmento === key)?.total ?? 0);
  };

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--blanco)', marginBottom: 4 }}>CRM Clientes</h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
            Base completa de clientes, contactos importados y seguimiento comercial.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          style={primaryButton}
        >
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <Metric icon={<Users size={17} />} label="Total CRM" value={resumen?.total ?? total} />
        <Metric icon={<Phone size={17} />} label="Con telefono" value={resumen?.conTelefono ?? 0} />
        <Metric icon={<Mail size={17} />} label="Con correo" value={resumen?.conEmail ?? 0} />
        <Metric icon={<FileText size={17} />} label="Importados Excel" value={resumen?.importadosExcel ?? 0} />
      </div>

      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) auto', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)' }} />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por nombre, telefono o correo"
              style={searchInput}
            />
          </div>
          <span style={{ color: 'var(--texto-suave)', fontSize: 12, whiteSpace: 'nowrap' }}>
            Mostrando {clientes.length} de {total}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <select
            value={contacto}
            onChange={e => { setContacto(e.target.value); setPagina(1); }}
            style={selectInput}
          >
            <option value="todos">Todos los contactos</option>
            <option value="con_telefono">Con telefono</option>
            <option value="sin_telefono">Sin telefono</option>
            <option value="con_email">Con correo</option>
            <option value="sin_email">Sin correo</option>
            <option value="importados_excel">Importados Excel</option>
          </select>
          <div style={{ color: 'var(--texto-suave)', fontSize: 12 }}>
            Filtra para limpiar datos, completar contactos y priorizar clientes listos para WhatsApp.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {['todos', 'nuevo', 'frecuente', 'vip', 'en_riesgo', 'inactivo'].map(key => (
            <button
              key={key}
              onClick={() => { setSegmento(key); setPagina(1); }}
              style={{
                ...filterButton,
                background: segmento === key ? 'var(--verde)' : 'transparent',
                color: segmento === key ? '#fff' : 'var(--texto-suave)',
                borderColor: segmento === key ? 'var(--verde)' : 'var(--borde)',
              }}
            >
              {SEGMENTO_LABEL[key]} <strong>{segmentCount(key)}</strong>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FAEAEA', border: '1px solid #E8C0C0', color: 'var(--error)', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={tableHead}>
          <span>Cliente</span>
          <span>Contacto</span>
          <span>Segmento</span>
          <span>Notas / origen</span>
          <span style={{ textAlign: 'right' }}>Acciones</span>
        </div>

        {cargando ? (
          <EmptyState text="Cargando clientes..." />
        ) : clientes.length === 0 ? (
          <EmptyState text="No hay clientes con ese filtro." />
        ) : clientes.map(c => (
          <div key={c.id} style={clientRow} onClick={() => verDetalle(c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{ ...avatar, borderColor: `${SEGMENTO_COLOR[c.segmento] || '#2A5080'}44`, color: SEGMENTO_COLOR[c.segmento] || '#2A5080' }}>
                {initials(c.nombre)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: 'var(--texto)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</strong>
                  {c.notas_privadas?.includes('Barbero Excel') && <span style={importBadge}>Excel</span>}
                </div>
                <span style={{ color: 'var(--texto-suave)', fontSize: 11 }}>Creado {formatFecha(c.created_at)}</span>
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <ContactLine icon={<Phone size={12} />} value={c.telefono || 'Sin telefono'} />
              <ContactLine icon={<Mail size={12} />} value={c.email || 'Sin correo'} />
            </div>

            <div>
              <span className={`badge badge-${c.segmento}`}>{SEGMENTO_LABEL[c.segmento] || c.segmento}</span>
              <div style={{ marginTop: 6, color: 'var(--texto-suave)', fontSize: 11 }}>
                {c.total_visitas} visitas · {c.ticket_promedio > 0 ? formatCOP(c.ticket_promedio) : 'sin ticket'}
              </div>
            </div>

            <div style={{ minWidth: 0, color: 'var(--texto-suave)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.notas_privadas || 'Sin notas registradas'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
              <a href={whatsappUrl(c)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={iconAction} title="WhatsApp">
                <MessageCircle size={15} />
              </a>
              <button onClick={e => { e.stopPropagation(); verDetalle(c); }} style={iconAction} title="Ver detalle">
                <UserRound size={15} />
              </button>
            </div>
          </div>
        ))}

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--borde)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>Pagina {pagina} de {totalPag}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={pageButton}><ChevronLeft size={14} /> Anterior</button>
            <button onClick={() => setPagina(p => Math.min(totalPag, p + 1))} disabled={pagina === totalPag} style={pageButton}>Siguiente <ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {detalle && (
        <ClientDetail
          cliente={detalle}
          historial={historial}
          onClose={() => setDetalle(null)}
          onEdit={() => abrirEditar(detalle)}
        />
      )}

      {modal && (
        <NewClientModal
          form={form}
          setForm={setForm}
          error={errorForm}
          saving={guardando}
          onClose={() => setModal(false)}
          onSave={guardarCliente}
          title={editando ? 'Editar cliente' : 'Nuevo cliente'}
        />
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 9, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(42,80,128,.1)', color: 'var(--verde)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ color: 'var(--texto)', fontWeight: 800, fontSize: 20 }}>{value.toLocaleString('es-CO')}</div>
        <div style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{label}</div>
      </div>
    </div>
  );
}

function ContactLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--texto-suave)', fontSize: 12, minWidth: 0, marginBottom: 3 }}>
      <span style={{ display: 'flex', color: 'var(--texto-suave)' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 42, textAlign: 'center', color: 'var(--texto-suave)', fontSize: 13 }}>{text}</div>;
}

function ClientDetail({
  cliente, historial, onClose, onEdit,
}: { cliente: Cliente; historial: Historial[]; onClose: () => void; onEdit: () => void }) {
  const notas = parseNotas(cliente.notas_privadas);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)', display: 'flex', justifyContent: 'flex-end', zIndex: 50 }}>
      <aside style={{ width: 460, maxWidth: '100%', background: 'var(--superficie)', borderLeft: '1px solid var(--borde)', overflow: 'auto', padding: 26, boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ ...avatar, width: 54, height: 54, fontSize: 17, marginBottom: 12 }}>{initials(cliente.nombre)}</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--blanco)' }}>{cliente.nombre}</h2>
            <div style={{ marginTop: 8 }}><span className={`badge badge-${cliente.segmento}`}>{SEGMENTO_LABEL[cliente.segmento] || cliente.segmento}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={iconAction} title="Editar cliente"><Edit3 size={15} /></button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Info label="Telefono" value={cliente.telefono || 'Sin telefono'} />
          <Info label="Correo" value={cliente.email || 'Sin correo'} />
          <Info label="Visitas" value={`${cliente.total_visitas || 0}`} />
          <Info label="Ticket" value={cliente.ticket_promedio > 0 ? formatCOP(cliente.ticket_promedio) : 'Sin ticket'} />
        </div>

        <a href={whatsappUrl(cliente)} target="_blank" rel="noreferrer" style={{ ...primaryButton, justifyContent: 'center', marginBottom: 16, textDecoration: 'none' }}>
          <MessageCircle size={15} /> Escribir por WhatsApp
        </a>

        <h3 style={detailTitle}><FileText size={15} /> Notas del CRM</h3>
        {notas.length === 0 ? (
          <p style={mutedText}>Sin notas registradas.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
            {notas.map((nota, index) => (
              <div key={`${nota.key}-${index}`} style={{ background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ color: 'var(--texto-suave)', fontSize: 11 }}>{nota.key}</div>
                <div style={{ color: 'var(--texto)', fontSize: 13, marginTop: 2 }}>{nota.value}</div>
              </div>
            ))}
          </div>
        )}

        <h3 style={detailTitle}><Clock size={15} /> Historial de servicios</h3>
        {historial.length === 0 ? (
          <p style={mutedText}>Sin historial de citas.</p>
        ) : historial.map(h => (
          <div key={h.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--borde)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <strong style={{ color: 'var(--texto)', fontSize: 13 }}>{h.servicio}</strong>
              <span className={`badge badge-${h.estado}`}>{h.estado}</span>
            </div>
            <div style={{ color: 'var(--texto-suave)', fontSize: 12 }}>{formatFecha(h.inicio)} · {h.barbero} · {formatCOP(h.precio_cop)}</div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 8, padding: '10px 12px', minWidth: 0 }}>
      <div style={{ color: 'var(--texto-suave)', fontSize: 11, marginBottom: 3 }}>{label}</div>
      <div style={{ color: 'var(--texto)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function NewClientModal({
  form, setForm, error, saving, onClose, onSave, title,
}: {
  form: { nombre: string; telefono: string; email: string; notas_privadas: string; segmento: string };
  setForm: React.Dispatch<React.SetStateAction<{ nombre: string; telefono: string; email: string; notas_privadas: string; segmento: string }>>;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 22 }}>
      <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 12, width: '100%', maxWidth: 430, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--blanco)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {[
          { label: 'Nombre *', key: 'nombre', type: 'text' },
          { label: 'Telefono', key: 'telefono', type: 'tel' },
          { label: 'Correo', key: 'email', type: 'email' },
        ].map(({ label, key, type }) => (
          <div key={key} style={{ marginBottom: 13 }}>
            <label style={labelStyle}>{label}</label>
            <input
              type={type}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom: 13 }}>
          <label style={labelStyle}>Segmento</label>
          <select
            value={form.segmento}
            onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))}
            style={inputStyle}
          >
            <option value="nuevo">Nuevo</option>
            <option value="frecuente">Frecuente</option>
            <option value="vip">VIP</option>
            <option value="en_riesgo">En riesgo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        <div style={{ marginBottom: 15 }}>
          <label style={labelStyle}>Notas privadas</label>
          <textarea
            value={form.notas_privadas}
            onChange={e => setForm(f => ({ ...f, notas_privadas: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
          />
        </div>

        {error && <div style={{ display: 'flex', gap: 8, background: '#FAEAEA', border: '1px solid #E8C0C0', color: 'var(--error)', borderRadius: 8, padding: 10, marginBottom: 13, fontSize: 12 }}><AlertTriangle size={14} /> {error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...secondaryButton, flex: 1 }}>Cancelar</button>
          <button onClick={onSave} disabled={saving} style={{ ...primaryButton, flex: 2, justifyContent: 'center' }}>
            {saving ? 'Guardando...' : title}
          </button>
        </div>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'var(--verde)',
  border: 'none',
  borderRadius: 8,
  padding: '9px 15px',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid var(--borde)',
  background: 'transparent',
  color: 'var(--texto-suave)',
  fontSize: 13,
  cursor: 'pointer',
};

const searchInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 36px',
  background: 'var(--superficie2)',
  border: '1px solid var(--borde)',
  borderRadius: 8,
  color: 'var(--texto)',
  fontSize: 14,
  outline: 'none',
};

const selectInput: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  background: 'var(--superficie2)',
  border: '1px solid var(--borde)',
  borderRadius: 8,
  color: 'var(--texto)',
  fontSize: 13,
  outline: 'none',
};

const filterButton: React.CSSProperties = {
  border: '1px solid var(--borde)',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: 12,
  cursor: 'pointer',
  display: 'inline-flex',
  gap: 6,
  alignItems: 'center',
};

const tableHead: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.35fr 1.15fr .8fr 1.35fr 92px',
  gap: 12,
  padding: '11px 16px',
  background: 'var(--superficie2)',
  borderBottom: '1px solid var(--borde)',
  color: 'var(--texto-suave)',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const clientRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.35fr 1.15fr .8fr 1.35fr 92px',
  gap: 12,
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--borde)',
  cursor: 'pointer',
};

const avatar: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(42,80,128,.1)',
  border: '2px solid rgba(42,80,128,.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0,
};

const importBadge: React.CSSProperties = {
  fontSize: 10,
  background: 'rgba(212,146,26,.14)',
  color: 'var(--cobre)',
  border: '1px solid rgba(212,146,26,.25)',
  borderRadius: 5,
  padding: '1px 5px',
  fontWeight: 800,
};

const iconAction: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid var(--borde)',
  background: 'transparent',
  color: 'var(--texto-suave)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const pageButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'transparent',
  border: '1px solid var(--borde)',
  borderRadius: 7,
  padding: '6px 10px',
  color: 'var(--texto-suave)',
  cursor: 'pointer',
  fontSize: 12,
};

const detailTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 14,
  fontWeight: 800,
  color: 'var(--blanco)',
  margin: '18px 0 10px',
};

const mutedText: React.CSSProperties = {
  color: 'var(--texto-suave)',
  fontSize: 13,
  margin: '0 0 14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--texto-suave)',
  marginBottom: 5,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--superficie2)',
  border: '1px solid var(--borde)',
  borderRadius: 8,
  color: 'var(--texto)',
  fontSize: 14,
  outline: 'none',
};

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Tag, Package, Layers, Clock, X, Check, ToggleLeft, ToggleRight, Trash2, TrendingUp, Search, ArrowUpDown, ChevronUp, ChevronDown, RotateCcw, Percent, AlertCircle, Scissors, Crown, Palette, Zap, Sparkles, Sun, Droplets, Hand, Feather, Star, Smile, Leaf, Wind } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideIcon = any;
import { api } from '../api/client';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Servicio {
  id: string; nombre: string; descripcion: string | null;
  duracion_min: number; precio_cop: number; categoria: string; activo: number;
}
interface Producto {
  id: string; nombre: string; descripcion: string | null;
  precio_cop: number; categoria: string; activo: number;
}
interface ComboItem {
  id: string; tipo: 'servicio' | 'producto'; item_id: string;
  cantidad: number; nombre: string; precio_unitario: number;
}
interface Combo {
  id: string; nombre: string; descripcion: string | null;
  precio_cop: number; activo: number; items: ComboItem[];
}
interface ItemDraft { tipo: 'servicio' | 'producto'; item_id: string; cantidad: number; }

// ─── helpers ──────────────────────────────────────────────────────────────────
const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const CAT_SVC_LABEL: Record<string, string> = {
  corte: 'Corte', barba: 'Barba', tratamiento: 'Tratamiento',
  combo: 'Paquete', otro: 'Otro',
};
const CAT_SVC = ['corte', 'barba', 'tratamiento', 'combo', 'otro'];

const CAT_PROD_LABEL: Record<string, string> = {
  cuidado: 'Cuidado', pomada: 'Pomada / Fijación', aceite: 'Aceite / Serum',
  afeitado: 'Afeitado', otro: 'Otro',
};
const CAT_PROD = ['cuidado', 'pomada', 'aceite', 'afeitado', 'otro'];

type TabId = 'servicios' | 'productos' | 'combos' | 'precios';
type TipoItem = 'servicio' | 'producto' | 'combo';
type SortKey = 'nombre' | 'precio_cop';
interface Toast { id: number; msg: string; tipo: 'ok' | 'error'; }

// ─── iconos y colores por servicio / categoría ────────────────────────────────
const ICONO_SVC: Record<string, LucideIcon> = {
  'Corte':                                                       Scissors,
  'Corte VIP':                                                   Crown,
  'Cerquillo':                                                   Scissors,
  'Barba':                                                       Wind,
  'Barba VIP':                                                   Crown,
  'Tinte Barba':                                                 Palette,
  'Depilación Cejas / Nariz / Oídos':                           Feather,
  'Combo Corte - Barba':                                         Layers,
  'Combo Corte - Barba - Mascarilla':                           Layers,
  'Combo VIP Corte - Barba':                                     Crown,
  'Servicio VIP (Spa Facial + Corte y Barba + Depilaciones)':   Crown,
  'Keratina Completa':                                           Zap,
  'Keratina Mechón':                                             Zap,
  'Tinte Cejas':                                                 Palette,
  'Tinte Cabello':                                               Palette,
  'Decoloración':                                                Palette,
  'Mascarilla Hidroplástica':                                    Sparkles,
  'Mascarilla de Colágeno':                                      Sparkles,
  'Mascarilla de Hidratación':                                   Droplets,
  'Mascarilla Puntos Negros':                                    Smile,
  'Mascarilla Ojeras':                                           Smile,
  'Mascarilla Led':                                              Zap,
  'Spa Facial (6 Mascarillas)':                                  Sun,
  'Ampolletas':                                                  Zap,
  'Cóctel de Hidratación':                                       Droplets,
  'Manicure':                                                    Hand,
  'Pedicure':                                                    Leaf,
};

const CAT_VISUAL: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  corte:       { icon: Scissors, color: '#2A5080', bg: 'rgba(42,80,128,0.1)',    label: 'Corte' },
  barba:       { icon: Wind,     color: '#D4921A', bg: 'rgba(212,146,26,0.1)',   label: 'Barba' },
  tratamiento: { icon: Sparkles, color: '#7A5A9E', bg: 'rgba(122,90,158,0.1)',   label: 'Tratamiento' },
  combo:       { icon: Crown,    color: '#2A7048', bg: 'rgba(42,112,72,0.1)',    label: 'Paquete' },
  otro:        { icon: Star,     color: '#4A7C8E', bg: 'rgba(74,124,142,0.1)',   label: 'Otro' },
};

const CAT_PROD_VISUAL: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  cuidado:  { icon: Sparkles, color: '#7A5A9E', bg: 'rgba(122,90,158,0.1)' },
  pomada:   { icon: Layers,   color: '#2A5080', bg: 'rgba(42,80,128,0.1)'  },
  aceite:   { icon: Droplets, color: '#D4921A', bg: 'rgba(212,146,26,0.1)' },
  afeitado: { icon: Feather,  color: '#2A7048', bg: 'rgba(42,112,72,0.1)'  },
  otro:     { icon: Star,     color: '#4A7C8E', bg: 'rgba(74,124,142,0.1)' },
};

function getSvcVisual(nombre: string, categoria: string) {
  const Icon  = ICONO_SVC[nombre] ?? CAT_VISUAL[categoria]?.icon ?? Tag;
  const color = CAT_VISUAL[categoria]?.color ?? 'var(--texto-suave)';
  const bg    = CAT_VISUAL[categoria]?.bg    ?? 'var(--superficie2)';
  return { Icon, color, bg };
}

function getProdVisual(categoria: string) {
  const v = CAT_PROD_VISUAL[categoria];
  return { Icon: v?.icon ?? Package, color: v?.color ?? 'var(--texto-suave)', bg: v?.bg ?? 'var(--superficie2)' };
}

const FORM_SVC = () => ({ nombre: '', descripcion: '', duracion_min: 30, precio_cop: 0, categoria: 'corte' });
const FORM_PROD = () => ({ nombre: '', descripcion: '', precio_cop: 0, categoria: 'cuidado' });
const FORM_COMBO = () => ({ nombre: '', descripcion: '', precio_cop: 0 });

// ─── componente principal ─────────────────────────────────────────────────────
export default function Catalogo() {
  const [tab, setTab]  = useState<TabId>('servicios');

  // servicios
  const [servicios,    setServicios]    = useState<Servicio[]>([]);
  const [mostrarInactSvc, setMostrarInactSvc] = useState(false);
  const [modalSvc,     setModalSvc]     = useState<'nuevo' | 'editar' | null>(null);
  const [editSvcId,    setEditSvcId]    = useState<string | null>(null);
  const [formSvc,      setFormSvc]      = useState(FORM_SVC());
  const [editPrecioId, setEditPrecioId] = useState<string | null>(null);
  const [precioInput,  setPrecioInput]  = useState('');

  // productos
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [mostrarInactProd, setMostrarInactProd] = useState(false);
  const [modalProd,    setModalProd]    = useState<'nuevo' | 'editar' | null>(null);
  const [editProdId,   setEditProdId]   = useState<string | null>(null);
  const [formProd,     setFormProd]     = useState(FORM_PROD());

  // combos
  const [combos,       setCombos]       = useState<Combo[]>([]);
  const [modalCombo,   setModalCombo]   = useState<'nuevo' | 'editar' | null>(null);
  const [editComboId,  setEditComboId]  = useState<string | null>(null);
  const [formCombo,    setFormCombo]    = useState(FORM_COMBO());
  const [itemsDraft,   setItemsDraft]   = useState<ItemDraft[]>([]);
  const [addTipo,      setAddTipo]      = useState<'servicio' | 'producto'>('servicio');
  const [addItemId,    setAddItemId]    = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  // precios rápidos
  const [preciosModificados, setPreciosModificados] = useState<Record<string, string>>({});
  const [guardandoPrecios, setGuardandoPrecios] = useState<Record<string, boolean>>({});
  const [successPrecios, setSuccessPrecios] = useState<Record<string, boolean>>({});
  const [filtroPrecios, setFiltroPrecios] = useState('');
  const [filtroCatPrecios, setFiltroCatPrecios] = useState<string>('todos');
  const [sortPrecios, setSortPrecios] = useState<SortKey>('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [mostrarInactPrecios, setMostrarInactPrecios] = useState(false);
  const [ajustePct, setAjustePct] = useState('');

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((msg: string, tipo: 'ok' | 'error' = 'ok') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ─── carga ──────────────────────────────────────────────────────────────────
  const cargarServicios = useCallback(async () => {
    const data = await api.get<Servicio[]>(`/servicios?todos=${mostrarInactSvc ? 1 : 0}`);
    setServicios(data);
  }, [mostrarInactSvc]);

  const cargarProductos = useCallback(async () => {
    const data = await api.get<Producto[]>(`/productos?todos=${mostrarInactProd ? 1 : 0}`);
    setProductos(data);
  }, [mostrarInactProd]);

  const cargarCombos = useCallback(async () => {
    const data = await api.get<Combo[]>('/combos');
    setCombos(data);
  }, []);

  useEffect(() => { cargarServicios(); }, [cargarServicios]);
  useEffect(() => { cargarProductos(); }, [cargarProductos]);
  useEffect(() => { cargarCombos(); }, [cargarCombos]);

  // ─── servicios CRUD ──────────────────────────────────────────────────────────
  const abrirNuevoSvc = () => {
    setFormSvc(FORM_SVC()); setEditSvcId(null); setErrorMsg(''); setModalSvc('nuevo');
  };
  const abrirEditarSvc = (s: Servicio) => {
    setFormSvc({ nombre: s.nombre, descripcion: s.descripcion || '', duracion_min: s.duracion_min, precio_cop: s.precio_cop, categoria: s.categoria });
    setEditSvcId(s.id); setErrorMsg(''); setModalSvc('editar');
  };
  const guardarSvc = async () => {
    if (!formSvc.nombre.trim()) { setErrorMsg('El nombre es obligatorio.'); return; }
    setGuardando(true); setErrorMsg('');
    try {
      if (modalSvc === 'nuevo') {
        await api.post('/servicios', formSvc);
      } else {
        await api.put(`/servicios/${editSvcId}`, formSvc);
      }
      setModalSvc(null);
      await cargarServicios();
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setGuardando(false); }
  };
  const toggleSvc = async (s: Servicio) => {
    await api.patch(`/servicios/${s.id}/activo`, { activo: !s.activo });
    await cargarServicios();
  };
  const guardarPrecioInline = async (id: string) => {
    const val = parseInt(precioInput.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val >= 0) {
      await api.put(`/servicios/${id}`, { precio_cop: val });
      await cargarServicios();
    }
    setEditPrecioId(null);
  };

  // ─── gestión de precios rápida ────────────────────────────────────────────────
  const guardarPrecioIndividual = async (id: string, tipo: TipoItem) => {
    const valStr = preciosModificados[id];
    if (valStr === undefined) return;
    const val = parseInt(valStr.replace(/\D/g, ''), 10);
    if (isNaN(val) || val < 0) return;

    setGuardandoPrecios(prev => ({ ...prev, [id]: true }));
    try {
      if (tipo === 'servicio') {
        await api.put(`/servicios/${id}`, { precio_cop: val });
        await cargarServicios();
      } else if (tipo === 'producto') {
        await api.put(`/productos/${id}`, { precio_cop: val });
        await cargarProductos();
      } else {
        await api.put(`/combos/${id}`, { precio_cop: val });
        await cargarCombos();
      }

      setSuccessPrecios(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setSuccessPrecios(prev => ({ ...prev, [id]: false })), 2000);
      setPreciosModificados(prev => { const c = { ...prev }; delete c[id]; return c; });
      showToast('Precio actualizado');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar el precio', 'error');
    } finally {
      setGuardandoPrecios(prev => ({ ...prev, [id]: false }));
    }
  };

  const guardarTodosLosPrecios = async () => {
    const ids = Object.keys(preciosModificados);
    if (ids.length === 0) return;

    setGuardando(true);
    try {
      const todosUnificados = [
        ...servicios.map(s => ({ id: s.id, tipo: 'servicio' as TipoItem })),
        ...productos.map(p => ({ id: p.id, tipo: 'producto' as TipoItem })),
        ...combos.map(c => ({ id: c.id, tipo: 'combo' as TipoItem })),
      ];
      const promesas = ids.map(async (id) => {
        const item = todosUnificados.find(x => x.id === id);
        if (!item) return;
        const val = parseInt(preciosModificados[id].replace(/\D/g, ''), 10);
        if (isNaN(val) || val < 0) return;
        if (item.tipo === 'servicio') await api.put(`/servicios/${id}`, { precio_cop: val });
        else if (item.tipo === 'producto') await api.put(`/productos/${id}`, { precio_cop: val });
        else await api.put(`/combos/${id}`, { precio_cop: val });
      });

      await Promise.all(promesas);
      await Promise.all([cargarServicios(), cargarProductos(), cargarCombos()]);
      setPreciosModificados({});
      showToast(`${ids.length} precio${ids.length !== 1 ? 's' : ''} actualizado${ids.length !== 1 ? 's' : ''} correctamente`);
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar los precios', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const aplicarAjustePct = () => {
    const pct = parseFloat(ajustePct);
    if (isNaN(pct) || pct === 0) return;
    const todosUnificados = [
      ...servicios.map(s => ({ ...s, tipo: 'servicio' as TipoItem })),
      ...productos.map(p => ({ ...p, tipo: 'producto' as TipoItem })),
      ...combos.map(c => ({ ...c, tipo: 'combo' as TipoItem, duracion_min: undefined as any, categoria: 'combo' })),
    ].filter(x => mostrarInactPrecios || x.activo);
    const filtrados = todosUnificados.filter(x => {
      const coincideTexto = x.nombre.toLowerCase().includes(filtroPrecios.toLowerCase());
      const coincideCat = filtroCatPrecios === 'todos' || x.tipo === filtroCatPrecios;
      return coincideTexto && coincideCat;
    });
    const nuevos: Record<string, string> = { ...preciosModificados };
    filtrados.forEach(x => {
      const precioBase = preciosModificados[x.id] !== undefined
        ? parseInt(preciosModificados[x.id].replace(/\D/g, ''), 10)
        : x.precio_cop;
      const nuevo = Math.max(0, Math.round(precioBase * (1 + pct / 100)));
      nuevos[x.id] = String(nuevo);
    });
    setPreciosModificados(nuevos);
    setAjustePct('');
    showToast(`${pct > 0 ? '+' : ''}${pct}% aplicado a ${filtrados.length} ítem${filtrados.length !== 1 ? 's' : ''}`);
  };

  const descartarTodosLosPrecios = () => {
    setPreciosModificados({});
    showToast('Cambios descartados');
  };

  // ─── productos CRUD ──────────────────────────────────────────────────────────
  const abrirNuevoProd = () => {
    setFormProd(FORM_PROD()); setEditProdId(null); setErrorMsg(''); setModalProd('nuevo');
  };
  const abrirEditarProd = (p: Producto) => {
    setFormProd({ nombre: p.nombre, descripcion: p.descripcion || '', precio_cop: p.precio_cop, categoria: p.categoria });
    setEditProdId(p.id); setErrorMsg(''); setModalProd('editar');
  };
  const guardarProd = async () => {
    if (!formProd.nombre.trim()) { setErrorMsg('El nombre es obligatorio.'); return; }
    setGuardando(true); setErrorMsg('');
    try {
      if (modalProd === 'nuevo') {
        await api.post('/productos', formProd);
      } else {
        await api.put(`/productos/${editProdId}`, formProd);
      }
      setModalProd(null);
      await cargarProductos();
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setGuardando(false); }
  };
  const toggleProd = async (p: Producto) => {
    await api.patch(`/productos/${p.id}/activo`, { activo: !p.activo });
    await cargarProductos();
  };

  // ─── combos CRUD ─────────────────────────────────────────────────────────────
  const abrirNuevoCombo = () => {
    setFormCombo(FORM_COMBO()); setItemsDraft([]); setEditComboId(null);
    setErrorMsg(''); setModalCombo('nuevo');
  };
  const abrirEditarCombo = (c: Combo) => {
    setFormCombo({ nombre: c.nombre, descripcion: c.descripcion || '', precio_cop: c.precio_cop });
    setItemsDraft(c.items.map(i => ({ tipo: i.tipo, item_id: i.item_id, cantidad: i.cantidad })));
    setEditComboId(c.id); setErrorMsg(''); setModalCombo('editar');
  };
  const agregarItemDraft = () => {
    if (!addItemId) return;
    setItemsDraft(prev => {
      const existe = prev.find(i => i.tipo === addTipo && i.item_id === addItemId);
      if (existe) return prev.map(i => i.tipo === addTipo && i.item_id === addItemId ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { tipo: addTipo, item_id: addItemId, cantidad: 1 }];
    });
    setAddItemId('');
  };
  const quitarItemDraft = (idx: number) => setItemsDraft(prev => prev.filter((_, i) => i !== idx));
  const guardarCombo = async () => {
    if (!formCombo.nombre.trim()) { setErrorMsg('El nombre es obligatorio.'); return; }
    if (itemsDraft.length === 0) { setErrorMsg('Agrega al menos un ítem al combo.'); return; }
    setGuardando(true); setErrorMsg('');
    try {
      const payload = { ...formCombo, items: itemsDraft };
      if (modalCombo === 'nuevo') {
        await api.post('/combos', payload);
      } else {
        await api.put(`/combos/${editComboId}`, payload);
      }
      setModalCombo(null);
      await cargarCombos();
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setGuardando(false); }
  };
  const toggleCombo = async (c: Combo) => {
    await api.patch(`/combos/${c.id}/activo`, { activo: !c.activo });
    await cargarCombos();
  };

  // ─── helpers de resumen de combo ─────────────────────────────────────────────
  const nombreItem = (tipo: 'servicio' | 'producto', itemId: string) => {
    if (tipo === 'servicio') return servicios.find(s => s.id === itemId)?.nombre || '—';
    return productos.find(p => p.id === itemId)?.nombre || '—';
  };
  const precioItem = (tipo: 'servicio' | 'producto', itemId: string) => {
    if (tipo === 'servicio') return servicios.find(s => s.id === itemId)?.precio_cop || 0;
    return productos.find(p => p.id === itemId)?.precio_cop || 0;
  };
  const subtotalDraft = itemsDraft.reduce((s, i) => s + precioItem(i.tipo, i.item_id) * i.cantidad, 0);

  // ─── agrupación por categoría ─────────────────────────────────────────────────
  const svcPorCat = CAT_SVC.reduce((acc, cat) => {
    const grupo = servicios.filter(s => s.categoria === cat);
    if (grupo.length) acc[cat] = grupo;
    return acc;
  }, {} as Record<string, Servicio[]>);

  const prodPorCat = CAT_PROD.reduce((acc, cat) => {
    const grupo = productos.filter(p => p.categoria === cat);
    if (grupo.length) acc[cat] = grupo;
    return acc;
  }, {} as Record<string, Producto[]>);

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blanco)', marginBottom: 4 }}>Catálogo</h1>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
            Servicios · Productos · Combos
          </p>
        </div>
        {tab === 'servicios' && (
          <button type="button" onClick={abrirNuevoSvc} style={btnVerde}>
            <Plus size={14} /> Nuevo servicio
          </button>
        )}
        {tab === 'productos' && (
          <button type="button" onClick={abrirNuevoProd} style={btnVerde}>
            <Plus size={14} /> Nuevo producto
          </button>
        )}
        {tab === 'combos' && (
          <button type="button" onClick={abrirNuevoCombo} style={btnVerde}>
            <Plus size={14} /> Nuevo combo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--borde)', paddingBottom: 0 }}>
        {([
          { id: 'servicios', label: 'Servicios',    Icon: Tag },
          { id: 'productos', label: 'Productos',    Icon: Package },
          { id: 'combos',   label: 'Combos',       Icon: Layers },
          { id: 'precios',  label: 'Cambiar precios', Icon: TrendingUp },
        ] as { id: TabId; label: string; Icon: any }[]).map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: tab === id ? 700 : 500,
            color: tab === id ? 'var(--verde)' : 'var(--texto-suave)',
            borderBottom: tab === id ? '2px solid var(--verde)' : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── TAB SERVICIOS ───────────────────────────────────────────────── */}
      {tab === 'servicios' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => setMostrarInactSvc(v => !v)} style={btnSecundario}>
              {mostrarInactSvc ? <ToggleRight size={14} color="var(--verde)" /> : <ToggleLeft size={14} />}
              Ver inactivos
            </button>
          </div>

          {Object.entries(svcPorCat).map(([cat, lista]) => {
            const cv = CAT_VISUAL[cat];
            const CatIcon = cv?.icon ?? Tag;
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                {/* Encabezado de categoría */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cv?.bg ?? 'var(--superficie2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CatIcon size={14} color={cv?.color ?? 'var(--texto-suave)'} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cv?.color ?? 'var(--cobre)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {cv?.label ?? cat}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>· {lista.length}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
                  {lista.map(s => {
                    const { Icon, color, bg } = getSvcVisual(s.nombre, s.categoria);
                    return (
                      <div key={s.id} style={{
                        background: 'var(--superficie)', border: '1px solid var(--borde)',
                        borderRadius: 12, padding: '14px 16px',
                        opacity: s.activo ? 1 : 0.5,
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        {/* Icono */}
                        <div style={{ width: 44, height: 44, borderRadius: 11, background: bg, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={20} color={color} strokeWidth={1.8} />
                        </div>

                        {/* Contenido */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)', lineHeight: 1.3 }}>{s.nombre}</span>
                              {!s.activo && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: 'var(--texto-suave)', border: '1px solid var(--borde)', borderRadius: 3, padding: '1px 4px', letterSpacing: '0.06em' }}>INACTIVO</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 2, marginLeft: 6, flexShrink: 0 }}>
                              <button type="button" title="Editar" onClick={() => abrirEditarSvc(s)} style={iconBtn}><Pencil size={12} /></button>
                              <button type="button" title={s.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleSvc(s)} style={iconBtn}>
                                {s.activo ? <ToggleRight size={13} color="var(--verde)" /> : <ToggleLeft size={13} />}
                              </button>
                            </div>
                          </div>

                          {s.descripcion && (
                            <p style={{ fontSize: 11, color: 'var(--texto-suave)', lineHeight: 1.4, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descripcion}</p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--texto-suave)' }}>
                              <Clock size={10} strokeWidth={2} />{s.duracion_min} min
                            </span>
                            {editPrecioId === s.id ? (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input type="number" value={precioInput}
                                  onChange={e => setPrecioInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') guardarPrecioInline(s.id); if (e.key === 'Escape') setEditPrecioId(null); }}
                                  autoFocus style={{ ...inputSmall, width: 76, textAlign: 'right' }} />
                                <button type="button" title="Confirmar precio" onClick={() => guardarPrecioInline(s.id)} style={{ ...iconBtn, color: 'var(--verde)' }}><Check size={12} /></button>
                                <button type="button" title="Cancelar" onClick={() => setEditPrecioId(null)} style={iconBtn}><X size={12} /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => { setEditPrecioId(s.id); setPrecioInput(String(s.precio_cop)); }} title="Editar precio"
                                style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg, border: `1px solid ${color}30`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 800, color }}>
                                {COP(s.precio_cop)} <Pencil size={9} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {servicios.length === 0 && (
            <p style={{ color: 'var(--texto-suave)', fontSize: 13, textAlign: 'center', padding: 40 }}>
              No hay servicios. Crea el primero.
            </p>
          )}
        </div>
      )}

      {/* ── TAB PRODUCTOS ──────────────────────────────────────────────── */}
      {tab === 'productos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => setMostrarInactProd(v => !v)} style={btnSecundario}>
              {mostrarInactProd ? <ToggleRight size={14} color="var(--verde)" /> : <ToggleLeft size={14} />}
              Ver inactivos
            </button>
          </div>

          {Object.entries(prodPorCat).map(([cat, lista]) => {
            const pv = CAT_PROD_VISUAL[cat];
            const CatIcon = pv?.icon ?? Package;
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: pv?.bg ?? 'var(--superficie2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CatIcon size={14} color={pv?.color ?? 'var(--texto-suave)'} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pv?.color ?? 'var(--cobre)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {CAT_PROD_LABEL[cat] ?? cat}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>· {lista.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
                  {lista.map(p => {
                    const { Icon, color, bg } = getProdVisual(p.categoria);
                    return (
                      <div key={p.id} style={{
                        background: 'var(--superficie)', border: '1px solid var(--borde)',
                        borderRadius: 12, padding: '14px 16px', opacity: p.activo ? 1 : 0.5,
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <div style={{ width: 44, height: 44, borderRadius: 11, background: bg, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={20} color={color} strokeWidth={1.8} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>{p.nombre}</span>
                              {!p.activo && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: 'var(--texto-suave)', border: '1px solid var(--borde)', borderRadius: 3, padding: '1px 4px' }}>INACTIVO</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 2, marginLeft: 6, flexShrink: 0 }}>
                              <button type="button" title="Editar" onClick={() => abrirEditarProd(p)} style={iconBtn}><Pencil size={12} /></button>
                              <button type="button" title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleProd(p)} style={iconBtn}>
                                {p.activo ? <ToggleRight size={13} color="var(--verde)" /> : <ToggleLeft size={13} />}
                              </button>
                            </div>
                          </div>
                          {p.descripcion && <p style={{ fontSize: 11, color: 'var(--texto-suave)', lineHeight: 1.4, margin: '3px 0 0' }}>{p.descripcion}</p>}
                          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg, border: `1px solid ${color}30`, borderRadius: 7, padding: '4px 10px', fontSize: 13, fontWeight: 800, color }}>
                              {COP(p.precio_cop)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {productos.length === 0 && (
            <p style={{ color: 'var(--texto-suave)', fontSize: 13, textAlign: 'center', padding: 40 }}>
              No hay productos. Crea el primero.
            </p>
          )}
        </div>
      )}

      {/* ── TAB COMBOS ─────────────────────────────────────────────────── */}
      {tab === 'combos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {combos.map(c => {
            const suma = c.items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
            const ahorro = suma - c.precio_cop;
            const pctDto = suma > 0 ? Math.round(ahorro / suma * 100) : 0;
            const { Icon: ComboIcon, color: comboColor, bg: comboBg } = getSvcVisual(c.nombre, 'combo');
            return (
              <div key={c.id} style={{
                background: 'var(--superficie)', border: '1px solid var(--borde)',
                borderRadius: 14, overflow: 'hidden', opacity: c.activo ? 1 : 0.5,
              }}>
                {/* Cabecera */}
                <div style={{ display: 'flex', gap: 14, padding: '16px 20px', alignItems: 'flex-start' }}>
                  {/* Icono */}
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: comboBg, border: `1px solid ${comboColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ComboIcon size={22} color={comboColor} strokeWidth={1.8} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto)' }}>{c.nombre}</span>
                      {ahorro > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#D0ECD4', color: '#2A6034', borderRadius: 99, padding: '2px 8px' }}>
                          -{pctDto}% dto
                        </span>
                      )}
                      {!c.activo && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--texto-suave)', border: '1px solid var(--borde)', borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>INACTIVO</span>}
                    </div>
                    {c.descripcion && <p style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 3 }}>{c.descripcion}</p>}
                  </div>

                  {/* Precio + acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: comboColor }}>{COP(c.precio_cop)}</div>
                      {ahorro > 0 && <div style={{ fontSize: 11, color: 'var(--texto-suave)', textDecoration: 'line-through' }}>{COP(suma)}</div>}
                    </div>
                    <button type="button" title="Editar combo" onClick={() => abrirEditarCombo(c)} style={iconBtn}><Pencil size={14} /></button>
                    <button type="button" title={c.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleCombo(c)} style={iconBtn}>
                      {c.activo ? <ToggleRight size={16} color="var(--verde)" /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </div>

                {/* Items del combo */}
                {c.items.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--borde)', background: 'var(--superficie2)', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.items.map(item => {
                      const { Icon: ItemIcon, color: itemColor, bg: itemBg } = getSvcVisual(item.nombre, item.tipo === 'servicio' ? 'corte' : 'otro');
                      return (
                        <span key={item.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, padding: '3px 10px', borderRadius: 99,
                          background: itemBg, color: 'var(--texto-suave)',
                          border: `1px solid ${itemColor}25`,
                        }}>
                          <ItemIcon size={10} color={itemColor} strokeWidth={2} />
                          {item.cantidad > 1 ? `${item.cantidad}× ` : ''}{item.nombre}
                          <span style={{ color: itemColor, fontWeight: 700 }}>{COP(item.precio_unitario)}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {combos.length === 0 && (
            <p style={{ color: 'var(--texto-suave)', fontSize: 13, textAlign: 'center', padding: 40 }}>
              No hay combos. Crea el primero.
            </p>
          )}
        </div>
      )}

      {/* ── TAB PRECIOS ─────────────────────────────────────────────────── */}
      {tab === 'precios' && (() => {
        const todosRaw = [
          ...servicios.map(s => ({ ...s, tipo: 'servicio' as TipoItem })),
          ...productos.map(p => ({ ...p, tipo: 'producto' as TipoItem, duracion_min: undefined as any })),
          ...combos.map(c => ({ ...c, tipo: 'combo' as TipoItem, duracion_min: undefined as any, categoria: 'combo' })),
        ];
        const filtrados = todosRaw
          .filter(x => mostrarInactPrecios || x.activo)
          .filter(x => x.nombre.toLowerCase().includes(filtroPrecios.toLowerCase()))
          .filter(x => filtroCatPrecios === 'todos' || x.tipo === filtroCatPrecios)
          .sort((a, b) => {
            const mul = sortDir === 'asc' ? 1 : -1;
            if (sortPrecios === 'nombre') return mul * a.nombre.localeCompare(b.nombre, 'es');
            return mul * (a.precio_cop - b.precio_cop);
          });

        const numPendientes = Object.keys(preciosModificados).length;
        const hayPendientes = numPendientes > 0;

        const toggleSort = (key: SortKey) => {
          if (sortPrecios === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortPrecios(key); setSortDir('asc'); }
        };
        const SortIcon = ({ k }: { k: SortKey }) =>
          sortPrecios === k
            ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
            : <ArrowUpDown size={10} style={{ opacity: 0.4 }} />;

        return (
          <div>
            {/* ── Barra de filtros ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)', pointerEvents: 'none' }} />
                <input
                  placeholder="Buscar…"
                  value={filtroPrecios}
                  onChange={e => setFiltroPrecios(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
              <select value={filtroCatPrecios} onChange={e => setFiltroCatPrecios(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
                <option value="todos">Todos los tipos</option>
                <option value="servicio">Servicios</option>
                <option value="producto">Productos</option>
                <option value="combo">Combos</option>
              </select>
              <button type="button" onClick={() => setMostrarInactPrecios(v => !v)} style={btnSecundario}>
                {mostrarInactPrecios ? <ToggleRight size={14} color="var(--verde)" /> : <ToggleLeft size={14} />}
                Inactivos
              </button>
            </div>

            {/* ── Ajuste masivo por % ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', background: 'var(--superficie2)', border: '1px solid var(--borde)', borderRadius: 9, padding: '10px 14px' }}>
              <Percent size={14} style={{ color: 'var(--cobre)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--texto-suave)', flexShrink: 0 }}>Ajuste masivo:</span>
              <input
                type="number"
                placeholder="ej: 10 o -5"
                value={ajustePct}
                onChange={e => setAjustePct(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aplicarAjustePct()}
                style={{ ...inputSmall, width: 90, textAlign: 'right' }}
              />
              <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>%</span>
              <button type="button" onClick={aplicarAjustePct} disabled={!ajustePct} style={{ ...btnVerde, padding: '5px 14px', fontSize: 12, opacity: !ajustePct ? 0.5 : 1 }}>
                Aplicar a visibles
              </button>
              <span style={{ fontSize: 11, color: 'var(--texto-suave)', marginLeft: 4 }}>({filtrados.length} ítem{filtrados.length !== 1 ? 's' : ''})</span>
            </div>

            {/* ── Barra de acciones pendientes ── */}
            {hayPendientes && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, padding: '10px 14px', background: 'rgba(203,161,53,0.09)', border: '1px solid rgba(203,161,53,0.3)', borderRadius: 9 }}>
                <AlertCircle size={14} style={{ color: 'var(--cobre)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--cobre)', fontWeight: 600, flex: 1 }}>
                  {numPendientes} cambio{numPendientes !== 1 ? 's' : ''} pendiente{numPendientes !== 1 ? 's' : ''} de guardar
                </span>
                <button type="button" onClick={descartarTodosLosPrecios} style={{ ...btnSecundario, gap: 5 }}>
                  <RotateCcw size={12} /> Descartar
                </button>
                <button type="button" onClick={guardarTodosLosPrecios} disabled={guardando} style={{ ...btnVerde, padding: '6px 16px' }}>
                  <Check size={13} /> Guardar {numPendientes} cambio{numPendientes !== 1 ? 's' : ''}
                </button>
              </div>
            )}

            {/* ── Tabla ── */}
            <div style={{ border: '1px solid var(--borde)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Encabezado */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 180px 90px',
                padding: '10px 16px', background: 'var(--superficie2)',
                borderBottom: '1px solid var(--borde)',
                fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                <button type="button" onClick={() => toggleSort('nombre')} style={{ ...colHeaderBtn, justifyContent: 'flex-start' }}>
                  Nombre <SortIcon k="nombre" />
                </button>
                <span>Tipo</span>
                <button type="button" onClick={() => toggleSort('precio_cop')} style={{ ...colHeaderBtn, justifyContent: 'flex-end' }}>
                  Precio <SortIcon k="precio_cop" />
                </button>
                <span style={{ textAlign: 'center' }}>Acción</span>
              </div>

              {filtrados.length === 0 && (
                <p style={{ color: 'var(--texto-suave)', fontSize: 13, textAlign: 'center', padding: 40 }}>
                  No hay resultados.
                </p>
              )}

              {filtrados.map((item, idx) => {
                const modificado = preciosModificados[item.id] !== undefined;
                const guardandoEste = guardandoPrecios[item.id];
                const exitoEste = successPrecios[item.id];
                const valorInput = modificado ? preciosModificados[item.id] : String(item.precio_cop);
                const nuevoPrecio = modificado ? parseInt(preciosModificados[item.id].replace(/\D/g, ''), 10) : null;
                const pctCambio = nuevoPrecio !== null && item.precio_cop > 0
                  ? Math.round(((nuevoPrecio - item.precio_cop) / item.precio_cop) * 100)
                  : null;

                const tipoBadge = {
                  servicio: { bg: '#EDF0EA', icon: <Tag size={9} />, label: 'Servicio' },
                  producto: { bg: '#F0EAE0', icon: <Package size={9} />, label: 'Producto' },
                  combo:    { bg: '#EAE0F0', icon: <Layers size={9} />, label: 'Combo' },
                }[item.tipo];

                return (
                  <div key={item.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 180px 90px',
                    padding: '11px 16px', alignItems: 'center',
                    borderBottom: idx < filtrados.length - 1 ? '1px solid var(--borde)' : 'none',
                    background: exitoEste ? 'rgba(76,175,80,0.06)' : modificado ? 'rgba(203,161,53,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                    opacity: item.activo ? 1 : 0.55,
                  }}>
                    {/* Nombre + meta */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{item.nombre}</span>
                        {!item.activo && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: '0.07em', border: '1px solid var(--borde)', borderRadius: 4, padding: '1px 5px' }}>INACTIVO</span>
                        )}
                      </div>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--texto-suave)', marginTop: 1 }}>
                        {item.tipo === 'servicio' && item.duracion_min && <><Clock size={10} style={{ marginRight: 3 }} />{item.duracion_min} min · </>}
                        {item.categoria !== 'combo' ? item.categoria : ''}
                      </span>
                    </div>

                    {/* Tipo badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 600,
                      background: tipoBadge.bg, color: 'var(--texto-suave)', border: '1px solid var(--borde)',
                      width: 'fit-content',
                    }}>
                      {tipoBadge.icon}{tipoBadge.label}
                    </span>

                    {/* Input de precio + indicador de cambio */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {modificado && (
                          <span style={{ fontSize: 11, color: 'var(--texto-suave)', textDecoration: 'line-through' }}>
                            {COP(item.precio_cop)}
                          </span>
                        )}
                        <input
                          type="number"
                          min={0}
                          title={`Precio de ${item.nombre}`}
                          placeholder="0"
                          value={valorInput}
                          onChange={e => setPreciosModificados(prev => ({ ...prev, [item.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') guardarPrecioIndividual(item.id, item.tipo);
                            if (e.key === 'Escape') setPreciosModificados(prev => { const c = { ...prev }; delete c[item.id]; return c; });
                          }}
                          style={{
                            ...inputSmall, width: 88, textAlign: 'right', fontWeight: 700,
                            borderColor: exitoEste ? 'var(--verde)' : modificado ? 'var(--cobre)' : 'var(--borde)',
                          }}
                        />
                      </div>
                      {pctCambio !== null && !isNaN(pctCambio) && nuevoPrecio !== item.precio_cop && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: pctCambio >= 0 ? '#2A6034' : '#8B1A1A',
                          background: pctCambio >= 0 ? '#D0ECD4' : '#FAEAEA',
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          {pctCambio >= 0 ? '+' : ''}{pctCambio}%
                        </span>
                      )}
                    </div>

                    {/* Acción */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {exitoEste ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--verde)', fontWeight: 600 }}>
                          <Check size={13} /> OK
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => guardarPrecioIndividual(item.id, item.tipo)}
                          disabled={!modificado || !!guardandoEste}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                            border: 'none', cursor: modificado ? 'pointer' : 'default',
                            background: modificado ? 'var(--verde)' : 'var(--superficie2)',
                            color: modificado ? '#fff' : 'var(--texto-suave)',
                            opacity: guardandoEste ? 0.6 : 1, transition: 'all 0.15s',
                          }}
                        >
                          {guardandoEste ? '…' : <><Check size={12} /> Guardar</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 10 }}>
              Edita el precio en la fila y presiona <strong>Enter</strong> o <strong>Guardar</strong>. El indicador de % muestra la variación respecto al precio actual.
            </p>
          </div>
        );
      })()}

      {/* ── MODAL SERVICIO ──────────────────────────────────────────────────── */}
      {modalSvc && (
        <Modal titulo={modalSvc === 'nuevo' ? 'Nuevo servicio' : 'Editar servicio'} onClose={() => setModalSvc(null)}>
          <Campo label="Nombre">
            <input style={inputStyle} value={formSvc.nombre} onChange={e => setFormSvc(p => ({ ...p, nombre: e.target.value }))} />
          </Campo>
          <Campo label="Descripción (opcional)">
            <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={formSvc.descripcion} onChange={e => setFormSvc(p => ({ ...p, descripcion: e.target.value }))} />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Duración (min)">
              <input type="number" style={inputStyle} value={formSvc.duracion_min} onChange={e => setFormSvc(p => ({ ...p, duracion_min: +e.target.value }))} />
            </Campo>
            <Campo label="Precio (COP)">
              <input type="number" style={inputStyle} value={formSvc.precio_cop} onChange={e => setFormSvc(p => ({ ...p, precio_cop: +e.target.value }))} />
            </Campo>
          </div>
          <Campo label="Categoría">
            <select style={inputStyle} value={formSvc.categoria} onChange={e => setFormSvc(p => ({ ...p, categoria: e.target.value }))}>
              {CAT_SVC.map(c => <option key={c} value={c}>{CAT_SVC_LABEL[c] ?? c}</option>)}
            </select>
          </Campo>
          {errorMsg && <p style={errorStyle}>{errorMsg}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setModalSvc(null)} style={btnCancelar}>Cancelar</button>
            <button type="button" onClick={guardarSvc} disabled={guardando} style={{ ...btnVerde, flex: 2, justifyContent: 'center' }}>
              {guardando ? 'Guardando…' : modalSvc === 'nuevo' ? 'Crear servicio' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL PRODUCTO ─────────────────────────────────────────────────── */}
      {modalProd && (
        <Modal titulo={modalProd === 'nuevo' ? 'Nuevo producto' : 'Editar producto'} onClose={() => setModalProd(null)}>
          <Campo label="Nombre">
            <input style={inputStyle} value={formProd.nombre} onChange={e => setFormProd(p => ({ ...p, nombre: e.target.value }))} />
          </Campo>
          <Campo label="Descripción (opcional)">
            <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={formProd.descripcion} onChange={e => setFormProd(p => ({ ...p, descripcion: e.target.value }))} />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Precio (COP)">
              <input type="number" style={inputStyle} value={formProd.precio_cop} onChange={e => setFormProd(p => ({ ...p, precio_cop: +e.target.value }))} />
            </Campo>
            <Campo label="Categoría">
              <select style={inputStyle} value={formProd.categoria} onChange={e => setFormProd(p => ({ ...p, categoria: e.target.value }))}>
                {CAT_PROD.map(c => <option key={c} value={c}>{CAT_PROD_LABEL[c] ?? c}</option>)}
              </select>
            </Campo>
          </div>
          {errorMsg && <p style={errorStyle}>{errorMsg}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setModalProd(null)} style={btnCancelar}>Cancelar</button>
            <button type="button" onClick={guardarProd} disabled={guardando} style={{ ...btnVerde, flex: 2, justifyContent: 'center' }}>
              {guardando ? 'Guardando…' : modalProd === 'nuevo' ? 'Crear producto' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL COMBO ────────────────────────────────────────────────────── */}
      {modalCombo && (
        <Modal titulo={modalCombo === 'nuevo' ? 'Nuevo combo' : 'Editar combo'} onClose={() => setModalCombo(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Izquierda: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Campo label="Nombre del combo">
                <input style={inputStyle} value={formCombo.nombre} onChange={e => setFormCombo(p => ({ ...p, nombre: e.target.value }))} />
              </Campo>
              <Campo label="Descripción (opcional)">
                <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={formCombo.descripcion} onChange={e => setFormCombo(p => ({ ...p, descripcion: e.target.value }))} />
              </Campo>
              <Campo label="Precio final (COP)">
                <input type="number" style={inputStyle} value={formCombo.precio_cop}
                  onChange={e => setFormCombo(p => ({ ...p, precio_cop: +e.target.value }))} />
              </Campo>

              {/* Resumen de precio */}
              {itemsDraft.length > 0 && (
                <div style={{ background: 'var(--superficie2)', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--texto-suave)' }}>
                    <span>Suma de ítems:</span>
                    <span>{COP(subtotalDraft)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 700 }}>
                    <span style={{ color: 'var(--texto)' }}>Precio combo:</span>
                    <span style={{ color: 'var(--cobre)' }}>{COP(formCombo.precio_cop)}</span>
                  </div>
                  {subtotalDraft > formCombo.precio_cop && formCombo.precio_cop > 0 && (
                    <div style={{ marginTop: 6, padding: '4px 8px', background: '#D0ECD4', borderRadius: 6, color: '#2A6034', fontWeight: 700, fontSize: 11, textAlign: 'center' }}>
                      Ahorro: {COP(subtotalDraft - formCombo.precio_cop)} ({Math.round((subtotalDraft - formCombo.precio_cop) / subtotalDraft * 100)}%)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Derecha: constructor de ítems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cobre)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ítems del combo
              </p>

              {/* Agregar ítem */}
              <div style={{ display: 'flex', gap: 6 }}>
                <select style={{ ...inputStyle, flex: '0 0 100px' }} value={addTipo} onChange={e => { setAddTipo(e.target.value as any); setAddItemId(''); }}>
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                </select>
                <select style={{ ...inputStyle, flex: 1 }} value={addItemId} onChange={e => setAddItemId(e.target.value)}>
                  <option value="">— seleccionar —</option>
                  {(addTipo === 'servicio' ? servicios : productos).map(x => (
                    <option key={x.id} value={x.id}>{x.nombre} · {COP(x.precio_cop)}</option>
                  ))}
                </select>
                <button type="button" onClick={agregarItemDraft} disabled={!addItemId} style={{ ...btnVerde, padding: '6px 12px' }}>
                  <Plus size={14} />
                </button>
              </div>

              {/* Lista de ítems */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {itemsDraft.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--texto-suave)', textAlign: 'center', padding: '16px 0' }}>
                    Agrega servicios o productos al combo.
                  </p>
                )}
                {itemsDraft.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--superficie2)', borderRadius: 7, padding: '6px 10px',
                  }}>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--texto)' }}>
                      {item.tipo === 'servicio' ? <Tag size={10} style={{ marginRight: 4 }} /> : <Package size={10} style={{ marginRight: 4 }} />}
                      {nombreItem(item.tipo, item.item_id)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--cobre)', fontWeight: 600 }}>
                      {COP(precioItem(item.tipo, item.item_id))}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button type="button" onClick={() => setItemsDraft(p => p.map((x, i) => i === idx ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))} style={iconBtn}>−</button>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.cantidad}</span>
                      <button type="button" onClick={() => setItemsDraft(p => p.map((x, i) => i === idx ? { ...x, cantidad: x.cantidad + 1 } : x))} style={iconBtn}>+</button>
                    </div>
                    <button type="button" onClick={() => quitarItemDraft(idx)} style={{ ...iconBtn, color: 'var(--error)' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {errorMsg && <p style={{ ...errorStyle, marginTop: 12 }}>{errorMsg}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="button" onClick={() => setModalCombo(null)} style={btnCancelar}>Cancelar</button>
            <button type="button" onClick={guardarCombo} disabled={guardando} style={{ ...btnVerde, flex: 2, justifyContent: 'center' }}>
              {guardando ? 'Guardando…' : modalCombo === 'nuevo' ? 'Crear combo' : 'Guardar cambios'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── TOASTS ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: t.tipo === 'ok' ? '#1E3A22' : '#3A1E1E',
            border: `1px solid ${t.tipo === 'ok' ? '#2A6034' : '#6B2525'}`,
            color: t.tipo === 'ok' ? '#7EE49A' : '#F4A0A0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'fadeInUp 0.2s ease',
          }}>
            {t.tipo === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children, wide }: { titulo: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: 'var(--superficie)', border: '1px solid var(--borde)',
        borderRadius: 14, padding: '24px 28px',
        width: '100%', maxWidth: wide ? 720 : 440,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--blanco)' }}>{titulo}</h2>
          <button type="button" onClick={onClose} style={{ ...iconBtn, padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--texto-suave)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── estilos compartidos ──────────────────────────────────────────────────────
const btnVerde: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'var(--verde)', border: 'none', borderRadius: 8,
  padding: '8px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const btnSecundario: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', border: '1px solid var(--borde)',
  borderRadius: 7, padding: '6px 12px',
  color: 'var(--texto-suave)', fontSize: 12, cursor: 'pointer',
};
const btnCancelar: React.CSSProperties = {
  flex: 1, padding: '10px', borderRadius: 8,
  border: '1px solid var(--borde)', background: 'transparent',
  color: 'var(--texto-suave)', fontSize: 13, cursor: 'pointer',
};
const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none',
  padding: '3px', cursor: 'pointer',
  color: 'var(--texto-suave)', display: 'flex', alignItems: 'center',
  borderRadius: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'var(--superficie2)', border: '1px solid var(--borde)',
  borderRadius: 7, color: 'var(--texto)', fontSize: 13, outline: 'none',
};
const inputSmall: React.CSSProperties = {
  padding: '3px 8px', background: 'var(--superficie2)',
  border: '1px solid var(--verde)', borderRadius: 6,
  color: 'var(--texto)', fontSize: 13, outline: 'none',
};
const colHeaderBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)',
  textTransform: 'uppercase', letterSpacing: '0.07em', padding: 0,
};
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 7,
  background: '#FAEAEA', border: '1px solid #E8C0C0',
  color: 'var(--error)', fontSize: 12,
};

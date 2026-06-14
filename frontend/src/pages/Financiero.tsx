import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, CheckCircle,
  AlertCircle, ChevronDown, Plus, Pencil, Trash2, Download,
  BarChart2, Receipt, Banknote, X, Loader2, Printer, Lock,
  ArrowDownCircle, Wallet,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface BarberoFila {
  barbero_id: string; barbero_nombre: string; color_agenda: string;
  porcentaje_comision: number; total_citas: number; completadas: number;
  ingresos_brutos: number; comision_monto: number; neto_barberia: number;
}
interface ServicioFila {
  nombre: string; categoria: string; total: number; completadas: number; ingresos: number;
}
interface EvolucionFila { fecha: string; ingresos: number; citas: number; }
interface GastoCategoria { categoria: string; total: number; cantidad: number; }
interface Resumen {
  total_citas: number; completadas: number; no_shows: number; canceladas: number; pendientes: number;
  ingresos_brutos: number; ingresos_efectivo: number; ingresos_datafono: number; ingresos_mixto: number;
  comisiones_total: number; neto_barberia: number;
  total_gastos: number; rentabilidad: number; margen_pct: number;
  porBarbero: BarberoFila[]; porServicio: ServicioFila[];
  evolucion: EvolucionFila[]; gastosPorCategoria: GastoCategoria[];
}
interface Comision {
  id: string; monto_cop: number; porcentaje: number; estado: 'pendiente' | 'pagada';
  periodo: string; created_at: string; cita_id: string;
  barbero_nombre: string; color_agenda: string;
  cita_inicio: string; cita_precio: number; servicio_nombre: string;
}
interface Gasto {
  id: string; concepto: string; monto_cop: number; categoria: string;
  fecha: string; notas: string | null; created_at: string;
  creado_por_nombre: string | null;
}
interface MesFila {
  mes: string; ingresos: number; completadas: number; gastos: number; rentabilidad: number;
}
interface GastoDetalle { concepto: string; monto_cop: number; categoria: string; fecha: string; }
interface AdelantoBarbero { barbero_id: string; nombre: string; total_adelantos: number; }
interface CierreData extends Resumen {
  fecha_inicio: string; fecha_fin: string; tipo: string;
  total_adelantos: number; num_adelantos: number;
  efectivo_caja: number; balance_final: number;
  adelantosPorBarbero: AdelantoBarbero[];
  gastosDetalle: GastoDetalle[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

const fmtMes = (ym: string) => {
  const [y, m] = ym.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${meses[Number(m) - 1]} ${y}`;
};

function hoy()      { return new Date().toISOString().split('T')[0]; }
function inicioMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'rango';
type Tab     = 'dashboard' | 'desglose' | 'gastos' | 'comisiones' | 'cierre';

const CATEGORIAS = ['operativo','insumos','arriendo','nomina','marketing','mantenimiento','servicios','otros'];

const COLORES_CAT: Record<string, string> = {
  operativo: '#2A5080', insumos: '#D4921A', arriendo: '#4A7C8E',
  nomina: '#7A5A9E', marketing: '#C07840', mantenimiento: '#7A4040',
  servicios: '#1E3E68', otros: '#888',
};

// ─── componente principal ─────────────────────────────────────────────────────
export default function Financiero() {
  const rol = useAuthStore(s => s.usuario?.rol);
  const esAdmin = rol === 'admin';

  const [tab,        setTab]        = useState<Tab>('dashboard');
  const [periodo,    setPeriodo]    = useState<Periodo>('mes');
  const [rangoInicio,setRangoInicio]= useState(inicioMes());
  const [rangoFin,   setRangoFin]  = useState(hoy());

  const [resumen,    setResumen]    = useState<Resumen | null>(null);
  const [evMensual,  setEvMensual]  = useState<MesFila[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [gastos,     setGastos]     = useState<Gasto[]>([]);

  const [filtroEstado,    setFiltroEstado]    = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [seleccionados,   setSeleccionados]   = useState<Set<string>>(new Set());

  const [cargando,  setCargando]  = useState(false);
  const [pagando,   setPagando]   = useState(false);
  const [guardando, setGuardando] = useState(false);

  // cierre de caja
  const [tipoCierre,     setTipoCierre]     = useState<'diario' | 'mensual'>('diario');
  const [fechaCierre,    setFechaCierre]     = useState(hoy());
  const [mesCierre,      setMesCierre]       = useState(new Date().toISOString().slice(0, 7));
  const [cierreData,     setCierreData]      = useState<CierreData | null>(null);
  const [cargandoCierre, setCargandoCierre]  = useState(false);

  // Modal de gasto
  const [modalGasto, setModalGasto] = useState<Partial<Gasto> | null>(null);
  const [esEdicion,  setEsEdicion]  = useState(false);

  // ── fechas ────────────────────────────────────────────────────────────────
  const calcFechas = useCallback((): [string, string] => {
    const hoyStr = hoy();
    if (periodo === 'hoy')    return [hoyStr, hoyStr];
    if (periodo === 'semana') {
      const d   = new Date();
      const dia = d.getDay() || 7;
      const lunes   = new Date(d); lunes.setDate(d.getDate() - dia + 1);
      const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
      return [lunes.toISOString().split('T')[0], domingo.toISOString().split('T')[0]];
    }
    if (periodo === 'mes') return [inicioMes(), hoyStr];
    return [rangoInicio, rangoFin];
  }, [periodo, rangoInicio, rangoFin]);

  // ── carga datos ──────────────────────────────────────────────────────────
  const cargarResumen = useCallback(async () => {
    setCargando(true);
    try {
      const [fi, ff] = calcFechas();
      const data = await api.get<Resumen>(`/financiero/resumen?fecha_inicio=${fi}&fecha_fin=${ff}`);
      setResumen(data);
    } finally { setCargando(false); }
  }, [calcFechas]);

  const cargarEvMensual = useCallback(async () => {
    const data = await api.get<MesFila[]>('/financiero/evolucion/mensual?meses=6');
    setEvMensual(data);
  }, []);

  const cargarComisiones = useCallback(async () => {
    const q = filtroEstado ? `?estado=${filtroEstado}` : '';
    const data = await api.get<Comision[]>(`/financiero/comisiones${q}`);
    setComisiones(data);
    setSeleccionados(new Set());
  }, [filtroEstado]);

  const cargarGastos = useCallback(async () => {
    const [fi, ff] = calcFechas();
    const q = new URLSearchParams({ fecha_inicio: fi, fecha_fin: ff });
    if (filtroCategoria) q.set('categoria', filtroCategoria);
    const data = await api.get<Gasto[]>(`/financiero/gastos?${q}`);
    setGastos(data);
  }, [calcFechas, filtroCategoria]);

  useEffect(() => { cargarResumen(); cargarEvMensual(); }, [cargarResumen, cargarEvMensual]);
  useEffect(() => { if (tab === 'comisiones') cargarComisiones(); }, [tab, cargarComisiones]);
  useEffect(() => { if (tab === 'gastos')     cargarGastos(); },     [tab, cargarGastos]);

  // ── comisiones ────────────────────────────────────────────────────────────
  const toggleSeleccion = (id: string) =>
    setSeleccionados(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const seleccionarTodas = () => {
    const pendientes = comisiones.filter(c => c.estado === 'pendiente').map(c => c.id);
    setSeleccionados(prev => prev.size === pendientes.length ? new Set() : new Set(pendientes));
  };

  const pagarSeleccionadas = async () => {
    if (!seleccionados.size) return;
    setPagando(true);
    try {
      await api.patch('/financiero/comisiones/pagar', { ids: [...seleccionados] });
      await cargarComisiones();
      await cargarResumen();
    } finally { setPagando(false); }
  };

  // ── gastos CRUD ──────────────────────────────────────────────────────────
  const abrirNuevoGasto = () => {
    setModalGasto({ categoria: 'operativo', fecha: hoy(), monto_cop: 0, concepto: '' });
    setEsEdicion(false);
  };
  const abrirEditarGasto = (g: Gasto) => { setModalGasto({ ...g }); setEsEdicion(true); };
  const cerrarModal = () => setModalGasto(null);

  const guardarGasto = async () => {
    if (!modalGasto) return;
    setGuardando(true);
    try {
      if (esEdicion && modalGasto.id) {
        await api.patch(`/financiero/gastos/${modalGasto.id}`, modalGasto);
      } else {
        await api.post('/financiero/gastos', modalGasto);
      }
      cerrarModal();
      await cargarGastos();
      await cargarResumen();
    } catch (e: any) {
      alert(e.message || 'Error al guardar gasto');
    } finally { setGuardando(false); }
  };

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.delete(`/financiero/gastos/${id}`);
    await cargarGastos();
    await cargarResumen();
  };

  // ── cierre de caja ───────────────────────────────────────────────────────
  const generarCierre = async () => {
    setCargandoCierre(true); setCierreData(null);
    try {
      const params = tipoCierre === 'diario'
        ? `tipo=diario&fecha=${fechaCierre}`
        : `tipo=mensual&fecha=${mesCierre}`;
      const data = await api.get<CierreData>(`/financiero/cierre?${params}`);
      setCierreData(data);
    } finally { setCargandoCierre(false); }
  };

  const imprimirCierre = () => {
    if (!cierreData) return;
    const d = cierreData;
    const titulo = d.tipo === 'mensual'
      ? `Cierre Mensual — ${fmtMes(d.fecha_inicio.slice(0, 7))}`
      : `Cierre Diario — ${fmt(d.fecha_inicio)}`;
    const fila = (label: string, valor: number, negativo = false, negrita = false) =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 4px;color:#555;${negrita ? 'font-weight:700' : ''}">${label}</td>
        <td style="padding:6px 4px;text-align:right;${negrita ? 'font-weight:800;font-size:1.05em' : ''}color:${negativo && valor > 0 ? '#c0392b' : negrita ? '#1a2440' : '#333'}">${negativo && valor > 0 ? '-' : ''}${COP(valor)}</td>
      </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${titulo}</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:680px;margin:30px auto;color:#1a2440;font-size:14px}
        h1{font-size:20px;text-align:center;margin:0}
        h2{font-size:13px;text-align:center;color:#666;margin:4px 0 0;font-weight:400}
        h3{font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        .total td{font-weight:800;font-size:1.1em;background:#f8f5ef;border-top:2px solid #c8a84b;border-bottom:2px solid #c8a84b}
        .section{margin-bottom:16px}
        .resultado td{font-weight:800;font-size:1.2em;background:#e8f5e9;border-top:3px solid #2A7048;color:#1a3a1a}
        @media print{.no-print{display:none}}
      </style></head><body>
      <div style="text-align:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #D4921A">
        <h1>CIERRE DE CAJA</h1>
        <h2>Rústico Barber &amp; Concept Shop</h2>
        <p style="color:#888;font-size:12px;margin:6px 0 0">${titulo}</p>
      </div>
      <div class="section">
        <h3>Ingresos</h3>
        <table>
          ${fila('Citas completadas', d.completadas)}
          ${fila('Ticket promedio', d.completadas > 0 ? Math.round(d.ingresos_brutos / d.completadas) : 0)}
          ${fila('Total bruto', d.ingresos_brutos, false, true)}
        </table>
      </div>
      <div class="section">
        <h3>Descuentos de caja</h3>
        <table>
          ${fila('Comisiones barberos', d.comisiones_total, true)}
          ${d.total_adelantos > 0 ? fila(`Adelantos (${d.num_adelantos})`, d.total_adelantos, true) : ''}
        </table>
        <table style="margin-top:6px"><tr class="total">
          <td style="padding:8px 4px">Efectivo en caja</td>
          <td style="padding:8px 4px;text-align:right">${COP(d.efectivo_caja)}</td>
        </tr></table>
      </div>
      ${d.total_gastos > 0 ? `<div class="section"><h3>Gastos del período</h3><table>
        ${d.gastosDetalle.map(g => fila(`${g.concepto} (${g.categoria})`, g.monto_cop, true)).join('')}
        <tr class="total"><td style="padding:8px 4px">Total gastos</td><td style="padding:8px 4px;text-align:right;color:#c0392b">-${COP(d.total_gastos)}</td></tr>
      </table></div>` : ''}
      <table style="margin:20px 0"><tr class="resultado">
        <td style="padding:12px 4px">Resultado neto del período</td>
        <td style="padding:12px 4px;text-align:right">${COP(d.balance_final)}</td>
      </tr></table>
      <div class="section">
        <h3>Por barbero</h3>
        <table>
          <tr style="border-bottom:2px solid #ddd;font-weight:700;font-size:12px">
            <td style="padding:6px 4px">Barbero</td>
            <td style="padding:6px 4px;text-align:right">Ventas</td>
            <td style="padding:6px 4px;text-align:right">%</td>
            <td style="padding:6px 4px;text-align:right">Comisión</td>
            ${d.total_adelantos > 0 ? '<td style="padding:6px 4px;text-align:right">Adelantos</td>' : ''}
            <td style="padding:6px 4px;text-align:right">Neto bbría</td>
          </tr>
          ${d.porBarbero.map(b => {
            const adv = d.adelantosPorBarbero.find((a: AdelantoBarbero) => a.barbero_id === b.barbero_id);
            return `<tr style="border-bottom:1px solid #eee">
              <td style="padding:7px 4px;font-weight:600">${b.barbero_nombre}</td>
              <td style="padding:7px 4px;text-align:right">${COP(b.ingresos_brutos)}</td>
              <td style="padding:7px 4px;text-align:right;color:#888">${b.porcentaje_comision}%</td>
              <td style="padding:7px 4px;text-align:right;color:#c0392b">-${COP(b.comision_monto)}</td>
              ${d.total_adelantos > 0 ? `<td style="padding:7px 4px;text-align:right;color:#e67e22">${adv ? `-${COP(adv.total_adelantos)}` : '—'}</td>` : ''}
              <td style="padding:7px 4px;text-align:right;font-weight:700">${COP(b.neto_barberia)}</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
      <p style="text-align:center;color:#aaa;font-size:11px;margin-top:30px;border-top:1px solid #eee;padding-top:10px">
        Generado el ${new Date().toLocaleString('es-CO')} · Rústico Barber &amp; Concept Shop
      </p>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=780,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const exportarCSVCierre = () => {
    if (!cierreData) return;
    const d = cierreData;
    const rows = [
      [`CIERRE DE CAJA — ${d.tipo === 'mensual' ? fmtMes(d.fecha_inicio.slice(0,7)) : fmt(d.fecha_inicio)}`],
      ['Rústico Barber & Concept Shop'], [],
      ['INGRESOS'],
      ['Citas completadas', d.completadas],
      ['Ingresos brutos', d.ingresos_brutos], [],
      ['DESCUENTOS'],
      ['Comisiones barberos', -d.comisiones_total],
      ['Adelantos', -d.total_adelantos],
      ['Efectivo en caja', d.efectivo_caja], [],
      ['GASTOS', -d.total_gastos],
      ...d.gastosDetalle.map(g => [g.concepto, -g.monto_cop]),
      [],
      ['RESULTADO NETO', d.balance_final], [],
      ['POR BARBERO'],
      ['Barbero','Ventas','% Comisión','Comisión','Neto Barbería'],
      ...d.porBarbero.map(b => [b.barbero_nombre, b.ingresos_brutos, `${b.porcentaje_comision}%`, b.comision_monto, b.neto_barberia]),
    ];
    const csv  = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `rustico-cierre-${d.fecha_inicio}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── export CSV ────────────────────────────────────────────────────────────
  const exportarCSV = () => {
    if (!resumen) return;
    const [fi, ff] = calcFechas();
    const rows = [
      ['Período', `${fi} — ${ff}`],
      [],
      ['RESUMEN'],
      ['Ingresos brutos', resumen.ingresos_brutos],
      ['Comisiones barberos', resumen.comisiones_total],
      ['Neto barbería', resumen.neto_barberia],
      ['Gastos', resumen.total_gastos],
      ['Rentabilidad neta', resumen.rentabilidad],
      ['Margen (%)', `${resumen.margen_pct}%`],
      ['Citas completadas', resumen.completadas],
      ['Ticket promedio', resumen.completadas > 0 ? Math.round(resumen.ingresos_brutos / resumen.completadas) : 0],
      [],
      ['DESGLOSE POR BARBERO'],
      ['Barbero', 'Citas', 'Completadas', 'Ingresos', '% Comisión', 'Comisión', 'Neto'],
      ...resumen.porBarbero.map(b => [
        b.barbero_nombre, b.total_citas, b.completadas,
        b.ingresos_brutos, `${b.porcentaje_comision}%`, b.comision_monto, b.neto_barberia,
      ]),
      [],
      ['DESGLOSE POR SERVICIO'],
      ['Servicio', 'Categoría', 'Total', 'Completadas', 'Ingresos'],
      ...resumen.porServicio.map(s => [s.nombre, s.categoria, s.total, s.completadas, s.ingresos]),
    ];

    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `rustico-financiero-${fi}-${ff}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── gráfica barras evolucion mensual ─────────────────────────────────────
  const maxEv = evMensual.length
    ? Math.max(...evMensual.map(m => Math.max(m.ingresos, m.gastos)), 1)
    : 1;
  const maxDia = resumen?.evolucion?.length
    ? Math.max(...resumen.evolucion.map(e => e.ingresos), 1)
    : 1;

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1140, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--blanco)', marginBottom: 2 }}>Financiero</h1>
          <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Ingresos, gastos, comisiones y rentabilidad</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {esAdmin && (
            <button onClick={abrirNuevoGasto} style={btnVerde}>
              <Plus size={14} /> Gasto
            </button>
          )}
          <button onClick={exportarCSV} style={btnSecundario} title="Exportar CSV">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Selector período */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['hoy', 'semana', 'mes', 'rango'] as Periodo[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: '1px solid',
            borderColor: periodo === p ? 'var(--cobre)' : 'var(--borde)',
            background:  periodo === p ? 'rgba(184,152,112,0.12)' : 'transparent',
            color:       periodo === p ? 'var(--cobre)' : 'var(--texto-suave)',
          }}>
            {{ hoy: 'Hoy', semana: 'Semana', mes: 'Mes', rango: 'Rango' }[p]}
          </button>
        ))}
        {periodo === 'rango' && (
          <>
            <input type="date" value={rangoInicio} onChange={e => setRangoInicio(e.target.value)} style={inputSt} />
            <span style={{ color: 'var(--texto-suave)' }}>—</span>
            <input type="date" value={rangoFin}    onChange={e => setRangoFin(e.target.value)}    style={inputSt} />
            <button onClick={cargarResumen} style={btnVerde}>Aplicar</button>
          </>
        )}
        {cargando && <Loader2 size={14} style={{ color: 'var(--texto-suave)', animation: 'spin 1s linear infinite' }} />}
      </div>

      {/* KPI Cards */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KPICard icono={<DollarSign size={16} />} label="Ingresos brutos"
            valor={COP(resumen.ingresos_brutos)} color="var(--cobre)"
            sub={resumen.completadas > 0 ? `Ticket ${COP(Math.round(resumen.ingresos_brutos / resumen.completadas))}` : undefined} />
          <KPICard icono={<Users size={16} />} label="Comisiones"
            valor={COP(resumen.comisiones_total)} color="var(--pendiente)"
            sub={`${resumen.porBarbero.length} barbero${resumen.porBarbero.length !== 1 ? 's' : ''}`} />
          <KPICard icono={<TrendingUp size={16} />} label="Neto barbería"
            valor={COP(resumen.neto_barberia)} color="var(--exito)"
            sub={resumen.ingresos_brutos > 0 ? `${Math.round(resumen.neto_barberia / resumen.ingresos_brutos * 100)}% del bruto` : undefined} />
          <KPICard icono={<TrendingDown size={16} />} label="Gastos"
            valor={COP(resumen.total_gastos)} color="var(--error)"
            sub={`${resumen.gastosPorCategoria.length} categoría${resumen.gastosPorCategoria.length !== 1 ? 's' : ''}`} />
          <KPICard icono={<Banknote size={16} />} label="Rentabilidad neta"
            valor={COP(resumen.rentabilidad)} color={resumen.rentabilidad >= 0 ? 'var(--exito)' : 'var(--error)'}
            sub={`Margen ${resumen.margen_pct}%`} highlight={resumen.rentabilidad < 0} />
          <KPICard icono={<CheckCircle size={16} />} label="Citas completadas"
            valor={String(resumen.completadas)} color="var(--verde)"
            sub={`de ${resumen.total_citas} totales`} />

          {/* Desglose por método de pago — solo si hay ingresos */}
          {resumen.ingresos_brutos > 0 && (
            <>
              <KPICard icono={<span style={{ fontSize: 16 }}>💵</span>} label="Efectivo"
                valor={COP(resumen.ingresos_efectivo)} color="#2A7048"
                sub={resumen.ingresos_brutos > 0 ? `${Math.round(resumen.ingresos_efectivo / resumen.ingresos_brutos * 100)}% del total` : undefined} />
              <KPICard icono={<span style={{ fontSize: 16 }}>💳</span>} label="Datáfono"
                valor={COP(resumen.ingresos_datafono)} color="#2A5080"
                sub={resumen.ingresos_brutos > 0 ? `${Math.round(resumen.ingresos_datafono / resumen.ingresos_brutos * 100)}% del total` : undefined} />
              {resumen.ingresos_mixto > 0 && (
                <KPICard icono={<span style={{ fontSize: 16 }}>🔀</span>} label="Mixto"
                  valor={COP(resumen.ingresos_mixto)} color="#D4921A"
                  sub={`${Math.round(resumen.ingresos_mixto / resumen.ingresos_brutos * 100)}% del total`} />
              )}
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--borde)', marginBottom: 24 }}>
        {([
          { id: 'dashboard',  label: 'Dashboard',    icono: <BarChart2 size={13} /> },
          { id: 'desglose',   label: 'Desglose',     icono: <TrendingUp size={13} /> },
          { id: 'gastos',     label: 'Gastos',        icono: <Receipt size={13} /> },
          { id: 'comisiones', label: 'Comisiones',    icono: <Users size={13} /> },
          { id: 'cierre',     label: 'Cierre de Caja', icono: <Lock size={13} /> },
        ] as { id: Tab; label: string; icono: React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '10px 18px', fontSize: 13, fontWeight: 600,
            background: 'transparent', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--cobre)' : '2px solid transparent',
            color: tab === t.id ? 'var(--cobre)' : 'var(--texto-suave)',
            marginBottom: -1,
          }}>
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB DASHBOARD ───────────────────────────────────────────────────── */}
      {tab === 'dashboard' && resumen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Evolución diaria de ingresos */}
          {resumen.evolucion.length > 1 && (
            <div style={card}>
              <h3 style={cardTitle}>Ingresos diarios — período seleccionado</h3>
              <GraficaBarras
                datos={resumen.evolucion.map(e => ({
                  label: e.fecha.slice(8),
                  valor: e.ingresos,
                  tooltip: `${e.fecha}: ${COP(e.ingresos)} · ${e.citas} cita${e.citas !== 1 ? 's' : ''}`,
                }))}
                max={maxDia}
                color="var(--verde)"
                altura={90}
              />
            </div>
          )}

          {/* Evolución mensual comparativa */}
          {evMensual.length > 0 && (
            <div style={card}>
              <h3 style={cardTitle}>Evolución mensual — últimos 6 meses</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110, paddingTop: 8, overflowX: 'auto' }}>
                {evMensual.map(m => (
                  <div key={m.mes} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 2, minWidth: 60 }}>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
                      <BarraSimple valor={m.ingresos}     max={maxEv} color="var(--verde)"  titulo={`Ingresos: ${COP(m.ingresos)}`}    h={80} />
                      <BarraSimple valor={m.gastos}        max={maxEv} color="var(--error)"  titulo={`Gastos: ${COP(m.gastos)}`}          h={80} />
                      <BarraSimple valor={Math.max(m.rentabilidad, 0)} max={maxEv} color="var(--cobre)" titulo={`Rentab: ${COP(m.rentabilidad)}`} h={80} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>{fmtMes(m.mes)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <Leyenda color="var(--verde)"  label="Ingresos" />
                <Leyenda color="var(--error)"  label="Gastos" />
                <Leyenda color="var(--cobre)"  label="Rentabilidad" />
              </div>
            </div>
          )}

          {/* Gastos por categoría */}
          {resumen.gastosPorCategoria.length > 0 && (
            <div style={card}>
              <h3 style={cardTitle}>Gastos por categoría</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {resumen.gastosPorCategoria.map(g => {
                  const pct = resumen.total_gastos > 0 ? Math.round(g.total / resumen.total_gastos * 100) : 0;
                  return (
                    <div key={g.categoria}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORES_CAT[g.categoria] || '#888', display: 'inline-block' }} />
                          <span style={{ textTransform: 'capitalize', color: 'var(--texto)' }}>{g.categoria}</span>
                          <span style={{ color: 'var(--texto-suave)' }}>({g.cantidad})</span>
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--error)' }}>{COP(g.total)} <span style={{ color: 'var(--texto-suave)', fontWeight: 400 }}>{pct}%</span></span>
                      </div>
                      <div style={{ background: 'var(--superficie2)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: COLORES_CAT[g.categoria] || '#888', height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            <MiniStat label="No shows"     valor={String(resumen.no_shows)}   color="var(--advertencia)" />
            <MiniStat label="Canceladas"   valor={String(resumen.canceladas)} color="var(--error)" />
            <MiniStat label="Pendientes"   valor={String(resumen.pendientes)} color="var(--pendiente)" />
            <MiniStat label="Ticket prom." valor={resumen.completadas > 0 ? COP(Math.round(resumen.ingresos_brutos / resumen.completadas)) : '—'} color="var(--cobre)" />
          </div>
        </div>
      )}

      {/* ── TAB DESGLOSE ────────────────────────────────────────────────────── */}
      {tab === 'desglose' && resumen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Por barbero */}
          <div style={card}>
            <h3 style={cardTitle}>Desglose por barbero</h3>
            {resumen.porBarbero.length === 0
              ? <Empty texto="Sin citas en este período" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tablaSt}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--borde)' }}>
                        {['Barbero','Citas','Completadas','Ingresos','% Com.','Comisión','Neto'].map(h => (
                          <th key={h} style={{ ...thSt, textAlign: h === 'Barbero' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.porBarbero.map(b => (
                        <tr key={b.barbero_id} style={{ borderBottom: '1px solid var(--borde)' }}>
                          <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Dot color={b.color_agenda} />
                            <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{b.barbero_nombre}</span>
                          </td>
                          <td style={tdR}>{b.total_citas}</td>
                          <td style={tdR}>{b.completadas}</td>
                          <td style={{ ...tdR, color: 'var(--cobre)', fontWeight: 600 }}>{COP(b.ingresos_brutos)}</td>
                          <td style={{ ...tdR, color: 'var(--texto-suave)' }}>{b.porcentaje_comision}%</td>
                          <td style={{ ...tdR, color: 'var(--advertencia)' }}>{COP(b.comision_monto)}</td>
                          <td style={{ ...tdR, color: 'var(--exito)', fontWeight: 600 }}>{COP(b.neto_barberia)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {resumen.porBarbero.length > 1 && (
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--borde)', background: 'var(--superficie2)' }}>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--texto-suave)' }}>TOTAL</td>
                          <td style={tdR}>{resumen.total_citas}</td>
                          <td style={tdR}>{resumen.completadas}</td>
                          <td style={{ ...tdR, color: 'var(--cobre)', fontWeight: 700 }}>{COP(resumen.ingresos_brutos)}</td>
                          <td style={tdR} />
                          <td style={{ ...tdR, color: 'var(--advertencia)', fontWeight: 700 }}>{COP(resumen.comisiones_total)}</td>
                          <td style={{ ...tdR, color: 'var(--exito)', fontWeight: 700 }}>{COP(resumen.neto_barberia)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
          </div>

          {/* Por servicio */}
          <div style={card}>
            <h3 style={cardTitle}>Desglose por servicio</h3>
            {resumen.porServicio.length === 0
              ? <Empty texto="Sin servicios en este período" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tablaSt}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--borde)' }}>
                        {['Servicio','Categoría','Total','Completadas','Ingresos','% del total'].map(h => (
                          <th key={h} style={{ ...thSt, textAlign: h === 'Servicio' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.porServicio.map((s, i) => {
                        const pct = resumen.ingresos_brutos > 0 ? Math.round(s.ingresos / resumen.ingresos_brutos * 100) : 0;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--borde)' }}>
                            <td style={{ padding: '10px', color: 'var(--texto)', fontWeight: 500 }}>{s.nombre}</td>
                            <td style={{ ...tdR }}>
                              <span className={`badge badge-${s.categoria === 'combo' ? 'vip' : s.categoria === 'barba' ? 'confirmada' : 'nuevo'}`}>
                                {s.categoria}
                              </span>
                            </td>
                            <td style={tdR}>{s.total}</td>
                            <td style={tdR}>{s.completadas}</td>
                            <td style={{ ...tdR, color: 'var(--cobre)', fontWeight: 600 }}>{COP(s.ingresos)}</td>
                            <td style={{ ...tdR, color: 'var(--texto-suave)' }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── TAB GASTOS ──────────────────────────────────────────────────────── */}
      {tab === 'gastos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Controles */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SelectFiltro
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              opciones={[{ value: '', label: 'Todas las categorías' }, ...CATEGORIAS.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
            />
            {esAdmin && (
              <button onClick={abrirNuevoGasto} style={btnVerde}>
                <Plus size={13} /> Nuevo gasto
              </button>
            )}
            {resumen && (
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--error)', fontWeight: 600 }}>
                Total: {COP(gastos.reduce((s, g) => s + g.monto_cop, 0))}
              </span>
            )}
          </div>

          <div style={card}>
            {gastos.length === 0
              ? <Empty texto="Sin gastos en este período" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tablaSt}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--borde)' }}>
                        {['Concepto','Categoría','Fecha','Monto','Notas','Registrado por',''].map((h, i) => (
                          <th key={i} style={{ ...thSt, textAlign: h === 'Monto' ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map(g => (
                        <tr key={g.id} style={{ borderBottom: '1px solid var(--borde)' }}>
                          <td style={{ padding: '10px', color: 'var(--texto)', fontWeight: 500 }}>{g.concepto}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 11, padding: '2px 8px', borderRadius: 99,
                              background: `${COLORES_CAT[g.categoria] ?? '#888'}22`,
                              color: COLORES_CAT[g.categoria] ?? '#888',
                              fontWeight: 600, textTransform: 'capitalize',
                            }}>
                              {g.categoria}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>{fmt(g.fecha)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--error)', fontWeight: 600 }}>{COP(g.monto_cop)}</td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.notas || '—'}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)' }}>{g.creado_por_nombre || '—'}</td>
                          {esAdmin && (
                            <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                              <button onClick={() => abrirEditarGasto(g)} style={btnIcono} title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => eliminarGasto(g.id)} style={{ ...btnIcono, color: 'var(--error)' }} title="Eliminar">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {/* ── TAB COMISIONES ──────────────────────────────────────────────────── */}
      {tab === 'comisiones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <SelectFiltro
              value={filtroEstado}
              onChange={setFiltroEstado}
              opciones={[
                { value: '', label: 'Todos los estados' },
                { value: 'pendiente', label: 'Pendientes' },
                { value: 'pagada', label: 'Pagadas' },
              ]}
            />
            {esAdmin && (
              <>
                <button onClick={seleccionarTodas} style={btnSecundario}>
                  {seleccionados.size > 0 ? 'Deseleccionar' : 'Seleccionar pendientes'}
                </button>
                {seleccionados.size > 0 && (
                  <button onClick={pagarSeleccionadas} disabled={pagando} style={btnVerde}>
                    {pagando ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Marcar {seleccionados.size} como pagada{seleccionados.size !== 1 ? 's' : ''}
                  </button>
                )}
              </>
            )}
          </div>

          <div style={card}>
            {comisiones.length === 0
              ? <Empty texto="Sin comisiones con este filtro" />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tablaSt}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--borde)' }}>
                        {esAdmin && <th style={{ padding: '8px 10px', width: 32 }} />}
                        {['Barbero','Servicio','Fecha cita','Precio','% Com.','Monto','Estado','Período'].map(h => (
                          <th key={h} style={{ ...thSt, textAlign: ['Precio','Monto'].includes(h) ? 'right' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comisiones.map(c => (
                        <tr key={c.id} style={{
                          borderBottom: '1px solid var(--borde)',
                          background: seleccionados.has(c.id) ? 'rgba(43,87,65,0.1)' : 'transparent',
                        }}>
                          {esAdmin && (
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              {c.estado === 'pendiente' && (
                                <input type="checkbox" checked={seleccionados.has(c.id)}
                                  onChange={() => toggleSeleccion(c.id)}
                                  style={{ accentColor: 'var(--verde)', cursor: 'pointer' }} />
                              )}
                            </td>
                          )}
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Dot color={c.color_agenda} size={8} />
                              <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{c.barbero_nombre}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)' }}>{c.servicio_nombre}</td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>
                            {fmt(c.cita_inicio)} {fmtHora(c.cita_inicio)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--texto)' }}>{COP(c.cita_precio)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--texto-suave)' }}>{c.porcentaje}%</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: 'var(--advertencia)', fontWeight: 600 }}>{COP(c.monto_cop)}</td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge badge-${c.estado === 'pagada' ? 'completada' : 'pendiente'}`}>{c.estado}</span>
                          </td>
                          <td style={{ padding: '10px', color: 'var(--texto-suave)' }}>{c.periodo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {comisiones.filter(c => c.estado === 'pendiente').length > 0 && (
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={15} color="var(--advertencia)" />
              <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                Total pendiente:
                <strong style={{ color: 'var(--advertencia)', marginLeft: 6 }}>
                  {COP(comisiones.filter(c => c.estado === 'pendiente').reduce((s, c) => s + c.monto_cop, 0))}
                </strong>
                {' '}— {comisiones.filter(c => c.estado === 'pendiente').length} comisiones
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CIERRE DE CAJA ──────────────────────────────────────────────── */}
      {tab === 'cierre' && (
        <div style={{ maxWidth: 780 }}>

          {/* Controles */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20, padding: '14px 18px', background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10 }}>
            {/* Tipo */}
            <div style={{ display: 'flex', border: '1px solid var(--borde)', borderRadius: 7, overflow: 'hidden' }}>
              {(['diario', 'mensual'] as const).map(t => (
                <button key={t} onClick={() => { setTipoCierre(t); setCierreData(null); }} style={{
                  padding: '7px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: tipoCierre === t ? 'var(--verde)' : 'transparent',
                  color: tipoCierre === t ? '#fff' : 'var(--texto-suave)',
                }}>
                  {t === 'diario' ? 'Diario' : 'Mensual'}
                </button>
              ))}
            </div>

            {/* Selector de fecha */}
            {tipoCierre === 'diario'
              ? <input type="date" title="Fecha del cierre" value={fechaCierre} max={hoy()} onChange={e => { setFechaCierre(e.target.value); setCierreData(null); }} style={inputSt} />
              : <input type="month" title="Mes del cierre" value={mesCierre} max={new Date().toISOString().slice(0,7)} onChange={e => { setMesCierre(e.target.value); setCierreData(null); }} style={inputSt} />
            }

            <button onClick={generarCierre} disabled={cargandoCierre} style={btnVerde}>
              {cargandoCierre
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Lock size={13} />
              }
              Generar cierre
            </button>
          </div>

          {/* Documento de cierre */}
          {cierreData && (() => {
            const d = cierreData;
            const tituloFecha = d.tipo === 'mensual'
              ? fmtMes(d.fecha_inicio.slice(0, 7))
              : new Date(d.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            const Fila = ({ label, valor, negativo = false, negrita = false, muted = false }: { label: string; valor: number; negativo?: boolean; negrita?: boolean; muted?: boolean }) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--borde)' }}>
                <span style={{ fontSize: 13, color: muted ? 'var(--texto-suave)' : 'var(--texto)', fontWeight: negrita ? 700 : 400 }}>{label}</span>
                <span style={{ fontSize: negrita ? 15 : 13, fontWeight: negrita ? 800 : 600, color: negativo && valor > 0 ? 'var(--error)' : negrita ? 'var(--blanco)' : 'var(--texto)' }}>
                  {negativo && valor > 0 ? '−' : ''}{COP(valor)}
                </span>
              </div>
            );

            const SeccionTitulo = ({ label, icono }: { label: string; icono: React.ReactNode }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '20px 0 8px', paddingBottom: 6, borderBottom: '2px solid var(--borde)' }}>
                {icono}
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              </div>
            );

            return (
              <div>
                {/* Cabecera del documento */}
                <div style={{ textAlign: 'center', padding: '20px', background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: '10px 10px 0 0', borderBottom: '2px solid var(--cobre)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cobre)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Cierre de Caja {d.tipo === 'mensual' ? 'Mensual' : 'Diario'}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blanco)' }}>Rústico Barber &amp; Concept Shop</div>
                  <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 4, textTransform: 'capitalize' }}>{tituloFecha}</div>
                </div>

                {/* Cuerpo del documento */}
                <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '16px 24px 24px' }}>

                  {/* INGRESOS */}
                  <SeccionTitulo label="Ingresos" icono={<TrendingUp size={14} color="var(--verde)" />} />
                  <Fila label={`Citas completadas: ${d.completadas}`} valor={d.ingresos_brutos} negrita muted={d.completadas === 0} />
                  {d.completadas > 0 && <Fila label="Ticket promedio" valor={Math.round(d.ingresos_brutos / d.completadas)} muted />}

                  {/* Desglose por método de pago */}
                  {d.ingresos_brutos > 0 && (
                    <div style={{ display: 'flex', gap: 8, margin: '10px 0 4px', flexWrap: 'wrap' }}>
                      {d.ingresos_efectivo > 0 && (
                        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, background: 'rgba(42,112,72,0.08)', border: '1px solid rgba(42,112,72,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 2 }}>💵 Efectivo</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#2A7048' }}>{COP(d.ingresos_efectivo)}</div>
                          <div style={{ fontSize: 10, color: 'var(--texto-suave)' }}>{Math.round(d.ingresos_efectivo / d.ingresos_brutos * 100)}%</div>
                        </div>
                      )}
                      {d.ingresos_datafono > 0 && (
                        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, background: 'rgba(42,80,128,0.08)', border: '1px solid rgba(42,80,128,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 2 }}>💳 Datáfono</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#2A5080' }}>{COP(d.ingresos_datafono)}</div>
                          <div style={{ fontSize: 10, color: 'var(--texto-suave)' }}>{Math.round(d.ingresos_datafono / d.ingresos_brutos * 100)}%</div>
                        </div>
                      )}
                      {d.ingresos_mixto > 0 && (
                        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, background: 'rgba(212,146,26,0.08)', border: '1px solid rgba(212,146,26,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 2 }}>🔀 Mixto</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#D4921A' }}>{COP(d.ingresos_mixto)}</div>
                          <div style={{ fontSize: 10, color: 'var(--texto-suave)' }}>{Math.round(d.ingresos_mixto / d.ingresos_brutos * 100)}%</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DESCUENTOS */}
                  <SeccionTitulo label="Descuentos de caja" icono={<ArrowDownCircle size={14} color="var(--error)" />} />
                  <Fila label="Comisiones barberos" valor={d.comisiones_total} negativo />
                  {d.total_adelantos > 0 && <Fila label={`Adelantos (${d.num_adelantos})`} valor={d.total_adelantos} negativo />}

                  {/* EFECTIVO EN CAJA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0', padding: '12px 16px', background: d.efectivo_caja >= 0 ? 'rgba(42,112,72,0.08)' : 'rgba(170,40,40,0.08)', border: `1px solid ${d.efectivo_caja >= 0 ? 'rgba(42,112,72,0.25)' : 'rgba(170,40,40,0.25)'}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>
                      <Wallet size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Efectivo en caja
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: d.efectivo_caja >= 0 ? '#2A7048' : 'var(--error)' }}>{COP(d.efectivo_caja)}</span>
                  </div>

                  {/* GASTOS */}
                  {d.total_gastos > 0 && (
                    <>
                      <SeccionTitulo label="Gastos del período" icono={<TrendingDown size={14} color="var(--error)" />} />
                      {d.gastosDetalle.map((g, i) => (
                        <Fila key={i} label={`${g.concepto}  ·  ${g.categoria}`} valor={g.monto_cop} negativo muted />
                      ))}
                      <Fila label="Total gastos" valor={d.total_gastos} negativo negrita />
                    </>
                  )}

                  {/* RESULTADO FINAL */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px', padding: '16px 20px', background: d.balance_final >= 0 ? 'rgba(42,112,72,0.1)' : 'rgba(170,40,40,0.1)', border: `2px solid ${d.balance_final >= 0 ? '#2A7048' : 'var(--error)'}`, borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Resultado neto del período</div>
                      <div style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Efectivo − Gastos</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: d.balance_final >= 0 ? '#2A7048' : 'var(--error)' }}>{COP(d.balance_final)}</div>
                  </div>

                  {/* POR BARBERO */}
                  {d.porBarbero.length > 0 && (
                    <>
                      <SeccionTitulo label="Desglose por barbero" icono={<Users size={14} color="var(--cobre)" />} />
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ ...tablaSt, fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--borde)' }}>
                              {['Barbero', 'Ventas', '%', 'Comisión', ...(d.total_adelantos > 0 ? ['Adelantos'] : []), 'Neto Bbría'].map(h => (
                                <th key={h} style={{ ...thSt, textAlign: ['Ventas','Comisión','Adelantos','Neto Bbría'].includes(h) ? 'right' : 'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {d.porBarbero.map(b => {
                              const adv = d.adelantosPorBarbero.find(a => a.barbero_id === b.barbero_id);
                              return (
                                <tr key={b.barbero_id} style={{ borderBottom: '1px solid var(--borde)' }}>
                                  <td style={{ padding: '9px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <Dot color={b.color_agenda} size={8} />
                                      <span style={{ fontWeight: 600, color: 'var(--texto)' }}>{b.barbero_nombre}</span>
                                    </div>
                                  </td>
                                  <td style={tdR}>{COP(b.ingresos_brutos)}</td>
                                  <td style={{ ...tdR, color: 'var(--texto-suave)' }}>{b.porcentaje_comision}%</td>
                                  <td style={{ ...tdR, color: 'var(--error)' }}>−{COP(b.comision_monto)}</td>
                                  {d.total_adelantos > 0 && <td style={{ ...tdR, color: 'var(--advertencia)' }}>{adv ? `−${COP(adv.total_adelantos)}` : '—'}</td>}
                                  <td style={{ ...tdR, fontWeight: 700 }}>{COP(b.neto_barberia)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={exportarCSVCierre} style={btnSecundario}>
                      <Download size={13} /> Exportar CSV
                    </button>
                    <button onClick={imprimirCierre} style={btnVerde}>
                      <Printer size={13} /> Imprimir
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {!cierreData && !cargandoCierre && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--texto-suave)', fontSize: 13 }}>
              <Lock size={28} style={{ color: 'var(--borde)', marginBottom: 12 }} />
              <p>Selecciona el período y presiona <strong>Generar cierre</strong></p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL GASTO ─────────────────────────────────────────────────────── */}
      {modalGasto !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={cerrarModal}>
          <div style={{
            background: 'var(--superficie)', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--blanco)' }}>
                {esEdicion ? 'Editar gasto' : 'Nuevo gasto'}
              </h2>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', color: 'var(--texto-suave)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Concepto *">
                <input type="text" value={modalGasto.concepto ?? ''} placeholder="Ej: Compra de cuchillas"
                  onChange={e => setModalGasto(p => ({ ...p, concepto: e.target.value }))}
                  style={{ ...inputSt, width: '100%' }} />
              </Campo>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Monto (COP) *">
                  <input type="number" min={1} value={modalGasto.monto_cop ?? ''}
                    onChange={e => setModalGasto(p => ({ ...p, monto_cop: Number(e.target.value) }))}
                    style={{ ...inputSt, width: '100%' }} />
                </Campo>
                <Campo label="Fecha *">
                  <input type="date" value={modalGasto.fecha ?? hoy()}
                    onChange={e => setModalGasto(p => ({ ...p, fecha: e.target.value }))}
                    style={{ ...inputSt, width: '100%' }} />
                </Campo>
              </div>

              <Campo label="Categoría">
                <select value={modalGasto.categoria ?? 'operativo'}
                  onChange={e => setModalGasto(p => ({ ...p, categoria: e.target.value }))}
                  style={{ ...inputSt, width: '100%' }}>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </Campo>

              <Campo label="Notas">
                <textarea value={modalGasto.notas ?? ''} rows={2} placeholder="Descripción adicional..."
                  onChange={e => setModalGasto(p => ({ ...p, notas: e.target.value }))}
                  style={{ ...inputSt, width: '100%', resize: 'vertical' }} />
              </Campo>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={cerrarModal} style={btnSecundario}>Cancelar</button>
              <button onClick={guardarGasto} disabled={guardando} style={btnVerde}>
                {guardando ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {esEdicion ? 'Guardar cambios' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────
function KPICard({ icono, label, valor, sub, color, highlight }: {
  icono: React.ReactNode; label: string; valor: string;
  sub?: string; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--superficie)', border: `1px solid ${highlight ? 'var(--error)' : 'var(--borde)'}`,
      borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ color, opacity: 0.85 }}>{icono}</div>
        <span style={{ fontSize: 11, color: 'var(--texto-suave)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: highlight ? 'var(--error)' : 'var(--blanco)', letterSpacing: '-0.02em' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniStat({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div style={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{valor}</div>
    </div>
  );
}

function GraficaBarras({ datos, max, color, altura }: {
  datos: { label: string; valor: number; tooltip: string }[];
  max: number; color: string; altura: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: altura, paddingTop: 8, overflowX: 'auto' }}>
      {datos.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3, minWidth: 18 }}>
          <div title={d.tooltip} style={{
            width: '100%', background: color, borderRadius: '3px 3px 0 0',
            height: d.valor > 0 ? `${Math.max(4, Math.round(d.valor / max * (altura - 20)))}px` : '2px',
            opacity: d.valor > 0 ? 1 : 0.25, transition: 'height 0.3s',
          }} />
          <span style={{ fontSize: 9, color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function BarraSimple({ valor, max, color, titulo, h }: {
  valor: number; max: number; color: string; titulo: string; h: number;
}) {
  const px = valor > 0 ? Math.max(3, Math.round(valor / max * h)) : 2;
  return (
    <div title={titulo} style={{
      width: 10, background: color, borderRadius: '2px 2px 0 0',
      height: `${px}px`, opacity: valor > 0 ? 0.85 : 0.2, alignSelf: 'flex-end',
    }} />
  );
}

function Leyenda({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--texto-suave)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </div>
  );
}

function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function Empty({ texto }: { texto: string }) {
  return <p style={{ color: 'var(--texto-suave)', fontSize: 13, padding: 8 }}>{texto}</p>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function SelectFiltro({ value, onChange, opciones }: {
  value: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputSt, paddingRight: 28, appearance: 'none' }}>
        {opciones.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)', pointerEvents: 'none' }} />
    </div>
  );
}

// ─── estilos ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10, padding: 16,
};
const cardTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--texto)', marginBottom: 14, letterSpacing: '0.02em',
};
const tablaSt: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thSt: React.CSSProperties = {
  padding: '8px 10px', color: 'var(--texto-suave)', fontWeight: 600, whiteSpace: 'nowrap',
};
const tdR: React.CSSProperties = { padding: '10px', textAlign: 'right', color: 'var(--texto)' };
const inputSt: React.CSSProperties = {
  background: 'var(--superficie2)', border: '1px solid var(--borde)',
  borderRadius: 6, color: 'var(--texto)', padding: '7px 10px', fontSize: 13,
};
const btnVerde: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'var(--verde)', color: '#fff', border: 'none',
  borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecundario: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'transparent', color: 'var(--texto-suave)',
  border: '1px solid var(--borde)', borderRadius: 6,
  padding: '6px 12px', fontSize: 13, cursor: 'pointer',
};
const btnIcono: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--texto-suave)',
  cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
};

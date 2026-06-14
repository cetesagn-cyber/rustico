import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Users, Scissors, Clock, TrendingUp, TrendingDown,
  Award, Lightbulb, Download, AlertTriangle, CheckCircle2,
  Info, Zap, Loader2, RefreshCw, Star,
} from 'lucide-react';
import { api } from '../api/client';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
  BarChart as ReBarChart, LineChart, Line,
} from 'recharts';

// ─── tipos ────────────────────────────────────────────────────────────────────
interface MesFila {
  mes: string; total_citas: number; completadas: number;
  no_shows: number; canceladas: number; ingresos: number;
  ticket_promedio: number; clientes_unicos: number;
}
interface BarberoStats {
  barbero_id: string; barbero_nombre: string; color_agenda: string;
  porcentaje_comision: number; total_citas: number; completadas: number;
  no_shows: number; canceladas: number; ingresos: number;
  ticket_promedio: number; tasa_completacion: number;
  tasa_no_show: number; tasa_cancelacion: number; clientes_atendidos: number;
}
interface EvBarberoFila {
  mes: string; barbero_nombre: string; color_agenda: string;
  ingresos: number; completadas: number;
}
interface HoraFila    { hora: number; total: number; completadas: number; }
interface DiaFila     { dia: number;  total: number; completadas: number; ingresos: number; }
interface ServFila    { nombre: string; categoria: string; total_citas: number; completadas: number; ingresos: number; precio_promedio: number; tasa_completacion: number; }
interface SegFila     { segmento: string; total: number; }
interface ClienteFila { id: string; nombre: string; segmento: string; total_visitas: number; citas_periodo: number; gasto_periodo: number; ticket_promedio: number; ultima_visita: string; barbero_favorito: string | null; }
interface RetencionFila { mes: string; clientes_activos: number; nuevos: number; retornando: number; }
interface NuevosMes   { mes: string; nuevos: number; }
interface Insight     { tipo: 'info' | 'warn' | 'success' | 'alert'; texto: string; }
interface KPIs {
  mesCurr: any; mesAnt: any;
  deltas: { ingresos: number; completadas: number; ticket_promedio: number };
  prom_citas_dia: number;
  mejor_dia: { dia: string; total: number } | null;
  mejor_hora: { hora: number; total: number } | null;
  servicio_estrella: { nombre: string; total: number } | null;
  comisiones_pendientes: { cantidad: number; monto: number };
  total_clientes: number; clientes_nuevos: number; clientes_retornando: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const DIAS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_ES: Record<string,string> = {
  '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
  '07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic',
};
function labelMes(ym: string) { const [,m] = ym.split('-'); return MESES_ES[m] ?? ym; }
function pct(v: number, max: number) { return max > 0 ? Math.max(2, Math.round(v / max * 100)) : 2; }

type Periodo = '1' | '3' | '6' | '12';
type Tab = 'resumen' | 'tendencia' | 'equipo' | 'negocio';

// Paleta coherente con el proyecto
const VERDE   = '#2A5080';
const COBRE   = '#D4921A';
const ERROR   = '#AA2828';
const PEND    = '#2A5080';
const SUP2    = '#EAECF2';
const BORDE   = '#C2CAD8';
const TSSUAVE = '#4A5878';

const SEG_COLOR: Record<string,string> = {
  vip:'#9A6018', frecuente:'#1A7840', nuevo:'#28587A',
  en_riesgo:'#946010', inactivo:'#888',
};

const ttpSt = {
  background:'#fff', border:`1px solid ${BORDE}`,
  borderRadius:8, fontSize:12, color:'#1A2E20',
};

// ─── componente principal ─────────────────────────────────────────────────────
export default function Estadisticas() {
  const [tab,     setTab]     = useState<Tab>('resumen');
  const [periodo, setPeriodo] = useState<Periodo>('3');
  const [cargando, setCargando] = useState(false);

  // datos
  const [kpis,        setKpis]        = useState<KPIs | null>(null);
  const [evolucion,   setEvolucion]   = useState<{ porMes: MesFila[]; meses: number } | null>(null);
  const [operaciones, setOperaciones] = useState<{
    rendimientoBarberos: BarberoStats[];
    evolucionBarberos: EvBarberoFila[];
    horasPico: HoraFila[];
    diasSemana: DiaFila[];
    topServicios: ServFila[];
  } | null>(null);
  const [clientesData, setClientesData] = useState<{
    segmentosClientes: SegFila[];
    topClientes: ClienteFila[];
    retencionMensual: RetencionFila[];
    nuevosPorMes: NuevosMes[];
    frecuencia_promedio_dias: number;
    clientes_en_riesgo: number;
  } | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  // tabla barberos
  const [sortCol, setSortCol] = useState<keyof BarberoStats>('ingresos');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  // ── carga ─────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [ev, op, cl, kp, ins] = await Promise.all([
        api.get<{ porMes: MesFila[]; meses: number }>(`/estadisticas/evolucion?meses=${periodo}`),
        api.get<typeof operaciones>(`/estadisticas/operaciones?meses=${periodo}`),
        api.get<typeof clientesData>(`/estadisticas/clientes?meses=${periodo}`),
        api.get<KPIs>('/estadisticas/kpis'),
        api.get<Insight[]>(`/estadisticas/insights?meses=${periodo}`),
      ]);
      setEvolucion(ev);
      setOperaciones(op as any);
      setClientesData(cl as any);
      setKpis(kp);
      setInsights(ins);
    } finally { setCargando(false); }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── tabla barberos ordenable ───────────────────────────────────────────────
  const sortBarberos = (col: keyof BarberoStats) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const barberosSorted = operaciones
    ? [...operaciones.rendimientoBarberos].sort((a, b) => {
        const v = (x: BarberoStats) => Number(x[sortCol]);
        return sortDir === 'desc' ? v(b) - v(a) : v(a) - v(b);
      })
    : [];

  // ── máximos ───────────────────────────────────────────────────────────────
  const maxHora = operaciones ? Math.max(...operaciones.horasPico.map(h => h.total), 1) : 1;
  const maxDia  = operaciones ? Math.max(...operaciones.diasSemana.map(d => d.total), 1) : 1;
  const maxServIng = operaciones ? Math.max(...operaciones.topServicios.map(s => s.ingresos), 1) : 1;
  const totalCli   = clientesData?.segmentosClientes.reduce((s,c) => s + c.total, 0) ?? 0;
  const maxGastoCli = clientesData ? Math.max(...clientesData.topClientes.map(c => c.gasto_periodo), 1) : 1;

  // ── recharts data ─────────────────────────────────────────────────────────
  const datosMes = evolucion?.porMes.map(m => ({
    mes: labelMes(m.mes), ingresos: m.ingresos,
    total: m.total_citas, completadas: m.completadas,
    no_shows: m.no_shows, ticket: Math.round(m.ticket_promedio),
    clientes_unicos: m.clientes_unicos,
  })) ?? [];

  const datosHoras = Array.from({ length: 13 }, (_, i) => {
    const h = i + 8;
    const f = operaciones?.horasPico.find(x => x.hora === h);
    return { hora: `${String(h).padStart(2,'0')}h`, total: f?.total || 0, completadas: f?.completadas || 0 };
  });

  const datosDias = DIAS_ES.map((nombre, idx) => {
    const f = operaciones?.diasSemana.find(d => d.dia === idx);
    return { dia: nombre, total: f?.total || 0, ingresos: f?.ingresos || 0, completadas: f?.completadas || 0 };
  });

  const datosRetencion = clientesData?.retencionMensual.map(r => ({
    mes: labelMes(r.mes), nuevos: r.nuevos, retornando: r.retornando,
  })) ?? [];

  const datosNuevos = clientesData?.nuevosPorMes.map(r => ({
    mes: labelMes(r.mes), nuevos: r.nuevos,
  })) ?? [];

  // ── export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!evolucion || !operaciones) return;
    const rows = [
      ['ESTADÍSTICAS RÚSTICO BARBER'],
      [`Período: últimos ${periodo} meses`],
      [],
      ['TENDENCIA MENSUAL'],
      ['Mes','Total Citas','Completadas','No-shows','Canceladas','Ingresos','Ticket Prom.','Clientes únicos'],
      ...evolucion.porMes.map(m => [
        m.mes, m.total_citas, m.completadas, m.no_shows,
        m.canceladas, m.ingresos, Math.round(m.ticket_promedio), m.clientes_unicos,
      ]),
      [],
      ['RENDIMIENTO BARBEROS'],
      ['Barbero','Total','Completadas','No-shows','Ingresos','Ticket','T.Completación%','T.NoShow%'],
      ...operaciones.rendimientoBarberos.map(b => [
        b.barbero_nombre, b.total_citas, b.completadas, b.no_shows,
        b.ingresos, Math.round(b.ticket_promedio), b.tasa_completacion, b.tasa_no_show,
      ]),
      [],
      ['TOP SERVICIOS'],
      ['Servicio','Categoría','Citas','Completadas','Ingresos','Precio prom.'],
      ...operaciones.topServicios.map(s => [
        s.nombre, s.categoria, s.total_citas, s.completadas, s.ingresos, Math.round(s.precio_promedio),
      ]),
    ];
    if (clientesData?.topClientes.length) {
      rows.push([], ['TOP CLIENTES'],
        ['Nombre','Segmento','Citas período','Gasto período','Ticket prom.','Última visita'],
        ...clientesData.topClientes.map(c => [
          c.nombre, c.segmento, c.citas_periodo, c.gasto_periodo,
          Math.round(c.ticket_promedio), c.ultima_visita,
        ]));
    }
    const csv  = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `rustico-stats-${periodo}m.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 1140, margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--blanco)', marginBottom:2 }}>Reportes</h1>
          <p style={{ fontSize:13, color:'var(--texto-suave)' }}>Tendencias · Equipo · Clientes · Negocio</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {(['1','3','6','12'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{
              padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:600, border:'1px solid',
              borderColor: periodo === p ? 'var(--verde)' : 'var(--borde)',
              background:  periodo === p ? 'rgba(74,112,80,0.12)' : 'transparent',
              color:       periodo === p ? 'var(--verde)' : 'var(--texto-suave)',
            }}>
              {p === '1' ? '1 mes' : `${p} meses`}
            </button>
          ))}
          <button onClick={cargar} style={btnIcono} title="Recargar">
            {cargando ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
          </button>
          <button onClick={exportCSV} style={btnSecundario}><Download size={13} /> CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--borde)', marginBottom:24 }}>
        {([
          { id:'resumen',   label:'Resumen',   icono:<Lightbulb size={13}/> },
          { id:'tendencia', label:'Tendencia',  icono:<TrendingUp size={13}/> },
          { id:'equipo',    label:'Equipo',     icono:<Award size={13}/> },
          { id:'negocio',   label:'Negocio',    icono:<BarChart2 size={13}/> },
        ] as { id:Tab; label:string; icono:React.ReactNode }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'10px 18px', fontSize:13, fontWeight:600,
            background:'transparent', border:'none',
            borderBottom: tab === t.id ? '2px solid var(--cobre)' : '2px solid transparent',
            color: tab === t.id ? 'var(--cobre)' : 'var(--texto-suave)',
            marginBottom:-1, whiteSpace:'nowrap',
          }}>
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB RESUMEN ─────────────────────────────────────────────────────── */}
      {tab === 'resumen' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* KPI Cards vs mes anterior */}
          {kpis && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:12 }}>
              <KPICard
                icono={<TrendingUp size={16}/>} label="Ingresos este mes"
                valor={COP(kpis.mesCurr.ingresos)} color="var(--cobre)"
                delta={kpis.deltas.ingresos}
                sub={`vs ${COP(kpis.mesAnt.ingresos)} mes ant.`}
              />
              <KPICard
                icono={<CheckCircle2 size={16}/>} label="Citas completadas"
                valor={String(kpis.mesCurr.completadas)} color="var(--verde)"
                delta={kpis.deltas.completadas}
                sub={`de ${kpis.mesCurr.total_citas} agendadas`}
              />
              <KPICard
                icono={<Scissors size={16}/>} label="Ticket promedio"
                valor={COP(kpis.mesCurr.ticket_promedio)} color="var(--pendiente)"
                delta={kpis.deltas.ticket_promedio}
                sub={`vs ${COP(kpis.mesAnt.ticket_promedio)} mes ant.`}
              />
              <KPICard
                icono={<Users size={16}/>} label="Clientes totales"
                valor={String(kpis.total_clientes)} color="var(--exito)"
                sub={`+${kpis.clientes_nuevos} nuevos este mes`}
              />
              <KPICard
                icono={<Clock size={16}/>} label="Prom. citas / día"
                valor={String(kpis.prom_citas_dia)} color="var(--texto)"
                sub={kpis.mejor_dia ? `${kpis.mejor_dia.dia} es el más ocupado` : undefined}
              />
              {kpis.comisiones_pendientes.cantidad > 0 && (
                <KPICard
                  icono={<AlertTriangle size={16}/>} label="Comisiones pendientes"
                  valor={COP(kpis.comisiones_pendientes.monto)} color="var(--advertencia)"
                  sub={`${kpis.comisiones_pendientes.cantidad} sin pagar`}
                  highlight
                />
              )}
            </div>
          )}

          {/* Badges de datos clave */}
          {kpis && (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {kpis.mejor_hora && (
                <MetaBadge icono={<Clock size={12}/>} label="Hora pico" valor={`${kpis.mejor_hora.hora}:00–${kpis.mejor_hora.hora+1}:00`} />
              )}
              {kpis.servicio_estrella && (
                <MetaBadge icono={<Star size={12}/>} label="Servicio estrella" valor={kpis.servicio_estrella.nombre} />
              )}
              <MetaBadge icono={<Users size={12}/>} label="Retornando" valor={`${kpis.clientes_retornando} clientes`} />
            </div>
          )}

          {/* Insights automáticos */}
          {insights.length > 0 && (
            <div style={card}>
              <SectionHeader icono={<Lightbulb size={15}/>} titulo="Insights automáticos" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {insights.map((ins, i) => (
                  <InsightRow key={i} ins={ins} />
                ))}
              </div>
            </div>
          )}

          {/* Mini tendencia — sparklines */}
          {datosMes.length > 1 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={card}>
                <SectionHeader icono={<TrendingUp size={14}/>} titulo="Ingresos mensuales" />
                <ResponsiveContainer width="100%" height={100}>
                  <ComposedChart data={datosMes} margin={{ top:4, right:4, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="gradSparkIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={VERDE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={VERDE} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" tick={{ fontSize:9, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={ttpSt} formatter={(v) => [COP(Number(v??0)),'Ingresos']} />
                    <Area type="monotone" dataKey="ingresos" stroke={VERDE} strokeWidth={2}
                      fill="url(#gradSparkIngresos)" dot={{ r:2, fill:VERDE, strokeWidth:0 }} activeDot={{ r:4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <SectionHeader icono={<BarChart2 size={14}/>} titulo="Citas completadas" />
                <ResponsiveContainer width="100%" height={100}>
                  <ReBarChart data={datosMes} margin={{ top:4, right:4, left:0, bottom:0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize:9, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={ttpSt} formatter={(v) => [Number(v??0),'Completadas']} />
                    <Bar dataKey="completadas" fill={COBRE} radius={[3,3,0,0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB TENDENCIA ───────────────────────────────────────────────────── */}
      {tab === 'tendencia' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Área ingresos + ticket */}
          <div style={card}>
            <SectionHeader icono={<TrendingUp size={15}/>} titulo="Ingresos y ticket promedio" />
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={datosMes} margin={{ top:4, right:20, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="gradIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={VERDE} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={VERDE} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${Math.round(v/1000)}k`} width={40} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize:10, fill:TSSUAVE }}
                  axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v/1000)}k`} width={40} />
                <Tooltip contentStyle={ttpSt}
                  formatter={(v, name) => [name === 'Ingresos' ? COP(Number(v??0)) : COP(Number(v??0)), String(name)]} />
                <Area yAxisId="left" type="monotone" dataKey="ingresos" name="Ingresos"
                  stroke={VERDE} strokeWidth={2.5} fill="url(#gradIng)"
                  dot={{ r:3, fill:VERDE, strokeWidth:0 }} activeDot={{ r:5 }} />
                <Line yAxisId="right" type="monotone" dataKey="ticket" name="Ticket prom."
                  stroke={COBRE} strokeWidth={2} strokeDasharray="5 3"
                  dot={{ r:3, fill:COBRE, strokeWidth:0 }} activeDot={{ r:5 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:14, marginTop:8 }}>
              <Leyenda color={VERDE} label="Ingresos" />
              <Leyenda color={COBRE} label="Ticket promedio" linea />
            </div>
          </div>

          {/* Citas: total, completadas, no-shows */}
          <div style={card}>
            <SectionHeader icono={<BarChart2 size={15}/>} titulo="Composición de citas por mes" />
            <ResponsiveContainer width="100%" height={190}>
              <ReBarChart data={datosMes} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={ttpSt} />
                <Bar dataKey="completadas" name="Completadas" stackId="a" fill={VERDE}   radius={[0,0,0,0]} />
                <Bar dataKey="no_shows"    name="No-shows"    stackId="a" fill={COBRE}   radius={[0,0,0,0]} />
                <Bar dataKey="canceladas"  name="Canceladas"  stackId="a" fill={'#D0C0A8'} radius={[3,3,0,0]} />
              </ReBarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:14, marginTop:8 }}>
              <Leyenda color={VERDE}    label="Completadas" />
              <Leyenda color={COBRE}    label="No-shows" />
              <Leyenda color="#D0C0A8"  label="Canceladas" />
            </div>
          </div>

          {/* Clientes únicos por mes */}
          <div style={card}>
            <SectionHeader icono={<Users size={15}/>} titulo="Clientes únicos atendidos por mes" />
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={datosMes} margin={{ top:4, right:8, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:11, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={ttpSt} formatter={(v) => [Number(v??0), 'Clientes únicos']} />
                <Bar dataKey="clientes_unicos" name="Clientes únicos" fill={PEND} radius={[3,3,0,0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Métricas comparativas */}
          {evolucion && evolucion.porMes.length >= 2 && (() => {
            const u = evolucion.porMes[evolucion.porMes.length - 1];
            const p = evolucion.porMes[evolucion.porMes.length - 2];
            const d = (a: number, b: number) => b > 0 ? Math.round((a - b) / b * 100) : 0;
            return (
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <DeltaChip label="Ingresos vs mes ant."  delta={d(u.ingresos, p.ingresos)} />
                <DeltaChip label="Citas vs mes ant."     delta={d(u.total_citas, p.total_citas)} />
                <DeltaChip label="Ticket vs mes ant."    delta={d(u.ticket_promedio, p.ticket_promedio)} />
                <DeltaChip label="Clientes vs mes ant."  delta={d(u.clientes_unicos, p.clientes_unicos)} />
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB EQUIPO ──────────────────────────────────────────────────────── */}
      {tab === 'equipo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Tabla rendimiento barberos */}
          <div style={card}>
            <SectionHeader icono={<Award size={15}/>} titulo="Rendimiento por barbero" />
            {barberosSorted.length > 0 ? (
              <div style={{ overflowX:'auto' }}>
                <table style={tablaSt}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--borde)' }}>
                      {([
                        ['Barbero',        null],
                        ['Citas',          'total_citas'],
                        ['Completadas',    'completadas'],
                        ['T. Compl. %',    'tasa_completacion'],
                        ['No-show %',      'tasa_no_show'],
                        ['Ingresos',       'ingresos'],
                        ['Ticket prom.',   'ticket_promedio'],
                        ['Clientes',       'clientes_atendidos'],
                      ] as [string, keyof BarberoStats | null][]).map(([h, col]) => (
                        <th key={h} onClick={() => col && sortBarberos(col)} style={{
                          padding:'8px 10px',
                          textAlign: h === 'Barbero' ? 'left' : 'right',
                          color: col && sortCol === col ? 'var(--cobre)' : 'var(--texto-suave)',
                          fontWeight:600, whiteSpace:'nowrap',
                          cursor: col ? 'pointer' : 'default', userSelect:'none',
                        }}>
                          {h}{col && sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {barberosSorted.map(b => (
                      <tr key={b.barbero_id} style={{ borderBottom:'1px solid var(--borde)' }}>
                        <td style={{ padding:'10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:10, height:10, borderRadius:'50%', background:b.color_agenda, flexShrink:0 }} />
                            <span style={{ color:'var(--texto)', fontWeight:600 }}>{b.barbero_nombre}</span>
                          </div>
                        </td>
                        <td style={tdR}>{b.total_citas}</td>
                        <td style={tdR}>{b.completadas}</td>
                        {/* Tasa completación — barra */}
                        <td style={{ padding:'10px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:6, background:SUP2, borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ width:`${b.tasa_completacion}%`, height:'100%', background:'var(--exito)', borderRadius:3, transition:'width 0.4s' }} />
                            </div>
                            <span style={{ fontSize:12, color:'var(--exito)', fontWeight:600, minWidth:36, textAlign:'right' }}>
                              {b.tasa_completacion}%
                            </span>
                          </div>
                        </td>
                        {/* No-show */}
                        <td style={{ padding:'10px', textAlign:'right' }}>
                          <span style={{
                            color: b.tasa_no_show > 15 ? 'var(--error)' : b.tasa_no_show > 8 ? 'var(--advertencia)' : 'var(--texto-suave)',
                            fontWeight: b.tasa_no_show > 8 ? 700 : 400,
                          }}>
                            {b.tasa_no_show > 15 && '⚠ '}{b.tasa_no_show}%
                          </span>
                        </td>
                        <td style={{ padding:'10px', textAlign:'right', color:'var(--cobre)', fontWeight:600 }}>{COP(b.ingresos)}</td>
                        <td style={{ padding:'10px', textAlign:'right', color:'var(--texto-suave)' }}>{COP(b.ticket_promedio)}</td>
                        <td style={{ padding:'10px', textAlign:'right', color:'var(--texto)' }}>{b.clientes_atendidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Vacio />}
          </div>

          {/* Ingresos por barbero en el tiempo */}
          {operaciones && operaciones.evolucionBarberos.length > 0 && (() => {
            // Pivotar: { mes, barbero1, barbero2, ... }
            const barberos = [...new Set(operaciones.evolucionBarberos.map(e => e.barbero_nombre))];
            const meses    = [...new Set(operaciones.evolucionBarberos.map(e => e.mes))];
            const pivot    = meses.map(mes => {
              const row: any = { mes: labelMes(mes) };
              for (const b of barberos) {
                const f = operaciones.evolucionBarberos.find(e => e.mes === mes && e.barbero_nombre === b);
                row[b] = f?.ingresos ?? 0;
              }
              return row;
            });
            const colors = barberosSorted.reduce((acc, b) => {
              acc[b.barbero_nombre] = b.color_agenda;
              return acc;
            }, {} as Record<string,string>);
            return (
              <div style={card}>
                <SectionHeader icono={<TrendingUp size={15}/>} titulo="Ingresos por barbero — evolución mensual" />
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={pivot} margin={{ top:4, right:8, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize:11, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${Math.round(v/1000)}k`} width={42} />
                    <Tooltip contentStyle={ttpSt} formatter={(v, n) => [COP(Number(v??0)), String(n)]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ fontSize:11, color:TSSUAVE }}>{v}</span>} />
                    {barberos.map(b => (
                      <Line key={b} type="monotone" dataKey={b}
                        stroke={colors[b] || VERDE} strokeWidth={2}
                        dot={{ r:3, fill:colors[b] || VERDE, strokeWidth:0 }} activeDot={{ r:5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Top servicios */}
          {operaciones && operaciones.topServicios.length > 0 && (
            <div style={card}>
              <SectionHeader icono={<Scissors size={15}/>} titulo="Top servicios" />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {operaciones.topServicios.map((s, i) => (
                  <div key={s.nombre} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, color: i<3 ? 'var(--cobre)' : 'var(--texto-suave)', minWidth:18, textAlign:'right' }}>
                      #{i+1}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:13, color:'var(--texto)', fontWeight:500 }}>{s.nombre}</span>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                          <span style={{ fontSize:11, color:'var(--texto-suave)' }}>{s.tasa_completacion}% compl.</span>
                          <span style={{ fontSize:12, color:'var(--cobre)', fontWeight:600 }}>{COP(s.ingresos)}</span>
                        </div>
                      </div>
                      <div style={{ height:5, background:SUP2, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct(s.ingresos, maxServIng)}%`, height:'100%',
                          background: i < 3 ? 'var(--cobre)' : VERDE, borderRadius:3, transition:'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize:10, color:'var(--texto-suave)', marginTop:3 }}>
                        {s.completadas} citas · prom. {COP(s.precio_promedio)}
                        <span className={`badge badge-${s.categoria === 'combo' ? 'vip' : s.categoria === 'barba' ? 'confirmada' : 'nuevo'}`}
                          style={{ marginLeft:8, fontSize:10 }}>
                          {s.categoria}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB NEGOCIO ─────────────────────────────────────────────────────── */}
      {tab === 'negocio' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Horas pico + Días semana */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={card}>
              <SectionHeader icono={<Clock size={15}/>} titulo="Horas pico" />
              {operaciones && operaciones.horasPico.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <ReBarChart layout="vertical" data={datosHoras} margin={{ top:0, right:20, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="hora" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={ttpSt} formatter={(v) => [Number(v??0), 'Citas']} />
                    <Bar dataKey="total" name="Citas" radius={[0,3,3,0]}>
                      {datosHoras.map((d, i) => (
                        <Cell key={i} fill={d.total >= maxHora * 0.7 ? COBRE : VERDE} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              ) : <Vacio />}
            </div>

            <div style={card}>
              <SectionHeader icono={<BarChart2 size={15}/>} titulo="Días de la semana" />
              {operaciones && operaciones.diasSemana.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={datosDias} margin={{ top:4, right:4, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize:11, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} width={24} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${Math.round(v/1000)}k`} width={38} />
                    <Tooltip contentStyle={ttpSt}
                      formatter={(v, n) => n === 'Ingresos' ? [COP(Number(v??0)), n] : [Number(v??0), n]} />
                    <Bar yAxisId="left" dataKey="total" name="Citas" radius={[3,3,0,0]}>
                      {datosDias.map((d, i) => (
                        <Cell key={i} fill={d.total >= maxDia * 0.7 ? COBRE : VERDE} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="ingresos" name="Ingresos"
                      stroke={ERROR} strokeWidth={2} dot={{ r:3, fill:ERROR, strokeWidth:0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <Vacio />}
              <div style={{ display:'flex', gap:14, marginTop:8 }}>
                <Leyenda color={VERDE} label="Citas" />
                <Leyenda color={ERROR} label="Ingresos" linea />
              </div>
            </div>
          </div>

          {/* Segmentos clientes + Retención */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={card}>
              <SectionHeader icono={<Users size={15}/>} titulo="Segmentos de clientes" />
              {clientesData && clientesData.segmentosClientes.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={clientesData.segmentosClientes} dataKey="total" nameKey="segmento"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {clientesData.segmentosClientes.map(s => (
                          <Cell key={s.segmento} fill={SEG_COLOR[s.segmento] || VERDE} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={ttpSt}
                        formatter={(v, name) => {
                          const n = Number(v??0);
                          return [`${n} (${Math.round(n / totalCli * 100)}%)`, String(name)];
                        }} />
                      <Legend iconType="circle" iconSize={8}
                        formatter={v => <span style={{ fontSize:11, color:TSSUAVE, textTransform:'capitalize' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                  {clientesData.clientes_en_riesgo > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:12 }}>
                      <AlertTriangle size={13} color="var(--advertencia)" />
                      <span style={{ color:'var(--texto-suave)' }}>
                        <strong style={{ color:'var(--advertencia)' }}>{clientesData.clientes_en_riesgo}</strong> clientes VIP/frecuentes sin visita en 60+ días
                      </span>
                    </div>
                  )}
                  {clientesData.frecuencia_promedio_dias > 0 && (
                    <div style={{ fontSize:12, color:'var(--texto-suave)', marginTop:4 }}>
                      Frecuencia promedio: <strong style={{ color:'var(--cobre)' }}>{clientesData.frecuencia_promedio_dias} días</strong> entre visitas
                    </div>
                  )}
                </>
              ) : <Vacio />}
            </div>

            <div style={card}>
              <SectionHeader icono={<TrendingUp size={15}/>} titulo="Retención mensual" />
              {datosRetencion.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <ReBarChart data={datosRetencion} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDE} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:TSSUAVE }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={ttpSt} />
                      <Bar dataKey="retornando" name="Retornando" stackId="a" fill={VERDE} radius={[0,0,0,0]} />
                      <Bar dataKey="nuevos"      name="Nuevos"      stackId="a" fill={COBRE} radius={[3,3,0,0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', gap:14, marginTop:8 }}>
                    <Leyenda color={VERDE} label="Retornando" />
                    <Leyenda color={COBRE} label="Nuevos" />
                  </div>
                </>
              ) : <Vacio />}
            </div>
          </div>

          {/* Top clientes */}
          {clientesData && clientesData.topClientes.length > 0 && (
            <div style={card}>
              <SectionHeader icono={<Star size={15}/>} titulo={`Top clientes — últimos ${periodo} meses`} />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {clientesData.topClientes.map((c, i) => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, color: i<3 ? 'var(--cobre)' : 'var(--texto-suave)', minWidth:18, textAlign:'right' }}>#{i+1}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ fontSize:13, color:'var(--texto)', fontWeight:600 }}>{c.nombre}</span>
                          <span className={`badge badge-${c.segmento}`}>{c.segmento}</span>
                        </div>
                        <span style={{ fontSize:12, color:'var(--cobre)', fontWeight:700 }}>{COP(c.gasto_periodo)}</span>
                      </div>
                      <div style={{ height:4, background:SUP2, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${pct(c.gasto_periodo, maxGastoCli)}%`, height:'100%',
                          background: i < 3 ? 'var(--cobre)' : VERDE, borderRadius:3, transition:'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize:10, color:'var(--texto-suave)', marginTop:2 }}>
                        {c.citas_periodo} citas · ticket {COP(c.ticket_promedio)} · última visita {c.ultima_visita ? new Date(c.ultima_visita).toLocaleDateString('es-CO',{day:'2-digit',month:'short'}) : '—'}
                        {c.barbero_favorito && <> · barbero: {c.barbero_favorito}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────
function KPICard({ icono, label, valor, color, sub, delta, highlight }: {
  icono: React.ReactNode; label: string; valor: string; color: string;
  sub?: string; delta?: number; highlight?: boolean;
}) {
  return (
    <div style={{
      background:'var(--superficie)',
      border:`1px solid ${highlight ? 'var(--advertencia)' : 'var(--borde)'}`,
      borderRadius:10, padding:'16px 18px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ color, opacity:0.85 }}>{icono}</div>
        <span style={{ fontSize:11, color:'var(--texto-suave)', fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:19, fontWeight:700, color: highlight ? 'var(--advertencia)' : 'var(--blanco)', letterSpacing:'-0.02em' }}>{valor}</div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
        {delta !== undefined && (
          <span style={{
            fontSize:11, fontWeight:700, padding:'1px 6px', borderRadius:4,
            background: delta > 0 ? 'rgba(42,106,58,0.12)' : delta < 0 ? 'rgba(170,40,40,0.12)' : 'transparent',
            color: delta > 0 ? 'var(--exito)' : delta < 0 ? 'var(--error)' : 'var(--texto-suave)',
          }}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}%
          </span>
        )}
        {sub && <span style={{ fontSize:11, color:'var(--texto-suave)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const cfg: Record<Insight['tipo'], { icono: React.ReactNode; color: string; bg: string }> = {
    info:    { icono: <Info size={13}/>,           color:'var(--pendiente)',   bg:'rgba(40,88,122,0.08)' },
    warn:    { icono: <AlertTriangle size={13}/>,   color:'var(--advertencia)', bg:'rgba(138,104,24,0.08)' },
    success: { icono: <CheckCircle2 size={13}/>,    color:'var(--exito)',       bg:'rgba(42,106,58,0.08)' },
    alert:   { icono: <Zap size={13}/>,             color:'var(--error)',       bg:'rgba(170,40,40,0.08)' },
  };
  const { icono, color, bg } = cfg[ins.tipo];
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px', borderRadius:7, background:bg }}>
      <div style={{ color, flexShrink:0, marginTop:1 }}>{icono}</div>
      <span style={{ fontSize:13, color:'var(--texto)', lineHeight:1.5 }}>{ins.texto}</span>
    </div>
  );
}

function MetaBadge({ icono, label, valor }: { icono: React.ReactNode; label: string; valor: string }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background:'var(--superficie)', border:'1px solid var(--borde)',
      borderRadius:8, padding:'6px 12px', fontSize:12,
    }}>
      <span style={{ color:'var(--cobre)' }}>{icono}</span>
      <span style={{ color:'var(--texto-suave)' }}>{label}:</span>
      <strong style={{ color:'var(--texto)' }}>{valor}</strong>
    </div>
  );
}

function DeltaChip({ label, delta }: { label: string; delta: number }) {
  const pos = delta >= 0;
  return (
    <div style={{
      background:'var(--superficie2)', border:'1px solid var(--borde)',
      borderRadius:6, padding:'4px 10px', fontSize:12,
      display:'flex', alignItems:'center', gap:6,
    }}>
      <span style={{ color:'var(--texto-suave)' }}>{label}</span>
      <strong style={{ color: pos ? 'var(--exito)' : 'var(--error)' }}>
        {pos ? '▲' : '▼'} {Math.abs(delta)}%
      </strong>
    </div>
  );
}

function SectionHeader({ icono, titulo }: { icono: React.ReactNode; titulo: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
      <span style={{ color:'var(--cobre)' }}>{icono}</span>
      <h3 style={{ fontSize:13, fontWeight:700, color:'var(--texto)', letterSpacing:'0.02em' }}>{titulo}</h3>
    </div>
  );
}

function Leyenda({ color, label, linea }: { color:string; label:string; linea?:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      {linea
        ? <div style={{ width:16, height:2, background:color, borderRadius:1 }} />
        : <div style={{ width:10, height:10, borderRadius:2, background:color }} />
      }
      <span style={{ fontSize:10, color:'var(--texto-suave)' }}>{label}</span>
    </div>
  );
}

function Vacio() {
  return <p style={{ fontSize:12, color:'var(--texto-suave)', padding:'8px 0' }}>Sin datos para el período seleccionado.</p>;
}

// ─── estilos ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background:'var(--superficie)', border:'1px solid var(--borde)', borderRadius:10, padding:16,
};
const tablaSt: React.CSSProperties = { width:'100%', borderCollapse:'collapse', fontSize:12 };
const tdR: React.CSSProperties     = { padding:'10px', textAlign:'right', color:'var(--texto)' };
const btnSecundario: React.CSSProperties = {
  display:'inline-flex', alignItems:'center', gap:5,
  background:'transparent', color:'var(--texto-suave)',
  border:'1px solid var(--borde)', borderRadius:6,
  padding:'6px 12px', fontSize:13, cursor:'pointer',
};
const btnIcono: React.CSSProperties = {
  background:'none', border:'none', color:'var(--texto-suave)',
  cursor:'pointer', padding:'6px', borderRadius:6,
};

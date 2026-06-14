import { Client, LocalAuth } from 'whatsapp-web.js';
import * as QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { query, queryOne } from '../../shared/database/pg.client';

export type WaEstado = 'desconectado' | 'qr_pendiente' | 'cargando' | 'conectado';

// ─── Singleton ────────────────────────────────────────────────────────────────
export class WhatsAppService extends EventEmitter {
  private static _inst: WhatsAppService;
  private client: Client | null = null;
  private _estado: WaEstado = 'desconectado';
  private _qr: string | null = null;          // base64 data URL
  private _info: { nombre: string; phone: string } | null = null;

  private constructor() { super(); }

  static get instance() {
    if (!WhatsAppService._inst) WhatsAppService._inst = new WhatsAppService();
    return WhatsAppService._inst;
  }

  get estado(): WaEstado   { return this._estado; }
  get qr(): string | null  { return this._qr; }
  get info()               { return this._info; }
  get conectado()          { return this._estado === 'conectado'; }

  // ── Inicializar cliente ─────────────────────────────────────────────────────
  async inicializar() {
    if (this.client) return;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    this.client.on('qr', async (qr: string) => {
      this._estado = 'qr_pendiente';
      this._qr     = await QRCode.toDataURL(qr);
      this.emit('qr', this._qr);
      console.log('📱 WhatsApp: escanea el código QR en la pantalla');
    });

    this.client.on('loading_screen', () => {
      this._estado = 'cargando';
      this.emit('estado', 'cargando');
    });

    this.client.on('ready', async () => {
      this._estado = 'conectado';
      this._qr     = null;
      const info   = await this.client!.getContactById(this.client!.info.wid._serialized).catch(() => null);
      this._info   = {
        nombre: (info as any)?.name || this.client!.info.pushname || '',
        phone:  this.client!.info.wid.user,
      };
      this.emit('estado', 'conectado');
      console.log('✅ WhatsApp conectado como:', this._info?.nombre, this._info?.phone);
    });

    this.client.on('disconnected', (reason: string) => {
      this._estado = 'desconectado';
      this._qr     = null;
      this._info   = null;
      this.emit('estado', 'desconectado');
      console.log('❌ WhatsApp desconectado:', reason);
      this.client = null;
    });

    this._estado = 'cargando';
    this.client.initialize().catch((err) => {
      console.error('❌ Error iniciando WhatsApp:', err.message);
      this._estado = 'desconectado';
      this.client  = null;
    });
  }

  async desconectar() {
    if (this.client) { await this.client.destroy(); this.client = null; }
    this._estado = 'desconectado';
    this._qr     = null;
    this._info   = null;
    this.emit('estado', 'desconectado');
  }

  // ── Envío de mensajes ───────────────────────────────────────────────────────
  private formatearTelefono(tel: string): string {
    const digits = tel.replace(/\D/g, '');
    // Colombia: números de 10 dígitos empiezan por 3
    if (digits.length === 10 && digits.startsWith('3')) return `57${digits}@c.us`;
    if (digits.length === 12 && digits.startsWith('57'))  return `${digits}@c.us`;
    return `${digits}@c.us`;
  }

  async enviarMensaje(telefono: string, mensaje: string): Promise<void> {
    if (!this.conectado || !this.client) throw new Error('WhatsApp no está conectado.');
    const chatId = this.formatearTelefono(telefono);
    await this.client.sendMessage(chatId, mensaje);
  }

  // ── Agenda diaria ───────────────────────────────────────────────────────────
  static buildMensajeAgenda(barberoNombre: string, fecha: string, citas: any[]): string {
    const d       = new Date(fecha + 'T12:00:00');
    const diaSem  = d.toLocaleDateString('es-CO', { weekday: 'long' });
    const diaFmt  = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
    const encabezado = `🗓️ *Tu agenda de hoy — Rústico Barber*\n_${diaSem.charAt(0).toUpperCase() + diaSem.slice(1)}, ${diaFmt}_`;

    if (citas.length === 0) {
      return `${encabezado}\n\nNo tienes citas hoy 😎\n\n💈 _Rústico Barber & Concept Shop_`;
    }

    const COP = (n: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

    const lista = citas.map((c: any) => {
      const hora   = new Date(c.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
      const cliente = c.cliente_nombre || 'Cliente';
      return `🕐 *${hora}* — ${c.servicio_nombre} · ${cliente}`;
    }).join('\n');

    const estComision = citas.reduce((s: number, c: any) =>
      s + Math.round(c.precio_cop * (c.porcentaje_comision ?? 42) / 100), 0);

    return `${encabezado}\n\n${lista}\n\n_${citas.length} cita${citas.length !== 1 ? 's' : ''} · Est. ${COP(estComision)} en comisiones_\n\n💈 _Rústico Barber & Concept Shop_`;
  }

  static buildMensajeNuevaCita(cita: any): string {
    const COP  = (n: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
    const hora = new Date(cita.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dia  = new Date(cita.inicio).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    return `✂️ *Nueva cita — Rústico Barber*\n👤 ${cita.cliente_nombre || 'Cliente sin nombre'}\n💈 ${cita.servicio_nombre} · ${COP(cita.precio_cop)}\n📅 ${dia} · 🕐 ${hora}`;
  }

  static buildMensajeCancelacion(cita: any): string {
    const hora = new Date(cita.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dia  = new Date(cita.inicio).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    return `❌ *Cita cancelada — Rústico Barber*\n👤 ${cita.cliente_nombre || 'Cliente'}\n💈 ${cita.servicio_nombre}\n📅 ${dia} · 🕐 ${hora}`;
  }

  static buildMensajeRecordatorio(cita: any): string {
    const hora = new Date(cita.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `⏰ *Recordatorio — Rústico Barber*\nEn 30 minutos tienes:\n👤 ${cita.cliente_nombre || 'Cliente'} · ${cita.servicio_nombre}\n🕐 ${hora}`;
  }

  // ── Obtener barberos con WhatsApp activo ────────────────────────────────────
  static async barberosTelefono(): Promise<{ barbero_id: string; nombre: string; telefono: string | null; whatsapp_activo: number }[]> {
    return query(`
      SELECT b.id AS barbero_id, u.nombre, u.telefono, b.whatsapp_activo
      FROM   barberos b
      JOIN   usuarios u ON u.id = b.usuario_id
      WHERE  b.activo = 1
      ORDER  BY u.nombre
    `);
  }

  // ── Enviar agenda del día a todos los barberos ──────────────────────────────
  async enviarAgendaDia(fecha: string): Promise<{ enviados: number; errores: string[] }> {
    const barberos = await WhatsAppService.barberosTelefono();
    const activos  = barberos.filter(b => b.whatsapp_activo && b.telefono);
    const errores: string[] = [];
    let enviados = 0;

    for (const b of activos) {
      try {
        const citas = await query<any>(`
          SELECT a.inicio, a.precio_cop, ts.nombre AS servicio_nombre,
                 c.nombre AS cliente_nombre, br.porcentaje_comision
          FROM   agenda a
          JOIN   tipo_servicios ts ON ts.id = a.servicio_id
          JOIN   barberos br       ON br.id = a.barbero_id
          LEFT JOIN clientes c     ON c.id  = a.cliente_id
          WHERE  a.barbero_id = ? AND DATE(a.inicio) = ?
            AND  a.estado IN ('confirmada', 'pendiente')
          ORDER  BY a.inicio ASC
        `, [b.barbero_id, fecha]);

        const msg = WhatsAppService.buildMensajeAgenda(b.nombre, fecha, citas);
        await this.enviarMensaje(b.telefono!, msg);
        enviados++;
      } catch (e: any) {
        errores.push(`${b.nombre}: ${e.message}`);
      }
    }
    return { enviados, errores };
  }
}

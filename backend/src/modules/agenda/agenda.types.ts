export type EstadoCita    = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_show';
export type MetodoPago    = 'efectivo' | 'datafono' | 'mixto';

export interface CrearCitaBody {
  cliente_id?:   string;
  barbero_id:    string;
  servicio_id:   string;
  inicio:        string;
  notas?:        string;
  precio_cop?:   number;
  metodo_pago?:  MetodoPago;
}

export interface ActualizarEstadoBody {
  estado: EstadoCita;
}

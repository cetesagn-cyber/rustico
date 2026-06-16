import { useEffect, useState, useRef } from 'react';
import { Search, Phone, MessageCircle } from 'lucide-react';
import { api } from '../api/client';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  visitas: number;
  ultima_visita: string | null;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCargando(true);
      const q = busqueda.trim() ? `?q=${encodeURIComponent(busqueda)}` : '';
      api.get<Cliente[]>(`/clientes${q}`)
        .then(data => setClientes(Array.isArray(data) ? data.slice(0, 30) : []))
        .catch(() => setClientes([]))
        .finally(() => setCargando(false));
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busqueda]);

  function llamar(tel: string) {
    window.location.href = `tel:${tel.replace(/\D/g, '')}`;
  }

  function whatsapp(cliente: Cliente) {
    const tel = cliente.telefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola ${cliente.nombre}, te escribimos desde Rústico Barber. 💈`);
    window.open(`https://wa.me/57${tel}?text=${msg}`, '_blank');
  }

  return (
    <div className="page clientes-mobile">
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          autoComplete="off"
        />
      </div>

      {cargando && <p className="loading-text">Buscando...</p>}

      <div className="clientes-list">
        {clientes.map(c => (
          <div key={c.id} className="cliente-card">
            <div className="cliente-info">
              <strong>{c.nombre}</strong>
              <span className="cliente-tel">{c.telefono}</span>
              {c.ultima_visita && (
                <span className="cliente-meta">
                  {c.visitas} visita{c.visitas !== 1 ? 's' : ''} · última {new Date(c.ultima_visita).toLocaleDateString('es-CO')}
                </span>
              )}
            </div>
            <div className="cliente-actions">
              <button className="icon-btn" onClick={() => llamar(c.telefono)} title="Llamar">
                <Phone size={18} />
              </button>
              <button className="icon-btn wa" onClick={() => whatsapp(c)} title="WhatsApp">
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        ))}
        {!cargando && clientes.length === 0 && busqueda && (
          <p className="empty-state">Sin resultados para "{busqueda}"</p>
        )}
      </div>
    </div>
  );
}

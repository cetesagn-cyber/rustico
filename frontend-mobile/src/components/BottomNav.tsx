import { NavLink } from 'react-router-dom';
import { CalendarDays, Users, User } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/agenda" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <CalendarDays size={22} />
        <span>Agenda</span>
      </NavLink>
      <NavLink to="/clientes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Users size={22} />
        <span>Clientes</span>
      </NavLink>
      <NavLink to="/perfil" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <User size={22} />
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
}

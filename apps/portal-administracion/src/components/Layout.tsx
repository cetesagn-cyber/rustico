import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main className="app-main" style={{ flex: 1, overflow: 'auto', background: 'var(--fondo)' }}>
        <Outlet />
      </main>
    </div>
  );
}

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  House, 
  Users, 
  Calendar,
  ChartBar,
  FileText,
  GearSix, 
  SignOut,
  Barbell
} from '@phosphor-icons/react';

const Layout = ({ children, user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const menuItems = [
    { path: '/dashboard', icon: House, label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/leads', icon: Users, label: 'Leads', testId: 'nav-leads' },
    { path: '/appointments', icon: Calendar, label: 'Appointments', testId: 'nav-appointments' },
  ];

  if (user?.role === 'admin' || user?.role === 'sales_manager') {
    menuItems.push(
      { path: '/reports', icon: FileText, label: 'Reports', testId: 'nav-reports' },
      { path: '/analytics', icon: ChartBar, label: 'Analytics', testId: 'nav-analytics' }
    );
  }

  // All users can access settings (for message templates)
  menuItems.push({ path: '/settings', icon: GearSix, label: 'Settings', testId: 'nav-settings' });

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <aside
        className="fixed left-0 top-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col"
        data-testid="sidebar"
      >
        <div className="h-16 flex items-center justify-center border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Barbell size={32} weight="duotone" className="text-lime-400" />
            <div>
              <h2 className="text-lg font-black text-zinc-50">XAC CRM</h2>
              <p className="text-xs text-zinc-500">Revival Fitness</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4" data-testid="nav-menu">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    data-testid={item.testId}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-semibold text-sm ${
                      isActive
                        ? 'bg-lime-400 text-zinc-950'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="mb-3 p-3 bg-zinc-900/50 rounded-md">
            <p className="text-sm font-semibold text-zinc-100">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
            <span className="inline-block mt-2 text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-300">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full bg-zinc-800 text-zinc-50 hover:bg-zinc-700 flex items-center justify-center gap-2"
          >
            <SignOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;

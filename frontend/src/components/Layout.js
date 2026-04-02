import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrandingContext } from '../App';
import { Button } from './ui/button';
import NotificationBell from './NotificationBell';
import { 
  House, 
  Users, 
  Calendar,
  ChartBar,
  FileText,
  Robot,
  GearSix, 
  SignOut,
  Barbell,
  CurrencyCircleDollar,
  Megaphone,
  Image
} from '@phosphor-icons/react';

const Layout = ({ children, user }) => {
  const { companyName } = useContext(BrandingContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const menuItems = [];

  // Marketing agents get their own set of pages
  if (user?.role === 'marketing_agent') {
    menuItems.push(
      { path: '/marketing', icon: Megaphone, label: 'Marketing', testId: 'nav-marketing' },
      { path: '/marketing/forms', icon: FileText, label: 'Forms', testId: 'nav-forms' },
      { path: '/gallery', icon: Image, label: 'Gallery', testId: 'nav-gallery' }
    );
  } else {
    // Standard CRM pages for non-marketing roles
    menuItems.push(
      { path: '/dashboard', icon: House, label: 'Dashboard', testId: 'nav-dashboard' },
      { path: '/leads', icon: Users, label: 'Leads', testId: 'nav-leads' },
      { path: '/appointments', icon: Calendar, label: 'Appointments', testId: 'nav-appointments' }
    );

    if (user?.role === 'admin' || user?.role === 'sales_manager') {
      menuItems.push(
        { path: '/reports', icon: FileText, label: 'Reports', testId: 'nav-reports' },
        { path: '/analytics', icon: ChartBar, label: 'Analytics', testId: 'nav-analytics' }
      );
    }

    // Commission visible to admin + consultants
    if (user?.role === 'admin' || user?.role === 'consultant') {
      menuItems.push({ path: '/commission', icon: CurrencyCircleDollar, label: 'Commission', testId: 'nav-commission' });
    }

    // Admin also gets Marketing + Gallery + Forms
    if (user?.role === 'admin') {
      menuItems.push(
        { path: '/marketing', icon: Megaphone, label: 'Marketing', testId: 'nav-marketing' },
        { path: '/marketing/forms', icon: FileText, label: 'Forms', testId: 'nav-forms' }
      );
    }

    // Gallery for admin + managers
    if (['admin', 'sales_manager', 'club_manager'].includes(user?.role)) {
      menuItems.push({ path: '/gallery', icon: Image, label: 'Gallery', testId: 'nav-gallery' });
    }

    if (user?.role === 'admin') {
      menuItems.push({ 
        path: '/emergent-fixes', 
        icon: Robot, 
        label: 'Emergent Fixes', 
        testId: 'nav-emergent-fixes',
        highlight: true 
      });
    }
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
              <p className="text-xs text-zinc-500">{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto" data-testid="nav-menu">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    data-testid={item.testId}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md font-semibold text-sm relative ${
                      isActive
                        ? item.highlight
                          ? 'bg-gradient-to-r from-lime-400 to-cyan-500 text-zinc-950'
                          : 'bg-lime-400 text-zinc-950'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    {item.label}
                    {item.highlight && !isActive && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                    )}
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
        <div className="sticky top-0 z-30 h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 flex items-center justify-end px-6">
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-200">{user?.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;

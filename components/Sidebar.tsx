import React from 'react';
import { DashboardIcon, ListIcon, FactoryIcon, CuttingIcon, BoxIcon, PlusCircleIcon, SunIcon, MoonIcon, XIcon, UsersIcon, TagIcon, DatabaseIcon } from './icons/Icons';
import { View, Theme } from '../types';

interface SidebarProps {
  activeView: View;
  navigateTo: (view: View) => void;
  theme: Theme;
  toggleTheme: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, navigateTo, theme, toggleTheme, isOpen, setIsOpen }) => {
  const navItems: { id: View, label: string, icon: React.FC<any>, path: string }[] = [
    { id: 'dashboard', label: 'Anasayfa', icon: DashboardIcon, path: '/' },
    { id: 'orders', label: 'Sipariş Listesi', icon: ListIcon, path: '/orders' },
    { id: 'orderEntry', label: 'Emir Girişi', icon: PlusCircleIcon, path: '/orderEntry' },
    { id: 'cuttingReport', label: 'Kesim Raporu', icon: CuttingIcon, path: '/cuttingReport' },
    { id: 'stockEntry', label: 'Stok Girişi', icon: PlusCircleIcon, path: '/stockEntry' },
    { id: 'stockRecords', label: 'Stok Kayıtları', icon: BoxIcon, path: '/stockRecords' },
    { id: 'workshopManagement', label: 'Atölye Yönetimi', icon: UsersIcon, path: '/workshopManagement' },
    { id: 'defectManagement', label: 'Defo Detayları', icon: TagIcon, path: '/defectManagement' },
    { id: 'dataManagement', label: 'Veri Yönetimi', icon: DatabaseIcon, path: '/dataManagement' },
  ];
  
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, view: View) => {
    e.preventDefault();
    navigateTo(view);
    setIsOpen(false);
  };


  return (
    <aside className={`w-64 bg-surface flex-shrink-0 border-r border-border-color flex flex-col transform transition-transform duration-300 ease-in-out fixed lg:fixed lg:top-0 lg:h-screen inset-y-0 left-0 z-50 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <header className="flex items-center justify-between p-4 mb-6">
        <a 
          href="/" 
          onClick={(e) => handleLinkClick(e, 'dashboard')} 
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary rounded-lg -ml-2 p-2"
          aria-label="Anasayfaya git"
        >
            <FactoryIcon className="h-8 w-8 text-primary"/>
            <h1 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">LOS OJOS</h1>
        </a>
        <button onClick={() => setIsOpen(false)} className="lg:hidden text-text-secondary p-1 rounded-full hover:bg-border-color">
            <XIcon className="h-6 w-6" />
        </button>
      </header>
      <nav className="flex-1 px-2">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.id)}
                className={`w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                  activeView === item.id || (activeView.startsWith(item.id) && item.id !== 'dashboard')
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-text-secondary hover:bg-border-color hover:text-text-primary'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <footer className="mt-auto">
         <div className="p-4 flex justify-between items-center">
            <div className="text-xs text-text-secondary">
              <p>&copy; 2024 LOS OJOS</p>
            </div>
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-text-secondary hover:bg-border-color hover:text-primary transition-colors"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
        </div>
      </footer>
    </aside>
  );
};

export default Sidebar;

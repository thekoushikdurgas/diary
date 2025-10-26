
import React from 'react';
import type { User } from '../types';
import { HomeIcon, CalendarIcon, SettingsIcon, WandIcon, LogoutIcon } from './icons';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
};

const UserProfile: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    return (
        <div className="p-3 bg-slate-200/60 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-bold">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-semibold text-sm text-text-primary dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
            </div>
            <button onClick={onLogout} title="Logout" className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <LogoutIcon className="w-6 h-6" />
            </button>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, currentUser, onLogout }) => {
  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col h-screen fixed top-0 left-0 z-30">
      <div className="flex items-center gap-2 mb-10 px-2">
         <div className="bg-primary p-2 rounded-lg">
            <WandIcon className="w-6 h-6 text-white" />
         </div>
        <h1 className="text-xl font-bold text-text-primary dark:text-gray-100 font-poppins">
          AI Content Hub
        </h1>
      </div>
      <nav className="flex flex-col gap-2">
        <NavItem
          icon={<HomeIcon className="w-6 h-6" />}
          label="Dashboard"
          isActive={activePage === 'dashboard'}
          onClick={() => onPageChange('dashboard')}
        />
        <NavItem
          icon={<CalendarIcon className="w-6 h-6" />}
          label="Calendar"
          isActive={activePage === 'calendar'}
          onClick={() => onPageChange('calendar')}
        />
        <NavItem
          icon={<SettingsIcon className="w-6 h-6" />}
          label="Settings"
          isActive={activePage === 'settings'}
          onClick={() => onPageChange('settings')}
        />
      </nav>
      <div className="mt-auto">
        <UserProfile user={currentUser} onLogout={onLogout} />
      </div>
    </aside>
  );
};

export default Sidebar;


import React from 'react';
import { WandIcon, ArrowPathIcon } from './icons';

interface HeaderProps {
    title: string;
    onOrganize?: () => void;
    isOrganizing?: boolean;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onOrganize, isOrganizing, onRefresh, isRefreshing }) => {
  return (
    <header className="bg-card-bg/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100 font-poppins">
          {title}
        </h1>
        <div className="flex items-center gap-4">
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="bg-gray-200 dark:bg-slate-700 text-text-primary dark:text-gray-100 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition flex items-center gap-2 disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            )}
            {onOrganize && (
                <button
                onClick={onOrganize}
                disabled={isOrganizing}
                className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:bg-accent/50"
                >
                <WandIcon className="w-5 h-5" />
                {isOrganizing ? 'Organizing...' : 'Organize with AI'}
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;

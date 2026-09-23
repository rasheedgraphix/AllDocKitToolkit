import React from 'react';
import { Sun, Moon, ShieldCheck, User as UserIcon } from 'lucide-react';
import { ToolId } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  activeTool: ToolId;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  toolNames: Record<ToolId, string>;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  theme,
  onToggleTheme,
  toolNames,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  return (
    <header
      id="app-header"
      className="h-16 border-b px-6 flex items-center justify-between transition-colors bg-white/80 dark:bg-stone-900/80 backdrop-blur border-stone-200 dark:border-stone-800"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          {toolNames[activeTool] || 'PixDoc - PDF & Image Toolkit'}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          Offline &amp; Private
        </span>
      </div>

      <div className="flex items-center gap-3">
        {onOpenAuth && (
          <button
            id="account-btn"
            onClick={onOpenAuth}
            title={user ? `Signed in as ${user.displayName || user.email}` : 'Sign In'}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer text-xs"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Account'}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline font-medium">
              {user ? user.displayName || user.email?.split('@')[0] : 'Sign In'}
            </span>
          </button>
        )}

        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-stone-700" />
          )}
        </button>
      </div>
    </header>
  );
};

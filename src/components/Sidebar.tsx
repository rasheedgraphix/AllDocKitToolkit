import React, { useState, useEffect } from 'react';
import {
  Files,
  Scissors,
  Minimize2,
  FileImage,
  RefreshCw,
  Maximize2,
  History,
  Settings,
  Shield,
  Layers,
  Stamp,
  Lock,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { ToolId } from '../types';
import { PixDocLogo } from './PixDocLogo';
import { checkLicense } from '../utils/license';

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (id: ToolId) => void;
  historyCount: number;
}

interface NavItem {
  id: ToolId;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  onSelectTool,
  historyCount,
}) => {
  const [license, setLicense] = useState(checkLicense());

  useEffect(() => {
    const handleUpdate = () => setLicense(checkLicense());
    window.addEventListener('license-updated', handleUpdate);
    return () => window.removeEventListener('license-updated', handleUpdate);
  }, []);

  const isPro = license.isPro;

  const pdfTools: NavItem[] = [
    { id: 'pdf-merger', label: 'PDF Merger', icon: Files },
    { id: 'pdf-splitter', label: 'PDF Splitter', icon: Scissors },
    {
      id: 'pdf-organizer',
      label: 'Organize & Rotate',
      icon: Layers,
      badge: 'NEW',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'pdf-to-images',
      label: 'PDF to Images',
      icon: FileImage,
      badge: 'HD',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'pdf-watermark',
      label: 'Watermark & Numbers',
      icon: Stamp,
      badge: 'NEW',
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
    { id: 'pdf-compressor', label: 'PDF Compressor', icon: Minimize2 },
    {
      id: 'pdf-protect',
      label: 'Security & Lock',
      icon: Lock,
    },
  ];

  const imageTools: NavItem[] = [
    { id: 'images-to-pdf', label: 'Images to PDF', icon: FileImage },
    {
      id: 'image-converter',
      label: 'Image Converter',
      icon: RefreshCw,
      badge: 'All Formats',
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      id: 'image-compressor',
      label: 'Compress & Resize',
      icon: Maximize2,
      badge: '-90%',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'qr-studio',
      label: 'QR Code Studio',
      icon: QrCode,
      badge: 'PRO',
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    },
  ];

  const systemTools: NavItem[] = [
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: historyCount > 0 ? `${historyCount}` : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: license.isTrial ? 'TRIAL' : isPro ? 'PRO' : 'FREE',
      badgeColor: isPro
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-64 border-r flex flex-col justify-between transition-colors bg-stone-50/70 dark:bg-stone-950/70 border-stone-200 dark:border-stone-800 select-none shrink-0"
    >
      <div className="p-4 space-y-5 overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <PixDocLogo size={36} />
          <div>
            <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>PixDoc</span>
              <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                100% FREE
              </span>
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              PDF & Image Toolkit
            </p>
          </div>
        </div>

        {/* PDF Tools Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-stone-400 dark:text-stone-500 uppercase">
            PDF Suite
          </p>
          {pdfTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                id={`sidebar-nav-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tool.label}</span>
                </div>
                {tool.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900'
                        : tool.badgeColor || 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Image Tools Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-stone-400 dark:text-stone-500 uppercase">
            Image & Utilities
          </p>
          {imageTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                id={`sidebar-nav-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tool.label}</span>
                </div>
                {tool.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900'
                        : tool.badgeColor || 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System & History */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-stone-400 dark:text-stone-500 uppercase">
            Workspace
          </p>
          {systemTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                id={`sidebar-nav-${tool.id}`}
                onClick={() => onSelectTool(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tool.label}</span>
                </div>
                {tool.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900'
                        : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Security & Offline Badge Footer */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight text-stone-600 dark:text-stone-400">
            <span className="font-semibold text-stone-900 dark:text-stone-200 block mb-0.5">
              PixDoc - 100% Free & Local
            </span>
            Zero upload fees. All file processing runs right in your browser.
          </div>
        </div>
      </div>
    </aside>
  );
};

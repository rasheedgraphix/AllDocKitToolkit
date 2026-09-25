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
  Volume2,
  FileCode,
  FileText,
  X,
  Crown,
} from 'lucide-react';
import { ToolId } from '../types';
import { PixDocLogo } from './PixDocLogo';
import { AdBanner } from './ads/AdBanner';
import { checkLicense } from '../utils/license';

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (id: ToolId) => void;
  historyCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
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
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [license, setLicense] = useState(checkLicense());

  useEffect(() => {
    const handleUpdate = () => setLicense(checkLicense());
    window.addEventListener('license-updated', handleUpdate);
    return () => window.removeEventListener('license-updated', handleUpdate);
  }, []);

  const isPro = license.isPro;

  const handleToolClick = (id: ToolId) => {
    onSelectTool(id);
    if (onCloseMobile) onCloseMobile();
  };

  const pdfTools: NavItem[] = [
    { id: 'pdf-merger', label: 'PDF Merger', icon: Files },
    { id: 'pdf-splitter', label: 'PDF Splitter', icon: Scissors },
    {
      id: 'html-to-pdf',
      label: 'HTML to PDF',
      icon: FileCode,
      badge: 'NEW',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'pdf-to-html',
      label: 'PDF to HTML',
      icon: FileText,
      badge: 'NEW',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
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
    {
      id: 'text-to-speech',
      label: 'Text to Speech (Voice)',
      icon: Volume2,
      badge: 'OFFLINE',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    },
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar overlay"
          onClick={onCloseMobile}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onCloseMobile?.();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden cursor-pointer animate-fade-in"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto w-68 border-r flex flex-col justify-between transition-transform duration-200 ease-in-out bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 select-none shrink-0 shadow-2xl lg:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Brand + Mobile Close Button */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5">
              <PixDocLogo size={36} />
              <div>
                <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>AllDocKit</span>
                  <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    100% FREE
                  </span>
                </h2>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  All-in-One Document Kit
                </p>
              </div>
            </div>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                aria-label="Close navigation sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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
                  onClick={() => handleToolClick(tool.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap truncate">{tool.label}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
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
                  onClick={() => handleToolClick(tool.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap truncate">{tool.label}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
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
                  onClick={() => handleToolClick(tool.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap truncate">{tool.label}</span>
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
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

            {/* Conditional Online Sidebar Ad / Sponsor */}
            <AdBanner slotType="sidebar" />
          </div>

          {/* Pro Upgrade Callout in Sidebar */}
          {!isPro && (
            <div className="pt-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-500/30 text-stone-900 dark:text-stone-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-400">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>AllDocKit Pro</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-black tracking-wide">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-stone-600 dark:text-stone-400 mb-2 leading-tight">
                  Unlimited operations, zero ads, batch tools. EasyPaisa / Card.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-upgrade-modal', { detail: { plan: 'annual' } }));
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Upgrade to Pro</span>
                </button>
              </div>
            </div>
          )}

          {isPro && (
            <div className="pt-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs font-bold">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">AllDocKit Pro Activated</span>
              </div>
            </div>
          )}
        </div>

        {/* Security & Offline Badge Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-900 dark:text-stone-200 block mb-0.5">
                AllDocKit - 100% Private & Local
              </span>
              100% client-side. All document processing runs securely on your device.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

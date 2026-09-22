/**
 * PDF & Image Toolkit - All in One Offline
 * 100% Client-side local processing using pdf-lib, Canvas, and Web APIs.
 * Ready for Tauri desktop packaging and browser usage.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolId, HistoryItem, AppSettings } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PdfMergerView } from './components/tools/PdfMergerView';
import { PdfSplitterView } from './components/tools/PdfSplitterView';
import { PdfCompressorView } from './components/tools/PdfCompressorView';
import { ImagesToPdfView } from './components/tools/ImagesToPdfView';
import { ImageConverterView } from './components/tools/ImageConverterView';
import { ImageResizerView } from './components/tools/ImageResizerView';
import { HistoryView } from './components/tools/HistoryView';
import { SettingsView } from './components/tools/SettingsView';
import { checkForUpdate, UpdateInfo } from './utils/updater';
import { UpdateModal } from './components/UpdateModal';
import {
  requestNotificationPermission,
  onMessageListener,
  emitInAppNotification,
  AppNotification,
} from './utils/firebase';
import { NotificationToast } from './components/NotificationToast';

const TOOL_NAMES: Record<ToolId, string> = {
  'pdf-merger': 'PDF Merger',
  'pdf-splitter': 'PDF Splitter & Page Remover',
  'pdf-compressor': 'PDF Compressor',
  'images-to-pdf': 'Images to PDF',
  'image-converter': 'Image Converter (PNG, JPG, WEBP, HEIC)',
  'image-compressor': 'Image Compressor & Resizer (-90%)',
  history: 'Conversion History',
  settings: 'Desktop Settings & Packaging',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultImageQuality: 85,
  defaultPdfCompression: 'medium',
  preserveTransparency: true,
  autoDownloadAfterProcess: false,
  historyLimit: 50,
};

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('pdf-merger');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [autoUpdateInfo, setAutoUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showAutoUpdateModal, setShowAutoUpdateModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);

  // Silently check for updates 3 seconds after application startup
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await checkForUpdate();
        if (update.hasUpdate) {
          setAutoUpdateInfo(update);
          setShowAutoUpdateModal(true);
        }
      } catch (err) {
        console.warn('Silent update check failed:', err);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Request Notification permission after 5 seconds
  useEffect(() => {
    const notifTimer = setTimeout(async () => {
      try {
        await requestNotificationPermission();
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    }, 5000);
    return () => clearTimeout(notifTimer);
  }, []);

  // Listen for foreground FCM and in-app notifications
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      setToastNotification(payload);
    });

    // Demonstrate initial update notification (e.g. "New PDF compress feature added!")
    const sampleTimer = setTimeout(() => {
      if (localStorage.getItem('notifications_enabled') === 'true') {
        emitInAppNotification({
          title: 'PixDoc Notification',
          body: 'New PDF compress feature added! Enjoy up to 90% file size reduction.',
        });
      }
    }, 7000);

    return () => {
      unsubscribe();
      clearTimeout(sampleTimer);
    };
  }, []);

  // Apply dark mode class to html document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  // Listen for upgrade navigation event
  useEffect(() => {
    const handleOpenUpgrade = () => {
      setActiveTool('settings');
    };
    window.addEventListener('open-upgrade-settings', handleOpenUpgrade);
    return () => window.removeEventListener('open-upgrade-settings', handleOpenUpgrade);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleAddToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    setHistory((prev) => [newItem, ...prev].slice(0, settings.historyLimit));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
      return updated;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setTheme(DEFAULT_SETTINGS.theme);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100 font-sans transition-colors antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTool={activeTool}
          theme={theme}
          onToggleTheme={toggleTheme}
          toolNames={TOOL_NAMES}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTool === 'pdf-merger' && (
                <PdfMergerView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'pdf-splitter' && (
                <PdfSplitterView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'pdf-compressor' && (
                <PdfCompressorView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'images-to-pdf' && (
                <ImagesToPdfView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'image-converter' && (
                <ImageConverterView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'image-compressor' && (
                <ImageResizerView onAddToHistory={handleAddToHistory} />
              )}
              {activeTool === 'history' && (
                <HistoryView history={history} onClearHistory={handleClearHistory} />
              )}
              {activeTool === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onResetSettings={handleResetSettings}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Auto-Update Prompt Modal */}
      <UpdateModal
        isOpen={showAutoUpdateModal}
        updateInfo={autoUpdateInfo}
        onClose={() => setShowAutoUpdateModal(false)}
      />

      {/* Floating In-App Notification Toast */}
      <NotificationToast
        notification={toastNotification}
        onDismiss={() => setToastNotification(null)}
      />
    </div>
  );
}

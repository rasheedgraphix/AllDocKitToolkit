import React, { useState, useEffect } from 'react';
import { Key, Check, X, ExternalLink, Shield } from 'lucide-react';
import { getClientApiKey, setClientApiKey } from '../../utils/aiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getClientApiKey());
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setClientApiKey(apiKey.trim());
    setIsSaved(true);
    onSave?.(apiKey.trim());
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Key className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
              AI Intelligence API Key
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-stone-600 dark:text-stone-400">
          <p>
            When running on <strong>GitHub Pages</strong> or offline static hosting, provide a free Google Gemini API Key to enable <strong>100% Perfect Urdu Nastaliq OCR &amp; Audio Transcription</strong>.
          </p>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
              <Shield className="w-3.5 h-3.5" />
              100% Free &amp; Private
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Your key is saved locally in your browser storage only. Zero server sharing.
            </p>
          </div>

          <div className="space-y-1 pt-1">
            <label htmlFor="modal-gemini-key-input" className="font-bold block text-stone-800 dark:text-stone-200">
              Gemini API Key
            </label>
            <input
              id="modal-gemini-key-input"
              name="geminiApiKey"
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-xs text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-amber-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
            >
              Get Free Key from Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
            {isSaved ? 'Saved Locally!' : 'Save & Activate AI'}
          </button>
        </div>
      </div>
    </div>
  );
};

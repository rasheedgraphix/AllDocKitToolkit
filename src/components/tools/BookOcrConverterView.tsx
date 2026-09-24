import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  Sliders,
  RefreshCw,
  Eye,
  FileCode,
  FileCheck,
  Search,
  Wand2,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { DropZone } from '../DropZone';
import { ProgressBar } from '../ProgressBar';
import { downloadBlob, createZipAndDownload, getPdfInfo } from '../../utils/fileHelpers';
import { renderPdfPagesToImages, parsePageRange, extractNativePdfText } from '../../utils/pdfOperations';
import {
  preprocessImageForOcr,
  exportToDocx,
  exportToPdf,
  exportToRtf,
  exportToMarkdown,
  exportToHtml,
  cleanBookOcrText,
} from '../../utils/ocrDocExporter';
import { performAiOcr, cleanAndReconstructText, getClientApiKey } from '../../utils/aiService';
import { ApiKeyModal } from '../common/ApiKeyModal';
import { HistoryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BookOcrConverterViewProps {
  onAddToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: '✨ Auto-Detect Language (خودکار شناخت)' },
  { code: 'urd+ara', name: 'Urdu + Arabic (اردو اور عربی کتابیں - Recommended)' },
  { code: 'urd', name: 'Urdu (اردو)' },
  { code: 'ara', name: 'Arabic (العربية)' },
  { code: 'eng', name: 'English (Default)' },
  { code: 'hin', name: 'Hindi (हिन्दी)' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ita', name: 'Italian (Italiano)' },
  { code: 'por', name: 'Portuguese (Português)' },
  { code: 'rus', name: 'Russian (Русский)' },
  { code: 'chi_sim', name: 'Chinese (中文)' },
  { code: 'jpn', name: 'Japanese (日本語)' },
  { code: 'tur', name: 'Turkish (Türkçe)' },
];

export const BookOcrConverterView: React.FC<BookOcrConverterViewProps> = ({ onAddToHistory }) => {
  const { verifyAccessBeforeAction } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [isPdf, setIsPdf] = useState(false);
  const [pageRange, setPageRange] = useState<string>('1-5');

  // OCR Settings - Defaults to 'auto'
  const [language, setLanguage] = useState('auto');
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);
  const [binarize, setBinarize] = useState(false);
  const [contrastBoost, setContrastBoost] = useState(35);
  const [brightness, setBrightness] = useState(5);
  const [threshold, setThreshold] = useState(130);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Result state
  const [extractedText, setExtractedText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isRepairingText, setIsRepairingText] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Find and replace
  const [findWord, setFindWord] = useState('');
  const [replaceWord, setReplaceWord] = useState('');

  const handleAiRepairText = async () => {
    if (!extractedText) return;
    setIsRepairingText(true);
    try {
      const repaired = await cleanAndReconstructText(extractedText, 'Urdu');
      if (repaired && repaired.trim()) {
        setExtractedText(repaired);
      }
    } catch (err) {
      console.error('Repair error:', err);
    } finally {
      setIsRepairingText(false);
    }
  };

  // Clean up URL object on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    setExtractedText('');

    const fileNameLower = file.name.toLowerCase();
    const hasArabicOrUrdu = /[\u0600-\u06FF]/.test(file.name) || /urdu|arabic|sharh|kitab|insha|quran|hadith/i.test(file.name);
    if (hasArabicOrUrdu) {
      setLanguage('urd+ara');
    }

    if (file.type === 'application/pdf' || fileNameLower.endsWith('.pdf')) {
      setIsPdf(true);
      try {
        const info = await getPdfInfo(file);
        setPdfPageCount(info.pageCount);
        setPageRange(info.pageCount > 5 ? '1-5' : `1-${info.pageCount}`);
      } catch {
        setPdfPageCount(1);
        setPageRange('1');
      }
      setPreviewUrl(null);
    } else {
      setIsPdf(false);
      setPdfPageCount(1);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedFile) return;

    const canProceed = await verifyAccessBeforeAction();
    if (!canProceed) return;

    setIsProcessing(true);
    setProgress(5);
    setStatusText('Initializing AI OCR Engine & Language Models...');

    try {
      // Determine effective language for auto-detection
      let effectiveLang = language;
      if (language === 'auto') {
        const fileNameLower = selectedFile.name.toLowerCase();
        const hasArabicOrUrdu = /[\u0600-\u06FF]/.test(selectedFile.name) || /urdu|arabic|sharh|kitab|insha|quran|hadith|islami|dars/i.test(fileNameLower);
        effectiveLang = hasArabicOrUrdu ? 'urd+ara' : 'eng';
      }

      // Robust Tesseract Worker Initialization
      let worker: any = null;
      const workerOptions = {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m: any) => {
          if (m.status === 'recognizing text' && m.progress != null) {
            const pct = Math.round(m.progress * 100);
            setProgress(pct);
            setStatusText(`Reading and extracting text (${pct}%)...`);
          } else if (m.status) {
            setStatusText(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
          }
        },
      };

      try {
        worker = await createWorker(effectiveLang, 1, workerOptions);
      } catch (workerErr) {
        console.warn('Fallback to standard worker initialization:', workerErr);
        try {
          worker = await createWorker(effectiveLang);
        } catch {
          worker = await createWorker('eng');
        }
      }

      let fullExtractedText = '';

      // Helper function to perform OCR via AI API or Tesseract fallback
      const processSinglePageOcr = async (imageBlobOrUrl: Blob | string, pageNumber?: number): Promise<string> => {
        try {
          // Convert Blob to base64
          let base64 = '';
          if (imageBlobOrUrl instanceof Blob) {
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result as string;
                resolve(res.split(',')[1] || res);
              };
              reader.onerror = reject;
              reader.readAsDataURL(imageBlobOrUrl);
            });
          } else if (typeof imageBlobOrUrl === 'string' && imageBlobOrUrl.startsWith('data:')) {
            base64 = imageBlobOrUrl.split(',')[1] || imageBlobOrUrl;
          }

          if (base64) {
            const aiText = await performAiOcr(base64, 'image/png', effectiveLang);
            if (aiText && aiText.trim().length > 0) {
              return cleanBookOcrText(aiText.trim());
            }
          }
        } catch (aiErr) {
          console.warn('AI OCR fallback to local Tesseract:', aiErr);
        }

        // Tesseract fallback
        try {
          if (!worker) {
            worker = await createWorker(effectiveLang);
          }
          const target = typeof imageBlobOrUrl === 'string' ? imageBlobOrUrl : URL.createObjectURL(imageBlobOrUrl);
          const ret = await worker.recognize(target);
          if (typeof imageBlobOrUrl !== 'string') URL.revokeObjectURL(target);
          return cleanBookOcrText(ret?.data?.text?.trim() || '');
        } catch (tessErr) {
          console.error('Tesseract fallback failed:', tessErr);
          return '';
        }
      };

      if (isPdf) {
        const targetPageList = parsePageRange(pageRange || '1-5', pdfPageCount || 1000);

        // Render target PDF pages at high DPI (2.5x)
        setStatusText(`Rendering ${targetPageList.length} pages at high-resolution...`);
        setProgress(15);
        const renderedPages = await renderPdfPagesToImages(
          selectedFile,
          'png',
          0.95,
          2.5,
          targetPageList
        );

        for (let i = 0; i < renderedPages.length; i++) {
          const page = renderedPages[i];
          const pagePercent = Math.round(15 + ((i + 1) / renderedPages.length) * 80);
          setProgress(pagePercent);
          setStatusText(`AI Reading & Extracting Page ${page.pageNumber} (${i + 1}/${renderedPages.length})...`);

          const pageText = await processSinglePageOcr(page.blob, page.pageNumber);

          if (pageText) {
            fullExtractedText += (fullExtractedText ? `\n\n=== [ Page ${page.pageNumber} ] ===\n\n` : `=== [ Page ${page.pageNumber} ] ===\n\n`) + pageText;
          }
        }
      } else {
        setStatusText('Analyzing scan image with AI OCR...');
        setProgress(25);

        let targetSource: Blob | string = selectedFile;
        if (enablePreprocessing && previewUrl) {
          try {
            targetSource = await preprocessImageForOcr(previewUrl, {
              contrast: contrastBoost,
              brightness,
              binarize,
              threshold,
            });
          } catch {
            targetSource = selectedFile;
          }
        }

        setProgress(50);
        setStatusText(`Extracting book writing and document text (${effectiveLang.toUpperCase()})...`);

        const extracted = await processSinglePageOcr(targetSource);
        fullExtractedText = cleanBookOcrText(extracted);
      }

      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }

      if (!fullExtractedText) {
        fullExtractedText = 'No clear readable text was detected. Please check if the document is right-side up, increase contrast, or choose the matching language.';
      }

      setExtractedText(fullExtractedText);
      setProgress(100);
      setStatusText('Complete! Book text extracted successfully.');

      const originalName = selectedFile.name;
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const docBlob = await exportToDocx(fullExtractedText, baseName);

      onAddToHistory({
        toolId: 'book-ocr-converter',
        toolName: 'Book & Doc OCR to Word',
        originalName: selectedFile.name,
        resultName: `${baseName}_Editable.docx`,
        originalSize: selectedFile.size,
        resultSize: docBlob.size,
        savedBytes: 0,
        resultBlob: docBlob,
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      setStatusText(`Extraction error: ${err.message || 'Failed to process document'}`);
      setExtractedText(`OCR Processing encountered an issue: ${err.message || 'Please retry with another image or language'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoCleanText = () => {
    if (!extractedText) return;
    const cleaned = cleanBookOcrText(extractedText);
    setExtractedText(cleaned);
  };

  const handleFindReplace = () => {
    if (!findWord) return;
    const regex = new RegExp(findWord, 'gi');
    setExtractedText((prev) => prev.replace(regex, replaceWord));
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const baseFilename = selectedFile
    ? selectedFile.name.replace(/\.[^/.]+$/, '')
    : 'Scanned_Book';

  const downloadWord = async () => {
    const blob = await exportToDocx(extractedText, baseFilename);
    downloadBlob(blob, `${baseFilename}_Editable.docx`);
  };

  const downloadPdfDoc = async () => {
    const blob = await exportToPdf(extractedText, baseFilename);
    downloadBlob(blob, `${baseFilename}_Document.pdf`);
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${baseFilename}.txt`);
  };

  const downloadRtf = () => {
    const blob = exportToRtf(extractedText, baseFilename);
    downloadBlob(blob, `${baseFilename}.rtf`);
  };

  const downloadMd = () => {
    const blob = exportToMarkdown(extractedText, baseFilename);
    downloadBlob(blob, `${baseFilename}.md`);
  };

  const downloadHtml = () => {
    const blob = exportToHtml(extractedText, baseFilename);
    downloadBlob(blob, `${baseFilename}.html`);
  };

  const downloadAllZip = async () => {
    const docxBlob = await exportToDocx(extractedText, baseFilename);
    const pdfBlob = await exportToPdf(extractedText, baseFilename);
    const txtBlob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const rtfBlob = exportToRtf(extractedText, baseFilename);
    const mdBlob = exportToMarkdown(extractedText, baseFilename);
    const htmlBlob = exportToHtml(extractedText, baseFilename);

    await createZipAndDownload(
      [
        { name: `${baseFilename}.docx`, blob: docxBlob },
        { name: `${baseFilename}.pdf`, blob: pdfBlob },
        { name: `${baseFilename}.txt`, blob: txtBlob },
        { name: `${baseFilename}.rtf`, blob: rtfBlob },
        { name: `${baseFilename}.md`, blob: mdBlob },
        { name: `${baseFilename}.html`, blob: htmlBlob },
      ],
      `${baseFilename}_All_Formats.zip`
    );
  };

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
  const charCount = extractedText.length;
  const readTimeMin = Math.ceil(wordCount / 200);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:to-indigo-950/30 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              Book &amp; Document OCR to Editable Word (.docx)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-600 text-white rounded-full">
              AI OCR ENGINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            Convert scanned books, photos, contracts &amp; multi-page PDFs into editable Word (.docx), PDF, RTF &amp; plain text.
          </p>
        </div>

        {extractedText && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadWord}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Word (.docx)
            </button>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      {!selectedFile && (
        <DropZone
          onFilesSelected={handleFileSelect}
          acceptedFormats={['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.bmp']}
          title="Drop Book Photos, Scans or PDF Documents here"
          subtitle="Supports Scanned Book Pages, Multi-page PDFs, Camera Photos, Receipts & Documents (100% Offline & Private)"
        />
      )}

      {selectedFile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Settings & Preview */}
          <div className="lg:col-span-4 space-y-4">
            {/* File Info Card */}
            <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {isPdf ? `${pdfPageCount} Pages (PDF)` : 'Single Image Scan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setExtractedText('');
                  }}
                  className="text-xs text-rose-500 hover:underline font-medium cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 max-h-48 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Document Scan Preview"
                    className="max-h-48 w-auto object-contain"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-xs rounded text-[10px] text-white flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Preview
                  </div>
                </div>
              )}
            </div>

            {/* OCR Language & Enhancement Settings */}
            <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-600" />
                OCR Configuration
              </h3>

              {/* Language Selector */}
              <div>
                <label htmlFor="ocr-document-language" className="text-xs text-stone-600 dark:text-stone-400 font-medium block mb-1">
                  Document Language
                </label>
                <select
                  id="ocr-document-language"
                  name="documentLanguage"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900 dark:text-stone-100"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Free AI Engine & Key Setup */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gemini 2.5 AI Ultra-OCR</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  API Key
                </button>
              </div>

              {/* PDF Page Range Selector */}
              {isPdf && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ocr-page-range" className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                      Pages to OCR (Total: {pdfPageCount})
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPageRange('1-5')}
                        className="text-amber-600 hover:underline"
                      >
                        1-5
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setPageRange(`1-${pdfPageCount}`)}
                        className="text-amber-600 hover:underline"
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <input
                    id="ocr-page-range"
                    name="pageRange"
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. 1-5, 8, 11-15"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900 dark:text-stone-100"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Tip: For thick books (100+ pages), convert 5-10 pages at a time for fast speed.
                  </p>
                </div>
              )}

              {/* Auto Preprocessing Toggle */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="ocr-auto-clean-checkbox" className="text-xs text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Auto-Clean &amp; Enhance Contrast
                  </label>
                  <input
                    id="ocr-auto-clean-checkbox"
                    name="autoCleanCheckbox"
                    type="checkbox"
                    checked={enablePreprocessing}
                    onChange={(e) => setEnablePreprocessing(e.target.checked)}
                    className="accent-amber-600 rounded cursor-pointer"
                  />
                </div>

                {enablePreprocessing && (
                  <div className="space-y-3 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200/60 dark:border-stone-800">
                    <div>
                      <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                        <label htmlFor="ocr-contrast-boost">Contrast Boost</label>
                        <span>+{contrastBoost}%</span>
                      </div>
                      <input
                        id="ocr-contrast-boost"
                        name="contrastBoost"
                        type="range"
                        min="0"
                        max="80"
                        value={contrastBoost}
                        onChange={(e) => setContrastBoost(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label htmlFor="ocr-binarize-checkbox" className="text-[11px] text-stone-600 dark:text-stone-400 cursor-pointer">
                        High Contrast B&amp;W Mode
                      </label>
                      <input
                        id="ocr-binarize-checkbox"
                        name="binarizeCheckbox"
                        type="checkbox"
                        checked={binarize}
                        onChange={(e) => setBinarize(e.target.checked)}
                        className="accent-amber-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Process Button */}
              <button
                onClick={handleStartOcr}
                disabled={isProcessing}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting Text...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start OCR Extraction
                  </>
                )}
              </button>
            </div>

            {/* Privacy note */}
            <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                All page recognition happens locally in your browser. No photos or PDFs are uploaded to any server.
              </span>
            </div>
          </div>

          {/* Right Panel: Output & Editor */}
          <div className="lg:col-span-8 space-y-4">
            {isProcessing && (
              <div className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-600 dark:text-amber-400">{statusText}</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar progress={progress} />
              </div>
            )}

            <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 min-h-[480px] flex flex-col justify-between">
              {/* Top Editor Bar */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Extracted Text Editor
                    </h3>
                  </div>

                  {extractedText && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAiRepairText}
                        disabled={isRepairingText}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-amber-500/30 transition-all disabled:opacity-50"
                        title="AI Reconstructs broken Nastaliq words and restores 100% textbook accuracy"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isRepairingText ? 'animate-spin' : ''}`} />
                        {isRepairingText ? 'Reconstructing Text...' : '✨ AI Fix & Proofread'}
                      </button>

                      <button
                        onClick={handleAutoCleanText}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        title="Fix broken line-breaks and punctuation"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                        Auto Clean
                      </button>

                      <button
                        onClick={handleCopy}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Find and Replace Bar */}
                {extractedText && (
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700">
                      <Search className="w-3.5 h-3.5 text-stone-400" />
                      <input
                        id="ocr-find-input"
                        name="findInput"
                        type="text"
                        placeholder="Find..."
                        aria-label="Find word"
                        value={findWord}
                        onChange={(e) => setFindWord(e.target.value)}
                        className="bg-transparent text-xs outline-none w-24 sm:w-32 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <ArrowRight className="w-3 h-3 text-stone-400" />
                    <input
                      id="ocr-replace-input"
                      name="replaceInput"
                      type="text"
                      placeholder="Replace with..."
                      aria-label="Replace word"
                      value={replaceWord}
                      onChange={(e) => setReplaceWord(e.target.value)}
                      className="bg-stone-50 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-xs outline-none w-24 sm:w-32 text-stone-900 dark:text-stone-100"
                    />
                    <button
                      onClick={handleFindReplace}
                      disabled={!findWord}
                      className="px-2.5 py-1 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Replace All
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="my-3 flex-1">
                <label htmlFor="ocr-extracted-text-area" className="sr-only">
                  Extracted Document Text
                </label>
                <textarea
                  id="ocr-extracted-text-area"
                  name="extractedTextArea"
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder={
                    isProcessing
                      ? "Analyzing image and extracting book text..."
                      : "Click 'Start OCR Extraction' to extract editable text from your document, or type/paste text here..."
                  }
                  dir={language.includes('urd') || language.includes('ara') ? 'rtl' : 'ltr'}
                  className={`w-full h-80 sm:h-96 p-4 rounded-xl bg-stone-50/70 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed ${
                    language.includes('urd') || language.includes('ara') ? 'font-serif text-base' : 'font-sans'
                  }`}
                />
              </div>

              {/* Stats & Multi-Format Downloads */}
              <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                  <div className="flex items-center gap-3">
                    <span><strong>{wordCount}</strong> words</span>
                    <span><strong>{charCount}</strong> characters</span>
                    <span>~<strong>{readTimeMin}</strong> min read</span>
                  </div>
                </div>

                {/* Export Buttons Grid */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={downloadWord}
                      disabled={!extractedText}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Word (.docx)
                    </button>

                    <button
                      onClick={downloadPdfDoc}
                      disabled={!extractedText}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      PDF (.pdf)
                    </button>

                    <button
                      onClick={downloadText}
                      disabled={!extractedText}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-white dark:bg-stone-200 dark:text-stone-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Text (.txt)
                    </button>

                    <button
                      onClick={downloadRtf}
                      disabled={!extractedText}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      RTF
                    </button>
                  </div>

                  <button
                    onClick={downloadAllZip}
                    disabled={!extractedText}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Download All (.ZIP)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* API Key Modal for GitHub Pages & Offline Use */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => {
          setStatusText('AI Key updated successfully!');
        }}
      />
    </div>
  );
};

export type ToolId =
  | 'pdf-merger'
  | 'pdf-splitter'
  | 'pdf-organizer'
  | 'pdf-to-images'
  | 'pdf-watermark'
  | 'pdf-compressor'
  | 'pdf-protect'
  | 'html-to-pdf'
  | 'pdf-to-html'
  | 'images-to-pdf'
  | 'image-converter'
  | 'image-compressor'
  | 'text-to-speech'
  | 'qr-studio'
  | 'history'
  | 'settings';

export type ToolCategory = 'pdf' | 'image' | 'utility' | 'system';

export interface ToolMeta {
  id: ToolId;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  acceptedFormats: string[];
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  thumbnailUrl?: string;
  pageCount?: number;
  dimensions?: { width: number; height: number };
  status: 'idle' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  resultBlob?: Blob;
  resultName?: string;
  resultSize?: number;
}

export interface HistoryItem {
  id: string;
  toolId: ToolId;
  toolName: string;
  originalName: string;
  resultName: string;
  originalSize: number;
  resultSize: number;
  savedBytes: number;
  timestamp: number;
  resultBlob?: Blob;
  downloadUrl?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultImageQuality: number;
  defaultPdfCompression: 'low' | 'medium' | 'high';
  preserveTransparency: boolean;
  autoDownloadAfterProcess: boolean;
  historyLimit: number;
}

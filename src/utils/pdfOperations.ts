import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

// Ensure PDF.js worker is properly set for Vite / Web browsers
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set pdfjs workerSrc:', e);
  }
}

export interface SplitPdfOptions {
  mode: 'range' | 'delete' | 'every-page';
  pageRange?: string; // e.g. "1-3, 5, 8-10"
  pagesToDelete?: number[]; // 1-indexed
}

export interface ImagesToPdfOptions {
  pageSize: 'fit' | 'a4' | 'letter';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number; // in points (e.g. 0, 18, 36)
}

export interface WatermarkOptions {
  text?: string;
  fontSize?: number;
  opacity?: number; // 0.1 to 1.0
  rotation?: number; // degrees e.g. 45
  colorHex?: string;
  addPageNumbers?: boolean;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right' | 'bottom-left';
  pageNumberFormat?: 'page-of-total' | 'page-only';
}

export interface PageOrganizeItem {
  originalIndex: number; // 0-indexed
  pageNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  isDeleted?: boolean;
  thumbnailUrl?: string;
}

/**
 * Parses user page range string (e.g. "1-3, 5, 7-10") into a set of 1-indexed page numbers
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          pages.add(i);
        }
      }
    } else {
      const single = parseInt(part, 10);
      if (!isNaN(single) && single >= 1 && single <= maxPages) {
        pages.add(single);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePdfFiles(
  files: File[],
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  if (files.length === 0) {
    throw new Error('Please select at least one PDF file to merge.');
  }

  onProgress?.(10, 'Initializing PDF merger...');
  const mergedPdf = await PDFDocument.create();

  const totalFiles = files.length;
  let totalPages = 0;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    onProgress?.(
      Math.round(15 + (i / totalFiles) * 70),
      `Reading ${file.name} (${i + 1}/${totalFiles})...`
    );

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageIndices = pdfDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
      totalPages++;
    }
  }

  onProgress?.(90, 'Finalizing and compiling merged document...');
  const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
  const blob = new Blob([mergedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  onProgress?.(100, 'Merge completed successfully!');
  return { blob, pageCount: totalPages };
}

/**
 * Split or extract pages from a single PDF
 */
export async function splitPdfFile(
  file: File,
  options: SplitPdfOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<{ files: { name: string; blob: Blob; pageCount: number }[] }> {
  onProgress?.(15, `Loading ${file.name}...`);
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const results: { name: string; blob: Blob; pageCount: number }[] = [];

  if (options.mode === 'every-page') {
    onProgress?.(30, 'Splitting each page into individual documents...');
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const pdfBytes = await newDoc.save({ useObjectStreams: true });
      results.push({
        name: `${baseName}_page_${i + 1}.pdf`,
        blob: new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        pageCount: 1,
      });

      onProgress?.(
        Math.round(30 + ((i + 1) / totalPages) * 65),
        `Extracted page ${i + 1} of ${totalPages}`
      );
    }
  } else if (options.mode === 'delete') {
    const pagesToDelete = new Set(options.pagesToDelete || []);
    const pagesToKeep: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (!pagesToDelete.has(p)) {
        pagesToKeep.push(p - 1); // 0-indexed for pdf-lib
      }
    }

    if (pagesToKeep.length === 0) {
      throw new Error('Cannot delete all pages from the document.');
    }

    onProgress?.(50, `Creating PDF with ${pagesToKeep.length} preserved pages...`);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save({ useObjectStreams: true });
    results.push({
      name: `${baseName}_edited.pdf`,
      blob: new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
      pageCount: pagesToKeep.length,
    });
  } else {
    // 'range' mode
    const selected1Indexed = parsePageRange(options.pageRange || '1', totalPages);
    if (selected1Indexed.length === 0) {
      throw new Error('No valid pages found in the specified range.');
    }

    onProgress?.(50, `Extracting ${selected1Indexed.length} pages...`);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(
      srcDoc,
      selected1Indexed.map((p) => p - 1)
    );
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save({ useObjectStreams: true });
    results.push({
      name: `${baseName}_extracted.pdf`,
      blob: new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
      pageCount: selected1Indexed.length,
    });
  }

  onProgress?.(100, 'Split operation completed!');
  return { files: results };
}

/**
 * Compress PDF file locally using structural stream optimization & object condensation
 */
export async function compressPdfFile(
  file: File,
  level: 'low' | 'medium' | 'high',
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; originalSize: number; newSize: number; pageCount: number }> {
  onProgress?.(20, 'Analyzing PDF structural streams...');
  const arrayBuffer = await file.arrayBuffer();
  const originalSize = file.size;

  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const pageCount = pdfDoc.getPageCount();

  onProgress?.(50, `Applying ${level} compression optimizations...`);

  // Strip non-essential metadata headers to save bytes
  if (level === 'medium' || level === 'high') {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('PDF & Image Toolkit Offline');
    pdfDoc.setCreator('PDF & Image Toolkit');
  }

  onProgress?.(80, 'Compressing cross-reference tables and streams...');
  // Re-encode with object stream packing (PDF 1.5+)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  let finalBytes: Uint8Array = compressedBytes as Uint8Array<ArrayBuffer>;

  // If high compression requested and the result is close, we perform structural repacking
  if (level === 'high') {
    onProgress?.(90, 'Applying high-density stream repacking...');
    const repackDoc = await PDFDocument.create();
    const copiedPages = await repackDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((p) => repackDoc.addPage(p));
    finalBytes = await repackDoc.save({ useObjectStreams: true }) as Uint8Array<ArrayBuffer>;
  }

  const blob = new Blob([finalBytes as unknown as BlobPart], { type: 'application/pdf' });
  onProgress?.(100, 'Compression completed!');

  return {
    blob,
    originalSize,
    newSize: blob.size,
    pageCount,
  };
}

/**
 * Helper to convert any image file (including WEBP/BMP/etc.) into PNG/JPEG bytes for PDF embedding
 */
async function prepareImageForPdf(
  file: File
): Promise<{ type: 'jpg' | 'png'; bytes: Uint8Array }> {
  const isJpg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

  if (isJpg) {
    const buffer = await file.arrayBuffer();
    return { type: 'jpg', bytes: new Uint8Array(buffer) };
  }

  if (isPng) {
    const buffer = await file.arrayBuffer();
    return { type: 'png', bytes: new Uint8Array(buffer) };
  }

  // Fallback for WEBP, SVG, GIF, etc. -> draw to canvas and export as high quality JPEG/PNG
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Failed to process image buffer'));
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve({ type: 'png', bytes: new Uint8Array(buffer) });
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = objectUrl;
  });
}

/**
 * Convert multiple image files into a single PDF document
 */
export async function convertImagesToPdf(
  imageFiles: File[],
  options: ImagesToPdfOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  if (imageFiles.length === 0) {
    throw new Error('Please select at least one image file.');
  }

  onProgress?.(10, 'Creating PDF document...');
  const pdfDoc = await PDFDocument.create();

  const total = imageFiles.length;

  for (let i = 0; i < total; i++) {
    const file = imageFiles[i];
    onProgress?.(
      Math.round(15 + (i / total) * 75),
      `Processing image ${i + 1} of ${total} (${file.name})...`
    );

    const { type, bytes } = await prepareImageForPdf(file);
    const embeddedImage =
      type === 'jpg' ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      pageWidth = imgWidth + options.margin * 2;
      pageHeight = imgHeight + options.margin * 2;
    } else {
      // Standard A4: 595.28 x 841.89 pt, Letter: 612 x 792 pt
      let baseW = options.pageSize === 'a4' ? 595.28 : 612;
      let baseH = options.pageSize === 'a4' ? 841.89 : 792;

      if (options.orientation === 'landscape') {
        [baseW, baseH] = [Math.max(baseW, baseH), Math.min(baseW, baseH)];
      } else if (options.orientation === 'portrait') {
        [baseW, baseH] = [Math.min(baseW, baseH), Math.max(baseW, baseH)];
      } else {
        // Auto match image aspect ratio
        if (imgWidth > imgHeight) {
          [baseW, baseH] = [Math.max(baseW, baseH), Math.min(baseW, baseH)];
        } else {
          [baseW, baseH] = [Math.min(baseW, baseH), Math.max(baseW, baseH)];
        }
      }

      pageWidth = baseW;
      pageHeight = baseH;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate fitted dimensions within margins
    const availableW = pageWidth - options.margin * 2;
    const availableH = pageHeight - options.margin * 2;

    const scale = Math.min(availableW / imgWidth, availableH / imgHeight, 1);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    const posX = options.margin + (availableW - drawW) / 2;
    const posY = options.margin + (availableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x: posX,
      y: posY,
      width: drawW,
      height: drawH,
    });
  }

  onProgress?.(92, 'Generating final PDF document...');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  onProgress?.(100, 'Images converted to PDF successfully!');
  return { blob, pageCount: total };
}

/**
 * Render all pages of a PDF to image blobs (PNG or JPG)
 */
export async function renderPdfPagesToImages(
  file: File,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92,
  dpiScale: number = 2.0,
  onProgress?: (progress: number, status: string) => void
): Promise<{ pageNumber: number; blob: Blob; width: number; height: number }[]> {
  onProgress?.(10, 'Loading PDF document into memory...');
  const arrayBuffer = await file.arrayBuffer();

  // Load document using pdfjs
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const results: { pageNumber: number; blob: Blob; width: number; height: number }[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(
      Math.round(15 + (i / numPages) * 75),
      `Rendering page ${i} of ${numPages} (${format.toUpperCase()})...`
    );

    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: dpiScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create Canvas 2D context');

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // Render page
    const renderContext: any = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    await (page.render(renderContext) as any).promise;

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to render page ${i} to image`));
        },
        mimeType,
        quality
      );
    });

    results.push({
      pageNumber: i,
      blob,
      width: canvas.width,
      height: canvas.height,
    });
  }

  onProgress?.(100, 'Finished extracting all PDF pages as images!');
  return results;
}

/**
 * Generate quick low-res thumbnails for PDF pages (for Page Organizer)
 */
export async function generatePdfPageThumbnails(
  file: File,
  onProgress?: (p: number) => void
): Promise<{ pageNumber: number; thumbnailUrl: string; width: number; height: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const thumbnails: { pageNumber: number; thumbnailUrl: string; width: number; height: number }[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(Math.round((i / numPages) * 100));
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 0.35 });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderParams: any = {
      canvasContext: ctx,
      viewport: viewport,
      canvas: canvas,
    };

    await (page.render(renderParams) as any).promise;

    thumbnails.push({
      pageNumber: i,
      thumbnailUrl: canvas.toDataURL('image/jpeg', 0.7),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return thumbnails;
}

/**
 * Reorder, rotate, or delete specific pages of a PDF
 */
export async function organizePdfPages(
  file: File,
  pageItems: PageOrganizeItem[],
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(15, 'Loading source PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const outputDoc = await PDFDocument.create();

  const activePages = pageItems.filter((p) => !p.isDeleted);
  if (activePages.length === 0) {
    throw new Error('At least one page must be kept in the document.');
  }

  const total = activePages.length;

  for (let i = 0; i < total; i++) {
    const item = activePages[i];
    onProgress?.(
      Math.round(20 + (i / total) * 70),
      `Arranging page ${i + 1} of ${total} (Rotation: ${item.rotation}°)...`
    );

    // Copy original page
    const [copiedPage] = await outputDoc.copyPages(srcDoc, [item.originalIndex]);

    // Apply rotation
    if (item.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
    }

    outputDoc.addPage(copiedPage);
  }

  onProgress?.(92, 'Finalizing organized document...');
  const pdfBytes = await outputDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  onProgress?.(100, 'Organized PDF saved successfully!');
  return { blob, pageCount: total };
}

/**
 * Helper to parse hex color to rgb [0-1]
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0;
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Add customizable watermark and/or page numbers to all pages of a PDF
 */
export async function addWatermarkAndPageNumbers(
  file: File,
  options: WatermarkOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(15, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const watermarkText = options.text?.trim() || '';
  const fontSize = options.fontSize || 42;
  const opacity = options.opacity !== undefined ? options.opacity : 0.3;
  const rotationDegrees = options.rotation !== undefined ? options.rotation : 45;
  const rgbColor = options.colorHex ? hexToRgb(options.colorHex) : { r: 0.5, g: 0.5, b: 0.5 };

  for (let i = 0; i < totalPages; i++) {
    onProgress?.(
      Math.round(20 + (i / totalPages) * 70),
      `Watermarking page ${i + 1} of ${totalPages}...`
    );

    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Draw Text Watermark if text is provided
    if (watermarkText) {
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Draw centered with angle
      page.drawText(watermarkText, {
        x: width / 2 - (textWidth / 2) * Math.cos((rotationDegrees * Math.PI) / 180),
        y: height / 2 - (textHeight / 2) * Math.sin((rotationDegrees * Math.PI) / 180),
        size: fontSize,
        font: font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity: opacity,
        rotate: degrees(rotationDegrees),
      });
    }

    // 2. Draw Page Numbers if enabled
    if (options.addPageNumbers) {
      const pageText =
        options.pageNumberFormat === 'page-only'
          ? `Page ${i + 1}`
          : `Page ${i + 1} of ${totalPages}`;

      const numFontSize = 10;
      const numWidth = regularFont.widthOfTextAtSize(pageText, numFontSize);
      let posX = 30;
      let posY = 20;

      const pos = options.pageNumberPosition || 'bottom-center';
      if (pos === 'bottom-center') {
        posX = (width - numWidth) / 2;
        posY = 24;
      } else if (pos === 'bottom-right') {
        posX = width - numWidth - 30;
        posY = 24;
      } else if (pos === 'bottom-left') {
        posX = 30;
        posY = 24;
      } else if (pos === 'top-right') {
        posX = width - numWidth - 30;
        posY = height - 30;
      }

      page.drawText(pageText, {
        x: posX,
        y: posY,
        size: numFontSize,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 0.85,
      });
    }
  }

  onProgress?.(92, 'Compiling watermarked PDF...');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  onProgress?.(100, 'Watermark applied successfully!');
  return { blob, pageCount: totalPages };
}

/**
 * Protect PDF with real AES-256 standard password encryption
 */
export async function protectPdfDocument(
  file: File,
  password: string,
  options?: {
    allowPrinting?: boolean;
    allowCopying?: boolean;
  },
  onProgress?: (progress: number, status: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(15, 'Reading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  onProgress?.(40, 'Compiling document payload...');
  const rawBytes = await pdfDoc.save({ useObjectStreams: true });

  onProgress?.(70, 'Encrypting PDF streams with AES-256 encryption...');
  const encryptedBytes = await encryptPDF(rawBytes, password, {
    algorithm: 'AES-256',
    ownerPassword: password,
    allowPrinting: options?.allowPrinting !== false,
    allowHighQualityPrint: options?.allowPrinting !== false,
    allowCopying: options?.allowCopying !== false,
    allowModifying: false,
    allowAnnotating: false,
    allowFillingForms: true,
  });

  const blob = new Blob([encryptedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  onProgress?.(100, 'Password protection applied successfully!');
  return { blob, pageCount };
}

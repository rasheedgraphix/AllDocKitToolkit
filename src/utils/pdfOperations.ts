import { PDFDocument } from 'pdf-lib';

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

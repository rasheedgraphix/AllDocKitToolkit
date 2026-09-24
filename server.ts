import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({});

app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType, languagePrompt } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Call Gemini to transcribe the audio file
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType || 'audio/mp3',
              },
            },
            {
              text: `Transcribe this audio file accurately.
Language context: ${languagePrompt || 'Urdu / Arabic / English'}.
Instructions:
- Write out the exact words spoken, recited, or sung (e.g. Naat, Hamd, speech, lecture, conversation, or audio note).
- If Urdu, write in clean, legible Urdu script.
- If Arabic, write in proper Arabic script.
- If English, write standard English text.
- Provide ONLY the direct transcript text without any preamble, conversational commentary, or surrounding quotes.`,
            },
          ],
        },
      ],
    });

    const transcript = response.text ? response.text.trim() : '';
    res.json({ transcript });
  } catch (error: any) {
    console.error('Audio Transcription Error:', error);
    try {
      // Fallback attempt with gemini-flash-latest
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: req.body.audioBase64,
                  mimeType: req.body.mimeType || 'audio/mp3',
                },
              },
              {
                text: `Please transcribe this audio into verbatim text. Language: ${req.body.languagePrompt || 'Urdu, Arabic, English'}. Output only the transcript text.`,
              },
            ],
          },
        ],
      });
      res.json({ transcript: fallbackResponse.text ? fallbackResponse.text.trim() : '' });
    } catch (fallbackErr: any) {
      console.error('Fallback Audio Transcription Error:', fallbackErr);
      res.status(500).json({ error: fallbackErr.message || 'Failed to transcribe audio file' });
    }
  }
});

// High-Precision AI OCR for Books, Documents, Urdu & Arabic Nastaliq
app.post('/api/ocr-page', async (req, res) => {
  try {
    const { imageBase64, mimeType, language } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || 'image/png',
              },
            },
            {
              text: `Perform high-precision OCR on this book page / document.
Target Language: ${language || 'Urdu + Arabic (Nastaliq)'}.

Strict Instructions:
1. Extract ALL actual book content, headings, lesson titles (e.g. الدرس الأول, الدرس الثاني), vocabulary, grammar rules, exercises, and Urdu explanations verbatim in proper script.
2. Ignore decorative page borders, floral frames, scanner artifacts, page noise, and small website watermark links (such as besturdubooks.wordpress.com or archive.org).
3. Maintain paragraph layout and line structure.
4. Output ONLY the extracted text of the page. Do NOT include markdown code blocks, preamble, or commentary.`,
            },
          ],
        },
      ],
    });

    const pageText = response.text ? response.text.trim() : '';
    res.json({ text: pageText });
  } catch (ocrErr: any) {
    console.error('AI OCR Error:', ocrErr);
    res.status(500).json({ error: ocrErr.message || 'AI OCR Failed' });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PixDoc Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();

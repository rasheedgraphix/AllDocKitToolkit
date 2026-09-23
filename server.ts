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

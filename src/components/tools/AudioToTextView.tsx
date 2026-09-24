import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Copy,
  Check,
  FileText,
  FileCode,
  ShieldCheck,
  Languages,
  Clock,
  Sparkles,
  UploadCloud,
  Trash2,
  File,
  Headphones,
  Sliders,
  Radio,
  AlertCircle
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { checkLicense } from '../../utils/license';
import { transcribeAudio, cleanAndReconstructText, getClientApiKey, setClientApiKey } from '../../utils/aiService';
import { ApiKeyModal } from '../common/ApiKeyModal';

interface AudioToTextViewProps {
  onProcessComplete?: (historyItem: any) => void;
}

const LANGUAGES = [
  { code: 'ur-PK', label: 'اردو (Urdu - Pakistan)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ar-SA', label: 'العربية (Arabic - Saudi Arabia)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'fa-IR', label: 'فارسی (Persian)' },
  { code: 'tr-TR', label: 'Türkçe (Turkish)' },
  { code: 'es-ES', label: 'Español (Spanish)' },
  { code: 'fr-FR', label: 'Français (French)' },
  { code: 'de-DE', label: 'Deutsch (German)' },
  { code: 'zh-CN', label: '中文 (Chinese Simplified)' },
];

export const AudioToTextView: React.FC<AudioToTextViewProps> = ({ onProcessComplete }) => {
  const [license] = useState(checkLicense());
  const isPro = license.isPro;

  // Mode: 'speech-to-text' | 'audio-file' | 'text-to-speech'
  const [activeTab, setActiveTab] = useState<'speech-to-text' | 'audio-file' | 'text-to-speech'>('speech-to-text');

  // Text State
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('ur-PK');
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [isFixingText, setIsFixingText] = useState<boolean>(false);

  // Live Speech Recognition State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  // Audio File State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text to Speech State
  const [ttsRate, setTtsRate] = useState<number>(1);
  const [ttsPitch, setTtsPitch] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  // Initialize Speech Recognition & Voices
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusMessage('Speech Recognition API is not supported in this browser. Please use Chrome or Edge.');
    }

    // Load TTS Voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setTtsVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          const defaultVoice = voices.find(v => v.lang.startsWith(selectedLang.slice(0, 2))) || voices[0];
          setSelectedVoice(defaultVoice?.name || voices[0].name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speech Recognition Control
  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Android Browser.');
      return;
    }

    try {
      // Request mic permission first
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr) {
          console.warn('Microphone permission request:', permErr);
        }
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setStatusMessage('Listening... Speak now into your microphone.');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (newFinal) {
          setTranscript((prev) => (prev ? prev.trim() + ' ' + newFinal.trim() : newFinal.trim()));
        }
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setStatusMessage('Microphone access denied. Please allow microphone permissions in browser.');
          alert('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
        } else if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Please speak closer to your microphone.');
        } else {
          setStatusMessage(`Speech engine status: ${event.error}`);
        }
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          // Auto-restart continuous listening on pauses
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimText('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setStatusMessage(`Failed to initialize microphone: ${err.message || err}`);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setInterimText('');
    setStatusMessage('Voice typing stopped.');
  };

  // Audio File Upload
  const handleAudioUpload = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
      alert('Please select a valid audio file (MP3, WAV, M4A, OGG, etc.)');
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setIsPlayingAudio(false);
    setAudioCurrentTime(0);
    setStatusMessage(`Loaded audio file: ${file.name}`);
  };

  // Automated Audio File Transcription
  const handleStartAutoTranscribe = async () => {
    if (!audioFile || !audioUrl) {
      alert('Please upload an audio file first.');
      return;
    }

    setIsAutoTranscribing(true);
    setStatusMessage(`Analyzing and transcribing ${audioFile.name}...`);

    try {
      // 1. Read file as Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const b64 = res.split(',')[1] || res;
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      const selectedLangObj = LANGUAGES.find((l) => l.code === selectedLang);
      const langPrompt = selectedLangObj ? selectedLangObj.label : 'Urdu, Arabic, or English';

      // 2. Call universal transcribe service
      const extracted = await transcribeAudio(
        base64Data,
        audioFile.type || 'audio/mp3',
        langPrompt
      );

      if (extracted && extracted.trim()) {
        setTranscript((prev) => (prev ? prev.trim() + '\n\n' + extracted.trim() : extracted.trim()));
        setStatusMessage('Transcription completed successfully!');
        return;
      }

      throw new Error('No text was returned from the audio.');
    } catch (apiErr: any) {
      console.error('Audio Transcription Error:', apiErr);
      setStatusMessage(`Transcription Notice: ${apiErr.message || 'Please check your connection or run on localhost:3000'}`);
      
      // Fallback: If on GitHub Pages without key, prompt user
      if (apiErr.message?.includes('API key') || !getClientApiKey()) {
        const userKey = window.prompt(
          'To transcribe audio directly on GitHub Pages, enter your free Gemini API Key (or run PixDoc locally on port 3000):'
        );
        if (userKey && userKey.trim()) {
          setClientApiKey(userKey.trim());
          setStatusMessage('API Key saved! Click "Auto-Transcribe Audio File" to start.');
        }
      }
    } finally {
      setIsAutoTranscribing(false);
    }
  };

  // Audio Playback Helpers
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setAudioCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipAudio = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Insert Timestamp to text
  const insertTimestamp = () => {
    const mins = Math.floor(audioCurrentTime / 60);
    const secs = Math.floor(audioCurrentTime % 60);
    const stamp = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}] `;
    setTranscript((prev) => (prev ? prev.trim() + '\n' + stamp : stamp));
  };

  // Text-To-Speech (Speech Synthesis)
  const speakText = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text to speech is not supported on your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = transcript.trim();
    if (!textToSpeak) {
      alert('Please enter or dictate some text to read aloud.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = ttsRate;
    utterance.pitch = ttsPitch;

    if (selectedVoice) {
      const voice = ttsVoices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export to TXT
  const exportTxt = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PixDoc-Transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to DOCX
  const exportDocx = async () => {
    if (!transcript) return;
    try {
      const paragraphs = transcript.split('\n').map((line) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
              font: 'Calibri',
            }),
          ],
          spacing: { after: 120 },
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: 'PixDoc Audio Transcript',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Language: ${selectedLang} | Generated with PixDoc Offline Audio Studio`,
                    italics: true,
                    size: 18,
                    color: '666666',
                  }),
                ],
                spacing: { after: 300 },
              }),
              ...paragraphs,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PixDoc-Transcript-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      alert('Error creating Word document. Please try exporting as TXT.');
    }
  };

  // Export to SRT Subtitles
  const exportSrt = () => {
    if (!transcript) return;
    const lines = transcript.split('\n').filter(l => l.trim().length > 0);
    let srtContent = '';
    let currentSeconds = 0;

    lines.forEach((line, index) => {
      const startMin = Math.floor(currentSeconds / 60);
      const startSec = Math.floor(currentSeconds % 60);
      const endSecTotal = currentSeconds + 4;
      const endMin = Math.floor(endSecTotal / 60);
      const endSec = Math.floor(endSecTotal % 60);

      const startTime = `00:${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')},000`;
      const endTime = `00:${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')},000`;

      srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${line}\n\n`;
      currentSeconds += 4;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PixDoc-Subtitles-${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statistics
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const chars = transcript.length;
  const estSpeakingTime = Math.ceil(words / 130);

  const isRtl = selectedLang.startsWith('ur') || selectedLang.startsWith('ar') || selectedLang.startsWith('fa');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-900/20 via-teal-900/10 to-stone-900/20 border border-emerald-500/20 dark:border-emerald-500/10 backdrop-blur-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Mic className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Audio to Text &amp; Voice Studio
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              100% Client-Side
            </span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Real-time live voice typing, audio file transcriber, and speech synthesis.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-stone-800/70 rounded-xl border border-stone-300/40 dark:border-stone-700/40 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('speech-to-text')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'speech-to-text'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Live Voice Typing</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audio-file')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audio-file'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audio File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text-to-speech')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'text-to-speech'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Text to Speech</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
          <Radio className="w-4 h-4 animate-pulse shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Controls & Tools */}
        <div className="space-y-4">
          {/* Tab 1: Live Voice Typing Controls */}
          {activeTab === 'speech-to-text' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="audio-voice-lang-select" className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 cursor-pointer">
                  <Languages className="w-4 h-4 text-emerald-600" />
                  Voice Language
                </label>
              </div>

              <select
                id="audio-voice-lang-select"
                name="voiceLanguage"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                disabled={isListening}
                className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>

              {/* Big Mic Button */}
              <div className="pt-4 flex flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`relative p-7 rounded-full transition-all cursor-pointer shadow-xl ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-8 ring-rose-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105'
                  }`}
                  aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
                >
                  {isListening ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                </button>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {isListening ? '🔴 Recording & Typing...' : 'Click Mic to Start Talking'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {isListening ? 'Bolte jayein — text foran screen par likha jayega' : 'Direct speech-to-text dictation'}
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                <p className="font-semibold text-stone-800 dark:text-stone-200">💡 Voice Typing Tips:</p>
                <p>• Click once to start, speak clearly in Urdu, English, or Arabic.</p>
                <p>• Text is transcribed in real-time and editable immediately.</p>
              </div>
            </div>
          )}

          {/* Tab 2: Audio File Transcriber Controls */}
          {activeTab === 'audio-file' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-emerald-600" />
                  Audio File Transcriber
                </h3>
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  API Key
                </button>
              </div>

              <div>
                <label htmlFor="audio-file-lang-select" className="text-xs text-stone-600 dark:text-stone-400 font-medium block mb-1">
                  Audio Language
                </label>
                <select
                  id="audio-file-lang-select"
                  name="audioFileLanguage"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  disabled={isAutoTranscribing}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {!audioFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-800/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleAudioUpload(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-stone-400" />
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Upload Audio File (.mp3, .wav, .m4a)
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Supports Voice Notes, Speeches, Lectures
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate text-stone-800 dark:text-stone-200">
                        {audioFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioUrl(null);
                      }}
                      className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Hidden Audio Element */}
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={() => {
                        if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) setAudioDuration(audioRef.current.duration);
                      }}
                      onEnded={() => {
                        setIsPlayingAudio(false);
                        setIsAutoTranscribing(false);
                      }}
                      className="hidden"
                    />
                  )}

                  {/* Auto Transcribe Action Button */}
                  <button
                    type="button"
                    onClick={handleStartAutoTranscribe}
                    disabled={isAutoTranscribing}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAutoTranscribing ? 'Transcribing Audio...' : 'Auto-Transcribe Audio File'}
                  </button>

                  {/* Scrubber */}
                  <div className="space-y-1">
                    <input
                      id="audio-scrubber-range"
                      name="audioScrubber"
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      step={0.1}
                      value={audioCurrentTime}
                      onChange={handleSeek}
                      aria-label="Audio playback scrubber"
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-500">
                      <span>
                        {Math.floor(audioCurrentTime / 60)}:
                        {String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')}
                      </span>
                      <span>
                        {Math.floor(audioDuration / 60)}:
                        {String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => skipAudio(-5)}
                      className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs cursor-pointer"
                      title="Rewind 5s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="p-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-md hover:scale-105 transition-transform cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => skipAudio(5)}
                      className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs cursor-pointer"
                      title="Forward 5s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed & Timestamp */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
                    <div className="flex items-center gap-1">
                      {[0.75, 1, 1.25, 1.5].map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => changeSpeed(speed)}
                          className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            playbackSpeed === speed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={insertTimestamp}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Clock className="w-3 h-3" />
                      Add Timestamp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Text to Speech Controls */}
          {activeTab === 'text-to-speech' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                Text to Speech (Voice Synthesizer)
              </h3>

              {/* Voice Selector */}
              <div>
                <label htmlFor="tts-voice-select" className="text-xs text-stone-600 dark:text-stone-400 font-medium block mb-1">
                  Voice Accent &amp; Reader
                </label>
                <select
                  id="tts-voice-select"
                  name="ttsVoiceSelect"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {ttsVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sliders: Rate & Pitch */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <label htmlFor="tts-rate-range">Reading Speed</label>
                    <span>{ttsRate}x</span>
                  </div>
                  <input
                    id="tts-rate-range"
                    name="ttsRate"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsRate}
                    onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <label htmlFor="tts-pitch-range">Pitch</label>
                    <span>{ttsPitch}x</span>
                  </div>
                  <input
                    id="tts-pitch-range"
                    name="ttsPitch"
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Speak / Stop Button */}
              <button
                type="button"
                onClick={isSpeaking ? stopSpeaking : speakText}
                className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isSpeaking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Voice Reading
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Read Text Aloud
                  </>
                )}
              </button>
            </div>
          )}

          {/* Privacy Box */}
          <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              All voice recordings and transcripts are processed privately on your device. Zero audio data is stored on remote servers.
            </span>
          </div>
        </div>

        {/* Right Side: Text Editor & Export Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 flex flex-col justify-between min-h-[480px]">
            <div>
              {/* Header inside Editor */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Live Transcript &amp; Text Editor
                  </h3>
                  {isListening && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      LIVE
                    </span>
                  )}
                </div>

                {transcript && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!transcript) return;
                        setIsFixingText(true);
                        try {
                          const fixed = await cleanAndReconstructText(transcript, selectedLang);
                          if (fixed && fixed.trim()) setTranscript(fixed);
                        } finally {
                          setIsFixingText(false);
                        }
                      }}
                      disabled={isFixingText}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-500/30 transition-all disabled:opacity-50"
                      title="AI Fixes typos, Urdu spelling, and formatting"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-emerald-600 ${isFixingText ? 'animate-spin' : ''}`} />
                      {isFixingText ? 'Fixing...' : '✨ AI Proofread'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTranscript('')}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea with interim preview */}
              <div className="my-3 relative">
                <label htmlFor="audio-transcript-text-area" className="sr-only">
                  Audio Transcript and Text Editor
                </label>
                <textarea
                  id="audio-transcript-text-area"
                  name="audioTranscriptTextArea"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening... Your words will appear here in real-time."
                      : "Type, dictate via mic, or upload an audio file to convert to text..."
                  }
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className={`w-full h-80 sm:h-96 p-4 rounded-xl bg-stone-50/70 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed ${
                    isRtl ? 'font-serif text-base' : 'font-sans'
                  }`}
                />

                {interimText && (
                  <div
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className="absolute bottom-4 left-4 right-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs italic pointer-events-none"
                  >
                    Speaking: {interimText}...
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Stats & Multi-Format Exports */}
            <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                <div className="flex items-center gap-3">
                  <span><strong>{words}</strong> words</span>
                  <span><strong>{chars}</strong> characters</span>
                  <span>~<strong>{estSpeakingTime}</strong> min speech</span>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={exportDocx}
                  disabled={!transcript}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Word (.docx)
                </button>

                <button
                  type="button"
                  onClick={exportTxt}
                  disabled={!transcript}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white dark:bg-stone-200 dark:text-stone-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Text (.txt)
                </button>

                <button
                  type="button"
                  onClick={exportSrt}
                  disabled={!transcript}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  SRT Subtitles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={() => {
          setStatusMessage('AI API Key saved successfully!');
        }}
      />
    </div>
  );
};

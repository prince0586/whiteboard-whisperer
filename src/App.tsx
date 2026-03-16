import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Camera, Activity, Zap, AlertTriangle, Check, X, Monitor, Play, Square } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: any;
  }
}

export default function App() {
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [hitlRequest, setHitlRequest] = useState<string | null>(null);
  const [status, setStatus] = useState('SYSTEM STANDBY');
  const [isGenerating, setIsGenerating] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setApiKeySelected(true);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    } else {
      // Fallback for local dev if aistudio is not injected
      setApiKeySelected(true);
    }
  };

  const playAudio = async (base64: string) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    try {
      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = audioCtxRef.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtxRef.current.destination);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  const startCapture = (sessionPromise: any) => {
    if (!streamRef.current) return;
    
    // Video capture loop
    captureIntervalRef.current = window.setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
          sessionPromise.then((session: any) => {
            session.sendRealtimeInput([{
              mimeType: 'image/jpeg',
              data: base64
            }]);
          });
        }
      }
    }, 1000);

    // Audio capture loop
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
    }
    const source = audioCtxRef.current.createMediaStreamSource(streamRef.current);
    const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioCtxRef.current.destination);
    
    processor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, channelData[i])) * 32767;
      }
      const buffer = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      const base64 = btoa(binary);
      sessionPromise.then((session: any) => {
        session.sendRealtimeInput([{
          mimeType: 'audio/pcm;rate=16000',
          data: base64
        }]);
      });
    };
    
    (window as any).audioProcessor = processor;
  };

  const stopLive = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.then((session: any) => session.close());
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if ((window as any).audioProcessor) {
      (window as any).audioProcessor.disconnect();
    }
    setIsLive(false);
    setStatus('SYSTEM STANDBY');
  };

  const startLive = async () => {
    try {
      setStatus('INITIALIZING SENSORS...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Use the injected API key or fallback to env
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      setStatus('CONNECTING TO MISSION CONTROL...');
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the Whiteboard Whisperer, an advanced AI assistant in a live session. Observe the user's video and audio.",
        },
        callbacks: {
          onopen: () => {
            setStatus('LIVE LINK ESTABLISHED');
            setIsLive(true);
            startCapture(sessionPromise);
          },
          onmessage: async (message: any) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
               playAudio(base64Audio);
            }
          },
          onclose: () => {
            stopLive();
          },
          onerror: (err: any) => {
            console.error(err);
            setStatus('CONNECTION ERROR');
            stopLive();
          }
        }
      });
      liveSessionRef.current = sessionPromise;
    } catch (err) {
      console.error(err);
      setStatus('SENSOR INITIALIZATION FAILED');
    }
  };

  const simulateComputerUse = () => {
    setStatus('UI NAVIGATOR ACTIVE. ANALYZING JIRA...');
    setTimeout(() => {
      setHitlRequest("The agent is about to create 5 new Epics in Jira based on the diagram. Do you approve this action?");
      setStatus('HITL REQUIRED');
    }, 3000);
  };

  const handleHitl = (approved: boolean) => {
    setHitlRequest(null);
    if (approved) {
      setStatus('ACTION APPROVED. EXECUTING...');
      setTimeout(() => setStatus('MISSION ACCOMPLISHED'), 2000);
    } else {
      setStatus('ACTION ABORTED BY USER');
    }
  };

  const makeThisReal = async () => {
    if (!canvasRef.current) return;
    setIsGenerating(true);
    setStatus('GENERATING ARCHITECTURAL DIAGRAM...');
    
    try {
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: 'Act as a creative director. Generate a highly detailed, professional 16:9 4K architectural diagram based on this whiteboard sketch or frame. Use a dark, neon-cyan blueprint aesthetic.' },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });
      
      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setImageResult(`data:image/jpeg;base64,${part.inlineData.data}`);
          setStatus('DIAGRAM GENERATED. INITIATING UI NAVIGATOR...');
          foundImage = true;
          setTimeout(simulateComputerUse, 2000);
          break;
        }
      }
      if (!foundImage) {
        setStatus('GENERATION RETURNED NO IMAGE');
      }
    } catch (err) {
      console.error(err);
      setStatus('GENERATION FAILED');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!apiKeySelected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 font-mono text-cyan-400 selection:bg-cyan-900">
        <div className="bg-gray-900/50 border border-cyan-900/50 rounded-xl p-8 max-w-md w-full text-center backdrop-blur-sm shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <Activity className="w-12 h-12 mx-auto mb-6 text-cyan-400 animate-pulse" />
          <h1 className="text-2xl font-bold mb-4 tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>Whiteboard Whisperer</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Mission Control requires a paid Gemini API key to access Nano Banana Pro (gemini-3.1-flash-image-preview) and the Live API.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-400 py-3 rounded-lg font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]"
          >
            AUTHENTICATE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-cyan-400 font-mono p-6 selection:bg-cyan-900">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b border-cyan-900/50 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 animate-pulse text-cyan-400" />
          <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>
            Whiteboard Whisperer
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></span>
            {status}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Sensors */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4" /> OPTICAL SENSOR
              </h2>
              {isLive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30 animate-pulse">REC</span>}
            </div>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-gray-800">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} width={640} height={480} className="hidden" />
              {!isLive && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                  SENSOR OFFLINE
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-4">
              {!isLive ? (
                <button onClick={startLive} className="flex-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-400 py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)]">
                  <Play className="w-5 h-5" /> INITIATE LIVE LINK
                </button>
              ) : (
                <button onClick={stopLive} className="flex-1 bg-red-950/50 hover:bg-red-900/50 border border-red-500/50 text-red-400 py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2">
                  <Square className="w-5 h-5" /> TERMINATE LINK
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Output & Actions */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 border border-cyan-900/50 rounded-xl p-4 backdrop-blur-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2">
                <Monitor className="w-4 h-4" /> TACTICAL DISPLAY
              </h2>
            </div>
            
            <div className="flex-1 bg-black rounded-lg border border-gray-800 relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center p-4">
              {imageResult ? (
                <img src={imageResult} alt="Generated Diagram" className="w-full h-full object-contain rounded" />
              ) : (
                <div className="text-gray-600 text-center space-y-4">
                  <Zap className="w-12 h-12 mx-auto opacity-20" />
                  <p>AWAITING VISION EXECUTION</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-cyan-400 flex flex-col items-center gap-4">
                    <Activity className="w-8 h-8 animate-spin" />
                    <span className="tracking-widest animate-pulse">SYNTHESIZING...</span>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={makeThisReal} 
              disabled={!isLive || isGenerating}
              className={`mt-6 w-full py-4 rounded-lg font-bold tracking-widest text-lg transition-all flex items-center justify-center gap-3 ${
                isLive && !isGenerating 
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] border border-cyan-400/50' 
                  : 'bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed'
              }`}
            >
              <Zap className="w-6 h-6" /> MAKE THIS REAL
            </button>
          </div>
        </div>
      </div>

      {/* HITL Modal */}
      {hitlRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-amber-500/50 rounded-xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="flex items-center gap-4 text-amber-500 mb-6">
              <AlertTriangle className="w-10 h-10 animate-pulse" />
              <h3 className="text-xl font-bold tracking-wider">HITL_REQUIRED</h3>
            </div>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {hitlRequest}
            </p>
            <div className="flex gap-4">
              <button onClick={() => handleHitl(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 border border-gray-600">
                <X className="w-5 h-5" /> ABORT
              </button>
              <button onClick={() => handleHitl(true)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Check className="w-5 h-5" /> APPROVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

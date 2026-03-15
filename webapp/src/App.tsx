import { useEffect } from 'react';
import { useLiveAgent } from './hooks/useLiveAgent';
import TranscriptZone from './components/TranscriptZone';
import VoiceWaveform from './components/VoiceWaveform';
import ControlButtons from './components/ControlButtons';
import { Power } from 'lucide-react';

function App() {
  const {
    messages,
    isConnected,
    speakingState,
    micEnabled,
    setMicEnabled,
    needsPermission,
    connect,
    disconnect,
    startAudio,
    stopAudio
  } = useLiveAgent();

  // Force connection on startup or via button
  const handlePower = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  // Automatically start audio when connected (if permissions allow)
  useEffect(() => {
    if (isConnected) {
      startAudio();
    } else {
      stopAudio();
    }
  }, [isConnected, startAudio, stopAudio]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#080808] text-white selection:bg-[#3B8BFF]/30">
      {/* Header - Minimalist */}
      <header className="h-[50px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h1 className="text-[14px] font-semibold tracking-tight text-white/90">Easy Move</h1>
        </div>

        <button
          onClick={handlePower}
          className={`p-2 rounded-full transition-all duration-300 ${isConnected ? 'text-green-500 hover:bg-green-500/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Power size={20} />
        </button>
      </header>

      {/* Main Content: Three Zones */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Permission Banner */}
        {needsPermission && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600/90 backdrop-blur-md p-4 flex flex-col items-center text-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-[13px] font-medium text-white shadow-sm">
              L'accès au microphone est requis.
            </p>
            <button
              onClick={() => startAudio()}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg text-[12px] font-bold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Autoriser le micro
            </button>
          </div>
        )}

        {/* Zone 1: Transcriptions */}
        <TranscriptZone messages={messages} />

        {/* Zone 2: Waveform */}
        <VoiceWaveform speakingState={speakingState} />

        {/* Zone 3: Controls */}
        <ControlButtons
          micEnabled={micEnabled}
          onToggleMic={() => setMicEnabled(!micEnabled)}
        />
      </main>

      {/* Footer / Status Bar - Optional */}
      <footer className="h-[24px] bg-black/50 border-t border-white/5 flex items-center px-4 justify-center">
        <span className="text-[9px] text-white/20 uppercase tracking-widest font-medium">
          Easy Move {isConnected ? '• Connected' : '• Disconnected'}
        </span>
      </footer>
    </div>
  );
}

export default App;

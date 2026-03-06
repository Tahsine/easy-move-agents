import { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Monitor, Settings, Paperclip, Power, PowerOff } from "lucide-react";
import { useLiveAgent } from "./hooks/useLiveAgent";

export default function App() {
  const {
    messages,
    isConnected,
    isRecording,
    needsPermission,
    connect,
    disconnect,
    sendMessage,
    startAudio,
    stopAudio
  } = useLiveAgent();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const toggleRecording = () => {
    if (isRecording) stopAudio();
    else startAudio();
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <h1 className="font-semibold text-sm tracking-tight text-neutral-200">Kaline Zephyr</h1>
          {needsPermission && (
            <span className="text-[10px] text-yellow-500 animate-pulse ml-2">Micro bloqué !</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => isConnected ? disconnect() : connect()}
            className={`p-1.5 rounded-lg transition-colors ${isConnected ? "text-red-400 hover:bg-red-500/10" : "text-green-400 hover:bg-green-500/10"}`}
            title={isConnected ? "Déconnecter" : "Connecter"}
          >
            {isConnected ? <PowerOff size={16} /> : <Power size={16} />}
          </button>
          <button className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10"
                : msg.role === "system"
                  ? "bg-neutral-900 border border-neutral-800 text-neutral-400 italic text-[10px] w-full text-center"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tl-none whitespace-pre-wrap"
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-neutral-950 border-t border-neutral-800">
        <div className="flex flex-col gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-1">
            <button
              disabled={!isConnected}
              className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-200 transition-colors uppercase tracking-wider disabled:opacity-30"
            >
              <Monitor size={14} />
              Partager l'écran
            </button>
            <div className="w-px h-3 bg-neutral-800 mx-1" />
            <button
              disabled={!isConnected}
              className="text-[10px] font-medium text-neutral-400 hover:text-neutral-200 transition-colors uppercase tracking-wider disabled:opacity-30"
            >
              Mode Texte
            </button>
          </div>

          {/* Input Box */}
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/5 rounded-xl blur-xl group-focus-within:bg-blue-500/10 transition-all duration-500" />
            <div className="relative flex flex-col gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 focus-within:border-neutral-700 transition-all shadow-inner">
              {needsPermission && (
                <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-500 flex items-center justify-between">
                  <span>Autorisation micro requise dans l'onglet</span>
                  <button
                    onClick={() => window.open(((window as any).chrome).runtime.getURL("permissions.html"), "_blank")}
                    className="underline font-bold"
                  >
                    Ouvrir
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button disabled={!isConnected} className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-30">
                  <Paperclip size={18} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={isConnected ? "Message à Kaline..." : "Connectez-vous pour parler..."}
                  disabled={!isConnected}
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32 placeholder:text-neutral-600 disabled:cursor-not-allowed"
                />

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleRecording}
                    disabled={!isConnected}
                    className={`p-2 rounded-lg transition-all ${isRecording
                      ? "bg-red-500/10 text-red-500 animate-pulse"
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
                      }`}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !isConnected}
                    className={`p-2 rounded-lg transition-all ${input.trim() && isConnected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-neutral-600 cursor-not-allowed"
                      }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

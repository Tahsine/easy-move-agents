import { useState, useRef, useCallback } from "react";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
}

export function useLiveAgent() {
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "system", content: "Kaline Zephyr Agent prêt. Cliquez sur le bouton pour démarrer." }
    ]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [needsPermission, setNeedsPermission] = useState(false);
    const [sessionId, setSessionId] = useState(() => "session-" + Math.random().toString(36).substring(7));

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null); // For recording (16kHz)
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // For recording
    const streamRef = useRef<MediaStream | null>(null);
    const playerNodeRef = useRef<AudioWorkletNode | null>(null); // For playback
    const playerContextRef = useRef<AudioContext | null>(null); // For playback (24kHz)

    const stopAudio = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const connect = useCallback((userId: string = "user") => {
        if (socketRef.current) return;

        const wsUrl = `ws://localhost:8500/ws/${userId}/${sessionId}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = async () => {
            console.log("WebSocket connection opened.");
            setIsConnected(true);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: "Connecté au serveur ADK." }]);

            // Initialize Player as soon as we connect so we can hear the agent
            if (!playerNodeRef.current) {
                try {
                    const playerContext = new AudioContext({ sampleRate: 24000 });
                    playerContextRef.current = playerContext;
                    await playerContext.audioWorklet.addModule("/pcm-player-processor.js");
                    const playerNode = new AudioWorkletNode(playerContext, "pcm-player-processor");
                    playerNode.connect(playerContext.destination);
                    playerNodeRef.current = playerNode;
                    console.log("Audio player initialized");
                } catch (e) {
                    console.error("Failed to initialize audio player:", e);
                }
            }
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle turnComplete or interrupted to reset typing indicators if we had them
                if (data.interrupted) {
                    console.log("🛑 INTERRUPTION RECEIVED FROM SERVER");
                    if (playerNodeRef.current) {
                        playerNodeRef.current.port.postMessage({ command: "endOfAudio" });
                    }

                    // Visually mark the message as interrupted
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content.includes("[Interrompu]")) {
                            return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + " [Interrompu]" }];
                        }
                        return prev;
                    });
                }

                // Handle Audio Output
                if (data.content?.parts) {
                    for (const part of data.content.parts) {
                        const inlineData = part.inlineData || part.inline_data;
                        if (inlineData?.mimeType?.startsWith("audio/pcm") || inlineData?.mime_type?.startsWith("audio/pcm")) {
                            if (playerNodeRef.current) {
                                const audioBuffer = base64ToArray(inlineData.data);
                                playerNodeRef.current.port.postMessage(audioBuffer);
                            }
                        }

                        // Handle text response
                        if (part.text) {
                            // Skip thoughts (internal reasoning)
                            if (part.thought) continue;

                            const text = part.text;
                            setMessages(prev => {
                                const lastMsg = prev[prev.length - 1];
                                if (lastMsg && lastMsg.role === "assistant") {
                                    // Append to the last assistant message
                                    return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + text }];
                                }
                                // Create a new assistant message bubble
                                return [...prev, { id: Date.now().toString(), role: "assistant", content: text }];
                            });
                        }
                    }
                }

            } catch (e) {
                console.error("Error parsing WS message:", e);
            }
        };

        socket.onclose = (e) => {
            console.log("WebSocket connection closed:", e.code, e.reason);
            setIsConnected(false);
            socketRef.current = null;
            if (playerContextRef.current) {
                playerContextRef.current.close().catch(() => { });
                playerContextRef.current = null;
                playerNodeRef.current = null;
            }
            stopAudio();
            setSessionId("session-" + Math.random().toString(36).substring(7));
        };

        socket.onerror = (e) => {
            console.error("WebSocket error:", e);
            setIsConnected(false);
        };
    }, [sessionId, stopAudio]);


    const sendMessage = useCallback((text: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            // Send interrupt to stop current generation if any
            socketRef.current.send(JSON.stringify({ type: "interrupt" }));

            // Stop current audio playback
            if (playerNodeRef.current) {
                playerNodeRef.current.port.postMessage({ command: "endOfAudio" });
            }

            // Send the text message
            socketRef.current.send(JSON.stringify({ type: "text", text }));
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
        }
    }, []);

    const startAudio = async () => {
        try {
            // Reset state
            setNeedsPermission(false);

            // Request permission first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
            streamRef.current = stream;

            // Setup audio context for recording (16kHz as expected by Gemini)
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            await audioCtx.audioWorklet.addModule("/pcm-recorder-processor.js");

            const source = audioCtx.createMediaStreamSource(stream);
            const recorderNode = new AudioWorkletNode(audioCtx, "pcm-recorder-processor");

            source.connect(recorderNode);

            // Handle incoming PCM data from the worklet
            recorderNode.port.onmessage = (event) => {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    const pcmData = convertFloat32ToPCM(event.data);
                    // Send raw binary buffer directly
                    socketRef.current.send(pcmData);
                }
            };

            audioWorkletNodeRef.current = recorderNode;

            // We set isRecording to true only *after* everything is cleanly setup
            setIsRecording(true);

        } catch (err: any) {
            console.error("Microphone access failed:", err);
            stopAudio(); // Cleanup on failure

            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setNeedsPermission(true);
                // Open permission page if in extension context
                const _chrome = (window as any).chrome;
                if (typeof _chrome !== "undefined" && _chrome.tabs) {
                    _chrome.tabs.create({ url: _chrome.runtime.getURL("permissions.html") });
                }
            }
        }
    };

    const disconnect = useCallback(() => {
        setIsConnected(false);
        stopAudio();
        if (playerContextRef.current) {
            playerContextRef.current.close().catch(() => { });
            playerContextRef.current = null;
            playerNodeRef.current = null;
        }
        if (socketRef.current) {
            // Prevent onclose from firing and resetting UI again
            socketRef.current.onclose = null;
            socketRef.current.close(1000, "User Disconnected");
            socketRef.current = null;
        }
        setSessionId("session-" + Math.random().toString(36).substring(7));
    }, [stopAudio]);

    return {
        messages,
        isConnected,
        isRecording,
        needsPermission,
        connect,
        disconnect,
        sendMessage,
        startAudio,
        stopAudio
    };
}

// Helpers
function convertFloat32ToPCM(inputData: Float32Array) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = inputData[i] * 0x7fff;
    }
    return pcm16.buffer;
}

function base64ToArray(base64: string) {
    // Convert base64url to standard base64 if needed
    let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (standardBase64.length % 4) standardBase64 += '=';

    const binaryString = window.atob(standardBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

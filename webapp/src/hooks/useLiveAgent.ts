import { useState, useRef, useCallback, useEffect } from "react";

export type SpeakingState = 'idle' | 'user' | 'agent';

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    partial?: boolean;
    timestamp: number;
}

export function useLiveAgent() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
    const [micEnabled, setMicEnabled] = useState(true);
    const [screenShareEnabled, setScreenShareEnabled] = useState(false);
    const [webInteractionEnabled, setWebInteractionEnabled] = useState(true);
    const [needsPermission, setNeedsPermission] = useState(false);
    const [sessionId, setSessionId] = useState(() => "session-" + Math.random().toString(36).substring(7));

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null); // For recording (16kHz)
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // For recording
    const streamRef = useRef<MediaStream | null>(null);
    const playerNodeRef = useRef<AudioWorkletNode | null>(null); // For playback
    const playerContextRef = useRef<AudioContext | null>(null); // For playback (24kHz)
    const micEnabledRef = useRef(micEnabled);

    // Keep micEnabledRef in sync safely
    useEffect(() => {
        console.log("🎤 Mic Enbaled state changed to:", micEnabled);
        micEnabledRef.current = micEnabled;
    }, [micEnabled]);

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
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: "Connecté au serveur ADK.", timestamp: Date.now() }]);

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
                            setSpeakingState('agent');
                            if (playerNodeRef.current) {
                                const audioBuffer = base64ToArray(inlineData.data);
                                playerNodeRef.current.port.postMessage(audioBuffer);
                            }
                        }

                        // Handle agent text (output_transcription)
                        if (part.text) {
                            if (part.thought) continue;
                            const text = part.text;
                            setMessages(prev => {
                                const lastMsg = prev[prev.length - 1];
                                if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content.includes("[Interrompu]")) {
                                    return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + text }];
                                }
                                return [...prev, { id: Date.now().toString(), role: "assistant", content: text, timestamp: Date.now() }];
                            });
                        }
                    }
                }

                // Handle Input Transcription (User speaking)
                if (data.input_transcription) {
                    const transcription = data.input_transcription;
                    if (transcription.text) {
                        setSpeakingState('user');
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            // If last message is a partial user transcription, update it
                            if (lastMsg && lastMsg.role === "user" && lastMsg.partial) {
                                return [...prev.slice(0, -1), {
                                    ...lastMsg,
                                    content: transcription.text,
                                    partial: data.partial !== false // If standard ADK, might be in root
                                }];
                            }
                            // Otherwise create new user message
                            return [...prev, {
                                id: "user-" + Date.now(),
                                role: "user",
                                content: transcription.text,
                                partial: true,
                                timestamp: Date.now()
                            }];
                        });
                    }
                }

                // Handle Output Transcription (Agent speech text)
                if (data.output_transcription) {
                    const transcription = data.output_transcription;
                    if (transcription.text) {
                        setSpeakingState('agent');
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content.includes("[Interrompu]")) {
                                return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + transcription.text }];
                            }
                            return [...prev, { id: "agent-" + Date.now(), role: "assistant", content: transcription.text, timestamp: Date.now() }];
                        });
                    }
                }

                // Handle tool call events — show action indicators
                if (data.content?.parts) {
                    for (const part of data.content.parts) {
                        const fc = part.functionCall || part.function_call;
                        if (fc) {
                            const toolIcons: Record<string, string> = {
                                navigate: '🌐', click_element: '🖱️', type_text: '⌨️',
                                scroll: '📜', get_page_context: '🔍', press_key: '⌨️'
                            };
                            const icon = toolIcons[fc.name] || '🔧';
                            const args = fc.args || {};
                            let label = fc.name;
                            if (fc.name === 'navigate') label = `Navigating to ${args.url || '...'}`;
                            else if (fc.name === 'click_element') label = `Clicking ${args.selector || '...'}`;
                            else if (fc.name === 'type_text') label = `Typing "${args.text || '...'}"`;
                            else if (fc.name === 'get_page_context') label = 'Reading page...';
                            else if (fc.name === 'scroll') label = `Scrolling ${args.direction || 'down'}`;
                            else if (fc.name === 'press_key') label = `Pressing ${args.key || '...'}`;

                            setMessages(prev => [...prev, {
                                id: "action-" + Date.now(),
                                role: "system",
                                content: `${icon} ${label}`,
                                timestamp: Date.now()
                            }]);
                        }
                    }
                }

                // Reset state on turn complete
                if (data.turn_complete || data.turnComplete) {
                    setSpeakingState('idle');
                    // Finalize partial messages
                    setMessages(prev => prev.map(m => m.partial ? { ...m, partial: false } : m));
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
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now() }]);
        }
    }, []);

    const startAudio = useCallback(async () => {
        if (isRecording || audioContextRef.current) {
            console.log("⚠️ Audio already recording, skipping startAudio");
            return;
        }

        try {
            console.log("🎤 Starting audio system...");
            setNeedsPermission(false);

            // Request permission with optimized constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                }
            });
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
                    if (micEnabledRef.current) {
                        const pcmData = convertFloat32ToPCM(event.data);
                        socketRef.current.send(pcmData);
                    } else {
                        // Optional: maybe send zeroed data if the agent expects continuous stream
                        // But usually just skipping is fine for Gemini VAD if turn isn't active
                    }
                }
            };

            audioWorkletNodeRef.current = recorderNode;
            setIsRecording(true);
            console.log("✅ Audio system active.");

            // Crucial: ensure context is running
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

        } catch (err: unknown) {
            console.error("Microphone access failed:", err);
            stopAudio(); // Cleanup on failure

            if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
                setNeedsPermission(true);
                // Open permission page if in extension context
                const _chrome = (window as any).chrome;
                if (typeof _chrome !== "undefined" && _chrome.tabs) {
                    _chrome.tabs.create({ url: _chrome.runtime.getURL("permissions.html") });
                }
            }
        }
    }, [stopAudio, isRecording]);

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
        speakingState,
        micEnabled,
        setMicEnabled,
        screenShareEnabled,
        setScreenShareEnabled,
        webInteractionEnabled,
        setWebInteractionEnabled,
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

import React, { useEffect, useRef } from 'react';
import type { Message } from '../hooks/useLiveAgent';

interface TranscriptZoneProps {
    messages: Message[];
}

const TranscriptZone: React.FC<TranscriptZoneProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const displayMessages = messages;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto w-full px-6 py-6 space-y-5 scroll-smooth no-scrollbar"
        >
            {displayMessages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : msg.role === 'system' ? 'items-center' : 'items-start'}`}
                >
                    {msg.role === 'system' ? (
                        // System / Action messages — compact and centered
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <span className="text-[11px] text-white/40">{msg.content}</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-white/30 mb-1">
                                {msg.role === 'user' ? 'You' : 'Easy Move'}
                            </span>
                            <p className={`
                                ${msg.role === 'user'
                                    ? 'text-white/60 text-[13px] text-right max-w-[85%]'
                                    : 'text-white text-[15px] leading-relaxed max-w-[95%]'
                                }
                                ${msg.partial ? 'opacity-60' : ''}
                            `}>
                                {msg.content}
                            </p>
                        </>
                    )}
                </div>
            ))}
            {displayMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="text-2xl">🌐</span>
                    </div>
                    <p className="text-white/20 text-[13px] text-center">
                        Say something to start navigating...
                    </p>
                    <p className="text-white/10 text-[11px] text-center italic">
                        "Go to Google" • "Search for..." • "Click on..."
                    </p>
                </div>
            )}
        </div>
    );
};

export default TranscriptZone;

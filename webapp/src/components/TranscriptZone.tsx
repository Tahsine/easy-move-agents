import React, { useEffect, useRef } from 'react';
import type { Message } from '../hooks/useLiveAgent';

interface TranscriptZoneProps {
    messages: Message[];
}

const TranscriptZone: React.FC<TranscriptZoneProps> = ({ messages }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter out system messages and "Interrompu" tags for cleaner script if needed
    // But per spec, we just show the messages.
    const displayMessages = messages.filter(m => m.role !== 'system');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto w-full px-[10%] lg:px-[20%] py-8 space-y-8 scroll-smooth no-scrollbar"
        >
            {displayMessages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-center'}`}
                >
                    <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-gray-500 mb-1">
                        {msg.role === 'user' ? 'Vous' : 'Agent'}
                    </span>
                    <p className={`
                        ${msg.role === 'user'
                            ? 'text-[#A0A0A0] text-[14px] text-right max-w-[80%]'
                            : 'text-[#FFFFFF] text-[17px] text-center font-normal leading-relaxed w-full'
                        }
                        ${msg.partial ? 'opacity-70 italic' : ''}
                    `}>
                        {msg.content}
                    </p>
                </div>
            ))}
            {displayMessages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                    <p className="text-[#2A2A2A] text-[14px] italic">Dites quelque chose pour commencer...</p>
                </div>
            )}
        </div>
    );
};

export default TranscriptZone;

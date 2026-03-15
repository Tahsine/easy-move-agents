import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface ControlButtonsProps {
    micEnabled: boolean;
    onToggleMic: () => void;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
    micEnabled,
    onToggleMic,
}) => {
    return (
        <div className="h-[80px] w-full flex items-center justify-center bg-[#080808]">
            {/* Micro Button — Primary action */}
            <button
                onClick={onToggleMic}
                className={`
                    w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300 border-2
                    ${micEnabled
                        ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 hover:scale-105 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                        : 'bg-red-500/15 border-red-500 hover:bg-red-500/25 text-red-500 shadow-[0_0_20px_rgba(255,60,60,0.1)]'
                    }
                `}
            >
                {micEnabled ? (
                    <Mic size={24} />
                ) : (
                    <MicOff size={24} />
                )}
            </button>
        </div>
    );
};

export default ControlButtons;

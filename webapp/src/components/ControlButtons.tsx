import React from 'react';
import { Mic, MicOff, Monitor, MonitorOff, Globe } from 'lucide-react';

interface ControlButtonsProps {
    micEnabled: boolean;
    onToggleMic: () => void;
    screenShareEnabled: boolean;
    onToggleScreen: () => void;
    webInteractionEnabled: boolean;
    onToggleWeb: () => void;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
    micEnabled,
    onToggleMic,
    screenShareEnabled,
    onToggleScreen,
    webInteractionEnabled,
    onToggleWeb
}) => {
    return (
        <div className="h-[70px] w-full flex items-center justify-center gap-6 bg-[#080808]">
            {/* Micro Button */}
            <button
                onClick={onToggleMic}
                className={`
                    w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200 border
                    ${micEnabled
                        ? 'bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.12)]'
                        : 'bg-[rgba(255,60,60,0.15)] border-[#FF3C3C] hover:bg-[rgba(255,60,60,0.25)] text-[#FF3C3C]'
                    }
                `}
            >
                {micEnabled ? (
                    <Mic size={22} className="text-white" />
                ) : (
                    <MicOff size={22} />
                )}
            </button>

            {/* Screen Share Button */}
            <button
                onClick={onToggleScreen}
                className={`
                    w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200 border
                    ${screenShareEnabled
                        ? 'bg-[rgba(59,139,255,0.2)] border-[#3B8BFF] text-[#3B8BFF]'
                        : 'bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.12)] text-white/50'
                    }
                `}
            >
                {screenShareEnabled ? <Monitor size={22} /> : <MonitorOff size={22} />}
            </button>

            {/* Web Interaction Button */}
            <button
                onClick={onToggleWeb}
                className={`
                    w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200 border
                    ${webInteractionEnabled
                        ? 'bg-[rgba(59,139,255,0.2)] border-[#3B8BFF] text-[#3B8BFF]'
                        : 'bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.12)] text-white/50'
                    }
                `}
            >
                <Globe size={22} />
            </button>
        </div>
    );
};

export default ControlButtons;

import React, { useEffect, useRef } from 'react';
import type { SpeakingState } from '../hooks/useLiveAgent';

interface VoiceWaveformProps {
    speakingState: SpeakingState;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ speakingState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let time = 0;

        const render = () => {
            time += 0.05;
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Determine color and amplitude based on state
            let color = '#2A2A2A'; // Idle
            let amplitude = 2;
            let speed = 0.02;

            if (speakingState === 'user') {
                color = '#FFFFFF';
                amplitude = 15;
                speed = 0.1;
            } else if (speakingState === 'agent') {
                color = '#3B8BFF';
                amplitude = 25;
                speed = 0.15;
            } else {
                // Breathing effect for idle
                amplitude = 2 + Math.sin(time * 0.5) * 1;
                speed = 0.02;
            }

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw a smooth wave
            const segments = 100;
            const step = (width * 0.6) / segments;
            const startX = width * 0.2;

            for (let i = 0; i <= segments; i++) {
                const x = startX + i * step;
                // Sine wave combined with some noise/variation
                const relativeX = i / segments;
                // Envelope function to taper the ends
                const envelope = Math.sin(relativeX * Math.PI);

                const y = (height / 2) +
                    Math.sin(time * speed * 50 + i * 0.1) * amplitude * envelope +
                    Math.cos(time * speed * 30 + i * 0.05) * (amplitude / 2) * envelope;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();

            // Add a subtle glow
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            animationId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationId);
    }, [speakingState]);

    return (
        <div className="w-full h-[80px] flex items-center justify-center bg-[#080808]">
            <canvas
                ref={canvasRef}
                width={800}
                height={80}
                className="w-full max-w-[600px] h-full"
            />
        </div>
    );
};

export default VoiceWaveform;

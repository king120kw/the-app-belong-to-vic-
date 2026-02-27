import React, { useRef } from 'react';

interface CustomAnimatedIconProps {
    src: string;
    size?: number;
    className?: string;
    playbackRate?: number;
    loop?: boolean;
}

export const CustomAnimatedIcon: React.FC<CustomAnimatedIconProps> = ({
    src,
    size = 40,
    className,
    playbackRate = 1.0,
    loop = false
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initial play if loop is true
    React.useEffect(() => {
        if (loop && videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(() => { }); // Ignore play errors
        } else if (!loop && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [loop, playbackRate]);

    const handleMouseEnter = () => {
        if (!loop && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(err => console.error("Video play failed:", err));
        }
    };

    const handleMouseLeave = () => {
        if (!loop && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div
            className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ width: size, height: size }}
        >
            <video
                ref={videoRef}
                src={src}
                muted
                playsInline
                loop={loop}
                preload="auto"
                className="w-full h-full object-contain pointer-events-none dark:mix-blend-screen dark:brightness-150 mixed-blend-multiply"
                style={{ mixBlendMode: 'inherit' }} // Controlled by tailwind classes instead for flexibility
            />
            {/* Dark mode gradient highlight behind icon */}
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 dark:opacity-40 pointer-events-none" />
        </div>
    );
};

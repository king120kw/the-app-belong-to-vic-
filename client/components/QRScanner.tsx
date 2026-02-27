import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [scanning, setScanning] = useState(true);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const intervalRef = useRef<number | null>(null);
    const isActiveRef = useRef(true);

    useEffect(() => {
        startScanning();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const startScanning = async () => {
        if (!isActiveRef.current) return;
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });

            if (!isActiveRef.current) {
                mediaStream.getTracks().forEach(track => track.stop());
                return;
            }

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                try {
                    await videoRef.current.play();
                } catch (playError: any) {
                    if (playError.name !== 'AbortError') {
                        console.error('Video play error:', playError);
                    }
                }

                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = window.setInterval(() => {
                    scanFrame();
                }, 300);
            }
        } catch (error) {
            console.error('Camera access denied:', error);
            toast.error('Camera access denied');
            onClose();
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    useEffect(() => {
        startScanning();
    }, [facingMode]);

    const scanFrame = async () => {
        if (!videoRef.current || !canvasRef.current || !scanning) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Try to detect QR code using BarcodeDetector if available
                if ('BarcodeDetector' in window) {
                    try {
                        const formats = ['qr_code', 'ean_13', 'upc_a', 'code_128', 'code_39', 'data_matrix'];
                        const barcodeDetector = new (window as any).BarcodeDetector({ formats });
                        const barcodes = await barcodeDetector.detect(canvas);

                        if (barcodes.length > 0) {
                            setScanning(false);
                            onScan(barcodes[0].rawValue);
                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }
                        }
                    } catch (err) {
                        // BarcodeDetector not supported
                    }
                } else {
                    // Fallback: Use jsQR library
                    try {
                        const { default: jsQR } = await import('jsqr');
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });

                        if (code) {
                            setScanning(false);
                            onScan(code.data);
                            if (stream) {
                                stream.getTracks().forEach(track => track.stop());
                            }
                        }
                    } catch (err) {
                        console.error('jsQR error:', err);
                    }
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Full Screen Scanner View */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls Overlay */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                    <h2 className="text-white font-bold text-lg drop-shadow-md">Scanner</h2>
                    <button onClick={toggleCamera} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-3xl">flip_camera_ios</span>
                    </button>
                </div>

                {/* Target Area */}
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="relative w-64 h-64 border-2 border-vic-green/50 rounded-3xl">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-vic-green rounded-tl-xl animate-pulse" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-vic-green rounded-tr-xl animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-vic-green rounded-bl-xl animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-vic-green rounded-br-xl animate-pulse" />

                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-vic-green/30 animate-scan-line shadow-[0_0_15px_rgba(33,255,100,0.5)]" />
                    </div>
                </div>

                {/* Footer instructions */}
                <div className="p-10 bg-gradient-to-t from-black/80 to-transparent text-center">
                    <p className="text-white text-sm font-medium drop-shadow-md">
                        Align QR code within the frame to scan
                    </p>
                    <p className="text-white/60 text-[10px] mt-2 tracking-widest uppercase">
                        AI Powered Detection
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s infinite linear;
                }
            `}</style>
        </div>
    );
}

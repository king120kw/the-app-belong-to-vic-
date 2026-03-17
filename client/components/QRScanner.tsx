import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MultiFormatReader, BinaryBitmap, HybridBinarizer, HTMLCanvasElementLuminanceSource, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
    onManualCapture?: (blob: Blob) => void;
    isAnalyzing?: boolean;
}

export default function QRScanner({ onScan, onClose, onManualCapture, isAnalyzing }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<number | null>(null);
    const hasScannedRef = useRef(false);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [status, setStatus] = useState<'scanning' | 'detected'>('scanning');

    // Instantiate ZXing single synchronous reader once
    const codeReaderRef = useRef(new MultiFormatReader());

    const startCamera = async (mode: 'environment' | 'user') => {
        // Stop any existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [{ focusMode: 'continuous' } as any]
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (playError: any) {
                    if (playError.name !== 'AbortError') {
                        throw playError;
                    }
                }
            }

            // Start scanning immediately — 250ms interval for near-instant response
            intervalRef.current = window.setInterval(scanFrame, 250);
        } catch (err) {
            console.error('Camera error:', err);
            toast.error('Camera access denied');
            onClose();
        }
    };

    const stopCamera = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const scanFrame = () => {
        if (hasScannedRef.current || isAnalyzing) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;

        // Ensure canvas matches video dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // ZXing synchronous decoding from canvas
            // We use the canvas luminance source and hybrid binarizer to parse the barcode natively
            const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

            // Hints to only look for typical product barcodes instead of QR
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                BarcodeFormat.EAN_8,
                BarcodeFormat.EAN_13,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.ITF
            ]);

            const result = codeReaderRef.current.decode(binaryBitmap, hints);

            if (result && !hasScannedRef.current) {
                // Ensure it's not a QR code if possible, or just accept the result since we are in barcode mode
                hasScannedRef.current = true;
                setStatus('detected');
                stopCamera();
                // Tiny visual delay, then trigger API
                setTimeout(() => onScan(result.getText()), 150);
            }
        } catch (err: any) {
            // ZXing throws NotFoundException continuously when no code is printed on the frame
            // We expect this silently 4 times per second.
        }
    };

    useEffect(() => {
        hasScannedRef.current = false;
        startCamera(facingMode);
        return stopCamera;
    }, [facingMode]);

    const toggleCamera = () => {
        hasScannedRef.current = false;
        setStatus('scanning');
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || !onManualCapture) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    stopCamera();
                    onManualCapture(blob);
                }
            }, 'image/jpeg', 0.8);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Fullscreen camera */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Hidden canvas for ZXing calculation and capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Minimal overlay: just close + flip buttons */}
            <div className="relative z-10 flex items-center justify-between p-5">
                <button
                    onClick={() => { stopCamera(); onClose(); }}
                    className="size-11 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <button
                    onClick={toggleCamera}
                    className="size-11 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Status indicator and capture button — bottom of screen */}
            <div className="absolute bottom-0 inset-x-0 pb-10 flex flex-col items-center gap-6">
                {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-4 bg-black/60 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                        <div className="w-10 h-10 border-4 border-vic-green border-t-transparent rounded-full animate-spin" />
                        <span className="text-white font-bold tracking-widest uppercase">
                            Analyzing Product...
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Manual Capture Button */}
                        {onManualCapture && (
                            <button
                                onClick={handleCapture}
                                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-lg" />
                            </button>
                        )}

                        {/* Status indicator */}
                        <div className="pointer-events-none">
                            {status === 'detected' ? (
                                <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500 rounded-full shadow-2xl">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                                    <span className="text-white font-black text-sm tracking-widest uppercase">
                                        Barcode Detected — Analysing…
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-white/80 text-xs font-bold tracking-widest uppercase">
                                        Scanning OR Tap to Capture
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

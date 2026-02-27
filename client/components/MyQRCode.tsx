import QRCode from 'react-qr-code';
// Fallback type if needed
type QRCodeType = any;
import { useAuth } from '../lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '../lib/api/auth';

interface MyQRCodeProps {
    size?: number;
}

export default function MyQRCode({ size = 256 }: MyQRCodeProps) {
    const { user } = useAuth();

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: () => getUserProfile(user!.id),
        enabled: !!user?.id
    });

    if (!user || !profile) {
        return (
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-3xl" style={{ width: size + 40, height: size + 40 }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-vic-green"></div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Generating...</span>
                </div>
            </div>
        );
    }

    // Create QR code payload with timestamp for expiry
    const timestamp = Date.now();
    const payload = {
        userId: user.id,
        fullName: profile.full_name || 'User',
        avatarUrl: profile.avatar_url || '',
        timestamp
    };

    // Simple signature using timestamp (server will validate freshness)
    const qrData = JSON.stringify(payload);

    return (
        <div key={user.id} className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-[#1f2c34] rounded-2xl">
            <h3 className="text-lg font-bold dark:text-white">My QR Code</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Let others scan this code to add you as a contact
            </p>
            <div className="p-4 bg-white rounded-xl">
                <QRCode
                    value={qrData}
                    size={size}
                    level="H"
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
                Valid for 5 minutes
            </p>
        </div>
    );
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getConversationById, getMessages, sendMessage, uploadChatMedia, markAsRead, sendTypingIndicator, initiateCallV2, updateCallStatus, softDeleteConversation } from '../lib/api/chat';
import { useAuth } from '../lib/AuthContext';
import { getUserProfile } from '../lib/api/auth';
import { toast } from 'sonner';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { useTranslation } from '../lib/api/translation';
import CameraCapture from '../components/CameraCapture';

// --- Sub-components ---

const AudioMessage = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);
    // Format duration helper if needed
    const [duration, setDuration] = useState(0);

    // Reset state if src changes
    useEffect(() => {
        setIsPlaying(false);
        setProgress(0);
        setError(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.load(); // Reload audio source
        }
    }, [src]);

    const togglePlay = () => {
        if (audioRef.current && !error) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => {
                    console.error("Audio playback failed:", e);
                    setError(true);
                    toast.error("Cannot play this audio format");
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Waveform visualization placeholder (static for now, could be dynamic)
    const renderWaveform = () => (
        <div className="flex items-center gap-1 h-4 w-full opacity-50">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 bg-current rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>
            ))}
        </div>
    );

    return (
        <div className="flex items-center gap-3 bg-[#D9FDD3] dark:bg-[#005c4b] p-3 rounded-xl min-w-[240px] shadow-sm border border-black/5">
            <button
                onClick={togglePlay}
                className={`size-10 rounded-full bg-black/10 flex items-center justify-center text-[#54656F] dark:text-[#E9EDEF] hover:bg-black/20 transition-all ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={error}
            >
                <span className="material-symbols-outlined text-[24px]">
                    {error ? 'error' : (isPlaying ? 'pause' : 'play_arrow')}
                </span>
            </button>

            <div className="flex-1 flex flex-col gap-1">
                {/* Progress Bar Container */}
                <div className="relative w-full h-8 flex items-center">
                    {/* Placeholder Waveform (Behind) */}
                    <div className="absolute inset-0 flex items-center justify-between pointer-events-none text-vic-green overflow-hidden">
                        {/*  Visible waveform bars */}
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-[3px] rounded-full transition-all duration-300 ${i / 30 * 100 < progress ? 'bg-[#54656F] dark:bg-[#E9EDEF]' : 'bg-[#54656F]/30 dark:bg-[#E9EDEF]/30'}`}
                                style={{ height: `${30 + Math.random() * 50}%` }}
                            ></div>
                        ))}
                    </div>

                    {/* Actual Progress Slider (Invisible but clickable) */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={isNaN(progress) ? 0 : progress}
                        onChange={(e) => {
                            if (audioRef.current) {
                                const newTime = (Number(e.target.value) / 100) * audioRef.current.duration;
                                audioRef.current.currentTime = newTime;
                                setProgress(Number(e.target.value));
                            }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>

                <div className="flex justify-between text-[11px] text-[#667781] dark:text-[#8696A0] font-medium">
                    <span>
                        {(() => {
                            if (!audioRef.current) return "0:00";
                            const cur = audioRef.current.currentTime;
                            if (isNaN(cur) || !isFinite(cur)) return "0:00";
                            const d = new Date(cur * 1000);
                            return `${d.getUTCMinutes()}:${d.getUTCSeconds().toString().padStart(2, '0')}`;
                        })()}
                    </span>
                    <span>
                        {(() => {
                            if (!audioRef.current) return "0:00";
                            const dur = audioRef.current.duration;
                            if (isNaN(dur) || !isFinite(dur)) return "0:00";
                            const d = new Date(dur * 1000);
                            return `${d.getUTCMinutes()}:${d.getUTCSeconds().toString().padStart(2, '0')}`;
                        })()}
                    </span>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onTimeUpdate={() => {
                    const duration = audioRef.current?.duration || 0;
                    const currentTime = audioRef.current?.currentTime || 0;
                    if (duration > 0 && !isNaN(duration)) {
                        setProgress((currentTime / duration) * 100);
                    } else {
                        setProgress(0);
                    }
                }}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onError={(e) => {
                    console.error("Audio Load Error:", e);
                    setError(true);
                }}
                className="hidden"
            />
        </div>
    );
};

// UUID v4 validation - prevents sending "self" or any invalid string to Supabase
const isValidUUID = (id: string | undefined): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export default function ChatConversation() {
    const { id: activeId } = useParams();
    const { user } = useAuth();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [message, setMessage] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingLocked, setIsRecordingLocked] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob, url: string } | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [recordingStartY, setRecordingStartY] = useState<number | null>(null);
    const [recordingDragY, setRecordingDragY] = useState(0);
    const [recordingDragX, setRecordingDragX] = useState(0);
    const [recordingStartX, setRecordingStartX] = useState<number | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Visualizer Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // --- Queries ---

    const { data: conversation, isLoading: isLoadingConv } = useQuery({
        queryKey: ['conversation', activeId],
        queryKeyHashFn: () => `conversation-${activeId}`, // Force unique hash
        queryFn: () => getConversationById(activeId!, user!.id),
        enabled: isValidUUID(activeId) && !!user,
        refetchOnWindowFocus: false // Don't refetch on window focus to avoid jumps
    });

    const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
        queryKey: ['messages', activeId],
        queryFn: () => getMessages(activeId!),
        enabled: isValidUUID(activeId),
        refetchOnWindowFocus: false
    });

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: () => getUserProfile(user!.id),
        enabled: !!user?.id
    });

    const isAI = useMemo(() => conversation?.conversation_type === 'ai', [conversation]);
    const isSelf = useMemo(() => conversation?.conversation_type === 'self', [conversation]);
    const isDirect = useMemo(() => conversation?.conversation_type === 'private' || conversation?.conversation_type === 'direct', [conversation]);

    const otherParticipant = useMemo(() => {
        if (isSelf) return null;
        return conversation?.conversation_participants?.find((p: any) => p.user_id !== user?.id);
    }, [conversation, user, isSelf]);

    const otherParticipantId = otherParticipant?.user_id;

    const { data: otherUserProfile } = useQuery({
        queryKey: ['profile', otherParticipantId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, username, avatar_url')
                .eq('id', otherParticipantId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!otherParticipantId && !isAI && !isSelf,
        retry: false
    });

    // Profile Realtime Sync
    useEffect(() => {
        if (!otherParticipantId) return;

        const profileChannel = supabase
            .channel(`profile:${otherParticipantId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `id=eq.${otherParticipantId}`
                },
                (payload) => {
                    queryClient.setQueryData(['profile', otherParticipantId], payload.new);
                    queryClient.invalidateQueries({ queryKey: ['conversation', activeId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
        };
    }, [otherParticipantId, queryClient, activeId]);

    // Guard: if the route param is not a valid UUID (e.g. '/chat/self'), redirect back
    useEffect(() => {
        if (activeId && !isValidUUID(activeId)) {
            navigate('/chat');
        }
    }, [activeId, navigate]);

    if (activeId && !isValidUUID(activeId)) {
        return null;
    }

    const displayName = useMemo(() => {
        if (isAI) return 'Health Coach';
        if (isSelf) return (profile?.full_name ? `${profile.full_name} (Me)` : 'Personal Notes');
        const p = otherUserProfile || otherParticipant?.user_profiles;
        return p?.full_name || p?.username || otherParticipant?.chat_users?.phone_number || 'User';
    }, [isAI, isSelf, profile, otherParticipant, otherUserProfile]);

    const displayAvatar = useMemo(() => {
        if (isAI) return '/APP%20LOGO.jpg';
        if (isSelf) return profile?.avatar_url || null;
        return otherUserProfile?.avatar_url || otherParticipant?.user_profiles?.avatar_url || null;
    }, [isAI, isSelf, profile, otherParticipant, otherUserProfile]);

    // Handle initial scroll
    useEffect(() => {
        if (scrollRef.current && !isLoadingMessages) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [isLoadingMessages, activeId]);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    // Scroll when messages changes (but only if we are already near bottom or it's our own message)
    useEffect(() => {
        scrollToBottom();
    }, [messages.length, otherUserTyping, scrollToBottom]);

    // Presence Logic
    useEffect(() => {
        if (!user?.id) return;

        const presenceChannel = supabase.channel('online-users');
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const online = new Set<string>();
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => {
                        if (p.user_id) online.add(p.user_id);
                    });
                });
                setOnlineUsers(online);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [user?.id]);


    const isOnline = otherParticipant && onlineUsers.has(otherParticipant.user_id);
    const expertStatus = isOnline ? "online" : "offline";

    // --- Actions ---

    const onEmojiClick = (emojiData: any) => {
        setMessage(prev => prev + emojiData.emoji);
    };

    const handleLocationShare = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                sendMutation.mutate({ content: "📍 Current Location", type: 'link', metadata: locationUrl });
            });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        toast.loading("Sending media...");
        try {
            const publicUrl = await uploadChatMedia(user.id, file);
            const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
            sendMutation.mutate({ content: file.name, type, metadata: { url: publicUrl } });
            toast.dismiss();
            toast.success("Sent!");
        } catch (err) {
            toast.dismiss();
            toast.error("Failed to upload");
        }
    };

    // Recording Logic
    const startRecording = async (e?: React.MouseEvent | React.TouchEvent) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedAudio({ blob, url });
                stream.getTracks().forEach(track => track.stop());

                // Cleanup AudioContext on actual stop
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(console.error);
                    audioContextRef.current = null;
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            };

            // Audio Visualizer Setup
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 64;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser); // Source -> Analyser Only

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
            } catch (e) {
                console.error("Audio Context Init Failed", e);
            }

            recorder.start(1000); // Send data chunks every second to prevent data loss
            setIsRecording(true);
            setIsRecordingLocked(false);
            setRecordingDragY(0);

            if (e) {
                const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
                const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
                setRecordingStartY(y);
                setRecordingStartX(x);
            }
        } catch (err) {
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = (cancel = false) => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = async () => {
                if (cancel) {
                    console.log("[Recording] Cancelled by user");
                    toast.info("Recording cancelled");
                    // Just reset state
                    setIsRecording(false);
                    setIsRecordingLocked(false);
                    setRecordingStartY(null);
                    setRecordingDragY(0);
                    setRecordedAudio(null);
                    return;
                }

                const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
                // Validate blob size
                if (blob.size < 100) {
                    toast.error("Audio recording too short");
                    setIsRecording(false);
                    setIsRecordingLocked(false);
                    return;
                }

                // UI Optimistic Update could go here

                // Upload logic
                toast.loading("Sending audio...");
                try {
                    // Important: Explicitly set MIME type on File object
                    const audioFile = new File([blob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
                    const publicUrl = await uploadChatMedia(user!.id, audioFile);
                    sendMutation.mutate({ content: "Voice Message", type: 'voice', metadata: { url: publicUrl, duration: Math.round((Date.now()) / 1000) } });
                    toast.dismiss();
                    toast.success("Sent!");
                } catch (err) {
                    console.error("Failed to upload audio:", err);
                    toast.dismiss();
                    toast.error("Failed to send audio");
                }

                setIsRecording(false);
                setIsRecordingLocked(false);
                setRecordingStartY(null);
                setRecordingDragY(0);
            };
            mediaRecorderRef.current.stop();
        }
    };

    const handleRecordingMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isRecording || isRecordingLocked || recordingStartY === null) return;

        const currentY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        const currentX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

        const deltaY = recordingStartY - currentY; // positive is upwards
        const deltaX = recordingStartX !== null ? currentX - recordingStartX : 0; // negative is leftwards

        setRecordingDragY(deltaY);
        setRecordingDragX(deltaX);

        if (deltaY > 80) { // Lock threshold
            setIsRecordingLocked(true);
            setRecordingStartY(null);
            setRecordingStartX(null);
            setRecordingDragY(0);
            setRecordingDragX(0);
            toast.success("Recording locked", { duration: 1000 });
        } else if (deltaX < -100) { // Cancel threshold
            stopRecording(true);
        }
    }, [isRecording, isRecordingLocked, recordingStartY]);

    useEffect(() => {
        if (isRecording && !isRecordingLocked) {
            window.addEventListener('mousemove', handleRecordingMove);
            window.addEventListener('touchmove', handleRecordingMove);
            window.addEventListener('mouseup', () => !isRecordingLocked && stopRecording());
            window.addEventListener('touchend', () => !isRecordingLocked && stopRecording());
        }
        return () => {
            window.removeEventListener('mousemove', handleRecordingMove);
            window.removeEventListener('touchmove', handleRecordingMove);
        };
    }, [isRecording, isRecordingLocked, handleRecordingMove]);

    const toggleRecordingLock = () => {
        setIsRecordingLocked(prev => !prev);
    };

    // Recording Timer
    useEffect(() => {
        let interval: any;
        if (isRecording) {
            setRecordingDuration(0);
            const start = Date.now();
            interval = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Waveform Animation Loop
    useEffect(() => {
        if (!isRecording) return;

        const animate = () => {
            if (!analyserRef.current || !canvasRef.current) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = 3;
            const gap = 2;
            const barsToDraw = Math.floor(canvas.width / (barWidth + gap));

            // Draw generic bars based on volume, mirrored from center would be nice, but simple left-to-right for now
            // Actually, let's just draw random-looking bars purely based on frequency data
            // We use a subset of dataArray to look more active

            for (let i = 0; i < barsToDraw; i++) {
                const value = dataArray[i % bufferLength] || 0;
                const percent = value / 255;
                const height = Math.max(percent * canvas.height, 4); // Min height 4px

                // Center vertically
                const y = (canvas.height - height) / 2;

                ctx.fillStyle = '#EF4444'; // Red-500
                ctx.fillRect((i * (barWidth + gap)), y, barWidth, height); // Simple rect for compatibility
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isRecording]);

    // --- Real-time Sync Logic ---

    // Robust Read Status Sync
    const markConversationAsReadLocal = useCallback(async (convId: string) => {
        if (!user?.id || !convId || !isValidUUID(convId)) return;

        console.log(`[Chat] Marking as read: ${convId}`);
        // 1. Optimistic UI update for the sidebar and local state
        queryClient.setQueryData(['conversations', user.id], (old: any) => {
            if (!old) return old;
            return old.map((c: any) => c.id === convId ? { ...c, unread_count: 0, is_read: true } : c);
        });

        try {
            // Use current timestamp for absolute precision
            await markAsRead(user.id, convId, new Date().toISOString());

            // Force invalidate conversation related queries to clear sidebar/navbar badges
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
            queryClient.invalidateQueries({ queryKey: ['chat-verified', user.id] });
        } catch (err) {
            console.error('[Chat] Failed to clear unread:', err);
        }
    }, [user?.id, queryClient]);

    // Continuous Sync Handler using Ref
    const messageHandlerRef = useRef<((payload: any) => void) | null>(null);
    useEffect(() => {
        messageHandlerRef.current = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                const newMessage = payload.new;
                if (!activeId || newMessage.conversation_id !== activeId) return;

                console.log("[Chat] New message received:", newMessage);

                // 1. Instant update to local message list cache
                queryClient.setQueryData(['messages', activeId], (old: any) => {
                    const base = Array.isArray(old) ? old : [];
                    const filtered = base.filter((m: any) => m.id !== newMessage.id && !m.id?.toString().startsWith('opt-'));
                    return [...filtered, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });

                // 2. Real-time Read Sync: if we're in the chat, mark it read immediately
                if (newMessage.sender_id !== user?.id) {
                    markConversationAsReadLocal(activeId);
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedMessage = payload.new;
                if (!activeId || updatedMessage.conversation_id !== activeId) return;

                console.log("[Chat] Message updated (Read Receipt?):", updatedMessage);

                queryClient.setQueryData(['messages', activeId], (old: any) => {
                    if (!old) return old;
                    // Robust merge to handle cases with partial payload (non-FULL replica identity)
                    return old.map((m: any) => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m);
                });
            }
        };
    }, [activeId, user?.id, queryClient, markConversationAsReadLocal]);

    // Stable Subscription
    useEffect(() => {
        if (!activeId || !user?.id) return;

        const channelName = `chat_room_${activeId}`;
        console.log(`[Chat] Subscribing to channel: ${channelName}`);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${activeId}`
                },
                (payload) => messageHandlerRef.current?.(payload)
            )
            .on(
                'broadcast',
                { event: 'typing' },
                (payload) => {
                    if (payload.payload.userId !== user?.id) {
                        setOtherUserTyping(payload.payload.isTyping);
                    }
                }
            )
            .subscribe();

        return () => {
            console.log(`[Chat] Unsubscribing from channel: ${channelName}`);
            supabase.removeChannel(channel);
        };
    }, [activeId, user?.id]);

    // On mount or switch: clear unread
    useEffect(() => {
        if (activeId && user?.id) {
            markConversationAsReadLocal(activeId);
        }

        // Also clear unread when the window gains focus (e.g. user comes back to the tab)
        const handleFocus = () => {
            if (activeId && user?.id) {
                console.log("[Chat] Window focused, refreshing read status");
                markConversationAsReadLocal(activeId);
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [activeId, user?.id, markConversationAsReadLocal]);

    // --- Call Handlers ---

    const handleStartCall = async (type: 'voice' | 'video') => {
        if (!user || !activeId || !conversation) return;

        const otherParticipant = conversation.conversation_participants.find((p: any) => p.user_id !== user.id);
        if (!otherParticipant) {
            toast.error("No other participant to call");
            return;
        }

        // --- Verification Check ---
        // Ensure we are calling a verified expert or user
        const otherUserProfile = otherParticipant.user_profiles;
        const isVerified = otherUserProfile?.chat_users?.is_verified;

        if (!isVerified) {
            toast.error("Calls are only available for verified contacts.", { duration: 3000 });
            return;
        }

        try {
            toast.loading("Starting call...", { id: 'call-start' });
            await initiateCallV2(activeId, user.id, otherParticipant.user_id, type);
            // We do NOT dismiss immediately here to avoid flash, triggering App.tsx will handle the overlay
            // But we can dismiss the loading toast after a short delay
            setTimeout(() => toast.dismiss('call-start'), 2000);
        } catch (err: any) {
            toast.dismiss('call-start');
            console.error("Call error:", err);
            toast.error("Failed to start call: " + (err.message || "Unknown error"));
        }
    };

    // --- Message Actions ---

    // --- Message Actions ---

    const sendMutation = useMutation({
        mutationFn: (args: { content: string, type?: string, metadata?: string }) =>
            sendMessage(user!.id, activeId!, args.content, (args.type as any) || 'text', args.metadata, isAI, isSelf),
        onMutate: async (newMsg) => {
            await queryClient.cancelQueries({ queryKey: ['messages', activeId] });
            const previousMessages = queryClient.getQueryData(['messages', activeId]);

            const optimisticMessage = {
                id: 'opt-' + Math.random().toString(36),
                conversation_id: activeId,
                sender_id: user!.id,
                content: newMsg.content,
                message_type: newMsg.type || 'text',
                metadata: newMsg.metadata,
                created_at: new Date().toISOString(),
                read_at: null,
            };

            queryClient.setQueryData(['messages', activeId], (old: any) => {
                const msgs = Array.isArray(old) ? old : [];
                return [...msgs, optimisticMessage];
            });

            setMessage("");
            setShowEmoji(false);
            scrollToBottom();

            return { previousMessages };
        },
        onError: (err, newMessage, context: any) => {
            queryClient.setQueryData(['messages', activeId], context.previousMessages);
            toast.error("Failed to send message");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
        }
    });

    const handleSend = () => {
        if (!message.trim() || !user || !activeId) return;
        sendMutation.mutate({ content: message.trim() });
    };

    const typingTimeoutRef = useRef<any>(null);
    const handleTyping = () => {
        if (!user || !activeId) return;

        sendTypingIndicator(user.id, activeId, true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(user.id, activeId, false);
        }, 2000);
    };

    // --- Rendering Helpers ---

    const formatMessageTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessageContent = (msg: any) => {
        // Handle new JSON metadata vs old raw string metadata
        const metadata = msg.metadata;
        const mediaUrl = (typeof metadata === 'object' && metadata !== null) ? metadata.url : metadata;

        switch (msg.message_type) {
            case 'image':
                return <img src={mediaUrl} alt="Shared" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(mediaUrl)} />;
            case 'video':
                return <video src={mediaUrl} controls className="max-w-full rounded-lg" />;
            case 'voice':
                return <AudioMessage src={mediaUrl} />;
            case 'link':
                return (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        {msg.content}
                    </a>
                );
            case 'file':
                return (
                    <div className="flex items-center gap-2 p-2 bg-black/5 rounded-lg border border-black/10">
                        <span className="material-symbols-outlined">description</span>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{msg.content}</p>
                            <a href={mediaUrl} target="_blank" download className="text-vic-green text-xs font-bold uppercase">Download</a>
                        </div>
                    </div>
                );
            default:
                return <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap">{msg.content}</p>;
        }
    };

    // Grouping messages by date
    const groupedMessages = useMemo(() => {
        const groups: { [date: string]: any[] } = {};
        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    }, [messages]);

    if (isLoadingConv && !conversation) {
        return (
            <div className="flex flex-col h-screen bg-[#F0F2F5] dark:bg-[#111B21] items-center justify-center">
                <div className="animate-spin size-8 border-4 border-vic-green border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-[#F0F2F5] dark:bg-[#111B21] transition-colors duration-300 overflow-hidden relative">
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_tyrZ_m8E.png')] dark:invert"></div>

            <div className="relative flex flex-col h-full z-10">
                {/* Header */}
                <header className="shrink-0 h-[64px] bg-[#F0F2F5] dark:bg-[#202C33] border-b border-white/5 flex items-center px-4 gap-3 z-30 shadow-sm">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>

                    <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-black/5 dark:border-white/10 shrink-0 flex items-center justify-center">
                        {displayAvatar ? (
                            <img
                                src={displayAvatar}
                                alt={displayName}
                                className="size-full object-cover"
                                onError={(e: any) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.parentElement.querySelector('.avatar-fallback');
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}

                        {/* Initials Fallback */}
                        {(!displayAvatar) && (
                            <div className="avatar-fallback size-full bg-vic-green flex items-center justify-center text-white text-sm font-bold">
                                {isSelf ? (
                                    <span className="material-symbols-outlined">bookmark</span>
                                ) : (
                                    (displayName || '?').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                )}
                            </div>
                        )}

                        {/* Hidden Fallback for Image Errors */}
                        {displayAvatar && (
                            <div className="avatar-fallback hidden size-full bg-vic-green flex items-center justify-center text-white text-sm font-bold">
                                {isSelf ? (
                                    <span className="material-symbols-outlined">bookmark</span>
                                ) : (
                                    (displayName || '?').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0" onClick={() => { if (!isSelf && !isAI && otherParticipant?.chat_users?.phone_number) navigate(`/expert/${otherParticipant.chat_users.phone_number}`) }}>
                        <h2 className="text-[16px] font-semibold text-[#111B21] dark:text-[#e9edef] truncate flex items-center gap-1.5">
                            {displayName}
                            {isAI && <span className="text-[9px] font-bold bg-vic-green/20 text-vic-green px-1.5 py-0.5 rounded-full">AI</span>}
                        </h2>
                        <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                            {otherUserTyping ? (
                                <span className="text-vic-green font-medium animate-pulse">typing...</span>
                            ) : isAI ? (
                                'AI Coach'
                            ) : isSelf ? (
                                'Personal Workspace'
                            ) : (
                                expertStatus
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-1">
                        {!isSelf && !isAI && (
                            <>
                                <button onClick={() => handleStartCall('video')} className="p-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 rounded-full">
                                    <span className="material-symbols-outlined text-[24px]">videocam</span>
                                </button>
                                <button onClick={() => handleStartCall('voice')} className="p-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 rounded-full">
                                    <span className="material-symbols-outlined text-[24px]">call</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Delete this conversation?")) {
                                            try {
                                                await softDeleteConversation(activeId!, user!.id);
                                                toast.success("Conversation deleted");
                                                navigate('/chat');
                                            } catch {
                                                toast.error("Failed to delete conversation");
                                            }
                                        }
                                    }}
                                    className="p-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 rounded-full"
                                >
                                    <span className="material-symbols-outlined text-[24px]">delete</span>
                                </button>
                            </>
                        )}
                        <button className="p-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 rounded-full">
                            <span className="material-symbols-outlined text-[24px]">more_vert</span>
                        </button>
                    </div>
                </header>

                {/* Messages Area */}
                <main
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 md:px-12 py-4 space-y-2 custom-scrollbar flex flex-col min-h-0"
                >
                    {Object.keys(groupedMessages).length > 0 ? (
                        Object.entries(groupedMessages).map(([date, dateMsgs]) => (
                            <div key={date} className="flex flex-col gap-2">
                                <div className="flex justify-center my-4">
                                    <span className="bg-white dark:bg-[#1f2c34] px-3 py-1.5 rounded-lg text-[12.5px] uppercase tracking-wide text-[#667781] dark:text-[#8696A0] shadow-sm font-medium">
                                        {date === new Date().toLocaleDateString() ? 'Today' : date}
                                    </span>
                                </div>

                                {dateMsgs.map((msg) => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 group`}
                                        >
                                            <div
                                                className={`relative max-w-[85%] md:max-w-[65%] min-w-[100px] px-3 py-2 rounded-xl shadow-sm ${isMe
                                                    ? 'bg-[#D9FDD3] dark:bg-[#005c4b] rounded-tr-none'
                                                    : 'bg-white dark:bg-[#202c33] rounded-tl-none'
                                                    }`}
                                            >
                                                {/* Content - Wrapper to ensure spacing for timestamp */}
                                                <div className="flex flex-col">
                                                    <div className="pb-1 pr-2 break-words">
                                                        {renderMessageContent(msg)}
                                                    </div>

                                                    {/* Timestamp & Status - Right aligned within flex container */}
                                                    <div className="flex items-center justify-end gap-0.5 mt-0.5 select-none self-end">
                                                        <span className="text-[10px] text-[#667781] dark:text-white/50">
                                                            {formatMessageTime(msg.created_at)}
                                                        </span>
                                                        {isMe && (
                                                            <span className={`material-symbols-outlined text-[15.5px] -ml-0.5 ${msg.read_at ? 'text-[#34B7F1]' : 'text-[#8696A0]'}`}>
                                                                done_all
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-start h-full pt-8 px-8 gap-4 text-center">
                            <div className="flex flex-col items-center gap-2 max-w-[450px]">
                                <div className="p-2 bg-white/70 dark:bg-[#1f2c34]/70 backdrop-blur-md rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-slate-500">lock</span>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        End-to-end encrypted
                                    </p>
                                </div>
                                <p className="text-[13px] text-[#667781] dark:text-[#8696A0] leading-relaxed">
                                    {t('messages_are_end_to_end_encrypted') || "Messages and calls are end-to-end encrypted. No one outside of this chat, not even Vic, can read or listen to them. Learn more."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Typing Indicator Overlay (Outside the date groups but inside main) */}
                    {otherUserTyping && (
                        <div className="flex w-full justify-start mt-1 px-3 py-1">
                            <div className="bg-white dark:bg-[#202c33] p-2 rounded-xl shadow-sm flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="size-1 bg-[#8696A0] rounded-full animate-bounce"></div>
                                    <div className="size-1 bg-[#8696A0] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="size-1 bg-[#8696A0] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Input Footer */}
                <footer className="px-3 md:px-4 py-2 bg-[#F0F2F5] dark:bg-[#202c33] flex items-end gap-2 relative z-40 pb-safe shrink-0">
                    <div className="flex-1 flex items-end gap-2 w-full max-w-[1200px] mx-auto min-w-0">
                        {!conversation ? (
                            <div className="w-full flex items-center justify-center p-4 text-slate-500 text-sm">
                                <div className="animate-spin size-5 border-2 border-vic-green border-t-transparent rounded-full"></div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-end gap-1 md:gap-2 bg-white dark:bg-[#202C33] rounded-[24px] shadow-sm py-[8px] px-2 relative border border-black/5 dark:border-white/5 min-w-0">
                                {/* Emoji Button */}
                                <button
                                    onClick={() => setShowEmoji(!showEmoji)}
                                    className={`p-2 text-[#54656F] dark:text-[#8696A0] hover:text-[#111B21] dark:hover:text-[#D1D7DB] transition-colors rounded-full hover:bg-black/5 ${showEmoji ? 'text-[#00A884]' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-[26px]">mood</span>
                                </button>

                                {/* Pin (Attachment) Button */}
                                <button
                                    onClick={() => setShowAttachments(!showAttachments)}
                                    className={`p-2 text-[#54656F] dark:text-[#8696A0] hover:text-[#111B21] transition-colors rounded-full hover:bg-black/5 ${showAttachments ? 'text-[#00A884] bg-black/5' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-[26px] rotate-45">attach_file</span>
                                </button>

                                {/* Text Input */}
                                <textarea
                                    ref={inputRef}
                                    placeholder="Message"
                                    rows={1}
                                    value={message}
                                    onChange={(e) => {
                                        setMessage(e.target.value);
                                        handleTyping();
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none py-2 px-2 text-[15px] leading-[22px] focus:ring-0 text-[#111B21] dark:text-[#D1D7DB] placeholder-[#667781] resize-none max-h-[120px] min-h-[40px]"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 relative">
                            {/* Microphone / Send Button */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        if (!message.trim()) {
                                            startRecording(e);
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        if (!message.trim()) {
                                            e.preventDefault();
                                            startRecording(e);
                                        }
                                    }}
                                    onClick={() => {
                                        if (message.trim()) {
                                            handleSend();
                                        } else if (isRecordingLocked || isRecording) {
                                            // Clicked Stop (Send)
                                            stopRecording();
                                        }
                                    }}
                                    // Use onMouseUp/onTouchEnd to handle "release to send" if not locked
                                    onMouseUp={() => {
                                        if (isRecording && !isRecordingLocked) {
                                            // Release to Send logic
                                            stopRecording();
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        if (isRecording && !isRecordingLocked) {
                                            stopRecording();
                                        }
                                    }}

                                    className={`size-[48px] shrink-0 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 z-20 
                                      ${message.trim() || isRecordingLocked
                                            ? 'bg-[#00A884] text-white hover:bg-[#008f6f]'
                                            : isRecording
                                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50'
                                                : 'bg-[#00A884] text-white hover:bg-[#008f6f]'
                                        }`}
                                    style={{
                                        transform: isRecording && !isRecordingLocked ? `translateY(${-Math.min(recordingDragY, 60)}px)` : 'none',
                                        transition: 'transform 0.1s ease-out'
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[24px]">
                                        {message.trim() ? 'send' : (isRecording ? 'send' : 'mic')}
                                    </span>
                                </button>
                            </div>

                            {/* Drag to Cancel Indicator */}
                            {isRecording && !isRecordingLocked && (
                                <div className="absolute right-[60px] flex items-center gap-4 pointer-events-none">
                                    <div className="flex items-center gap-2">
                                        {/* Timer */}
                                        <span className="text-red-500 font-mono font-bold text-lg min-w-[50px]">
                                            {formatDuration(recordingDuration)}
                                        </span>
                                        <canvas ref={canvasRef} width={80} height={30} className="opacity-80" />
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 font-medium animate-pulse whitespace-nowrap">
                                        <span className="material-symbols-outlined">chevron_left</span>
                                        Slide to cancel
                                    </div>
                                </div>
                            )}

                            {/* Lock Indicator (Floating) */}
                            {isRecording && !isRecordingLocked && (
                                <div
                                    className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-80 animate-bounce pointer-events-none bg-black/60 text-white rounded-full px-2 py-1"
                                    style={{
                                        top: `${-100 - Math.max(recordingDragY, 0)}px`,
                                        opacity: Math.max(0.4, 1 - (recordingDragY / 120))
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">lock</span>
                                </div>
                            )}

                            {isRecordingLocked && (
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#00A884] p-1.5 rounded-full shadow-lg animate-pulse z-10">
                                    <span className="material-symbols-outlined text-white text-[16px]">lock</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Emoji Picker Popover */}
                    {showEmoji && (
                        <div className="absolute bottom-[70px] left-0 md:left-auto md:w-[400px] z-40 bg-white dark:bg-[#1f2c34] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                            {/* Tabs */}
                            <div className="flex border-b border-slate-100 dark:border-slate-700">
                                <button className="flex-1 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-vic-green border-b-2 border-vic-green">
                                    Emoji
                                </button>
                                <button
                                    onClick={() => toast.info("GIFs coming soon!")}
                                    className="flex-1 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    GIF
                                </button>
                                <button
                                    onClick={() => toast.info("Stickers coming soon!")}
                                    className="flex-1 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Sticker
                                </button>
                            </div>
                            <div className="h-[350px]">
                                <EmojiPicker
                                    width="100%"
                                    height={350}
                                    onEmojiClick={onEmojiClick}
                                    theme={Theme.AUTO}
                                    emojiStyle={EmojiStyle.NATIVE}
                                    previewConfig={{ showPreview: false }}
                                    searchDisabled={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Attachment Menu (Pin) */}
                    {showAttachments && (
                        <div className="absolute bottom-[70px] left-2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
                            <div className="flex flex-col gap-2">
                                {/* Document */}
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx';
                                    input.onchange = async (e: any) => {
                                        const file = e.target?.files?.[0];
                                        if (file) {
                                            toast.loading('Uploading document...', { id: 'doc-upload' });
                                            try {
                                                const url = await uploadChatMedia(user!.id, file);
                                                sendMutation.mutate({ content: file.name, type: 'file', metadata: url });
                                                toast.success('Document sent!', { id: 'doc-upload' });
                                                setShowAttachments(false);
                                            } catch (err) {
                                                toast.error('Failed to upload document', { id: 'doc-upload' });
                                            }
                                        }
                                    };
                                    input.click();
                                }}>
                                    <div className="size-12 rounded-full bg-gradient-to-t from-[#5F66CD] to-[#7F66FF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white text-[22px]">description</span>
                                    </div>
                                    <span className="bg-white dark:bg-[#202C33] px-2 py-1 rounded-md text-sm font-medium shadow-md">Document</span>
                                </div>

                                {/* Location */}
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                                    handleLocationShare();
                                    setShowAttachments(false);
                                }}>
                                    <div className="size-12 rounded-full bg-gradient-to-t from-[#1F9F5F] to-[#25D366] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white text-[22px]">location_on</span>
                                    </div>
                                    <span className="bg-white dark:bg-[#202C33] px-2 py-1 rounded-md text-sm font-medium shadow-md">Location</span>
                                </div>

                                {/* Gallery */}
                                <label className="flex items-center gap-3 group cursor-pointer">
                                    <div className="size-12 rounded-full bg-gradient-to-t from-[#AC44CF] to-[#BF59CF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white text-[22px]">image</span>
                                    </div>
                                    <span className="bg-white dark:bg-[#202C33] px-2 py-1 rounded-md text-sm font-medium shadow-md">Gallery</span>
                                    <input type="file" className="hidden" onChange={(e) => {
                                        handleFileUpload(e);
                                        setShowAttachments(false);
                                    }} accept="image/*,video/*" />
                                </label>

                                {/* Audio */}
                                <label className="flex items-center gap-3 group cursor-pointer">
                                    <div className="size-12 rounded-full bg-gradient-to-t from-[#F05522] to-[#F57143] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white text-[22px]">headphones</span>
                                    </div>
                                    <span className="bg-white dark:bg-[#202C33] px-2 py-1 rounded-md text-sm font-medium shadow-md">Audio</span>
                                    <input type="file" className="hidden" accept="audio/*" onChange={async (e) => {
                                        const file = e.target?.files?.[0];
                                        if (file) {
                                            toast.loading('Uploading audio...', { id: 'audio-upload' });
                                            try {
                                                const url = await uploadChatMedia(user!.id, file);
                                                sendMutation.mutate({ content: file.name, type: 'voice', metadata: url });
                                                toast.success('Audio sent!', { id: 'audio-upload' });
                                                setShowAttachments(false);
                                            } catch (err) {
                                                toast.error('Failed to upload audio', { id: 'audio-upload' });
                                            }
                                        }
                                    }} />
                                </label>

                                {/* Contact */}
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                                    const contactPhone = window.prompt("Enter contact phone number to share:");
                                    if (contactPhone && contactPhone.trim()) {
                                        sendMutation.mutate({ content: `👤 Contact: ${contactPhone}`, type: 'text', metadata: `tel:${contactPhone}` });
                                        toast.success("Contact shared!");
                                        setShowAttachments(false);
                                    }
                                }}>
                                    <div className="size-12 rounded-full bg-gradient-to-t from-[#009DE2] to-[#00B2FF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-white text-[22px]">person</span>
                                    </div>
                                    <span className="bg-white dark:bg-[#202C33] px-2 py-1 rounded-md text-sm font-medium shadow-md">Contact</span>
                                </div>

                                {/* Row 3 - Poll & Event (Optional/Future) */}
                                <div className="flex gap-6 justify-center">
                                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => {
                                        const pollQuestion = window.prompt("Enter your poll question:");
                                        if (pollQuestion && pollQuestion.trim()) {
                                            sendMutation.mutate({ content: `📊 Poll: ${pollQuestion}\n\n1️⃣ Option 1\n2️⃣ Option 2`, type: 'text' });
                                            toast.success("Poll sent!");
                                            setShowAttachments(false);
                                        }
                                    }}>
                                        <div className="size-[52px] rounded-full bg-gradient-to-t from-[#009688] to-[#1DE9B6] flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                                            <span className="material-symbols-outlined text-white text-[24px]">poll</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </footer>

                {/* Camera Capture Modal */}
                {showCamera && (
                    <CameraCapture
                        onCapture={async (file) => {
                            try {
                                const url = await uploadChatMedia(user!.id, file);
                                sendMutation.mutate({ content: "Photo", type: 'image', metadata: url });
                                toast.success('Photo sent!');
                            } catch (error) {
                                toast.error('Failed to send photo');
                            }
                        }}
                        onClose={() => setShowCamera(false)}
                    />
                )}
            </div>
        </div>
    );
}

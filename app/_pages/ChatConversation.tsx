"use client"
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { requestMicrophoneAccess } from "@/lib/api/permissions";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getConversationById, getMessages, sendMessage, uploadChatMedia, markAsRead, sendTypingIndicator, initiateCallV2, updateCallStatus, softDeleteConversation, findUserByIdSecure, provisionAndSendMessage, findConversationByParticipants } from '@/lib/api/chat';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile } from '@/lib/api/auth';
import { toast } from 'sonner';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { useTranslation } from '@/lib/api/translation';
import CameraCapture from '@/components/CameraCapture';
import { saveFoodAnalysis } from '@/lib/api/food';
import { useAnalysisStore } from '@/store/analysisStore';
import { useCoachInjectionStore } from '@/store/coachInjectionStore';

// --- Constants ---
const COACH_ID = '00000000-0000-0000-0000-000000000001';

// --- Sub-components ---

const AudioMessage = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [internalSrc, setInternalSrc] = useState(src);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [duration, setDuration] = useState(0);
    const MAX_RETRIES = 3;

    useEffect(() => {
        setInternalSrc(src);
        setIsPlaying(false);
        setProgress(0);
        setError(false);
        setRetryCount(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.load();
        }
    }, [src]);

    const performRetry = async (currentAttempt: number) => {
        const delay = Math.pow(2, currentAttempt) * 1000;
        setTimeout(async () => {
            try {
                let blob: Blob;
                if (src.startsWith('blob:')) {
                    const res = await fetch(src);
                    blob = await res.blob();
                } else {
                    const match = src.match(/object\/public\/([^\/]+)\/(.+)/);
                    if (match) {
                        const { data, error: downloadErr } = await supabase.storage.from(match[1]).download(match[2]);
                        if (downloadErr) throw downloadErr;
                        blob = data!;
                    } else {
                        const res = await fetch(src, { mode: 'cors' });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        blob = await res.blob();
                    }
                }
                const objUrl = URL.createObjectURL(blob);
                setInternalSrc(objUrl);
            } catch (err) {
                if (currentAttempt < MAX_RETRIES) {
                    performRetry(currentAttempt + 1);
                } else {
                    setError(true);
                }
            }
        }, delay);
    };

    const togglePlay = () => {
        if (audioRef.current && !error) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(() => setError(true));
            }
        }
    };

    const handleTogglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        togglePlay();
    };

    return (
        <div className="flex items-center gap-3 bg-white/10 dark:bg-black/20 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-white/20 dark:border-white/5 min-w-[200px] shadow-lg group hover:bg-white/20 dark:hover:bg-black/40 transition-all duration-300">
            <button
                onClick={handleTogglePlay}
                disabled={error}
                className="size-10 flex items-center justify-center bg-vic-green rounded-full shadow-[0_0_15px_rgba(19,236,55,0.4)] hover:scale-110 active:scale-95 transition-all text-slate-900 shrink-0"
            >
                <span className="material-symbols-outlined text-2xl font-bold">
                    {error ? 'error' : isPlaying ? 'pause' : 'play_arrow'}
                </span>
            </button>

            <div className="flex-1 space-y-1">
                <div className="flex items-end gap-0.5 h-6">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-300`}
                            style={{ 
                                height: `${30 + (Math.sin(i * 0.5) * 20) + 20}%`,
                                backgroundColor: (progress * 20 / 100) > i ? '#13ec37' : 'currentColor',
                                opacity: (progress * 20 / 100) > i ? 1 : 0.2
                            }}
                        />
                    ))}
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-black tracking-tighter text-slate-500 underline-offset-2 dark:text-white/70">
                    <span>{isPlaying ? 'Playing...' : 'Voice Note'}</span>
                    <span>{duration > 0 ? `${Math.floor(audioRef.current?.currentTime || 0 / 60)}:${Math.floor(audioRef.current?.currentTime || 0 % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={internalSrc}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                        setProgress(p || 0);
                    }
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                }}
                onError={() => {
                    if (!internalSrc.startsWith('blob:') && retryCount < MAX_RETRIES) {
                        setRetryCount(prev => prev + 1);
                        performRetry(retryCount + 1);
                    } else {
                        setError(true);
                    }
                }}
                className="hidden"
            />
        </div>
    );
};

// --- Location Message Component (WhatsApp-style) ---
const LocationMessage = ({ lat, lng, name }: { lat: number; lng: number; name?: string }) => {
    const [imgError, setImgError] = useState(false);
    // Use OpenStreetMap static tile via Leaflet's tile convention (free, no API key needed)
    const zoom = 15;
    // Static map URL using OpenStreetMap Nominatim/Overpass static image via geoapify (free tier)
    // Fallback: show a placeholder with coordinates if image fails
    const mapUrl = `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${lng},${lat}&z=${zoom}&l=map&size=400,200&pt=${lng},${lat},pm2rdm`;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const appleMapsUrl = `https://maps.apple.com/?q=${lat},${lng}`;

    const openMap = () => {
        // Open native app or browser maps
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        window.open(isIOS ? appleMapsUrl : googleMapsUrl, '_blank');
    };

    return (
        <div
            className="relative overflow-hidden rounded-xl cursor-pointer group"
            style={{ minWidth: 220, maxWidth: 280 }}
            onClick={openMap}
        >
            {/* Map Preview */}
            {!imgError ? (
                <img
                    src={mapUrl}
                    alt="Location"
                    onError={() => setImgError(true)}
                    className="w-full h-[140px] object-cover rounded-t-xl"
                />
            ) : (
                // Fallback: OpenStreetMap tile via a different provider
                <div className="w-full h-[140px] bg-[#e8f4e8] dark:bg-[#1a2e1a] flex flex-col items-center justify-center gap-2 rounded-t-xl">
                    <span className="material-symbols-outlined text-[48px] text-vic-green">location_on</span>
                    <p className="text-xs text-[#667781] font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
                </div>
            )}

            {/* Red Pin Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                    <span className="material-symbols-outlined text-[36px] text-red-500 drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>location_on</span>
                </div>
            </div>

            {/* Dark Overlay on Hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-t-xl" />

            {/* Location Info Bar */}
            <div className="bg-white dark:bg-[#202c33] px-3 py-2 flex items-center gap-2 border-t border-black/5 rounded-b-xl">
                <span className="material-symbols-outlined text-[18px] text-vic-green shrink-0">near_me</span>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#111B21] dark:text-[#E9EDEF] truncate">
                        {name || 'Shared Location'}
                    </p>
                    <p className="text-[11px] text-[#667781] dark:text-[#8696A0]">
                        Tap to open in Maps
                    </p>
                </div>
            </div>
        </div>
    );
};

// UUID v4 validation - prevents sending "self" or any invalid string to Supabase
const isValidUUID = (id: string | undefined): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export default function ChatConversation() {
    const { id: activeId } = useParams() as { id: string };
    const isVirtual = activeId?.startsWith('new-');
    const virtualTargetId = isVirtual ? activeId?.replace('new-', '') : null;

    const { user } = useAuth();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const router = useRouter();
    const pathname = usePathname();

    // V12: Robust stabilization
    const pendingAnalysisContext = useAnalysisStore(state => state.pendingAnalysisContext);
    const clearPendingAnalysisContext = useAnalysisStore(state => state.clearPendingAnalysisContext);
    const lastMarkedId = useRef<string | null>(null);
    const renderCount = useRef(0);
    renderCount.current++;

    if (renderCount.current % 20 === 0) {
        console.log(`[Chat] Render #${renderCount.current} for ${activeId}`);
    }

    const [hasSentInitial, setHasSentInitial] = useState(false);
    const [message, setMessage] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [isRecordingLocked, setIsRecordingLocked] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji');
    const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob, url: string } | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [otherUserOnline, setOtherUserOnline] = useState(false);
    const [recordingStartY, setRecordingStartY] = useState<number | null>(null);
    const [recordingDragY, setRecordingDragY] = useState(0);
    const [recordingDragX, setRecordingDragX] = useState(0);
    const [recordingStartX, setRecordingStartX] = useState<number | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const shouldSendOnStopRef = useRef(false);
    const recordingStartTimeRef = useRef(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Visualizer Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [isDictating, setIsDictating] = useState(false);
    const recognitionRef = useRef<any>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Queries ---

    const { data: conversationData, isLoading: isLoadingConv } = useQuery({
        queryKey: ['conversation', activeId],
        queryKeyHashFn: () => `conversation-${activeId}`, // Force unique hash
        queryFn: () => getConversationById(activeId!, user!.id),
        enabled: isValidUUID(activeId) && !!user,
        refetchOnWindowFocus: false // Don't refetch on window focus to avoid jumps
    });

    const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
        queryKey: ['messages', activeId],
        queryFn: async () => {
            if (isVirtual && virtualTargetId) {
                // V7/V8: Check if a direct conversation already exists to load history using RPC
                const existingId = await findConversationByParticipants(user!.id, virtualTargetId);

                if (existingId) {
                    return getMessages(existingId);
                }
                return [];
            }
            return getMessages(activeId!);
        },
        enabled: (isValidUUID(activeId) || !!isVirtual) && !!user?.id,
        refetchOnWindowFocus: false
    });

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: () => getUserProfile(user!.id),
        enabled: !!user?.id
    });

    const { data: virtualProfile } = useQuery({
        queryKey: ['profile', virtualTargetId],
        queryFn: () => findUserByIdSecure(virtualTargetId!),
        enabled: !!isVirtual && !!virtualTargetId
    });

    const isAI = useMemo(() => conversationData?.conversation_type === 'ai' || (isVirtual && virtualTargetId === '00000000-0000-0000-0000-000000000001'), [conversationData, isVirtual, virtualTargetId]);
    const isSelf = useMemo(() => conversationData?.conversation_type === 'self' || (isVirtual && virtualTargetId === user?.id), [conversationData, isVirtual, virtualTargetId, user?.id]);

    // Construct a "resolvedConversation" that handles virtual IDs for the UI to render
    const conversation = useMemo(() => {
        if (conversationData) return conversationData;
        if (isVirtual && virtualProfile) {
            return {
                id: activeId,
                conversation_type: isAI ? 'ai' : isSelf ? 'self' : 'direct',
                conversation_participants: [
                    { user_id: user?.id, user_profiles: profile },
                    { user_id: virtualTargetId, user_profiles: virtualProfile }
                ]
            };
        }
        return null;
    }, [conversationData, isVirtual, virtualProfile, activeId, isAI, isSelf, user?.id, profile, virtualTargetId]);

    const isDirect = useMemo(() => conversation?.conversation_type === 'private' || conversation?.conversation_type === 'direct', [conversation]);

    const otherParticipant = useMemo(() => {
        if (isSelf) return null;
        return conversation?.conversation_participants?.find((p: any) => p.user_id !== user?.id);

    }, [conversation, user, isSelf]);

    const otherParticipantId = otherParticipant?.user_id;

    const { data: otherUserProfile } = useQuery({
        queryKey: ['profile', otherParticipantId],
        queryFn: () => findUserByIdSecure(otherParticipantId!),
        enabled: !!otherParticipantId && !isAI && !isSelf && !isVirtual
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

    // V13: Handle initial message and context from navigation state or stores
    useEffect(() => {
        const initialMessage = sessionStorage.getItem('chatInitialMessage');
        if (initialMessage && !hasSentInitial) {
            sessionStorage.removeItem('chatInitialMessage');
            setMessage(initialMessage);
            setHasSentInitial(true);
        } else if (pendingAnalysisContext && !hasSentInitial && isAI) {
            const ctx = pendingAnalysisContext;
            const msg = `I just analyzed ${ctx.productName} (${ctx.calories} kcal). ${ctx.political_warning ? 'It has an ethical warning.' : ''} How does this look for me?`;
            setMessage(msg);
            setHasSentInitial(true);
        }
    }, [pendingAnalysisContext, hasSentInitial, isAI]);

    if (activeId && !isValidUUID(activeId) && !isVirtual) {
        return null;
    }

    const displayName = useMemo(() => {
        if (isAI) return 'Health Coach';
        if (isSelf) return (profile?.full_name ? `${profile.full_name} (Me)` : 'Personal Notes');
        const rawP = isVirtual ? virtualProfile : (otherUserProfile || otherParticipant?.user_profiles);
        const p = Array.isArray(rawP) ? rawP[0] : rawP;
        return p?.full_name || p?.username || otherParticipant?.chat_users?.phone_number || 'User';
    }, [isAI, isSelf, profile, otherParticipant, otherUserProfile, isVirtual, virtualProfile]);

    const displayAvatar = useMemo(() => {
        if (isAI) return '/APP%20LOGO.jpg';
        if (isSelf) return profile?.avatar_url || null;
        if (isVirtual) return virtualProfile?.avatar_url || null;
        const rawP = otherUserProfile || otherParticipant?.user_profiles;
        const p = Array.isArray(rawP) ? rawP[0] : rawP;
        return p?.avatar_url || null;
    }, [isAI, isSelf, profile, otherParticipant, otherUserProfile, isVirtual, virtualProfile]);

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
            console.log("[Voice] Starting recording session...");
            const stream = await requestMicrophoneAccess({ audio: true });

            // Determine optimal supported audio MIME type for cross-browser compatibility
            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // Safari preferred
            } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus'; // Chrome preferred
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            }

            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const finalMimeType = mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: finalMimeType });

                stream.getTracks().forEach(track => track.stop());

                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(console.error);
                    audioContextRef.current = null;
                }
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }

                if (blob.size < 1000) {
                    // Too small / cancelled
                    setRecordedAudio(null);
                    setRecordingStatus('idle');
                    return;
                }

                if (shouldSendOnStopRef.current) {
                    // Send immediately! No preview.
                    setRecordingStatus('idle');
                    const uploadAndSend = async () => {
                        toast.loading("Sending audio...", { id: 'voice-upload' });
                        try {
                            const actualDuration = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
                            const audioFile = new File([blob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
                            const publicUrl = await uploadChatMedia(user!.id, audioFile);
                            sendMutation.mutate({
                                content: "Voice Message",
                                type: 'voice',
                                metadata: { url: publicUrl, duration: actualDuration }
                            });
                            toast.success("Sent!", { id: 'voice-upload' });
                        } catch (err) {
                            console.error("Failed to upload audio:", err);
                            toast.error("Failed to send audio", { id: 'voice-upload' });
                        }
                    };
                    uploadAndSend();
                } else {
                    // Show preview (because they locked it)
                    const url = URL.createObjectURL(blob);
                    setRecordedAudio({ blob, url });
                    setRecordingStatus('preview');
                }
            };

            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 64;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
            } catch (e) {
                console.error("Audio Context Init Failed", e);
            }

            recordingStartTimeRef.current = Date.now();
            recorder.start(1000);
            setIsRecording(true);
            setRecordingStatus('recording');
            setIsRecordingLocked(false);
            setRecordingDragY(0);

            if (e) {
                const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
                const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
                setRecordingStartY(y);
                setRecordingStartX(x);
            }
        } catch (err) {
            console.error("[Voice] Mic access denied:", err);
            toast.error("Microphone access denied");
        }
    };

    const startDictation = () => {
        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Speech recognition not supported in this browser");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = document.documentElement.lang || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = () => {
            setIsDictating(true);
            toast.info("Listening...", { id: 'stt-status' });
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setMessage(prev => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("STT Error:", event.error);
            setIsDictating(false);
            toast.error(`Error: ${event.error}`, { id: 'stt-status' });
        };

        recognition.onend = () => {
            setIsDictating(false);
            toast.dismiss('stt-status');
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopRecording = (cancel = false, sendImmediately = false) => {
        if (mediaRecorderRef.current && isRecording) {
            if (cancel) {
                shouldSendOnStopRef.current = false;
                mediaRecorderRef.current.onstop = () => {
                    console.log("[Voice] Recording cancelled");
                    setIsRecording(false);
                    setRecordingStatus('idle');
                    setIsRecordingLocked(false);
                    setRecordedAudio(null);
                    setRecordingDragY(0);
                };
            } else {
                shouldSendOnStopRef.current = sendImmediately;
            }
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const confirmVoiceSend = async () => {
        if (!recordedAudio || !user?.id) return;

        const { blob } = recordedAudio;
        if (blob.size < 100) {
            toast.error("Audio recording too short");
            setRecordedAudio(null);
            setRecordingStatus('idle');
            return;
        }

        toast.loading("Sending audio...", { id: 'voice-upload' });
        try {
            const audioFile = new File([blob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
            const publicUrl = await uploadChatMedia(user.id, audioFile);

            sendMutation.mutate({
                content: "Voice Message",
                type: 'voice',
                metadata: { url: publicUrl, duration: recordingDuration }
            });

            toast.success("Sent!", { id: 'voice-upload' });
        } catch (err) {
            console.error("Failed to upload audio:", err);
            toast.error("Failed to send audio", { id: 'voice-upload' });
        } finally {
            setRecordedAudio(null);
            setRecordingStatus('idle');
        }
    };

    const discardRecording = () => {
        setRecordedAudio(null);
        setRecordingStatus('idle');
        toast.info("Recording discarded");
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
        if (!user?.id || !convId) return;

        // Loop Guard: If we JUST marked this ID as read in this component instance, STOP.
        if (lastMarkedId.current === convId) {
            return;
        }

        let realId = convId;

        // If it's a virtual ID, resolve it
        if (convId.startsWith('new-')) {
            const targetId = convId.replace('new-', '');
            const existingId = await findConversationByParticipants(user.id, targetId);
            if (!existingId) return;
            realId = existingId;
        } else if (!isValidUUID(convId)) {
            return;
        }

        // --- Double Guard: Check local state too ---
        const conversations = queryClient.getQueryData<any[]>(['conversations', user.id]);
        const currentConv = conversations?.find(c => c.id === realId);

        // Only skip if unread_count is zero AND we've already marked THIS specific ID in this session.
        // If unread_count > 0, we ALWAYS want to try marking as read.
        if (currentConv && currentConv.unread_count === 0 && lastMarkedId.current === convId) {
            return;
        }

        console.log(`[Chat] Marking as read (API call): ${realId}`);
        lastMarkedId.current = convId; // Set guard IMMEDIATELY before async work

        // 1. Optimistic UI update
        queryClient.setQueryData(['conversations', user.id], (old: any) => {
            if (!old) return old;
            return old.map((c: any) => c.id === realId ? { ...c, unread_count: 0, is_read: true } : c);
        });

        try {
            await markAsRead(user.id, realId, new Date().toISOString());
            // No forced invalidation here, let the real-time events handle it
        } catch (err) {
            console.error('[Chat] Failed to clear unread:', err);
            lastMarkedId.current = null; // Reset guard on failure to allow retry
        }
    }, [user?.id, queryClient]);

    // V11: Ground Truth Persistence Logic
    const activeChannelRef = useRef<any>(null);
    const lastReadAtTimestampRef = useRef<string | null>(null);

    // Refs for handlers to avoid useEffect dependency churn
    const onMessageEventRef = useRef<((payload: any) => void) | null>(null);

    useEffect(() => {
        onMessageEventRef.current = (payload: any) => {
            console.log(`[Chat] V11 Real-time event [${payload.eventType}]:`, payload);

            if (payload.eventType === 'INSERT') {
                const newMessage = payload.new;

                // 1. Update local cache with deduplication
                queryClient.setQueryData(['messages', activeId], (old: any) => {
                    const base = Array.isArray(old) ? old : [];

                    // Already have this real message?
                    if (base.some((m: any) => m.id === newMessage.id)) {
                        console.log(`[Chat] Message ${newMessage.id} already in cache, skipping.`);
                        return old;
                    }

                    // If it's from US, try to match and replace the optimistic one
                    if (newMessage.sender_id === user?.id) {
                        const optIndex = base.findIndex(m =>
                            m.id?.toString().startsWith('opt-') &&
                            m.content === newMessage.content &&
                            m.message_type === newMessage.message_type
                        );
                        if (optIndex > -1) {
                            console.log(`[Chat] Replacing optimistic message with real message ${newMessage.id}`);
                            const updated = [...base];
                            updated[optIndex] = newMessage;
                            return updated;
                        }
                    }

                    console.log(`[Chat] Appending new message ${newMessage.id} to conversation ${activeId}`);
                    const next = [...base, newMessage].sort((a, b) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );

                    return next;
                });

                // Clear AI typing state if we received an AI message
                if (newMessage.sender_id === COACH_ID) {
                    setOtherUserTyping(false);
                }

                // 2. Mark as read if not from us
                if (newMessage.sender_id !== user?.id && activeId) {
                    markConversationAsReadLocal(activeId);
                }

                // --- Sidebar Sync ---
                queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
            } else if (payload.eventType === 'UPDATE') {
                const updatedMessage = payload.new;

                // If AI message is updating (streaming), ensure typing is false once it has content
                if (updatedMessage.sender_id === COACH_ID && updatedMessage.content?.length > 0) {
                    setOtherUserTyping(false);
                }

                queryClient.setQueryData(['messages', activeId], (old: any) => {
                    if (!old) return old;
                    return old.map((m: any) => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m);
                });
            } else if (payload.eventType === 'DELETE') {
                queryClient.setQueryData(['messages', activeId], (old: any) => {
                    if (!old) return old;
                    return old.filter((m: any) => m.id !== payload.old.id);
                });
            }
        };
    }, [activeId, user?.id, queryClient, markConversationAsReadLocal]);

    useEffect(() => {
        if (!activeId || !user?.id) return;

        // Skip for uninitialized virtual chats until first message
        const isV = activeId.startsWith('new-');
        const vTargetId = isV ? activeId.replace('new-', '') : null;

        const channelName = isV
            ? `private_chat_${[user.id, vTargetId].sort().join('_')}`
            : `chat_room_${activeId}`;

        const initChannel = () => {
            if (activeChannelRef.current) {
                console.log(`[Chat] V12 Cleaning up stale channel: ${activeChannelRef.current.topic}`);
                supabase.removeChannel(activeChannelRef.current);
                activeChannelRef.current = null;
            }

            console.log(`[Chat] V12 Subscribing to: ${channelName} for ${activeId}`);
            const channel = supabase.channel(channelName)
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    let isTyping = false;
                    let isOnline = false;
                    const targetId = isV ? vTargetId : otherParticipantId;

                    Object.values(state).forEach((presences: any) => {
                        presences.forEach((p: any) => {
                            if (p.user_id === targetId) {
                                isOnline = true;
                                if (p.typing && (p.conversation_id === activeId || isV)) {
                                    isTyping = true;
                                }
                            }
                        });
                    });

                    setOtherUserTyping(prev => (prev !== isTyping ? isTyping : prev));
                    setOtherUserOnline(prev => (prev !== isOnline ? isOnline : prev));
                })
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                    // V13: NO FILTER HERE. We filter manually in the handler to ensure 100% reliability.
                }, (payload) => {
                    const incomingConvId = payload.new ? (payload.new as any).conversation_id : (payload.old as any)?.conversation_id;
                    
                    // Only process messages for the CURRENT conversation (Case-Insensitive UUID check)
                    const isMatch = incomingConvId?.toString().toLowerCase() === activeId?.toString().toLowerCase();

                    if (isMatch || (isV && incomingConvId)) {
                        console.log(`[Chat] Real-time event [${payload.eventType}] matching ${activeId}. Incoming: ${incomingConvId}`);
                        onMessageEventRef.current?.(payload);
                    } else {
                        console.log(`[Chat] Skipping real-time event [${payload.eventType}] - No match. Target: ${activeId}, Received: ${incomingConvId}`);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Chat] V12 channel ${channelName} SUBSCRIBED`);
                        await channel.track({
                            user_id: user.id,
                            conversation_id: activeId,
                            online_at: new Date().toISOString(),
                            typing: false
                        });
                    }
                });

            activeChannelRef.current = channel;
        };

        initChannel();

        return () => {
            if (activeChannelRef.current) {
                console.log(`[Chat] V12 Hook Cleanup for ${activeChannelRef.current.topic}`);
                supabase.removeChannel(activeChannelRef.current);
                activeChannelRef.current = null;
            }
        };
    }, [activeId, user?.id]); // STRICT DEPENDENCY

    // On mount or switch: clear unread
    useEffect(() => {
        if (activeId && user?.id && lastMarkedId.current !== activeId) {
            console.log(`[Chat] Effect: Checking read status for ${activeId}`);
            markConversationAsReadLocal(activeId);
            lastMarkedId.current = activeId;
        }

        // Also clear unread when the window gains focus (e.g. user comes back to the tab)
        const handleFocus = () => {
            if (activeId && user?.id) {
                console.log("[Chat] Window focused, refreshing read status");
                markConversationAsReadLocal(activeId);
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            // Reset lastMarkedId on unmount if we want it to run again on remount
            // lastMarkedId.current = null; 
        };
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
        mutationFn: async (args: { content: string, type?: string, metadata?: any }) => {
            if (!user?.id || !activeId) throw new Error("Missing context");

            if (isVirtual && virtualTargetId) {
                console.log("[Chat] V11 Provisioning new conversation for virtual ID:", activeId);
                const newId = await provisionAndSendMessage(user.id, virtualTargetId, args.content, args.type || 'text', args.metadata);
                // The navigate will happen in onSettled or handleSend to avoid race conditions with Query cache
                return { id: 'new', realId: newId };
            }

            // Inject context if sending to AI
            const { latestAnalysis, clearLatestAnalysis } = useCoachInjectionStore.getState();
            const messageMetadata = {
                ...args.metadata,
                latest_analysis: isAI ? latestAnalysis : null
            };

            // Clear analysis after injection to prevent stale context next time
            if (isAI && latestAnalysis) {
                clearLatestAnalysis();
            }

            return sendMessage(user.id, activeId, args.content, (args.type as any) || 'text', messageMetadata, isAI, isSelf);
        },
        onMutate: async (newMsg) => {
            console.log("[Chat] sendMutation.onMutate", newMsg);
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
        onSuccess: (data: any) => {
            if (data?.realId) {
                console.log("[Chat] V11 Conversation provisioned! Navigating to:", data.realId);
                router.replace(`/chat/${data.realId}`);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', activeId] });
        }
    });
    const handleSend = async () => {
        if (!message.trim() || !user || !activeId || isSubmitting) return;
        const content = message.trim();

        console.log(`[Chat] handleSend to ${activeId}`);

        // Instant simulated response indicator for AI
        if (isAI) {
            setOtherUserTyping(true);
        }

        // Attach any pending analysis context when sending to the coach
        const contextMetadata = isAI && pendingAnalysisContext
            ? { scannedProductContext: pendingAnalysisContext }
            : undefined;

        if (isAI && pendingAnalysisContext) {
            clearPendingAnalysisContext();
        }

        sendMutation.mutate({ content, metadata: contextMetadata });
    };

    // --- Context Injection: Pre-populate input from navigation state ---
    useEffect(() => {
        if (hasSentInitial) return;
        const initialMsg = sessionStorage.getItem('chatInitialMessage');
        if (initialMsg && !isLoadingConv) {
            console.log("[Chat] Pre-populating input with context message...");
            sessionStorage.removeItem('chatInitialMessage');
            setHasSentInitial(true);
            setMessage(initialMsg);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [hasSentInitial, isLoadingConv]);

    const handleLocationShare = async () => {
        if (!navigator.geolocation) {
            toast.error('Location sharing is not supported by your browser');
            return;
        }

        const toastId = 'location-share';
        toast.loading('Getting your location...', { id: toastId });

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;

                // Reverse geocode for a nice address using Nominatim (free)
                let locationName = 'Current Location';
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await res.json();
                    if (data?.display_name) {
                        // Trim to just neighborhood + city
                        locationName = data.address?.suburb || data.address?.quarter || data.address?.city || data.display_name.split(',')[0];
                    }
                } catch {
                    // Silently fall back to generic name
                }

                toast.dismiss(toastId);
                sendMutation.mutate({
                    content: locationName,
                    type: 'location',
                    metadata: { lat, lng, name: locationName }
                });
                toast.success('Location sent!');
            },
            (error) => {
                toast.dismiss(toastId);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('Location permission denied. Please enable it in browser settings.');
                } else {
                    toast.error('Could not get your location. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const lastTypingSentRef = useRef<number>(0);
    const handleTyping = async () => {
        if (!user || !activeId || !activeChannelRef.current) return;

        // Throttle presence updates to once every 2 seconds to avoid channel noise
        const now = Date.now();
        if (now - lastTypingSentRef.current < 2000) return;
        lastTypingSentRef.current = now;

        // EPHEMERAL PRESENCE TYPING
        await sendTypingIndicator(activeChannelRef.current, user.id, activeId, true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(async () => {
            if (activeChannelRef.current) {
                await sendTypingIndicator(activeChannelRef.current, user.id, activeId, false);
            }
        }, 3000);
    };

    // --- Rendering Helpers ---

    const formatMessageTime = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessageContent = (msg: any) => {
        // Handle new JSON metadata vs old raw string metadata
        const metadata = msg.metadata;
        const mediaUrl = (typeof metadata === 'object' && metadata !== null) ? metadata.url : metadata;

        const handleLogFood = async (foodData: any) => {
            if (!user?.id) return;
            const tid = toast.loading("Adding to your daily log...");
            try {
                await saveFoodAnalysis(user.id, {
                    ...foodData,
                    image_url: mediaUrl || foodData.image_url
                });
                toast.success(`${foodData.name} logged successfully!`, { id: tid });
                queryClient.invalidateQueries({ queryKey: ['daily-progress'] });
            } catch (err) {
                console.error("Log failed:", err);
                toast.error("Failed to log food", { id: tid });
            }
        };

        switch (msg.message_type) {
            case 'image':
                return (
                    <div className="flex flex-col gap-2">
                        <img src={mediaUrl} alt="Shared" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(mediaUrl)} />
                        {/* Check for food analysis results in metadata */}
                        {metadata?.foodAnalysis && (
                            <div className="mt-3 p-4 bg-white/5 dark:bg-black/40 rounded-3xl border border-vic-green/30 backdrop-blur-md shadow-lg">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-black text-vic-green text-sm uppercase tracking-tight">{metadata.foodAnalysis.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${metadata.foodAnalysis.healthStatus === 'GOOD' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                metadata.foodAnalysis.healthStatus === 'POOR' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                }`}>
                                                {metadata.foodAnalysis.healthStatus || 'Neutral'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold uppercase overflow-x-auto no-scrollbar">
                                            <span className="shrink-0">{metadata.foodAnalysis.calories} kcal</span>
                                            <span className="shrink-0 text-white/20">|</span>
                                            <span className="shrink-0 text-vic-blue">{metadata.foodAnalysis.protein}g P</span>
                                            <span className="shrink-0 text-amber-400">{metadata.foodAnalysis.carbs}g C</span>
                                            <span className="shrink-0 text-rose-400">{metadata.foodAnalysis.fat}g F</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleLogFood(metadata.foodAnalysis)}
                                        className="shrink-0 w-10 h-10 bg-vic-green text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vic-green/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                    </button>
                                </div>
                                {metadata.foodAnalysis.clinical_synopsis && (
                                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                        <p className="text-[11px] leading-relaxed italic text-slate-600 dark:text-slate-400 font-medium">
                                            "{metadata.foodAnalysis.clinical_synopsis}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'video':
                return <video src={mediaUrl} controls className="max-w-full rounded-lg" />;
            case 'voice':
                return <AudioMessage src={mediaUrl} />;
            case 'location': {
                const locMeta = typeof metadata === 'object' && metadata !== null ? metadata : {};
                const lat = Number(locMeta.lat || locMeta.latitude || 0);
                const lng = Number(locMeta.lng || locMeta.longitude || 0);
                const locName = locMeta.name || msg.content || 'Shared Location';
                if (!lat || !lng) return <p className="text-[14.2px] leading-[19px]">📍 {msg.content || 'Location'}</p>;
                return <LocationMessage lat={lat} lng={lng} name={locName} />;
            }
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
                // Handle JSON-formatted AI responses that might contain analysis
                if (isAI && msg.content?.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed.foodAnalysis) {
                            return (
                                <div className="p-4 bg-white/5 dark:bg-black/40 rounded-3xl border border-vic-green/30 backdrop-blur-md shadow-lg my-2 max-w-[280px]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-black text-vic-green text-sm uppercase tracking-tight mb-1">{parsed.foodAnalysis.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${parsed.foodAnalysis.healthStatus === 'GOOD' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                parsed.foodAnalysis.healthStatus === 'POOR' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                }`}>
                                                {parsed.foodAnalysis.healthStatus || 'Neutral'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleLogFood(parsed.foodAnalysis)}
                                            className="w-10 h-10 bg-vic-green text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vic-green/20"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase mb-4">
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <div className="text-white">{parsed.foodAnalysis.calories}</div>
                                            <div className="text-slate-500 text-[6px]">KCAL</div>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <div className="text-vic-blue">{parsed.foodAnalysis.protein}g</div>
                                            <div className="text-slate-500 text-[6px]">PRO</div>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <div className="text-amber-400">{parsed.foodAnalysis.carbs}g</div>
                                            <div className="text-slate-500 text-[6px]">CARB</div>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <div className="text-rose-400">{parsed.foodAnalysis.fat}g</div>
                                            <div className="text-slate-500 text-[6px]">FAT</div>
                                        </div>
                                    </div>

                                    <p className="text-[11px] leading-relaxed italic text-slate-300 border-t border-white/5 pt-3">
                                        "{parsed.foodAnalysis.clinical_synopsis || parsed.reply}"
                                    </p>
                                </div>
                            );
                        }
                    } catch (e) {
                        // Not valid JSON, fall through to text
                    }
                }
                return <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap">{msg.content}</p>;
        }
    };

    // Grouping messages by date
    const groupedMessages = useMemo(() => {
        const groups: { [date: string]: any[] } = {};
        messages.forEach(msg => {
            const d = new Date(msg.created_at);
            const date = isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString();
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
                    <button onClick={() => router.back()} className="p-2 -ml-2 text-[#54656F] dark:text-[#8696A0] hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
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

                    <div className="flex-1 min-w-0" onClick={() => {
                        if (!isSelf && !isAI) {
                            const chatUser = Array.isArray(otherParticipant?.chat_users) ? otherParticipant.chat_users[0] : otherParticipant?.chat_users;
                            if (chatUser?.phone_number) router.push(`/expert/${chatUser.phone_number}`);
                        }
                    }}>
                        <h2 className="text-[16px] font-semibold text-[#111B21] dark:text-[#e9edef] truncate flex items-center gap-1.5">
                            {displayName}
                            {isAI && <span className="text-[9px] font-bold bg-vic-green/20 text-vic-green px-1.5 py-0.5 rounded-full">AI</span>}
                        </h2>
                        <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                            {otherUserTyping ? (
                                <span className="text-vic-green font-medium animate-pulse">typing...</span>
                            ) : otherUserOnline ? (
                                <span className="text-vic-green font-medium">Online</span>
                            ) : isAI ? (
                                'AI Coach'
                            ) : isSelf ? (
                                'Personal Workspace'
                            ) : (
                                expertStatus || 'Offline'
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
                                                router.push('/chat');
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
                                                                {msg.delivered_at || msg.is_delivered ? 'done_all' : 'done'}
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
                        {(!conversation && !isVirtual) ? (
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

                                {/* STT button */}
                                <button
                                    onClick={startDictation}
                                    className={`p-2 transition-colors rounded-full hover:bg-black/5 ${isDictating ? 'text-red-500 animate-pulse bg-red-50' : 'text-[#54656F] dark:text-[#8696A0] hover:text-[#111B21]'}`}
                                    title="Dictate"
                                >
                                    <span className="material-symbols-outlined text-[26px]">{isDictating ? 'mic' : 'keyboard_voice'}</span>
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
                            {/* Recording Preview Overlay */}
                            {recordingStatus === 'preview' && recordedAudio && (
                                <div className="absolute bottom-[60px] right-0 left-[-300px] md:left-[-400px] bg-white dark:bg-[#202c33] p-3 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex items-center gap-4 animate-in slide-in-from-bottom-2">
                                    <button
                                        onClick={discardRecording}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Discard"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">delete</span>
                                    </button>

                                    <audio src={recordedAudio.url} controls className="flex-1 h-8 max-w-[200px] md:max-w-none" />

                                    <button
                                        onClick={confirmVoiceSend}
                                        className="size-[40px] bg-vic-green text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                                        title="Send Voice Message"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">send</span>
                                    </button>
                                </div>
                            )}

                            {/* Microphone / Send Button */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => {
                                        if (!message.trim() && recordingStatus === 'idle') {
                                            startRecording(e);
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        if (!message.trim() && recordingStatus === 'idle') {
                                            // Don't prevent default here so clicks still work, but prevent ghost clicks if needed
                                            startRecording(e);
                                        }
                                    }}
                                    onClick={(e) => {
                                        if (message.trim()) {
                                            handleSend();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        if (recordingStatus === 'recording' && !isRecordingLocked) {
                                            if (recordingDuration < 1) {
                                                stopRecording(true);
                                                toast("Hold to record, release to send", { duration: 2000 });
                                            } else {
                                                stopRecording(false, true); // send immediately
                                            }
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        if (recordingStatus === 'recording' && !isRecordingLocked) {
                                            if (recordingDuration < 1) {
                                                stopRecording(true);
                                                toast("Hold to record, release to send", { duration: 2000 });
                                            } else {
                                                stopRecording(false, true); // send immediately
                                            }
                                        }
                                    }}

                                    className={`size-[48px] shrink-0 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 z-20 
                                      ${message.trim() || isRecordingLocked
                                            ? 'bg-[#00A884] text-white hover:bg-[#008f6f]'
                                            : recordingStatus === 'recording'
                                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50'
                                                : recordingStatus === 'preview'
                                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                                    : 'bg-[#00A884] text-white hover:bg-[#008f6f]'
                                        }`}
                                    style={{
                                        transform: recordingStatus === 'recording' && !isRecordingLocked ? `translateY(${-Math.min(recordingDragY, 60)}px)` : 'none',
                                        transition: 'transform 0.1s ease-out'
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[24px]">
                                        {message.trim() ? 'send' : (recordingStatus === 'recording' ? 'stop' : (recordingStatus === 'preview' ? 'audiotrack' : 'mic'))}
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

                    {/* Emoji/GIF/Sticker Picker Popover */}
                    {showEmoji && (
                        <div className="absolute bottom-[70px] left-0 md:left-auto md:w-[400px] z-40 bg-white dark:bg-[#1f2c34] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                            {/* Tabs */}
                            <div className="flex border-b border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setActiveMediaTab('emoji')}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'emoji' ? 'text-vic-green border-b-2 border-vic-green' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    Emoji
                                </button>
                                <button
                                    onClick={() => setActiveMediaTab('gif')}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'gif' ? 'text-vic-green border-b-2 border-vic-green' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    GIF
                                </button>
                                <button
                                    onClick={() => setActiveMediaTab('sticker')}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeMediaTab === 'sticker' ? 'text-vic-green border-b-2 border-vic-green' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    Sticker
                                </button>
                            </div>
                            <div className="h-[350px] overflow-y-auto custom-scrollbar bg-[#F0F2F5] dark:bg-[#111B21]">
                                {activeMediaTab === 'emoji' && (
                                    <EmojiPicker
                                        width="100%"
                                        height={350}
                                        onEmojiClick={onEmojiClick}
                                        theme={Theme.AUTO}
                                        emojiStyle={EmojiStyle.NATIVE}
                                        previewConfig={{ showPreview: false }}
                                        searchDisabled={false}
                                    />
                                )}
                                {activeMediaTab === 'gif' && (
                                    <div className="p-2 grid grid-cols-2 gap-2">
                                        {/* Mock GIFs from Giphy/Tenor */}
                                        {[
                                            'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', // Hello
                                            'https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif', // Thumbs up
                                            'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', // OK
                                            'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', // Laugh
                                            'https://media.giphy.com/media/3o6ozh46EBuEFtl0ig/giphy.gif', // Mind blown
                                            'https://media.giphy.com/media/l41YtZOb9EUABnuqA/giphy.gif'  // Yes
                                        ].map((gifUrl, idx) => (
                                            <div key={idx} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                                                sendMutation.mutate({ content: "GIF", type: 'image', metadata: gifUrl });
                                                setShowEmoji(false);
                                            }}>
                                                <img src={gifUrl} alt="GIF" className="w-full h-24 object-cover rounded-lg" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {activeMediaTab === 'sticker' && (
                                    <div className="p-3 grid grid-cols-4 gap-3">
                                        {/* Mock Stickers (transparent emojis/icons) */}
                                        {[
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433048.png', // Heart
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433100.png', // Fire
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433066.png', // LOL
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433054.png', // Party
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433095.png', // Sad
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433050.png', // Angry
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433085.png', // Cool
                                            'https://cdn-icons-png.flaticon.com/512/10433/10433076.png'  // Thinking
                                        ].map((stickerUrl, idx) => (
                                            <div key={idx} className="cursor-pointer hover:scale-110 active:scale-95 transition-transform" onClick={() => {
                                                sendMutation.mutate({ content: "Sticker", type: 'image', metadata: stickerUrl });
                                                setShowEmoji(false);
                                            }}>
                                                <img src={stickerUrl} alt="Sticker" className="w-full h-16 object-contain drop-shadow-md" />
                                            </div>
                                        ))}
                                    </div>
                                )}
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

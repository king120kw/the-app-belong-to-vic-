"use client"
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNavbar } from "./BottomNavbar";
import CallOverlay from "./CallOverlay";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useDailyCall } from "@/hooks/useDailyCall";
import { updateCallStatus, subscribeToUserConversations, unsubscribeFromMessages } from "@/lib/api/chat";
import { useTranslation } from "@/lib/api/translation";
import { useQueryClient } from "@tanstack/react-query";

export function GlobalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { lang } = useTranslation();
  const queryClient = useQueryClient();
  const isChatConversation = pathname.startsWith('/chat/') && pathname !== '/chat';

  useEffect(() => {
    document.documentElement.dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Global Call State
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const { joinCall, leaveCall, status: dailyStatus, participants, updateIframeStyle } = useDailyCall();

  // Global Call Listener
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel('global_calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[App] Incoming call:', payload.new);
          if (payload.new.status === 'ringing') {
            setIncomingCall(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status !== 'ringing') {
            setIncomingCall((prev: any) => (prev?.id === payload.new.id ? null : prev));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `caller_id=eq.${user.id}`,
        },
        (payload) => {
          setActiveCall((prev: any) => {
            if (prev?.id === payload.new.id) {
              return { ...prev, ...payload.new };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Global Chat Listener for Restoration & Updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToUserConversations(user.id, (payload) => {
      const key1 = ['conversations', user.id];
      const key2 = ['unread-messages-global', user.id];

      console.log("[App] Global chat update, invalidating:", key1, key2);
      queryClient.invalidateQueries({ queryKey: key1 });
      queryClient.invalidateQueries({ queryKey: key2 });
    });

    return () => {
      unsubscribeFromMessages(channel);
    };
  }, [user?.id]);

  const showOverlay = (incomingCall || activeCall);

  const handleGlobalAccept = async () => {
    if (!incomingCall) return;
    try {
      const acceptedCall = { ...incomingCall, status: 'connected' };
      setActiveCall(acceptedCall);
      setIncomingCall(null);

      await updateCallStatus(incomingCall.id, 'connected');

      if (incomingCall.room_url) {
        joinCall(incomingCall.room_url, incomingCall.type === 'video');
      }
    } catch (err) {
      console.error("Failed to accept call:", err);
      toast.error("Failed to accept call");
      setIncomingCall(incomingCall);
      setActiveCall(null);
    }
  };

  const handleGlobalDecline = async () => {
    if (!incomingCall) return;
    try {
      await updateCallStatus(incomingCall.id, 'declined');
      setIncomingCall(null);
    } catch (err) {
      console.error("Failed to decline call:", err);
      setIncomingCall(null);
    }
  };

  const handleGlobalEnd = async () => {
    const callId = activeCall?.id || incomingCall?.id;
    if (callId) {
      await updateCallStatus(callId, 'ended');
    }
    setActiveCall(null);
    setIncomingCall(null);
    setIsCallMinimized(false);
    leaveCall();
  };

  // Sync Daily Iframe Style with Minimization
  useEffect(() => {
    if (dailyStatus === 'joined') {
      if (isCallMinimized) {
        updateIframeStyle({
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          zIndex: '9999',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          pointerEvents: 'auto'
        });
      } else {
        updateIframeStyle({
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: '0',
          zIndex: '9999',
          borderRadius: '0'
        });
      }
    }
  }, [isCallMinimized, dailyStatus, updateIframeStyle]);

  // Auto-minimize when navigating away from chat
  useEffect(() => {
    if (dailyStatus === 'joined' && !isChatConversation && !isCallMinimized) {
      setIsCallMinimized(true);
    }
  }, [pathname, dailyStatus, isChatConversation, isCallMinimized]);

  // AI Coach Midnight Trigger
  useEffect(() => {
    if (!user?.id) return;

    const checkAndTriggerSummary = async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const lastCheckKey = `vicalary_summary_check_${user.id}`;
        const lastChecked = localStorage.getItem(lastCheckKey);

        if (lastChecked !== today) {
          // If it's early morning (e.g., just after midnight), we trigger for "yesterday"
          // If they open later, we trigger for "today" to give them a wrap-up.
          // The user specifically asked for "at midnight".
          console.log("[Coach] Checking daily summary trigger...");
          const { generateDailySummary } = await import("@/lib/api/coach");
          await generateDailySummary(user.id, today); 
          localStorage.setItem(lastCheckKey, today);
        }
      } catch (e) {
        console.error("[Coach] Trigger failed:", e);
      }
    };

    checkAndTriggerSummary();
    const interval = setInterval(checkAndTriggerSummary, 60 * 60 * 1000); // Check hourly
    return () => clearInterval(interval);
  }, [user?.id]);

  // Global Auth Loader to prevent flashing
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0b141a] flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-vic-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-vic-green font-bold tracking-widest text-xs uppercase animate-pulse">Loading VICALARY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <CallOverlay
            type={incomingCall?.type || activeCall?.type || 'voice'}
            status={incomingCall ? 'ringing' : 'connected'}
            caller={{
              name: incomingCall
                ? (incomingCall.caller?.full_name || incomingCall.caller?.display_name || 'Caller')
                : (activeCall?.receiver?.full_name || activeCall?.receiver?.display_name || 'Calling...'),
              avatar: incomingCall
                ? incomingCall.caller?.avatar_url
                : (activeCall?.receiver?.avatar_url)
            }}
            direction={incomingCall ? 'incoming' : 'outgoing'}
            onAccept={handleGlobalAccept}
            onDecline={handleGlobalDecline}
            onEnd={handleGlobalEnd}
            isMinimized={isCallMinimized}
            onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
          />
        </div>
      )}
      <main className={`flex-1 ${!isChatConversation && pathname !== '/onboarding' ? 'pb-16' : ''}`}>
        {children}
      </main>
      {!isChatConversation && <BottomNavbar />}
    </div>
  );
}

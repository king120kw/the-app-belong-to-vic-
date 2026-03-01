import { useState, useEffect, useRef } from "react";
import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Camera from "./pages/Camera";
import Notifications from "./pages/Notifications";
import PhoneInput from "./pages/PhoneInput";
import VerificationCode from "./pages/VerificationCode";
import Chat from "./pages/Chat";
import ChatConversation from "./pages/ChatConversation";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Cookbook from "./pages/Cookbook";
import RecipeDetails from "./pages/RecipeDetails";
import Budget from "./pages/Budget";
import ProgressAnalysis from "./pages/ProgressAnalysis";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { BottomNavbar } from "./components/BottomNavbar";
import CallOverlay from "./components/CallOverlay";
import { supabase } from "./lib/supabase";
import { useAuth, AuthProvider } from "./lib/AuthContext";
import { toast } from "sonner";
import { useDailyCall } from "./hooks/useDailyCall";
import { updateCallStatus, subscribeToUserConversations, unsubscribeFromMessages } from "./lib/api/chat";

const queryClient = new QueryClient();

import ErrorBoundary from "./components/ErrorBoundary";

import { useTranslation } from "./lib/api/translation";

const MainLayout = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { lang } = useTranslation();
  const isChatConversation = location.pathname.startsWith('/chat/') && location.pathname !== '/chat';

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
            // Fetch caller details if possible, or rely on payload structure if RLS allows
            // For now, we set it directly. 
            // Note: payload.new usually only has raw columns. 
            // We might need to fetch profile if the overlay needs name/avatar.
            // But let's set it first to trigger the UI.
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
            // If call ended/missed/connected elsewhere
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
          // Check if our outgoing call was answered
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
      // Invalidate queries to update UI
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

  // Logic: Show overlay if:
  // 1. Incoming call exists (Status: ringing)
  // 2. Active call exists AND (we haven't joined yet OR we joined but only us are there)
  // This mimics "Calling..." screen until the other person picks up (joins).

  const showOverlay = (incomingCall || activeCall);

  const handleGlobalAccept = async () => {
    if (!incomingCall) return;
    try {
      // Optimistic update
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
      setIncomingCall(incomingCall); // Revert on error
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
        // Floating Bubble Style
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
        // Full Screen Style
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
  }, [location.pathname, dailyStatus, isChatConversation, isCallMinimized]);
  // Global Auth Loader to prevent flashing
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0b141a] flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-vic-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-vic-green font-bold tracking-widest text-xs uppercase animate-pulse">Loading VicCalary...</p>
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
      <main className={`flex-1 ${!isChatConversation && location.pathname !== '/onboarding' ? 'pb-16' : ''}`}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:id" element={<ChatConversation />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/cookbook" element={<Cookbook />} />
          <Route path="/recipe/:id" element={<RecipeDetails />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/phone-input" element={<PhoneInput />} />
          <Route path="/verification-code" element={<VerificationCode />} />
          <Route path="/analysis" element={<ProgressAnalysis />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isChatConversation && <BottomNavbar />}
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <AuthProvider>
              <MainLayout />
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

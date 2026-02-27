import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getConversationsV2, isChatVerified, createPrivateConversation, findUserByPhone, softDeleteConversation } from "../lib/api/chat";
import { searchUsers, getUserProfile } from "../lib/api/auth";
import { useTranslation } from "../lib/api/translation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import QRScanner from "../components/QRScanner";

export default function Chat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [contactFound, setContactFound] = useState<any>(null);

  // Fetch current user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user?.id
  });

  // Search users for discovery
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['user-search', discoveryQuery],
    queryFn: () => searchUsers(discoveryQuery, user!.id),
    enabled: !!user?.id && discoveryQuery.length >= 2
  });

  const startConversationMutation = useMutation({
    mutationFn: (otherUserId: string) => createPrivateConversation(user!.id, otherUserId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setIsDiscoveryOpen(false);
      setShowManualEntry(false);
      navigate(`/chat/${data.id}`);
    }
  });


  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      try {
        await softDeleteConversation(conversationId, user!.id);
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
        toast.success("Conversation deleted");
      } catch (err) {
        toast.error("Failed to delete conversation");
      }
    }
  };

  const resolveContact = async (phoneOrId: string, isId: boolean = false) => {
    try {
      setIsSearchingPhone(true);
      let targetUser = null;

      if (isId) {
        // Fetch profile for the ID
        targetUser = await getUserProfile(phoneOrId);
      } else {
        targetUser = await findUserByPhone(phoneOrId);
      }

      if (!targetUser) {
        toast.error("User not found or not verified for chat");
        return;
      }

      setContactFound(targetUser);
      setShowManualEntry(false);
    } catch (err: any) {
      toast.error(`Resolution failed: ${err.message}`);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const handleManualContact = async () => {
    if (!manualPhone || manualPhone.length < 7) {
      toast.error("Please enter a valid phone number");
      return;
    }
    await resolveContact(manualPhone);
  };

  const openSelfChat = () => {
    navigate(`/chat/self`);
  };

  // Check if user is verified for chat
  const { data: verified, isLoading: isVerifying } = useQuery({
    queryKey: ['chat-verified', user?.id],
    queryFn: () => isChatVerified(user!.id),
    enabled: !!user?.id
  });

  // Fetch conversations
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => getConversationsV2(user!.id),
    enabled: !!user?.id && !!verified,
    refetchInterval: 10000 // Auto-refresh every 10 seconds
  });

  // Real-time conversation list updates
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id || !verified) return;

    // Listen for window focus to refresh unread counts when user returns to tab
    const handleFocus = () => {
      console.log("[Chat] Window focused, refreshing conversation list");
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
    };
    window.addEventListener('focus', handleFocus);



    // Presence logic
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
      window.removeEventListener('focus', handleFocus);

      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id, verified, queryClient]);

  // Filter & Deduplicate conversations
  const isSelfUser = (conv: any) => {
    return conv.conversation_participants?.length > 0 && conv.conversation_participants.every((p: any) => p.user_id === user?.id);
  };

  const filteredConversations = (() => {
    if (!conversations) return [];

    // 1. Deduplicate conversations
    const seen = new Set();
    const unique: any[] = [];

    conversations.forEach((conv: any) => {
      // Groups: Deduplicate by ID
      if (conv.is_group) {
        if (!seen.has(conv.id)) {
          seen.add(conv.id);
          unique.push(conv);
        }
        return;
      }

      // Direct Messages: Deduplicate by Partner ID OR Conversation ID for self-chats
      const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== user?.id);

      // For self-chats (no other participant), use conversation ID to prevent merging different self-chats
      // For friend chats, use the friend's user ID to deduplicate
      const dedupeKey = otherParticipant?.user_id || `self-${conv.id}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        unique.push(conv);
      }
    });

    // 2. Filter by search query and tab
    return unique.filter((conv: any) => {
      const matchesSearch = (
        conv.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.display_phone?.includes(searchQuery) ||
        conv.last_message?.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (!matchesSearch) return false;

      if (activeTab === 'Unread') {
        return (conv.unread_count || 0) > 0;
      }
      if (activeTab === 'Groups') {
        return conv.is_group;
      }
      return true;
    });
  })();

  // Optimized Unread check
  const isActuallyUnread = (conv: any) => (conv.unread_count || 0) > 0;

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0b141a]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-vic-green"></div>
      </div>
    );
  }

  if (!verified && user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-white dark:bg-[#0d1418]">
        <div className="size-24 bg-vic-green/10 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-vic-green">chat</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('chat_experts')}</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xs">{t('chat_desc')}</p>
        <button
          onClick={() => navigate("/phone-input")}
          className="w-full max-w-xs py-4 bg-vic-green text-slate-900 font-bold rounded-2xl shadow-lg"
        >
          {t('verify_phone')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full bg-white dark:bg-[#0b141a] h-[100dvh] font-sans">
      <header className="px-4 py-3 bg-white dark:bg-[#0d1418] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-vic-deep-blue dark:text-vic-green hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-vic-deep-blue dark:text-white tracking-tight">VicCalary</h1>
              <p className="text-[10px] font-bold text-vic-green uppercase tracking-widest">{t('messages')}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => toast.info("Voice calling coming soon!")} className="text-slate-400">
              <span className="material-symbols-outlined">call</span>
            </button>
            <button onClick={() => toast.info("Video calling coming soon!")} className="text-slate-400">
              <span className="material-symbols-outlined">videocam</span>
            </button>
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#233138] rounded-xl shadow-xl border border-slate-100 dark:border-white/5 z-50 py-2">
                  <button onClick={() => { setIsDiscoveryOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm dark:text-white hover:bg-slate-50 dark:hover:bg-white/5">New Chat</button>
                  <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm dark:text-white hover:bg-slate-50 dark:hover:bg-white/5">Profile</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Unread', 'Favorites', 'Groups'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab
                ? 'bg-vic-green/20 text-vic-green border border-vic-green/30'
                : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-vic-green"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.02]">
            {/* Message Yourself - Unified Entry */}
            {(() => {
              const selfConv = conversations?.find((c: any) => isSelfUser(c));
              const isUnread = selfConv && isActuallyUnread(selfConv);

              return (
                <button
                  onClick={() => {
                    if (selfConv) {
                      navigate(`/chat/${selfConv.id}`);
                    } else {
                      openSelfChat();
                    }
                  }}
                  className={`w-full flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] text-left transition-colors ${isUnread ? 'bg-vic-green/5 dark:bg-vic-green/5' : ''}`}
                >
                  <div className="size-14 rounded-full overflow-hidden bg-vic-pink/10 flex items-center justify-center border border-vic-pink/20 relative">
                    {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-vic-pink">mood</span>}
                    {isUnread && (
                      <div className="absolute top-0 right-0 size-3 bg-vic-green rounded-full border-2 border-white dark:border-[#111B21]"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className={`truncate dark:text-white ${isUnread ? 'font-black text-slate-900' : 'font-bold'}`}>Message Yourself</h3>
                      {selfConv?.last_message && (
                        <span className={`text-[10px] ${isUnread ? 'text-vic-green font-bold' : 'text-slate-400'}`}>
                          {new Date(selfConv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!selfConv?.last_message && <span className="text-[10px] text-vic-pink">Self</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-[13px] truncate ${isUnread ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500'}`}>
                        {selfConv?.last_message?.content || "Send a message to yourself"}
                      </p>
                      {isUnread && (
                        <div className="min-w-[20px] h-5 px-1.5 bg-vic-green rounded-full flex items-center justify-center ml-2">
                          <span className="text-[10px] font-bold text-white">{selfConv.unread_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })()}

            {filteredConversations
              .filter(conv => !isSelfUser(conv))
              .map((conv: any) => {
                const isUnread = isActuallyUnread(conv);

                return (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    className={`flex gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors ${isUnread ? 'bg-vic-green/5 dark:bg-vic-green/5' : ''}`}
                  >
                    <div className="size-14 rounded-full overflow-hidden shrink-0 relative">
                      <img src={conv.display_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.display_name)}&background=006BFF&color=fff`} className="w-full h-full object-cover" />
                      {(() => {
                        const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== user?.id);
                        const isOnline = otherParticipant && onlineUsers.has(otherParticipant.user_id);
                        return isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 size-3.5 bg-[#25D366] rounded-full border-2 border-white dark:border-[#0b141a]"></div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className={`truncate dark:text-white ${isUnread ? 'font-black text-slate-900' : 'font-bold'}`}>
                          {conv.display_name}
                        </h3>
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] ${isUnread ? 'text-vic-green font-bold' : 'text-slate-400'}`}>
                            {(() => {
                              const date = new Date(conv.last_message?.created_at || conv.created_at);
                              const now = new Date();
                              const isToday = date.toDateString() === now.toDateString();
                              const yesterday = new Date(now);
                              yesterday.setDate(now.getDate() - 1);
                              const isYesterday = date.toDateString() === yesterday.toDateString();

                              if (isToday) {
                                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              } else if (isYesterday) {
                                return "Yesterday";
                              } else {
                                return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          {conv.last_message?.sender_id === user?.id && (
                            <span className={`material-symbols-outlined text-[14px] ${conv.last_message?.read_at ? 'text-[#34B7F1]' : 'text-slate-400'}`}>
                              done_all
                            </span>
                          )}
                          <p className={`text-[13px] truncate ${isUnread ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500'}`}>
                            {conv.last_message?.content || "Tap to start chatting"}
                          </p>
                        </div>

                        {/* Unread Badge (Count or Dot) */}
                        {isUnread && (
                          <div className="min-w-[20px] h-5 px-1.5 bg-vic-green rounded-full flex items-center justify-center ml-2">
                            <span className="text-[10px] font-bold text-white">{conv.unread_count > 0 ? conv.unread_count : 1}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
          </div>
        )}
      </main>

      <button onClick={() => setIsDiscoveryOpen(true)} className="fixed bottom-24 right-6 size-14 bg-vic-pink text-white rounded-full shadow-lg flex items-center justify-center">
        <span className="material-symbols-outlined">add_comment</span>
      </button>

      {/* Discovery Modal */}
      {isDiscoveryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f2c34] w-full max-w-lg rounded-3xl overflow-hidden">
            <div className="p-4 border-b dark:border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">New Chat</h2>
              <button onClick={() => setIsDiscoveryOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => { setShowQRScanner(true); setIsDiscoveryOpen(false); }} className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl">
                  <span className="material-symbols-outlined text-3xl text-vic-green">qr_code_scanner</span>
                  <span className="text-xs font-bold dark:text-white">Scan QR</span>
                </button>
                <button onClick={() => setShowManualEntry(true)} className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl">
                  <span className="material-symbols-outlined text-3xl text-vic-pink">person_add</span>
                  <span className="text-xs font-bold dark:text-white">Phone Number</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Search name..."
                value={discoveryQuery}
                onChange={(e) => setDiscoveryQuery(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-black/20 rounded-xl outline-none dark:text-white mb-4"
              />

              {searchResults?.map((result: any) => (
                <button key={result.id} onClick={() => startConversationMutation.mutate(result.id)} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl">
                  <div className="size-10 rounded-full overflow-hidden shrink-0">
                    <img src={result.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.full_name)}`} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold dark:text-white">{result.full_name}</h4>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f2c34] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-8 border border-white/10">
            <div className="size-16 bg-vic-pink/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl text-vic-pink">person_add</span>
            </div>
            <h2 className="text-2xl font-black dark:text-white mb-2 tracking-tight">Add by Phone</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Enter the verified number including country code (e.g. 6281216724463).</p>

            <input
              autoFocus
              type="tel"
              placeholder="Phone Number"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full h-16 p-5 bg-slate-50 dark:bg-black/40 rounded-2xl border-2 border-transparent focus:border-vic-pink outline-none text-xl font-bold dark:text-white mb-8 transition-all"
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={handleManualContact}
                disabled={manualPhone.length < 7 || isSearchingPhone}
                className="w-full py-5 bg-vic-green text-slate-900 font-black rounded-2xl shadow-xl shadow-vic-green/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSearchingPhone && <div className="size-5 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />}
                FIND & ADD CONTACT
              </button>
              <button onClick={() => setShowManualEntry(false)} className="w-full py-4 text-slate-500 font-bold hover:text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showQRScanner && (
        <QRScanner
          onScan={async (data) => {
            setShowQRScanner(false);
            try {
              // Try JSON first (for backward compatibility or structured QR)
              const qrData = JSON.parse(data);
              if (qrData.userId) {
                resolveContact(qrData.userId, true);
                return;
              }
              if (qrData.phone) {
                resolveContact(qrData.phone);
                return;
              }
            } catch (err) {
              // Not JSON, treat as raw phone number if it looks like one
              const phoneRegex = /^\+?[0-9]{7,15}$/;
              if (phoneRegex.test(data)) {
                resolveContact(data);
              } else {
                toast.error('Invalid QR code format');
              }
            }
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* Contact Found Overlay */}
      {contactFound && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#1f2c34] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-24 rounded-full overflow-hidden mb-6 ring-4 ring-vic-green/20">
                <img
                  src={contactFound.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contactFound.full_name)}&background=00A884&color=fff&size=200`}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-black dark:text-white mb-1">{contactFound.full_name}</h2>
              <p className="text-vic-green font-bold text-sm mb-8">{contactFound.phone_number}</p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => startConversationMutation.mutate(contactFound.id)}
                  className="w-full py-5 bg-vic-green text-slate-900 font-black rounded-2xl shadow-xl shadow-vic-green/20 active:scale-95 transition-all"
                >
                  ADD CONTACT & CHAT
                </button>
                <button
                  onClick={() => setContactFound(null)}
                  className="w-full py-4 text-slate-500 font-bold hover:text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

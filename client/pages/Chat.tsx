import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread?: number;
  status?: "sent" | "delivered" | "read";
  type?: "text" | "voice" | "photo";
}

export default function Chat() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");

  const chats: Chat[] = [
    {
      id: 1,
      name: "Musthafa",
      avatar: "👤",
      lastMessage: "Did you test her",
      time: "18:51",
      status: "read",
    },
    {
      id: 2,
      name: "Ibrahim my blood brother",
      avatar: "👨",
      lastMessage: "Voice call",
      time: "17:41",
      type: "voice",
    },
    {
      id: 3,
      name: "V My Tomato 🍅",
      avatar: "🧑",
      lastMessage: "Photo",
      time: "15:48",
      type: "photo",
    },
    {
      id: 4,
      name: "Emados Shawarma",
      avatar: "👤",
      lastMessage: "2 shawarma, uma'il 3 nasmadi an 2...",
      time: "15:34",
      status: "read",
    },
    {
      id: 5,
      name: "+62 857-2746-8286",
      avatar: "📞",
      lastMessage: "Yo",
      time: "15:33",
      status: "delivered",
      unread: 1,
    },
    {
      id: 6,
      name: "Bob UMP",
      avatar: "BU",
      lastMessage: "Okay",
      time: "14:20",
      status: "read",
    },
  ];

  useEffect(() => {
    const isPhoneVerified = localStorage.getItem("phoneVerified");
    if (!isPhoneVerified) {
      navigate("/phone-input");
    }
  }, [navigate]);

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#0d1418] text-white font-display">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1f2c34]">
        <h1 className="text-xl font-semibold">VicCalary</h1>
        <div className="flex items-center gap-6">
          <button className="text-gray-300">
            <span className="material-symbols-outlined text-2xl">photo_camera</span>
          </button>
          <button className="text-gray-300">
            <span className="material-symbols-outlined text-2xl">more_vert</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-[#1f2c34]">
        <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
          <input
            type="text"
            placeholder="Ask VicCalary AI or Search"
            className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1418] overflow-x-auto scrollbar-hide">
        {["All", "Unread", "Favourites", "Groups"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter
                ? "bg-vic-green text-[#0d1418]"
                : "bg-[#1f2c34] text-gray-300"
              }`}
          >
            {filter}
          </button>
        ))}
        <button className="flex size-7 items-center justify-center rounded-full bg-[#1f2c34] text-gray-300">
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>

      {/* Archived Section */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2c34] hover:bg-[#1f2c34] cursor-pointer transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded bg-[#09141a]">
            <span className="material-symbols-outlined text-vic-green text-xl">archive</span>
          </div>
          <span className="text-base font-medium">Archived</span>
        </div>
        <span className="material-symbols-outlined text-gray-500">chevron_right</span>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#1f2c34] cursor-pointer transition-colors border-b border-[#1a1a1a]"
            onClick={() => navigate(`/chat/${chat.id}`)}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={`flex size-12 items-center justify-center rounded-full text-xl ${chat.avatar.length === 2
                    ? "bg-[#d84a38] text-white font-bold"
                    : "bg-gray-700"
                  }`}
              >
                {chat.avatar}
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-base font-medium text-white truncate">{chat.name}</h3>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="flex items-center gap-1">
                {chat.status && (
                  <span className="material-symbols-outlined text-base text-gray-400">
                    {chat.status === "read" ? "done_all" : "done"}
                  </span>
                )}
                {chat.type === "voice" && (
                  <span className="material-symbols-outlined text-base text-gray-400">call</span>
                )}
                {chat.type === "photo" && (
                  <span className="material-symbols-outlined text-base text-gray-400">
                    photo_camera
                  </span>
                )}
                <p className="text-sm text-gray-400 truncate flex-1">{chat.lastMessage}</p>
              </div>
            </div>

            {/* Unread Badge */}
            {chat.unread && (
              <div className="flex-shrink-0 flex size-5 items-center justify-center rounded-full bg-vic-green text-xs font-bold text-[#0d1418]">
                {chat.unread}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-vic-green shadow-lg hover:bg-vic-green/90 transition-all">
        <span className="material-symbols-outlined text-[#0d1418] text-2xl">add</span>
      </button>
    </div>
  );
}

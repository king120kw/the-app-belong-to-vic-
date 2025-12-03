import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [userAvatar, setUserAvatar] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem("userName") || "User";
    setUserName(savedName);
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("userName");
    // Optional: Clear other user data if needed
    navigate("/");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUserAvatar(base64String);
        localStorage.setItem("userAvatar", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto w-full pb-32 bg-white dark:bg-[#0d1418]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-vic-deep-blue dark:text-vic-green font-bold hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="text-red-500 font-bold text-sm hover:opacity-80 transition-opacity"
        >
          Sign Out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="relative w-24 h-24 mb-4 cursor-pointer group"
            onClick={handleAvatarClick}
          >
            <img
              src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=13ec37&color=fff&size=128`}
              alt="User"
              className="w-full h-full rounded-full object-cover border-2 border-vic-green"
            />
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white">edit</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {userName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">user@example.com</p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-[#1f2c34] rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Weight
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              70 kg
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-[#1f2c34] rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Goal
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              Lose Weight
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-[#1f2c34] rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Member Since
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              Dec 2024
            </p>
          </div>
        </div>

        <Link
          to="/settings"
          className="mt-8 block w-full px-6 py-3 bg-vic-deep-blue text-white rounded-lg font-bold text-center hover:bg-vic-blue transition-colors"
        >
          Go to Settings
        </Link>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-[#0d1418] border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-around">
          {[
            { label: "Home", icon: "home", path: "/dashboard" },
            {
              label: "Notifications",
              icon: "notifications",
              path: "/notifications",
            },
            { label: "Chat", icon: "chat", path: "/chat" },
            {
              label: "Profile",
              icon: "person",
              path: "/profile",
              active: true,
            },
          ].map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors ${tab.active
                  ? "text-vic-deep-blue dark:text-vic-green"
                  : "text-slate-500 dark:text-slate-400"
                }`}
            >
              <span
                className={`material-symbols-outlined ${tab.active ? "icon-filled" : ""}`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-xs font-medium ${tab.active ? "font-bold" : ""}`}
              >
                {tab.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

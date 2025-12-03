import { useState } from "react";
import { Link } from "react-router-dom";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 bg-white dark:bg-slate-950">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-vic-deep-blue dark:text-vic-green font-bold hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex-1 text-center">
          Settings
        </h1>
        <div className="w-6" />
      </header>

      <main className="flex-1 overflow-y-auto pb-6">
        {/* Profile Section */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                Alex Johnson
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                alex@example.com
              </p>
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-vic-green/20 dark:bg-vic-green/30 text-vic-blue dark:text-vic-green rounded-lg font-medium hover:bg-vic-green/30 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">camera</span>
            Change Profile Picture
          </button>
        </div>

        {/* General Settings */}
        <SettingGroup title="GENERAL">
          <SettingItem
            label="Account Settings"
            icon="account_circle"
            onClick={() => alert("Coming soon!")}
          />
          <SettingItem
            label="Language"
            icon="language"
            value="English"
            onClick={() => alert("Coming soon!")}
          />
        </SettingGroup>

        {/* Theme Settings */}
        <SettingGroup title="APPEARANCE">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 last:border-0">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                dark_mode
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                Dark Mode
              </span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-7 rounded-full transition-colors ${
                darkMode ? "bg-vic-green" : "bg-slate-300"
              } relative`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  darkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </SettingGroup>

        {/* Notification Settings */}
        <SettingGroup title="NOTIFICATIONS">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 last:border-0">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                notifications
              </span>
              <span className="font-medium text-slate-900 dark:text-white">
                Push Notifications
              </span>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-7 rounded-full transition-colors ${
                notifications ? "bg-vic-green" : "bg-slate-300"
              } relative`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </SettingGroup>

        {/* Subscription Settings */}
        <SettingGroup title="SUBSCRIPTION">
          <SettingItem
            label="Premium Features"
            icon="star"
            value="Basic Plan"
            onClick={() => alert("Coming soon!")}
          />
        </SettingGroup>

        {/* Help & Info */}
        <SettingGroup title="HELP & INFO">
          <SettingItem
            label="Privacy Policy"
            icon="privacy_tip"
            onClick={() => alert("Coming soon!")}
          />
          <SettingItem
            label="Terms of Service"
            icon="description"
            onClick={() => alert("Coming soon!")}
          />
          <SettingItem
            label="App Version"
            icon="info"
            value="1.0.0"
            clickable={false}
          />
        </SettingGroup>

        {/* Logout Button */}
        <div className="p-6">
          <button className="w-full px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-b border-slate-200 dark:border-slate-800">
      <h3 className="px-6 py-3 text-xs uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider">
        {title}
      </h3>
      <div className="bg-white dark:bg-slate-900">{children}</div>
    </div>
  );
}

function SettingItem({
  label,
  icon,
  value,
  onClick,
  clickable = true,
}: {
  label: string;
  icon: string;
  value?: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={`w-full flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 last:border-0 ${
        clickable
          ? "hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          : "cursor-default"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
          {icon}
        </span>
        <span className="font-medium text-slate-900 dark:text-white">
          {label}
        </span>
      </div>
      {value && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {value}
          </span>
          {clickable && (
            <span className="material-symbols-outlined text-slate-400">
              chevron_right
            </span>
          )}
        </div>
      )}
    </button>
  );
}

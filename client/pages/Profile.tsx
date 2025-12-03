import { Link } from "react-router-dom";

export default function Profile() {
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto w-full pb-32">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-vic-deep-blue dark:text-vic-green font-bold hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Profile
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
            alt="User"
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Alex Johnson
          </h1>
          <p className="text-slate-600 dark:text-slate-400">alex@example.com</p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Weight
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              70 kg
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Goal
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              Lose Weight
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
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

      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
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
              className={`flex-1 flex flex-col items-center justify-center py-4 gap-1 transition-colors ${
                tab.active
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

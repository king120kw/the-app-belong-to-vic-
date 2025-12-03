import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-screen w-full flex-col font-display group/design-root overflow-x-hidden"
      style={{ backgroundColor: "#f2f2f2" }}
    >
      {/* Top App Bar */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 pb-2 pt-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center text-[#444444] cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <h1 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em] text-[#444444]">
          Notifications
        </h1>
        <div className="size-12 shrink-0"></div> {/* Spacer */}
      </header>

      <main className="flex-1 space-y-6 p-4 pb-24">
        {/* Core Feature Updates Section */}
        <div>
          <h3 className="text-[#444444] text-lg font-bold leading-tight tracking-[-0.015em] px-0 pb-3 pt-2">
            Core Feature Updates
          </h3>
          <div className="flex flex-col gap-3 rounded-xl bg-white p-2 shadow-sm">
            {/* Camera Notification */}
            <div className="flex items-center gap-4 bg-white px-2 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-700">
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#444444] text-base font-medium leading-normal line-clamp-1">
                    New scan added
                  </p>
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    Your recent scan has been added to your log.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <p className="text-gray-400 text-sm font-normal leading-normal">2h ago</p>
                <div className="size-2.5 rounded-full bg-gradient-to-br from-lime-400 to-green-500"></div>
              </div>
            </div>

            {/* Cook Notification */}
            <div className="flex items-center gap-4 bg-white px-2 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-700">
                  <span className="material-symbols-outlined text-2xl">soup_kitchen</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#444444] text-base font-medium leading-normal line-clamp-1">
                    New recipe available
                  </p>
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    A new healthy recipe is available in Cook.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-gray-400 text-sm font-normal leading-normal">5h ago</p>
              </div>
            </div>

            {/* Budget Notification */}
            <div className="flex items-center gap-4 bg-white px-2 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-lime-100 text-lime-700">
                  <span className="material-symbols-outlined text-2xl">wallet</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#444444] text-base font-medium leading-normal line-clamp-1">
                    Budget updated
                  </p>
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    Your food budget for this week has been set.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-gray-400 text-sm font-normal leading-normal">1d ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Reminder */}
        <div className="rounded-xl bg-[#0B3C7C] p-5 shadow-sm">
          <h3 className="text-lg font-bold text-white">Progress Reminder</h3>
          <p className="mt-2 text-base text-white/90">
            Tomorrow is your 7th day of the week, be ready to input your progress update.
          </p>
        </div>

        {/* Quranic Verse & Hadith Section */}
        <div>
          <h3 className="text-[#444444] text-lg font-bold leading-tight tracking-[-0.015em] px-0 pb-3 pt-2">
            Daily Inspiration
          </h3>
          <div className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm">
            <div>
              <p className="text-right text-lg font-medium text-gray-800" dir="rtl">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
              </p>
              <p className="text-sm text-gray-500">
                "In the name of Allah, the Most Gracious, the Most Merciful."
              </p>
            </div>
            <hr />
            <div>
              <p className="text-base font-medium text-[#444444]">Hadith of the Day</p>
              <p className="mt-1 text-sm text-gray-500">
                "The best of you are those who are best to their families." - Prophet Muhammad
                (peace be upon him)
              </p>
            </div>
          </div>
        </div>

        {/* Application Updates Section */}
        <div>
          <h3 className="text-[#444444] text-lg font-bold leading-tight tracking-[-0.015em] px-0 pb-3 pt-2">
            Application Updates
          </h3>
          <div className="flex flex-col gap-3 rounded-xl bg-white p-2 shadow-sm">
            {/* App Version Notification */}
            <div className="flex items-center gap-4 bg-white px-2 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <span className="material-symbols-outlined text-2xl">update</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#444444] text-base font-medium leading-normal line-clamp-1">
                    New version 2.1 is available
                  </p>
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    Update now to get the latest features.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-gray-400 text-sm font-normal leading-normal">3d ago</p>
              </div>
            </div>

            {/* Privacy Policy Notification */}
            <div className="flex items-center gap-4 bg-white px-2 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  <span className="material-symbols-outlined text-2xl">policy</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#444444] text-base font-medium leading-normal line-clamp-1">
                    Privacy Policy Updated
                  </p>
                  <p className="text-gray-500 text-sm font-normal leading-normal line-clamp-2">
                    We've updated our terms and conditions.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <p className="text-gray-400 text-sm font-normal leading-normal">1w ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white">
        <div className="mx-auto flex h-20 max-w-md items-center justify-around px-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-center justify-center gap-1 text-gray-500"
          >
            <span className="material-symbols-outlined text-2xl">home</span>
            <span className="text-xs">Home</span>
          </button>
          <div className="flex flex-col items-center justify-center gap-1 text-[#0B3C7C]">
            <span
              className="material-symbols-outlined text-2xl font-bold"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              notifications
            </span>
            <span className="text-xs font-semibold">Notifications</span>
          </div>
          <button
            onClick={() => navigate("/chat")}
            className="flex flex-col items-center justify-center gap-1 text-gray-500"
          >
            <span className="material-symbols-outlined text-2xl">chat_bubble</span>
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center justify-center gap-1 text-gray-500"
          >
            <span className="material-symbols-outlined text-2xl">person</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

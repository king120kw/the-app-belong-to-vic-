import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { getNotifications, markNotificationAsRead } from "../lib/api/settings";
import { useTranslation } from "../lib/api/translation";
import { getPrayerTimes, getPersonalizedSpiritualReminder, isPrayerTime } from "../lib/api/prayerTimes";
import { toast } from "sonner";

export default function Notifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, lang } = useTranslation();

  // Fetch Notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !!user?.id
  });

  // Fetch Prayer Times
  const { data: prayerTimes } = useQuery({
    queryKey: ['prayer-times', user?.id],
    queryFn: () => getPrayerTimes(),
    enabled: !!user?.id,
    staleTime: 3600000 // 1 hour
  });

  // Fetch Personalized Spiritual Reminder if it's prayer time
  const { data: spiritualReminder } = useQuery({
    queryKey: ['spiritual-reminder', user?.id],
    queryFn: () => getPersonalizedSpiritualReminder(user!.id),
    enabled: !!user?.id && !!prayerTimes && isPrayerTime(prayerTimes),
    staleTime: 300000 // 5 minutes
  });

  const contextualReminder = spiritualReminder ? {
    title: spiritualReminder.type === 'quran' ? t('quran_verse') : t('hadith'),
    content: spiritualReminder.content,
    reference: spiritualReminder.reference
  } : null;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0d1418]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vic-green"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto w-full bg-white dark:bg-[#0d1418]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 bg-white dark:bg-[#0d1418]">
        <Link to="/dashboard" className="flex items-center gap-2 text-vic-deep-blue dark:text-vic-green font-bold">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('notifications_section')}</h1>
        <div className="w-6"></div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {contextualReminder && (
          <div className="m-4 p-4 bg-vic-green/10 border border-vic-green/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 text-vic-green">
              <span className="material-symbols-outlined">auto_awesome</span>
              <h4 className="font-bold text-sm uppercase tracking-wider">{contextualReminder.title}</h4>
            </div>
            <p className="text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
              "{contextualReminder.content}"
            </p>
            {contextualReminder.reference && (
              <p className="text-[11px] text-vic-green font-bold text-right">
                — {contextualReminder.reference}
              </p>
            )}
          </div>
        )}

        {notifications && notifications.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
                className={`p-4 flex gap-4 transition-colors cursor-pointer ${notification.is_read ? 'bg-transparent' : 'bg-vic-green/5 dark:bg-vic-green/10'}`}
              >
                <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-vic-green/20 text-vic-green'}`}>
                  <span className="material-symbols-outlined">
                    {notification.type === 'alert' ? 'warning' : 'notifications'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold text-sm ${notification.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {notification.content}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="size-2 rounded-full bg-vic-green mt-2"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="size-20 bg-slate-100 dark:bg-[#1f2c34] rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">notifications_off</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('no_notifications')}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('notifications_desc')}</p>
          </div>
        )}
      </main>
    </div>
  );
}

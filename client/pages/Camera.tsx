import { Link } from "react-router-dom";

export default function Camera() {
  return (
    <div className="flex items-center justify-center min-h-screen max-w-2xl mx-auto w-full p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          📷 Camera Feature
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Live food analysis with AI-powered ingredient detection coming soon!
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 bg-vic-deep-blue text-white rounded-lg font-bold hover:bg-vic-blue transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

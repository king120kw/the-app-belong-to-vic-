import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithName, getUser } from "@/lib/api/auth";
import "./auth.css";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getUser();
      if (user) {
        // User is authenticated, redirect to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      // User is not authenticated, stay on auth page
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await signInWithName(name);
      // Navigate to onboarding as requested
      navigate("/onboarding");
    } catch (error) {
      console.error("Error signing in:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-r from-vic-green-start to-vic-green-end">
      <div className={`main-container container ${isSignUp ? "active" : ""}`}>
        {/* Sign In Background */}
        <div className="bg-container sign-in-bg">
          <img
            className="bg-image"
            alt="Healthy salad bowl"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5ft470FPRGEKvlxsbk-7dbLtVNzqX48YmRIcRkMdn-VjLUaZ8Oggkyf79b6L0k3zXB9PJXsn7nQLKk7pSxXYp3cPfCB6-UEbHw9lRxKcAuSSGoyS0YyPUN7aZSZapm5732kFAZs8IrozqCptwWQt_fvQbZRtDVeu9NV8YXaLp1zUi5H5hbVlHtj24nhau6hAlAyULnHVQmVhGQJ2KHpXJ0kTTsDUjE09wNP1Fsem53gLxKABlZuFrqZ79nvVIck0PMDfnd1nYzEFp"
          />
          <div className="bg-overlay"></div>
        </div>

        {/* Sign Up Background */}
        <div className="bg-container sign-up-bg">
          <img
            className="bg-image"
            alt="Man jogging in park"
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=800&fit=crop"
          />
          <div className="bg-overlay"></div>
        </div>

        {/* Sign In Form */}
        <div className="form-container sign-in-container">
          <div className="flex w-full h-full items-center justify-center p-4 sm:p-8">
            <div className="w-full rounded-xl form-card p-6 sm:p-8 text-center max-w-sm mx-auto">
              <h1 className="text-white text-3xl font-bold tracking-tight">
                Welcome Back
              </h1>
              <p className="text-gray-200 mt-2 mb-6 sm:mb-8 text-base font-medium">
                Enter your name to continue
              </p>
              <form onSubmit={handleSignIn} className="flex w-full flex-col items-center space-y-4 sm:space-y-6">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-vic-green"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-w-[84px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-5 text-base font-semibold leading-normal tracking-wide text-gray-900 shadow-soft transition-opacity hover:opacity-90 h-14 disabled:opacity-50"
                >
                  <span className="truncate">{loading ? "Signing in..." : "Continue"}</span>
                </button>
                <div className="text-gray-200 text-sm mt-4 w-full font-medium">
                  <div className="mt-3">
                    New here?
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-accent-purple hover:underline font-semibold bg-transparent border-0 p-0 m-0 h-auto ml-1 hover:bg-white/20 px-2 py-1 rounded"
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sign Up Form */}
        <div className="form-container sign-up-container">
          <div className="flex w-full h-full items-center justify-center p-4 sm:p-8">
            <div className="w-full rounded-xl form-card p-6 sm:p-8 text-center max-w-sm mx-auto">
              <h1 className="text-white text-3xl font-bold tracking-tight">
                Create Account
              </h1>
              <p className="text-gray-200 mt-2 mb-6 sm:mb-8 text-base font-medium">
                Start your healthy journey today
              </p>
              <form onSubmit={handleSignIn} className="flex w-full flex-col items-center space-y-4 sm:space-y-6">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-vic-green"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-w-[84px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-5 text-base font-semibold leading-normal tracking-wide text-gray-900 shadow-soft transition-opacity hover:opacity-90 h-14 disabled:opacity-50"
                >
                  <span className="truncate">{loading ? "Signing in..." : "Get Started"}</span>
                </button>
                <div className="text-gray-200 text-sm mt-4 font-medium">
                  Already have an account?
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-accent-purple hover:underline font-semibold bg-transparent border-0 p-0 m-0 h-auto ml-1 hover:bg-white/20 px-2 py-1 rounded"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

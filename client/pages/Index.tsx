import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function Welcome() {
  const [animationPhase, setAnimationPhase] = useState<"idle" | "zooming" | "welcome" | "complete">("idle");
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    // Phase 1: Hero zoom and fade (0-2500ms)
    setAnimationPhase("zooming");

    // Phase 2: Show welcome message on clean background (2500ms)
    setTimeout(() => {
      setAnimationPhase("welcome");
    }, 2500);

    // Phase 3: Navigate to auth (4500ms)
    setTimeout(() => {
      setAnimationPhase("complete");
      navigate("/auth");
    }, 4500);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden font-display bg-[#FFFFFF]">
      {/* Load Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Epilogue:ital,wght@0,100..900;1,100..900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .font-display { font-family: 'Epilogue', sans-serif; }
      `}</style>

      {/* Phase 1 & Idle: Main Layout */}
      <AnimatePresence>
        {(animationPhase === "idle" || animationPhase === "zooming") && (
          <motion.div
            className="absolute inset-0 flex flex-col h-full w-full"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >

            {/* Hero Image Section - Unified Canvas */}
            <div className="absolute inset-x-0 top-0 h-[75%] pointer-events-none">
              <div className="relative h-full w-full">
                {/* Background Gradient - Soft Beige to White */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(to bottom, #EAD7C5 0%, #EAD7C5 20%, #F5EBE0 50%, #FFFFFF 100%)'
                }} />

                {/* Hero Image with Deep Progressive Fade */}
                <motion.div
                  className="absolute inset-0 h-full w-full"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={animationPhase === "zooming" ? {
                    scale: 2.5,
                    opacity: 0,
                    transition: { duration: 2.5, ease: "easeInOut" }
                  } : { scale: 1, opacity: 1 }}
                >
                  <img
                    className="h-full w-full object-cover object-[50%_25%]"
                    style={{
                      // Deep mask for seamless blend
                      maskImage: 'linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.2) 80%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.2) 80%, transparent 100%)',
                      filter: 'saturate(1.1) contrast(1.05) brightness(1.02)' // Calibrated for natural look
                    }}
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqDz9j6l_CXZHY0v-hyrGT-UgKk86Ji4pNAXk24kqX-NekWGpjU1f6l-_6s2ux94-QgPRwuF8vwOVniQ67C3s4-s9ctWaeOflNwPr0Xtbm_efTNCsQtq4WwZ8fBu-ZVaNs_DX_UL4ADYobxtHvtlDvG6kdcEBnwBPgCzzHplXbpL_oRW8aqQnpFmSKItYlyPfpX-nuoFA54lLYPvowImzZMIHD3dD1w79t6OHZlEyi9zSNPcVs2fGdOgcPueRtMTEp264hxTTbfa6R"
                    alt="Welcome Hero"
                  />
                </motion.div>
              </div>
            </div>

            {/* Content Section - Optical Flow */}
            <motion.div
              animate={animationPhase === "zooming" ? { opacity: 0, y: 20, transition: { duration: 0.5 } } : { opacity: 1, y: 0 }}
              className="relative z-10 flex flex-col justify-end h-full w-full max-w-7xl mx-auto pb-12 px-6"
            >
              <div className="w-full max-w-xl mx-auto text-center flex flex-col items-center">
                {/* Headline - Regular Weight, Optical Spacing */}
                <h1 className="text-black tracking-tight text-4xl md:text-5xl lg:text-6xl font-normal leading-tight mb-4">
                  Start Your Journey
                </h1>

                {/* Subtext - Anchored */}
                <p className="text-black/80 text-lg md:text-xl font-normal leading-relaxed mb-12 max-w-sm mx-auto">
                  Personalized meal plans for a healthier you.
                </p>

                {/* Button - Grounded & Decisive */}
                <button
                  onClick={handleGetStarted}
                  disabled={animationPhase !== "idle"}
                  className="bg-black text-white text-lg font-medium px-12 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95 w-full max-w-[280px]"
                >
                  Get Started
                </button>

                {/* Bottom Indicator */}
                <div className="w-32 h-1 bg-black/10 rounded-full mt-8"></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 2: Welcome Message (Clean Background) */}
      <AnimatePresence>
        {animationPhase === "welcome" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-white z-50"
          >
            <h2 className="text-4xl md:text-5xl font-medium text-black text-center px-6 tracking-tight" style={{ fontFamily: "'Epilogue', sans-serif" }}>
              Welcome to VicCalary
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

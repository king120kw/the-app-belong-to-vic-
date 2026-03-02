import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { MealDeck } from "@/components/MealDeck";
import { MealAnalysis } from "@/components/MealAnalysis";
import { ProductDetails } from "@/components/ProductDetails";
import FoodCarousel from "@/components/FoodCarousel";
import { getUserProfile } from "@/lib/api/auth";
import { getDailyProgress, logMeal, getDailySummary } from "@/lib/api/progress";
import { getDailyMealSuggestions } from "@/lib/api/recipes";
import { analyzeFoodImage as apiAnalyzeFoodImage } from "@/lib/api/food";
import { toast } from "sonner";
import { ProgressCard } from "@/components/ProgressCard";
import { uploadAvatar } from "@/lib/api/auth";
import { CustomAnimatedIcon } from "@/components/CustomAnimatedIcon";
import { CheckpointCalendar } from "@/components/CheckpointCalendar";
import { useTranslation } from "@/lib/api/translation";
import { BottomNavbar } from "@/components/BottomNavbar";
import { supabase } from "@/lib/supabase";
import { SpiritualReminder } from "@/components/SpiritualReminder";
import { ManualProgressInput } from "@/components/ManualProgressInput";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { t, country, lang, localHour, speak } = useTranslation();
  const [currentView, setCurrentView] = useState<"dashboard" | "progress">("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // Determine current meal type based on time
  const getCurrentMealType = () => {
    const hour = localHour;
    if (hour < 11) return "breakfast";
    if (hour < 16) return "lunch";
    return "dinner";
  };
  const [activeMealType, setActiveMealType] = useState<"breakfast" | "lunch" | "dinner">(getCurrentMealType());



  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showMealAnalysis, setShowMealAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [selectedProgressDate, setSelectedProgressDate] = useState<Date>(new Date());

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  // Fetch user profile from Supabase
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user?.id
  });

  // Fetch daily progress
  const { data: dailyProgress } = useQuery({
    queryKey: ['daily-progress', user?.id],
    queryFn: () => getDailyProgress(user!.id, new Date().toISOString().split('T')[0]),
    enabled: !!user?.id
  });

  // Fetch onboarding info for calorie goals
  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', user!.id)
        .limit(1);
      if (error) throw error;
      return rows && rows.length > 0 ? rows[0] : null;
    },
    enabled: !!user?.id
  });

  const { data: dailySummary } = useQuery({
    queryKey: ['daily-summary', user?.id],
    queryFn: () => getDailySummary(user!.id),
    enabled: !!user?.id
  });

  // Fetch suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: () => getDailyMealSuggestions(user!.id),
    enabled: !!user?.id
  });

  // Update active meal type when suggestions load (backend logic takes precedence)
  useEffect(() => {
    if (suggestions?.currentSession) {
      setActiveMealType(suggestions.currentSession);
    }
  }, [suggestions]);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setDarkMode(savedTheme === "dark");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, [user, profile, authLoading]);

  // Auto-scan timer for Barcode Scanner
  useEffect(() => {
    if (showScannerModal && !isAnalyzing) {
      const timer = window.setTimeout(() => {
        captureScannerPhoto();
      }, 5000); // 5 seconds auto-trigger
      return () => clearTimeout(timer);
    }
  }, [showScannerModal, isAnalyzing]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
        // Force play
        try {
          await cameraVideoRef.current.play();
        } catch (e) {
          console.error("Video auto-play failed:", e);
        }
      }
      setShowCameraModal(true);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Camera access failed. Please check permissions.");
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    // Stop current stream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Start new stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
        try {
          await cameraVideoRef.current.play();
        } catch (e) {
          console.error("Video auto-play failed:", e);
        }
      }
    } catch (err) {
      toast.error("Failed to switch camera.");
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = async () => {
    if (!cameraVideoRef.current) return;

    try {
      setIsAnalyzing(true);
      const video = cameraVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
      if (!blob) throw new Error("Failed to capture image");

      const file = new File([blob], "meal.jpg", { type: "image/jpeg" });
      const analysis = await apiAnalyzeFoodImage(user!.id, file);

      const imageData = canvas.toDataURL("image/jpeg");
      const formattedAnalysis = {
        mealImage: imageData,
        totalCalories: analysis.calories,
        foodItems: [
          {
            name: analysis.name,
            calories: analysis.calories,
            image: imageData,
            protein: analysis.protein,
            carbs: analysis.carbs,
            fat: analysis.fat,
            fiber: analysis.fiber,
            sugar: analysis.sugar,
            portion_size_estimate: analysis.portion_size_estimate,
            portion_assumptions: analysis.portion_assumptions,
            clinical_evaluation: analysis.clinical_evaluation,
            metabolic_impact: analysis.metabolic_impact,
            clinical_synopsis: analysis.clinical_synopsis,
            health_impact_score: analysis.health_impact_score,
            healthRating: analysis.healthRating,
            confidence_level: analysis.confidence_level,
            healthStatus: analysis.healthStatus,
            personalizedAdvice: analysis.personalizedAdvice
          }
        ],
        ...analysis
      };

      setAnalysisData(formattedAnalysis);
      closeCamera();
      setShowMealAnalysis(true);
      toast.success("Meal analyzed!");
    } catch (err: any) {
      console.error("Capture Photo Error:", err);
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsAnalyzing(true);
      const analysis = await apiAnalyzeFoodImage(user.id, file);

      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file);

      const formattedAnalysis = {
        mealImage: imageUrl,
        totalCalories: analysis.calories,
        foodItems: [
          {
            name: analysis.name,
            calories: analysis.calories,
            image: imageUrl,
            protein: analysis.protein,
            carbs: analysis.carbs,
            fat: analysis.fat,
            fiber: analysis.fiber,
            sugar: analysis.sugar,
            portion_size_estimate: analysis.portion_size_estimate,
            portion_assumptions: analysis.portion_assumptions,
            clinical_evaluation: analysis.clinical_evaluation,
            metabolic_impact: analysis.metabolic_impact,
            clinical_synopsis: analysis.clinical_synopsis,
            health_impact_score: analysis.health_impact_score,
            healthRating: analysis.healthRating,
            confidence_level: analysis.confidence_level,
            healthStatus: analysis.healthStatus,
            personalizedAdvice: analysis.personalizedAdvice
          }
        ],
        ...analysis
      };

      setAnalysisData(formattedAnalysis);
      closeCamera();
      setShowMealAnalysis(true);
      toast.success("Image analyzed!");
    } catch (err: any) {
      console.error("Gallery Upload Error:", err);
      toast.error(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleLogMeal = async () => {
    if (!user || !analysisData) return;
    try {
      await logMeal(user.id, analysisData);
      toast.success("Meal logged successfully!");
      setShowMealAnalysis(false);
      queryClient.invalidateQueries({ queryKey: ['daily-progress', user.id] });
    } catch (err: any) {
      toast.error(`Failed to log meal: ${err.message}`);
    }
  };

  const openScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = stream;
        scannerStreamRef.current = stream;
      }
      setShowScannerModal(true);
    } catch (err) {
      toast.error("Camera access denied.");
    }
  };

  const captureScannerPhoto = async () => {
    if (!scannerVideoRef.current) return;

    try {
      setIsAnalyzing(true);
      const video = scannerVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
      if (!blob) throw new Error("Failed to capture scan");

      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });

      // For now, using vision-based analysis for the scanner photo
      // but we could also detect barcode here and call scanProduct
      const analysis = await apiAnalyzeFoodImage(user!.id, file);

      const imageData = canvas.toDataURL("image/jpeg");

      const formattedProduct = {
        productImage: imageData,
        productName: analysis.name,
        servingSize: analysis.serving_size || "Per serving",
        healthStatus: analysis.healthStatus || (analysis.healthRating >= 7 ? 'GOOD' : analysis.healthRating >= 4 ? 'MODERATE' : 'POOR'),
        country: analysis.country_of_origin || country || "Global",
        expiry: "Fresh Info",
        calories: analysis.calories,
        ai_insight: analysis.clinical_synopsis || analysis.insight || analysis.personalizedAdvice || analysis.ai_insight,
        clinical_synopsis: analysis.clinical_synopsis,
        health_impact_score: analysis.health_impact_score,
        healthRating: analysis.healthRating,
        ingredient_quality: analysis.ingredient_quality,
        macro_balance_evaluation: analysis.macro_balance_evaluation,
        health_impact_rationale: analysis.health_impact_rationale,
        financialImpact: analysis.financialImpact || "MODERATE",
        currentBalance: analysis.currentBalance || 0,
        alternatives: analysis.alternatives || analysis.suggestions || []
      };

      setProductData(formattedProduct);
      closeScanner();
      setShowProductDetails(true);
      toast.success("Product identified!");
    } catch (err: any) {
      console.error("Scanner Photo Error:", err);
      toast.error(`Scan failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogProduct = async () => {
    if (!user || !productData) return;
    try {
      const mealToLog = {
        mealImage: productData.productImage,
        totalCalories: productData.calories,
        foodItems: [{
          name: productData.productName,
          calories: productData.calories,
          image: productData.productImage
        }]
      };
      await logMeal(user.id, mealToLog);
      toast.success("Product logged successfully!");
      setShowProductDetails(false);
      queryClient.invalidateQueries({ queryKey: ['daily-progress', user.id] });
    } catch (err: any) {
      toast.error(`Failed to log product: ${err.message}`);
    }
  };

  const closeScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(track => track.stop());
      scannerStreamRef.current = null;
    }
    setShowScannerModal(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const promise = uploadAvatar(user.id, file);
      toast.promise(promise, {
        loading: 'Uploading avatar...',
        success: 'Avatar updated successfully!',
        error: 'Failed to upload avatar'
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (err: any) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0d1418]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vic-green"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-[#0d1418] p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('welcome_title')}</h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">Please sign in to view your dashboard.</p>
        <Link to="/auth" className="px-6 py-3 bg-vic-deep-blue text-white rounded-lg font-bold">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-auto min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-[#0d1418] overflow-x-hidden font-display">
      {/* Modals */}
      <div className={`modal-overlay ${showCameraModal ? "active" : ""}`}>
        <div className="modal-content !p-0 bg-black h-[100dvh] flex flex-col">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={cameraVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
            />

            {/* Camera Controls */}
            <div className="absolute top-6 right-6 flex flex-col gap-4">
              <button
                onClick={closeCamera}
                className="size-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
              <button
                onClick={switchCamera}
                className="size-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors"
                title="Switch Camera"
              >
                <span className="material-symbols-outlined text-2xl">flip_camera_ios</span>
              </button>
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6">
              <p className="text-white/80 text-sm font-medium px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
                {isAnalyzing ? t('analyzing') : "Capture food for analysis"}
              </p>

              <div className="flex items-center gap-12">
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="size-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all active:scale-95"
                  title="Upload from Gallery"
                >
                  <span className="material-symbols-outlined text-3xl">photo_library</span>
                </button>

                <button
                  onClick={capturePhoto}
                  disabled={isAnalyzing}
                  className="size-24 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all bg-white/20 backdrop-blur-sm disabled:opacity-50"
                >
                  <div className="size-20 rounded-full bg-white shadow-xl flex items-center justify-center">
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-vic-green"></div>
                    ) : (
                      <span className="material-symbols-outlined text-vic-green text-5xl">photo_camera</span>
                    )}
                  </div>
                </button>

                <div className="size-14" /> {/* Spacer to balance gallery button */}
              </div>
            </div>

            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleGalleryUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${showScannerModal ? "active" : ""}`}>
        <div className="modal-content bg-white dark:bg-[#1f2c34] dark:border dark:border-slate-800">
          <div className="relative bg-black rounded-t-lg">
            <video ref={scannerVideoRef} className="w-full h-80 object-cover" autoPlay playsInline />
            <div className="absolute inset-4 border-2 border-vic-green rounded-lg animate-pulse"></div>
            <button onClick={closeScanner} className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm">
              <span className="material-symbols-outlined">close</span>
            </button>
            <button
              onClick={captureScannerPhoto}
              disabled={isAnalyzing}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-vic-green text-slate-900 rounded-full p-4 shadow-lg disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900"></div>
              ) : (
                <span className="material-symbols-outlined text-4xl">barcode_scanner</span>
              )}
            </button>
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <p className="text-white text-xs font-bold whitespace-nowrap">
                {isAnalyzing ? t('analyzing') : t('auto_scanning')}
              </p>
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">{t('scanner')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('scanner_desc')}</p>
          </div>
        </div>
      </div>

      {showMealAnalysis && analysisData && (
        <MealAnalysis
          mealImage={analysisData.mealImage}
          totalCalories={analysisData.totalCalories}
          dailyCalorieGoal={onboarding?.daily_calorie_goal}
          foodItems={analysisData.foodItems}
          onClose={() => setShowMealAnalysis(false)}
          onLog={handleLogMeal}
        />
      )}

      {showProductDetails && productData && (
        <ProductDetails
          {...productData}
          onClose={() => setShowProductDetails(false)}
          onAddToDiary={handleLogProduct}
        />
      )}

      <header className="flex items-center bg-background-light dark:bg-[#0d1418] p-4 pb-2 justify-between sticky top-0 z-10">
        <Link to="/settings">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 border border-vic-green"
            style={{ backgroundImage: `url("${(profile as any)?.avatar_url || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((profile as any)?.full_name || user.user_metadata?.full_name || 'User')}&background=13ec37&color=fff&size=128`}")` }}
          ></div>
        </Link>
        <button onClick={toggleTheme} className="text-[#111812] dark:text-white">
          <span className="material-symbols-outlined">{darkMode ? "light_mode" : "dark_mode"}</span>
        </button>
      </header>

      <div className="flex items-center gap-4 px-4 pt-4">
        <div className="flex flex-col">
          <h1 className="text-[#111812] dark:text-white tracking-light text-[32px] font-bold leading-tight">
            {t('welcome')}, {(profile as any)?.full_name || user.user_metadata?.full_name || user.user_metadata?.first_name || "User"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base">{t('ready_journey')}</p>
        </div>
      </div>

      <SpiritualReminder userId={user.id} />

      <ProgressCard
        profile={profile}
        dailyProgress={dailyProgress}
        user={user}
        onAvatarUpload={handleAvatarUpload}
      />

      <div className="grid grid-cols-4 gap-3 px-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={openCamera}
            className="aspect-square w-full rounded-2xl bg-[#D1F7C4] dark:bg-[#1a2e21] flex items-center justify-center transition-all hover:brightness-95 active:scale-95 border-none shadow-none overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 dark:group-hover:opacity-20 transition-opacity" />
            <CustomAnimatedIcon
              src="/cute-camera_15944861.mp4"
              size={120}
              className="w-[110%] h-[110%]"
              loop={window.innerWidth < 768}
            />
          </button>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Camera</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={openScanner}
            className="aspect-square w-full rounded-2xl bg-[#D1F7C4] dark:bg-[#1a2e21] flex items-center justify-center transition-all hover:brightness-95 active:scale-95 border-none shadow-none overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 dark:group-hover:opacity-20 transition-opacity" />
            <CustomAnimatedIcon
              src="/scan_14984808.mp4"
              size={120}
              className="w-[110%] h-[110%]"
              loop={window.innerWidth < 768}
            />
          </button>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{t('scanner')}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => navigate("/cookbook?tab=suggested")}
            className="aspect-square w-full rounded-2xl bg-[#D1F7C4] dark:bg-[#1a2e21] flex items-center justify-center transition-all hover:brightness-95 active:scale-95 border-none shadow-none overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 dark:group-hover:opacity-20 transition-opacity" />
            <CustomAnimatedIcon
              src="/chef_17659714.mp4"
              size={120}
              className="w-[110%] h-[110%]"
              loop={window.innerWidth < 768}
            />
          </button>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{t('cook')}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => navigate("/budget")}
            className="aspect-square w-full rounded-2xl bg-[#D1F7C4] dark:bg-[#1a2e21] flex items-center justify-center transition-all hover:brightness-95 active:scale-95 border-none shadow-none overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 dark:group-hover:opacity-20 transition-opacity" />
            <CustomAnimatedIcon
              src="/money-bag_6172509.mp4"
              size={120}
              className="w-[110%] h-[110%]"
              loop={window.innerWidth < 768}
            />
          </button>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{t('budget')}</span>
        </div>
      </div>

      <CheckpointCalendar
        joinDate={user?.created_at || new Date()}
        onEditProgress={(date) => {
          setSelectedProgressDate(date);
          setShowProgressInput(true);
        }}
      />

      {showProgressInput && (
        <ManualProgressInput
          initialDate={selectedProgressDate}
          onClose={() => setShowProgressInput(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['daily-progress', user.id] })}
        />
      )}

      <div className="mt-4 pb-20"> {/* Bottom padding for navbar */}
        <FoodCarousel
          breakfastMeals={suggestions?.breakfast || []}
          lunchMeals={suggestions?.lunch || []}
          dinnerMeals={suggestions?.dinner || []}
          initialMealType={activeMealType}
          strictMode={true}
        />
      </div>

      <BottomNavbar />
    </div>
  );
}

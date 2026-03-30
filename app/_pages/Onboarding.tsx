"use client"
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { saveOnboardingResponses, getUserProfile } from "@/lib/api/auth";
import { useCurrency } from "@/lib/CurrencyContext";
import { toast } from "sonner";
import { useTranslation } from "@/lib/api/translation";

interface Question {
  id: number;
  key: string;
  title: string;
  type:
  | "text"
  | "age"
  | "gender"
  | "height"
  | "weight"
  | "radio"
  | "checkbox"
  | "slider"
  | "range";
  imageAnimation: "left" | "right" | "bottom" | "top";
  imageSrc: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export default function Onboarding() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { currencySymbol } = useCurrency();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<any>({});

  const questions: Question[] = useMemo(() => [
    {
      id: 0,
      key: "full_name",
      title: t('whats_your_name'),
      type: "text",
      imageAnimation: "left",
      imageSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&h=800&fit=crop",
    },
    {
      id: 1,
      key: "age",
      title: t('how_old'),
      type: "age",
      imageAnimation: "left",
      imageSrc:
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=800&fit=crop",
    },
    {
      id: 2,
      key: "gender",
      title: t('whats_gender'),
      type: "gender",
      imageAnimation: "right",
      imageSrc:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=800&fit=crop",
      options: [t('male'), t('female')],
    },
    {
      id: 3,
      key: "height_cm",
      title: t('whats_height'),
      type: "height",
      imageAnimation: "bottom",
      imageSrc:
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=800&fit=crop",
      min: 140,
      max: 220,
      unit: "cm",
    },
    {
      id: 4,
      key: "weight_kg",
      title: t('whats_weight'),
      type: "weight",
      imageAnimation: "top",
      imageSrc:
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=800&fit=crop",
      min: 30,
      max: 150,
      unit: "kg",
    },
    {
      id: 5,
      key: "goal",
      title: t('primary_goal'),
      type: "radio",
      imageAnimation: "left",
      imageSrc:
        "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=800&fit=crop",
      options: [t('lose_weight_opt'), t('maintain_weight_opt'), t('gain_weight_opt')],
    },
    {
      id: 6,
      key: "budget",
      title: t('monthly_budget'),
      type: "slider",
      imageAnimation: "right",
      imageSrc:
        "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&h=800&fit=crop",
      min: 50,
      max: 1000,
      unit: currencySymbol,
    },
    {
      id: 7,
      key: "preferences",
      title: t('eating_style'),
      type: "checkbox",
      imageAnimation: "bottom",
      imageSrc: "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=1200&h=800&fit=crop",
      options: [
        t('home_cooking'),
        t('eating_out'),
        t('quick_meals'),
        t('snacking'),
        t('mixed'),
      ],
    },
    {
      id: 8,
      key: "daily_meal_frequency",
      title: t('meal_frequency'),
      type: "radio",
      imageAnimation: "top",
      imageSrc:
        "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop",
      options: [t('two_meals'), t('three_meals'), t('four_five_meals')],
    },
    {
      id: 9,
      key: "liked_foods",
      title: t('liked_foods'),
      type: "checkbox",
      imageAnimation: "left",
      imageSrc:
        "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=1200&h=800&fit=crop",
      options: [
        t('rice'),
        t('chicken'),
        t('beef'),
        t('fish'),
        t('vegetables'),
        t('fruits'),
        t('dairy'),
        t('bread'),
        t('oats'),
        t('pasta'),
      ],
    },
    {
      id: 10,
      key: "restrictions",
      title: t('restrictions'),
      type: "checkbox",
      imageAnimation: "right",
      imageSrc: "https://images.unsplash.com/photo-1546421845-6471bdcf6edf?w=1200&h=800&fit=crop",
      options: [t('lactose'), t('gluten'), t('seafood'), t('nuts'), t('eggs'), t('pork'), t('none')],
    },
    {
      id: 11,
      key: "cooking_skill",
      title: t('cooking_skill'),
      type: "radio",
      imageAnimation: "bottom",
      imageSrc:
        "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=1200&h=800&fit=crop",
      options: [t('beginner'), t('intermediate'), t('advanced')],
    },
    {
      id: 12,
      key: "meal_prep_time",
      title: t('meal_prep_time'),
      type: "radio",
      imageAnimation: "top",
      imageSrc:
        "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&h=800&fit=crop",
      options: [
        t('less_15m'),
        t('15_30m'),
        t('30_60m'),
        t('1h_plus'),
      ],
    },
    {
      id: 13,
      key: "target",
      title: t('weight_change_target'),
      type: "range",
      imageAnimation: "left",
      imageSrc:
        "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&h=800&fit=crop",
      min: -5,
      max: 5,
      step: 0.5,
      unit: t('kg_month'),
    },
    {
      id: 14,
      key: "dietary_lifestyle",
      title: t('dietary_lifestyle_q'),
      type: "checkbox",
      imageAnimation: "right",
      imageSrc:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=800&fit=crop",
      options: [
        t('halal'),
        t('vegetarian'),
        t('vegan'),
        t('high_protein'),
        t('low_carb'),
        t('balanced'),
        t('none'),
      ],
    },
    {
      id: 15,
      key: "calorie_flexibility",
      title: t('calorie_flexibility'),
      type: "radio",
      imageAnimation: "bottom",
      imageSrc:
        "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&h=800&fit=crop",
      options: [
        t('strict'),
        t('moderate_opt'),
        t('flexible'),
      ],
    },
    {
      id: 16,
      key: "activity_level",
      title: t('activity_level_q'),
      type: "radio",
      imageAnimation: "top",
      imageSrc: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=800&fit=crop",
      options: [
        t('sedentary'),
        t('lightly_active'),
        t('moderately_active'),
        t('very_active'),
        t('extra_active')
      ],
    },
  ], [t]);

  // Pre-load all onboarding images
  useEffect(() => {
    questions.forEach((q) => {
      const img = new Image();
      img.src = q.imageSrc;
    });
  }, [questions]);

  const [syncAttempted, setSyncAttempted] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/auth");
      } else {
        // Check if profile exists, and sync if not
        getUserProfile(user.id).then(profile => {
          if (profile) {
            if (profile.onboarding_completed) {
              router.push("/dashboard");
            }
          } else if (!syncAttempted) {
            // Profile missing and no sync attempted yet!
            setSyncAttempted(true);
            console.warn("Profile missing in Onboarding, triggering initial sync...");
            import("../lib/api/auth").then(({ syncUserWithSupabase }) => {
              syncUserWithSupabase(user).catch(err => {
                console.error("Critical: Failed to sync profile during onboarding recovery:", err);
                toast.error("Failed to initialize your profile. Please try logging in again or refresh the page.");
              });
            });
          }
        });
      }
    }
  }, [authLoading, user, router, syncAttempted]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // One last check for profile before saving to avoid foreign key violation
      const profile = await getUserProfile(user!.id);
      if (!profile) {
        const { syncUserWithSupabase } = await import("../lib/api/auth");
        await syncUserWithSupabase(user);
      }
      return saveOnboardingResponses(user!.id, data);
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error: any) => {
      console.error("Onboarding Save Error:", error);
      toast.error(`Failed to save onboarding: ${error.message || 'Check console for details'}`);
    }
  });

  const currentQuestion = questions[currentStep];
  const progressPercent = ((currentStep + 1) / questions.length) * 100;

  const animationClass = useMemo(() => {
    switch (currentQuestion.imageAnimation) {
      case "left": return "animate-slide-in-left";
      case "right": return "animate-slide-in-right";
      case "bottom": return "animate-slide-in-bottom";
      case "top": return "animate-slide-in-top";
      default: return "animate-slide-in-left";
    }
  }, [currentQuestion.imageAnimation]);

  const textAnimationClass = useMemo(() => {
    switch (currentQuestion.imageAnimation) {
      case "left": return "animate-slide-in-left";
      case "right": return "animate-slide-in-right";
      case "bottom": return "animate-slide-in-bottom";
      case "top": return "animate-slide-in-top";
      default: return "animate-slide-in-left";
    }
  }, [currentQuestion.imageAnimation]);

  const handleContinue = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("Submitting Onboarding Responses:", responses);
      saveMutation.mutate(responses);
    }
  };

  const updateResponse = (key: string, value: any) => {
    setResponses((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0d1418]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vic-green"></div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col font-display overflow-x-hidden bg-gradient-to-b from-vic-green-start to-vic-green-end">
      {/* Progress Bar */}
      <div className="w-full px-6 pt-4 sticky top-0 z-20 bg-gradient-to-b from-vic-green-start to-vic-green-end">
        <div className="flex justify-between items-center mb-2">
          <span className="text-vic-blue text-sm font-medium">
            {t('step_of').replace('%s', (currentStep + 1).toString()).replace('%s', questions.length.toString())}
          </span>
          <button
            onClick={handleBack}
            className={`text-vic-blue text-sm font-medium underline transition-all duration-300 ${currentStep === 0
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
              }`}
          >
            {t('back')}
          </button>
        </div>
        <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
          <div
            className="bg-vic-blue h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="flex flex-col flex-1">
        {/* Image Section */}
        <div className="relative w-full flex-shrink-0">
          <div
            className={`${animationClass} w-full bg-center bg-no-repeat bg-cover h-[45vh]`}
            style={{ backgroundImage: `url("${currentQuestion.imageSrc}")` }}
          >
            <div className="absolute inset-0 image-fade-overlay" />
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 w-full z-10 -mb-px">
            <svg
              className="w-full h-auto"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 1440 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-vic-green-start"
                d="M0 50C120 10 240 10 360 50C480 90 600 90 720 50C840 10 960 10 1080 50C1200 90 1320 90 1440 50V100H0V50Z"
              />
            </svg>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex flex-col flex-1 px-6 pt-8 pb-6">
          <h1 className={`${textAnimationClass} text-vic-blue tracking-tight text-3xl font-bold leading-tight text-center pb-8`}>
            {currentQuestion.title}
          </h1>

          {/* Input section */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {currentQuestion.type === "text" && (
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={responses[currentQuestion.key] || ""}
                  onChange={(e) => updateResponse(currentQuestion.key, e.target.value)}
                  placeholder={t('enter_name')}
                  className="w-full h-14 px-4 rounded-xl border-2 border-vic-blue/20 focus:border-vic-blue focus:outline-none text-vic-blue text-lg font-medium bg-white shadow-sm transition-all"
                  autoFocus
                />
              </div>
            )}
            {currentQuestion.type === "age" && (
              <AgeSelector value={responses[currentQuestion.key]} yearsLabel={t('years')} onChange={(val) => updateResponse(currentQuestion.key, val)} />
            )}
            {currentQuestion.type === "gender" && (
              <RadioOptions options={currentQuestion.options || []} value={responses[currentQuestion.key]} onChange={(val) => updateResponse(currentQuestion.key, val)} />
            )}
            {currentQuestion.type === "height" && (
              <NumberSlider
                label={t('whats_height')}
                min={currentQuestion.min || 140}
                max={currentQuestion.max || 220}
                unit={currentQuestion.unit}
                value={responses[currentQuestion.key]}
                onChange={(val) => updateResponse(currentQuestion.key, val)}
              />
            )}
            {currentQuestion.type === "weight" && (
              <NumberSlider
                label={t('whats_weight')}
                min={currentQuestion.min || 30}
                max={currentQuestion.max || 150}
                unit={currentQuestion.unit}
                value={responses[currentQuestion.key]}
                onChange={(val) => updateResponse(currentQuestion.key, val)}
              />
            )}
            {currentQuestion.type === "radio" && (
              <RadioOptions options={currentQuestion.options || []} value={responses[currentQuestion.key]} onChange={(val) => updateResponse(currentQuestion.key, val)} />
            )}
            {currentQuestion.type === "checkbox" && (
              <CheckboxOptions options={currentQuestion.options || []} value={responses[currentQuestion.key]} onChange={(val) => updateResponse(currentQuestion.key, val)} />
            )}
            {currentQuestion.type === "slider" && (
              <SliderInput
                label={t('monthly_budget')}
                min={currentQuestion.min || 50}
                max={currentQuestion.max || 1000}
                unit={currentQuestion.unit}
                value={responses[currentQuestion.key]}
                onChange={(val) => updateResponse(currentQuestion.key, val)}
              />
            )}
            {currentQuestion.type === "range" && (
              <RangeSlider
                label={t('weight_change_target')}
                min={currentQuestion.min || -5}
                max={currentQuestion.max || 5}
                step={currentQuestion.step || 0.5}
                unit={currentQuestion.unit}
                value={responses[currentQuestion.key]}
                t={t}
                onChange={(val) => updateResponse(currentQuestion.key, val)}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-auto space-y-4 flex flex-col items-center w-full">
            <button
              onClick={handleContinue}
              disabled={saveMutation.isPending}
              className="continue-btn flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 w-full max-w-[480px] bg-white text-vic-blue text-base font-bold leading-normal tracking-[0.015em] shadow-md hover:shadow-lg transition-all active:translate-y-1 disabled:opacity-50 mx-auto"
            >
              <span className="truncate">
                {saveMutation.isPending ? "..." : currentStep === questions.length - 1 ? t('finish') : t('continue')}
              </span>
            </button>
            <p
              onClick={handleContinue}
              className="skip-btn text-vic-blue/80 text-sm font-normal leading-normal text-center underline cursor-pointer hover:text-vic-blue transition-colors mx-auto"
            >
              {t('skip')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgeSelector({ value, yearsLabel, onChange }: { value?: number, yearsLabel: string, onChange: (val: number) => void }) {
  const ages = Array.from({ length: 73 }, (_, i) => i + 18);
  const age = value || 25;

  return (
    <div className="relative w-full max-w-xs">
      <div className="h-40 overflow-y-auto bg-white rounded-xl shadow-lg p-2 snap-y snap-mandatory">
        {ages.map((a) => (
          <div
            key={a}
            onClick={() => onChange(a)}
            className={`py-3 text-center cursor-pointer rounded-lg font-bold transition-all ${age === a
              ? "bg-vic-blue text-white scale-105 shadow-md"
              : "text-vic-blue hover:bg-vic-green-start"
              }`}
          >
            {a}
          </div>
        ))}
      </div>
      <div className="mt-4 text-vic-blue text-lg font-bold text-center">
        {age} {yearsLabel}
      </div>
    </div>
  );
}

function RadioOptions({ options, value, onChange }: { options: string[], value?: string, onChange: (val: string) => void }) {
  return (
    <div className="flex flex-col space-y-3 w-full max-w-xs mb-8">
      {options.map((option) => (
        <label
          key={option}
          className={`flex cursor-pointer h-14 grow items-center justify-center overflow-hidden rounded-xl px-4 py-2 ${value === option ? "bg-vic-blue text-white shadow-lg" : "bg-white text-vic-blue shadow-md"} text-base font-bold transition-all`}
        >
          <span className="truncate">{option}</span>
          <input
            type="radio"
            name="option"
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value)}
            className="invisible w-0"
          />
        </label>
      ))}
    </div>
  );
}

function CheckboxOptions({ options, value, onChange }: { options: string[], value?: string[], onChange: (val: string[]) => void }) {
  const isLargeList = options.length > 5;
  const selected = value || [];

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div
      className={`${isLargeList ? "grid grid-cols-2 gap-3" : "flex flex-col space-y-3"
        } w-full max-w-xs mb-8`}
    >
      {options.map((option) => (
        <label
          key={option}
          onClick={() => toggle(option)}
          className={`flex cursor-pointer ${isLargeList ? "h-14" : "h-14 grow"
            } items-center justify-center overflow-hidden rounded-xl px-3 py-2 ${selected.includes(option) ? "bg-vic-blue text-white shadow-lg" : "bg-white text-vic-blue shadow-md"} text-sm font-bold transition-all`}
        >
          <span className="truncate">{option}</span>
        </label>
      ))}
    </div>
  );
}

function NumberSlider({
  label,
  min,
  max,
  unit,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  unit?: string;
  value?: number;
  onChange: (val: number) => void;
}) {
  const val = value || (min + max) / 2;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-vic-blue"
      />
      <div className="flex justify-between text-vic-blue text-sm font-medium w-full">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div className="text-vic-blue text-2xl font-bold">
        {val} {unit}
      </div>
    </div>
  );
}

function SliderInput({
  label,
  min,
  max,
  unit,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  unit?: string;
  value?: number;
  onChange: (val: number) => void;
}) {
  const val = value || (min + max) / 2;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-vic-blue"
      />
      <div className="flex justify-between text-vic-blue text-sm font-medium w-full">
        <span>
          {unit}
          {min}
        </span>
        <span>
          {unit}
          {max}+
        </span>
      </div>
      <div className="text-vic-blue text-2xl font-bold">
        {unit}
        {val}
      </div>
    </div>
  );
}

function RangeSlider({
  label,
  min,
  max,
  step,
  unit,
  value,
  t,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  value?: number;
  t: any;
  onChange: (val: number) => void;
}) {
  const val = value || 0;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-vic-blue"
      />
      <div className="flex justify-between text-vic-blue text-sm font-medium w-full px-2">
        <span>
          {t('lose_weight_opt')}
        </span>
        <span>{t('maintain')}</span>
        <span>
          {t('gain_weight_opt')}
        </span>
      </div>
      <div className="text-vic-blue text-2xl font-bold">
        {val} {unit}
      </div>
    </div>
  );
}

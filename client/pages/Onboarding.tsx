import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface Question {
  id: number;
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

const questions: Question[] = [
  {
    id: 0,
    title: "What's your name?",
    type: "text",
    imageAnimation: "left",
    imageSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&h=800&fit=crop",
  },
  {
    id: 1,
    title: "How old are you?",
    type: "age",
    imageAnimation: "left",
    imageSrc:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=800&fit=crop",
  },
  {
    id: 2,
    title: "What's your gender?",
    type: "gender",
    imageAnimation: "right",
    imageSrc:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=800&fit=crop",
    options: ["Male", "Female"],
  },
  {
    id: 3,
    title: "What is your height?",
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
    title: "What's your current weight?",
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
    title: "What is your primary goal?",
    type: "radio",
    imageAnimation: "left",
    imageSrc:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=800&fit=crop",
    options: ["Lose Weight", "Maintain My Weight", "Gain Weight"],
  },
  {
    id: 6,
    title: "What's your monthly food budget?",
    type: "slider",
    imageAnimation: "right",
    imageSrc:
      "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&h=800&fit=crop",
    min: 50,
    max: 1000,
    unit: "$",
  },
  {
    id: 7,
    title: "How would you describe your eating style?",
    type: "checkbox",
    imageAnimation: "bottom",
    imageSrc: "/onboarding-q7.png",
    options: [
      "Home cooking",
      "Eating out",
      "Quick meals",
      "Snacking throughout day",
      "Mixed",
    ],
  },
  {
    id: 8,
    title: "How many meals do you prefer each day?",
    type: "radio",
    imageAnimation: "top",
    imageSrc:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop",
    options: ["2 meals", "3 meals", "4-5 small meals"],
  },
  {
    id: 9,
    title: "What foods do you enjoy?",
    type: "checkbox",
    imageAnimation: "left",
    imageSrc:
      "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=1200&h=800&fit=crop",
    options: [
      "Rice",
      "Chicken",
      "Beef",
      "Fish",
      "Vegetables",
      "Fruits",
      "Dairy",
      "Bread",
      "Oats",
      "Pasta",
    ],
  },
  {
    id: 10,
    title: "Do you have any allergies or foods to avoid?",
    type: "checkbox",
    imageAnimation: "right",
    imageSrc: "/onboarding-q10.png",
    options: ["Lactose", "Gluten", "Seafood", "Nuts", "Eggs", "Pork", "None"],
  },
  {
    id: 11,
    title: "How comfortable are you with cooking?",
    type: "radio",
    imageAnimation: "bottom",
    imageSrc:
      "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=1200&h=800&fit=crop",
    options: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    id: 12,
    title: "How much time can you spend preparing meals each day?",
    type: "radio",
    imageAnimation: "top",
    imageSrc:
      "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&h=800&fit=crop",
    options: [
      "Less than 15 minutes",
      "15-30 minutes",
      "30-60 minutes",
      "1+ hour",
    ],
  },
  {
    id: 13,
    title: "How many kilograms do you want to lose or gain per month?",
    type: "range",
    imageAnimation: "left",
    imageSrc:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&h=800&fit=crop",
    min: -5,
    max: 5,
    step: 0.5,
    unit: "kg/month",
  },
  {
    id: 14,
    title: "Do you follow any specific dietary lifestyle?",
    type: "checkbox",
    imageAnimation: "right",
    imageSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=800&fit=crop",
    options: [
      "Halal",
      "Vegetarian",
      "Vegan",
      "High-protein",
      "Low-carb",
      "Balanced",
      "None",
    ],
  },
  {
    id: 15,
    title: "What best describes your daily calorie tolerance?",
    type: "radio",
    imageAnimation: "bottom",
    imageSrc:
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&h=800&fit=crop",
    options: [
      "Very strict (tight control)",
      "Moderate (balanced)",
      "Flexible (room for snacks)",
    ],
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const currentQuestion = questions[currentStep];
  const progressPercent = ((currentStep + 1) / questions.length) * 100;

  const animationClass = useMemo(() => {
    switch (currentQuestion.imageAnimation) {
      case "left":
        return "animate-slide-in-left";
      case "right":
        return "animate-slide-in-right";
      case "bottom":
        return "animate-slide-in-bottom";
      case "top":
        return "animate-slide-in-top";
      default:
        return "animate-slide-in-left";
    }
  }, [currentQuestion.imageAnimation]);

  const textAnimationClass = useMemo(() => {
    switch (currentQuestion.imageAnimation) {
      case "left":
        return "animate-slide-in-left";
      case "right":
        return "animate-slide-in-right";
      case "bottom":
        return "animate-slide-in-bottom";
      case "top":
        return "animate-slide-in-top";
      default:
        return "animate-slide-in-left";
    }
  }, [currentQuestion.imageAnimation]);

  const handleContinue = () => {
    if (currentQuestion.type === "text" && !name.trim()) {
      return; // Prevent continuing if name is empty
    }

    if (currentQuestion.type === "text") {
      localStorage.setItem("userName", name);
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSkip = () => {
    handleContinue();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col font-display overflow-x-hidden bg-gradient-to-b from-vic-green-start to-vic-green-end">
      {/* Progress Bar */}
      <div className="w-full px-6 pt-4 sticky top-0 z-20 bg-gradient-to-b from-vic-green-start to-vic-green-end">
        <div className="flex justify-between items-center mb-2">
          <span className="text-vic-blue text-sm font-medium">
            Step {currentStep + 1} of {questions.length}
          </span>
          <button
            onClick={handleBack}
            className={`text-vic-blue text-sm font-medium underline transition-all duration-300 ${currentStep === 0
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
              }`}
          >
            Back
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-14 px-4 rounded-xl border-2 border-vic-blue/20 focus:border-vic-blue focus:outline-none text-vic-blue text-lg font-medium bg-white shadow-sm transition-all"
                  autoFocus
                />
              </div>
            )}
            {currentQuestion.type === "age" && <AgeSelector />}
            {currentQuestion.type === "gender" && (
              <RadioOptions options={currentQuestion.options || []} />
            )}
            {currentQuestion.type === "height" && (
              <NumberSlider
                label="Height"
                min={currentQuestion.min || 140}
                max={currentQuestion.max || 220}
                unit={currentQuestion.unit}
              />
            )}
            {currentQuestion.type === "weight" && (
              <NumberSlider
                label="Weight"
                min={currentQuestion.min || 30}
                max={currentQuestion.max || 150}
                unit={currentQuestion.unit}
              />
            )}
            {currentQuestion.type === "radio" && (
              <RadioOptions options={currentQuestion.options || []} />
            )}
            {currentQuestion.type === "checkbox" && (
              <CheckboxOptions options={currentQuestion.options || []} />
            )}
            {currentQuestion.type === "slider" && (
              <SliderInput
                label="Budget"
                min={currentQuestion.min || 50}
                max={currentQuestion.max || 1000}
                unit={currentQuestion.unit}
              />
            )}
            {currentQuestion.type === "range" && (
              <RangeSlider
                label="Monthly Weight Target"
                min={currentQuestion.min || -5}
                max={currentQuestion.max || 5}
                step={currentQuestion.step || 0.5}
                unit={currentQuestion.unit}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-auto space-y-4">
            <button
              onClick={handleContinue}
              className="continue-btn flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 w-full bg-white text-vic-blue text-base font-bold leading-normal tracking-[0.015em] shadow-md hover:shadow-lg transition-all active:translate-y-1"
            >
              <span className="truncate">
                {currentStep === questions.length - 1 ? "Finish" : "Continue"}
              </span>
            </button>
            <p
              onClick={handleSkip}
              className="skip-btn text-vic-blue/80 text-sm font-normal leading-normal text-center underline cursor-pointer hover:text-vic-blue transition-colors"
            >
              Skip
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgeSelector() {
  const [age, setAge] = useState(25);
  const ages = Array.from({ length: 73 }, (_, i) => i + 18);

  return (
    <div className="relative w-full max-w-xs">
      <div className="h-40 overflow-y-auto bg-white rounded-xl shadow-lg p-2 snap-y snap-mandatory">
        {ages.map((a) => (
          <div
            key={a}
            onClick={() => setAge(a)}
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
        {age} years
      </div>
    </div>
  );
}

function RadioOptions({ options }: { options: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col space-y-3 w-full max-w-xs mb-8">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer h-14 grow items-center justify-center overflow-hidden rounded-xl px-4 py-2 has-[:checked]:bg-vic-blue has-[:checked]:text-white bg-white text-vic-blue text-base font-bold transition-all shadow-md has-[:checked]:shadow-lg"
        >
          <span className="truncate">{option}</span>
          <input
            type="radio"
            name="option"
            value={option}
            onChange={(e) => setSelected(e.target.value)}
            className="invisible w-0"
          />
        </label>
      ))}
    </div>
  );
}

function CheckboxOptions({ options }: { options: string[] }) {
  const isLargeList = options.length > 5;

  return (
    <div
      className={`${isLargeList ? "grid grid-cols-2 gap-3" : "flex flex-col space-y-3"
        } w-full max-w-xs mb-8`}
    >
      {options.map((option) => (
        <label
          key={option}
          className={`flex cursor-pointer ${isLargeList ? "h-14" : "h-14 grow"
            } items-center justify-center overflow-hidden rounded-xl px-3 py-2 has-[:checked]:bg-vic-blue has-[:checked]:text-white bg-white text-vic-blue text-sm font-bold transition-all shadow-md has-[:checked]:shadow-lg`}
        >
          <span className="truncate">{option}</span>
          <input
            type="checkbox"
            name="options"
            value={option}
            className="invisible w-0"
          />
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
}: {
  label: string;
  min: number;
  max: number;
  unit?: string;
}) {
  const [value, setValue] = useState((min + max) / 2);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-vic-blue"
      />
      <div className="flex justify-between text-vic-blue text-sm font-medium w-full">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div className="text-vic-blue text-2xl font-bold">
        {value} {unit}
      </div>
    </div>
  );
}

function SliderInput({
  label,
  min,
  max,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  unit?: string;
}) {
  const [value, setValue] = useState((min + max) / 2);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
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
        {value}
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
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  const [value, setValue] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-6">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-vic-blue"
      />
      <div className="flex justify-between text-vic-blue text-sm font-medium w-full">
        <span>
          Lose {Math.abs(min)}
          {unit?.split("/")[0]}
        </span>
        <span>Maintain</span>
        <span>
          Gain {max}
          {unit?.split("/")[0]}
        </span>
      </div>
      <div className="text-vic-blue text-2xl font-bold">
        {value} {unit}
      </div>
    </div>
  );
}

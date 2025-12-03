import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MealDeck } from "@/components/MealDeck";
import { MealAnalysis } from "@/components/MealAnalysis";
import { ProductDetails } from "@/components/ProductDetails";
import FoodCarousel from "@/components/FoodCarousel";
import { getUser, getUserProfile } from "@/lib/api/auth";
import { getDailyProgress } from "@/lib/api/progress";
import { getTimeBbasedSuggestions } from "@/lib/api/recipes";

interface Meal {
  id: string;
  name: string;
  subtitle: string;
  calories: number;
  image: string;
  meal_type: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<"dashboard" | "progress">("dashboard");
  const [activeMealType, setActiveMealType] = useState<"breakfast" | "lunch" | "dinner">("breakfast");

  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyProgress, setDailyProgress] = useState<any>(null);
  const [meals, setMeals] = useState<{ breakfast: Meal[]; lunch: Meal[]; dinner: Meal[] }>({
    breakfast: [],
    lunch: [],
    dinner: []
  });
  const [loading, setLoading] = useState(true);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showMealAnalysis, setShowMealAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<{
    mealImage: string;
    totalCalories: number;
    foodItems: { name: string; calories: number; image: string; }[];
  } | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [productData, setProductData] = useState<{
    productImage: string;
    productName: string;
    servingSize: string;
    healthStatus: "GOOD" | "MODERATE" | "POOR";
    country: string;
    expiry: string;
    calories: number;
    suggestions: { image: string; title: string; }[];
  } | null>(null);

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  // Fetch all dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const user = await getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Parallel data fetching
        const [profile, progress, suggestions] = await Promise.all([
          getUserProfile(user.id),
          getDailyProgress(new Date().toISOString().split('T')[0]),
          getTimeBbasedSuggestions()
        ]);

        setUserProfile(profile);
        setDailyProgress(progress);

        // Set active meal type based on time if suggestions returned it
        if (suggestions.mealType) {
          setActiveMealType(suggestions.mealType as any);
        }

        // Fetch meals for all types with complete food image data (from HTML design)
        setMeals({
          breakfast: [
            { id: '1', name: "Oatmeal with Dates", subtitle: "High fiber start", calories: 320, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80", meal_type: 'breakfast' },
            { id: '2', name: "Berry Smoothie Bowl", subtitle: "Antioxidant rich", calories: 280, image: "https://images.unsplash.com/photo-1546069901-eacef0df6022?w=1200&q=80", meal_type: 'breakfast' },
            { id: '3', name: "Soft Boiled Eggs", subtitle: "Protein packed", calories: 180, image: "https://images.unsplash.com/photo-1513042575839-1c0c2d1e5ddf?w=1200&q=80", meal_type: 'breakfast' },
            { id: '4', name: "Avocado Toast", subtitle: "Healthy fats", calories: 350, image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80", meal_type: 'breakfast' },
            { id: '5', name: "Greek Yogurt Parfait", subtitle: "Probiotic boost", calories: 250, image: "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?w=1200&q=80", meal_type: 'breakfast' },
            { id: '6', name: "Banana Pancakes", subtitle: "Light & satiety", calories: 380, image: "https://images.unsplash.com/photo-1505250469679-203ad9ced0cb?w=1200&q=80", meal_type: 'breakfast' },
            { id: '7', name: "Fresh Fruit Plate", subtitle: "Natural sugars", calories: 150, image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&q=80", meal_type: 'breakfast' },
            { id: '8', name: "Muesli Bowl", subtitle: "Wholegrain energy", calories: 310, image: "https://images.unsplash.com/photo-1541987157448-6d6a1f9f5c8d?w=1200&q=80", meal_type: 'breakfast' },
            { id: '9', name: "Breakfast Burrito", subtitle: "Savory & filling", calories: 420, image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=80", meal_type: 'breakfast' },
            { id: '10', name: "Butter Croissant", subtitle: "Flaky delight", calories: 290, image: "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=1200&q=80", meal_type: 'breakfast' },
            { id: '11', name: "Chia Pudding", subtitle: "Omega-3 rich", calories: 200, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80", meal_type: 'breakfast' },
            { id: '12', name: "French Toast", subtitle: "Classic comfort", calories: 360, image: "https://images.unsplash.com/photo-1558042239-2510ca0eff8a?w=1200&q=80", meal_type: 'breakfast' }
          ],
          lunch: [
            { id: '13', name: "Grilled Chicken Bowl", subtitle: "Lean protein", calories: 480, image: "https://images.unsplash.com/photo-1605478573815-7e0b7a77b798?w=1200&q=80", meal_type: 'lunch' },
            { id: '14', name: "Quinoa Salad", subtitle: "Filling & fiber", calories: 390, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80", meal_type: 'lunch' },
            { id: '15', name: "Fish Rice Bowl", subtitle: "Omega-3 rich", calories: 520, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80", meal_type: 'lunch' },
            { id: '16', name: "Veggie Wrap", subtitle: "Portable & light", calories: 340, image: "https://images.unsplash.com/photo-1564758866816-79f6b0f4b5f6?w=1200&q=80", meal_type: 'lunch' },
            { id: '17', name: "Poke Bowl", subtitle: "Fresh & balanced", calories: 450, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&q=80", meal_type: 'lunch' },
            { id: '18', name: "Lentil Soup", subtitle: "Comfort & protein", calories: 320, image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80", meal_type: 'lunch' },
            { id: '19', name: "Chicken Salad", subtitle: "Crisp greens", calories: 380, image: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80", meal_type: 'lunch' },
            { id: '20', name: "Sushi Plate", subtitle: "Light & savory", calories: 410, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80", meal_type: 'lunch' },
            { id: '21', name: "Club Sandwich", subtitle: "Triple layered", calories: 520, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=1200&q=80", meal_type: 'lunch' },
            { id: '22', name: "Gourmet Burger", subtitle: "Premium beef", calories: 580, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80", meal_type: 'lunch' },
            { id: '23', name: "Margherita Pizza", subtitle: "Classic Italian", calories: 490, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80", meal_type: 'lunch' },
            { id: '24', name: "Burrito Bowl", subtitle: "Mexican fusion", calories: 510, image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=1200&q=80", meal_type: 'lunch' }
          ],
          dinner: [
            { id: '25', name: "Grilled Steak", subtitle: "Hearty protein", calories: 620, image: "https://images.unsplash.com/photo-1604908177522-2ecbd7f2b4e3?w=1200&q=80", meal_type: 'dinner' },
            { id: '26', name: "Wholegrain Pasta", subtitle: "Comfort carbs", calories: 480, image: "https://images.unsplash.com/photo-1604908177345-4bfc5bd7b8f9?w=1200&q=80", meal_type: 'dinner' },
            { id: '27', name: "Tofu Stir Fry", subtitle: "Vegetarian option", calories: 390, image: "https://images.unsplash.com/photo-1541544181188-2f8b0b3c5f9f?w=1200&q=80", meal_type: 'dinner' },
            { id: '28', name: "Roasted Vegetables", subtitle: "Light & warm", calories: 280, image: "https://images.unsplash.com/photo-1543353071-087092ec393a?w=1200&q=80", meal_type: 'dinner' },
            { id: '29', name: "Vegetable Soup", subtitle: "Comforting broth", calories: 220, image: "https://images.unsplash.com/photo-1604908177313-4f6f79f4b4c6?w=1200&q=80", meal_type: 'dinner' },
            { id: '30', name: "Baked Salmon", subtitle: "Omega-3 rich", calories: 520, image: "https://images.unsplash.com/photo-1512058564366-c9e3c8d4f3c8?w=1200&q=80", meal_type: 'dinner' },
            { id: '31', name: "Chicken Curry", subtitle: "Warm & savory", calories: 550, image: "https://images.unsplash.com/photo-1526318472351-c75fcf070b60?w=1200&q=80", meal_type: 'dinner' },
            { id: '32', name: "Mushroom Risotto", subtitle: "Creamy & rich", calories: 480, image: "https://images.unsplash.com/photo-1514511524328-1b0a9d2c7d97?w=1200&q=80", meal_type: 'dinner' },
            { id: '33', name: "Roast Chicken", subtitle: "Classic comfort", calories: 590, image: "https://images.unsplash.com/photo-1604908177308-0460a8f5f7c1?w=1200&q=80", meal_type: 'dinner' },
            { id: '34', name: "Beef Lasagna", subtitle: "Layered goodness", calories: 610, image: "https://images.unsplash.com/photo-1604908177315-4bfc5bd7b8f9?w=1200&q=80", meal_type: 'dinner' },
            { id: '35', name: "Grilled Shrimp", subtitle: "Light seafood", calories: 380, image: "https://images.unsplash.com/photo-1604908177316-4f6f79f4b4c6?w=1200&q=80", meal_type: 'dinner' },
            { id: '36', name: "Beef Stew", subtitle: "Hearty & warm", calories: 540, image: "https://images.unsplash.com/photo-1604908177317-47c6c4b5f7c1?w=1200&q=80", meal_type: 'dinner' }
          ]
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [navigate]);

  const handleCycleComplete = () => {
    if (activeMealType === "breakfast") setActiveMealType("lunch");
    else if (activeMealType === "lunch") setActiveMealType("dinner");
    else setActiveMealType("breakfast");
  };



  // Camera functions
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraStreamRef.current = stream;
      }
      setShowCameraModal(true);
    } catch (err) {
      alert("Camera access denied. Please enable camera permissions in your browser settings.");
    }
  };

  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    // Simulate AI analysis with mock data
    const mockAnalysis = {
      mealImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsM_zQJ4gmzBUB86ghfLCrvF-DNPW4bKn0YHj62c6ghvjjl1l8YFgUxXQLC1IyzQwOkssxI3LrKkVGcQO487vJn7y32aPble3xsjcFDOP743hbspIa2TrmFeDcs06bopUPo7ekv6nVBWoHnqn7Fq5ou6v55gFSLg-o6IAUnwGUYkwMcjf8i6vRzAtWts6XgO9nGT94IKTV7KcPsyjDm4HMRA9ub75KFgNec7b5-BKOXspdfsrpVQqrXJBIDICna6W-uaOAie-DjQkT",
      totalCalories: 600,
      foodItems: [
        {
          name: "Grilled Chicken",
          calories: 350,
          image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDJqXyJqaPpG2DZTXVSodZAjteA8mptnnnIwS4ehOJw_Aceu7fEFvRxqVXPEIyeFhTgx4F30wflAgZcYVe7dBicmkxZcR0gCvjImdMYF6TBqodsfvc9YFWZ2QiPufuboMmp4rEA_ES1qsYdL_BZeyGH-na2UV2aRTpNttrijt2im0nxSTg7EYpSzykTn_Yn7VsK9dmubBpv5r_BcMISnlrj8bW_5QGZazBDp0nR5WEFxEMOW90Ug0U5AG_nbZLEze_y3ABRe-ugEvX"
        },
        {
          name: "Steamed Broccoli",
          calories: 150,
          image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBqSDio5nR3YbB1GZfILQbsdyocdpaSyLtD1_hGyWnrcq9DlGujwAhsFLpvmAjc-s93IFc8qdk8PGGwsDsxYf6VdSSPVQA57xmN_CCKVLa--XCPpUrZ_gnpNN6tH2xJhoOLRBtz1x6tWGtat_rARoRU94TMd0C5t6thF3CsKMPT6fgt-F1Z8kYRgMnesGB1mNCgzuI6p1twL7uO3bWebjY-d2PvLT4s2P7aNH-kDyemdAKFTZzZrK81br8qaOqOtTIq8jyM7uuo6wo"
        },
        {
          name: "Brown Rice",
          calories: 200,
          image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBhVQ034nQVJgruCO7-M0b08t6X-0DE9NIO-b4K2eub8H1wl2-ICJdOzP5Yi9ycG81pPmC0JElE7UOIIUyc0QrM5ozuVWL_th8KDGTrtLWGR1EXn3hHeRhVijbDQrwzBiE8NQqkXmzxTAFuNZmT-AaUquQ4xV3jrUfzVZs6w_paOYQ6-xLaQ0wIQZAGY4DMzy2Ro6JJfQpBrCR7bCkeYKwbq_HhZt8twSNbf-8QyLb_b5PIPWFoeRD_56F-TRjxM_oHss5BgZPZtuQc"
        }
      ]
    };

    setAnalysisData(mockAnalysis);
    closeCamera();
    setShowMealAnalysis(true);
  };

  // Scanner functions
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

      // Simulate barcode detection
      setTimeout(() => {
        // Mock product data
        const mockProduct = {
          productImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDC3uI36v2v7l9_dYjandwQ5efulW90CJIuB9PT0VUJmiMsXlTlQllW5g6TVCaCC14WaGQVXKiT2LGtXHNwhw2Mg1oigGzUzVW3l5H5PmyQvnNRraa53sGWIev2gs-RidtWBACWiukga86c_mcIxv_0kOp9Ux4tnDF-ZBzYwP7c5sY8_DIeoWkxvQ8xYPS6T7rerFgJu--mC1uad0CEjzQcmgHraXfbSZhhC6fH2jux8tXzEq7gHhNiAKKsvjEc2GDXu0rJPLyNJNA_",
          productName: "Cheddar Cheese",
          servingSize: "1 oz (28g)",
          healthStatus: "GOOD" as const,
          country: "USA",
          expiry: "12/24",
          calories: 113,
          suggestions: [
            {
              image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtObdYnvTU4mJfu_RZW_YQ2eVLI2zbHL2U4M0eaW1ZwrUYIBEYJ_UJ1S7XjiRyAY4_n6qseWGGUD-UYj0yvDxKMNm33MZNjvPxub1mPX3M6GBQj_2NWFowgC171CV6hrIoUzMRWDJ_ohPm6GlnjvgRrZEA8VE15cLFc27yHd_QXwkrSM_e9g1So7CsW-Ndhu5eM71o2fQkbzew-kLTgWRnz8EknPZkLKdx9rxHnmGE2jF2jjsAKKQ24IL-1AdwNPA4CLs4bwKzl6MF",
              title: "Appetizer: With Crackers"
            },
            {
              image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9wZONqhe2ENP7gmYP2Jpg5qtvYeA3CkqZ5APk8DZYaGjygb5drbHPfGAZCwSWFIcaQW51o7cw6LIP4UjxdTC4EYi9Vc-9juR53hLBRsbFFdZ2ALCZglYRqp_f7iOl_eV63iRSGeYciwb1odLNPzfqXE4c8WA-WzL7MN1DiuOZDCXoTgYVUXkZ_jAPGhLlzC1tKjnWG0KrTtMUhBnwi5mFfE9s9JzvpamOJrssVSGVk48UFbqmKeTZzzcZU6xb-_nyHyoNQTjmHt2m",
              title: "Snack: With Green Apples"
            },
            {
              image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWuNuyg2-s_Dqy8b3WdoYrl8NCoS6Knyw4bqzN06FI7NHFImnSDTEdlfc4-Y6R4m1smHWn4llDC79IKrCWN52NyZ7IBwkfuvvRBGBf2IWxk0yKHRd6F8n7uhNrCLyxzUOmeBIu8f3mQyeSJLN667n8_Fa6sOsd8meNCIklv06iy5md6xVzwSv-qxLs07OauD1IHZ86Dpks455yNIV5sK0Zf7m-kqdsApW9AHr3q5yWkkX0kNg5N9EzqEyWtPDDrBh_ssv9YF3Rzuz-",
              title: "Meal: Baked Mac & Cheese"
            }
          ]
        };

        setProductData(mockProduct);
        closeScanner();
        setShowProductDetails(true);
      }, 2000);
    } catch (err) {
      alert("Camera access denied. Please enable camera permissions in your browser settings.");
    }
  };

  const closeScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(track => track.stop());
      scannerStreamRef.current = null;
    }
    setShowScannerModal(false);
  };



  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCamera();
        closeScanner();
        setShowProgressModal(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative mx-auto flex h-auto min-h-screen w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display">
      {/* Camera Modal */}
      <div className={`modal-overlay ${showCameraModal ? "active" : ""}`}>
        <div className="modal-content bg-white dark:bg-background-dark dark:border dark:border-slate-800">
          <div className="relative bg-black rounded-t-lg">
            <video ref={cameraVideoRef} className="w-full h-80 object-cover" autoPlay playsInline />
            <button
              onClick={closeCamera}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <button
              onClick={capturePhoto}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-vic-green text-slate-900 rounded-full p-4 shadow-lg"
            >
              <span className="material-symbols-outlined text-2xl">photo_camera</span>
            </button>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Meal Camera</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Point your camera at your meal to automatically detect ingredients and calculate calories.
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <div className={`modal-overlay ${showScannerModal ? "active" : ""}`}>
        <div className="modal-content bg-white dark:bg-background-dark dark:border dark:border-slate-800">
          <div className="relative bg-black rounded-t-lg">
            <video ref={scannerVideoRef} className="w-full h-80 object-cover" autoPlay playsInline />
            <div className="absolute inset-4 border-2 border-vic-green rounded-lg animate-pulse"></div>
            <button
              onClick={closeScanner}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Barcode Scanner</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Scan packaged foods to instantly log nutrition data and calories.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      <div className={`modal-overlay ${showProgressModal ? "active" : ""}`}>
        <div className="modal-content bg-white dark:bg-background-dark dark:border dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Weekly Progress</h3>
            <button
              onClick={() => setShowProgressModal(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-vic-green/20 dark:bg-vic-green/30 rounded-xl p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Today's Completion</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">75%</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-vic-soft-gray dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-white">5</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Day Streak</p>
              </div>
              <div className="bg-vic-soft-gray dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-white">2.1k</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Avg Calories</p>
              </div>
              <div className="bg-vic-soft-gray dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-white">12</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Meals Logged</p>
              </div>
            </div>

            <div className="bg-vic-soft-gray dark:bg-slate-800 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Weekly Trend</p>
              <div className="flex items-end justify-between h-20 gap-1">
                <div className="bg-vic-green/60 rounded-t w-full h-12"></div>
                <div className="bg-vic-green/80 rounded-t w-full h-16"></div>
                <div className="bg-vic-green rounded-t w-full h-14"></div>
                <div className="bg-vic-green/70 rounded-t w-full h-18"></div>
                <div className="bg-vic-green/90 rounded-t w-full h-20"></div>
                <div className="bg-vic-green/60 rounded-t w-full h-15"></div>
                <div className="bg-vic-green/85 rounded-t w-full h-17"></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Analysis Modal */}
      {showMealAnalysis && analysisData && (
        <MealAnalysis
          mealImage={analysisData.mealImage}
          totalCalories={analysisData.totalCalories}
          foodItems={analysisData.foodItems}
          onClose={() => setShowMealAnalysis(false)}
        />
      )}

      {/* Product Details Modal */}
      {showProductDetails && productData && (
        <ProductDetails
          productImage={productData.productImage}
          productName={productData.productName}
          servingSize={productData.servingSize}
          healthStatus={productData.healthStatus}
          country={productData.country}
          expiry={productData.expiry}
          calories={productData.calories}
          suggestions={productData.suggestions}
          onClose={() => setShowProductDetails(false)}
          onAddToDiary={() => {
            alert("Added to diary!");
            setShowProductDetails(false);
          }}
        />
      )}

      {/* Dashboard View */}
      <div className={`view ${currentView === "dashboard" ? "active" : ""}`}>
        {/* Header */}
        <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
          <div className="flex size-12 shrink-0 items-center">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBDIzmOKkCMAsO-QHgqPOmIS520rbDbPDohsp_l1BHCh2F8CvyNglHXwkKPfhdX1xPldmXOO0jLDsy_alKCT0oxe220SbizDgjNnxPyT1BasQvEzaehDfdntF2fxT4SJCyrztK3VrcBcNobzunVf17EVYGqpXnQoQSCfnp-syeFwTEFngZaFvY9QJh9Vwnx65HljWSyuAGUOEb-ITp9wMMKEPpfWm7A0t27zUe5HNhnGO41SnWQADmX6TSpKo0CsipDwEWKePVYeuMH")'
              }}
            ></div>
          </div>
          <div className="flex w-12 items-center justify-end">
            <Link
              to="/settings"
              className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-[#111812] dark:text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0"
            >
              <span className="material-symbols-outlined text-[#111812] dark:text-white">settings</span>
            </Link>
          </div>
        </header>

        {/* Welcome Section */}
        <div className="flex items-center gap-4 px-4 pt-4">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-16 shrink-0"
            style={{
              backgroundImage: `url("${userProfile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDIzmOKkCMAsO-QHgqPOmIS520rbDbPDohsp_l1BHCh2F8CvyNglHXwkKPfhdX1xPldmXOO0jLDsy_alKCT0oxe220SbizDgjNnxPyT1BasQvEzaehDfdntF2fxT4SJCyrztK3VrcBcNobzunVf17EVYGqpXnQoQSCfnp-syeFwTEFngZaFvY9QJh9Vwnx65HljWSyuAGUOEb-ITp9wMMKEPpfWm7A0t27zUe5HNhnGO41SnWQADmX6TSpKo0CsipDwEWKePVYeuMH'}")`
            }}
          ></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[#111812] dark:text-white tracking-light text-[32px] font-bold leading-tight text-left">
                Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Vic'}
              </h1>
              <div className="flex items-center gap-1 rounded-full bg-vic-green/20 dark:bg-vic-green/30 px-2 py-1 text-vic-green">
                <span className="material-symbols-outlined !text-sm">mic</span>
                <span className="text-xs font-medium text-slate-800 dark:text-white">AR</span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal">
              Ready to continue your journey?
            </p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-4">
          <div className="flex flex-col items-stretch justify-start rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] bg-white dark:bg-background-dark dark:border dark:border-slate-800">
            <div className="flex w-full grow flex-col items-stretch justify-center gap-4 p-6">
              <div className="flex flex-col">
                <p className="text-slate-600 dark:text-slate-400 text-sm font-normal leading-normal">Progress</p>
                <p className="text-[#111812] dark:text-white text-5xl font-bold leading-tight tracking-[-0.015em]">
                  {dailyProgress ? Math.round((dailyProgress.calories_consumed / dailyProgress.calories_goal) * 100) : 0}%
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-[#111812] dark:text-white text-base font-bold leading-normal">
                    {dailyProgress?.calories_consumed || 0}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-normal leading-normal">Calories Eaten</p>
                </div>
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-[#111812] dark:text-white text-base font-bold leading-normal">
                    {dailyProgress ? (dailyProgress.calories_goal - dailyProgress.calories_consumed) : 2000}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-normal leading-normal">Calories Left</p>
                </div>
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-[#111812] dark:text-white text-base font-bold leading-normal">
                    {dailyProgress?.calories_goal || 2000}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-normal leading-normal">Goal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center p-6">
              <div className="relative size-24">
                <svg className="size-full" height="36" viewBox="0 0 36 36" width="36">
                  <circle className="stroke-slate-200 dark:stroke-slate-700" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                  <circle
                    className="stroke-vic-green"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="16"
                    strokeDasharray="75 100"
                    strokeDashoffset="25"
                    strokeLinecap="round"
                    strokeWidth="3"
                    transform="rotate(-90 18 18)"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20"
                    style={{
                      backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDfpu_92P0oCEdYkmVor-bmVEsWk6gFxB_ERE-lZ3h6B8xiCZPe9h8BZQQuhwqWMQhRqzxapgHz6LZYVHvUvJheFOm0WiQVW_c2vZF6cc3xihxbAyoC7SaO8RvPcnI2xM-LZVHvT3nlMpNnWyfwKa8ILfBYlUWTPHf2AE2prJpRF7eiO9mo83ZOpT_nPcalVuM9ATuoswj_u75_LvYdkcuT54kcCjRPj6QoVQPMQ6C0Gv3hXHSZfNe324WipLAkqv9KYJqrGJmwWQij")'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2">
          <button
            onClick={openCamera}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-vic-green/20 text-primary-dark"
          >
            <span className="material-symbols-outlined text-vic-green">photo_camera</span>
            <span className="text-xs font-medium leading-normal text-slate-800 dark:text-white truncate">Camera</span>
          </button>
          <button
            onClick={openScanner}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-vic-green/20 text-primary-dark"
          >
            <span className="material-symbols-outlined text-vic-green">qr_code_scanner</span>
            <span className="text-xs font-medium leading-normal text-slate-800 dark:text-white truncate">Scanner</span>
          </button>
          <button
            onClick={() => navigate("/cookbook")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-vic-green/20 text-primary-dark"
          >
            <span className="material-symbols-outlined text-vic-green">restaurant</span>
            <span className="text-xs font-medium leading-normal text-slate-800 dark:text-white truncate">Cook</span>
          </button>
          <button
            onClick={() => navigate("/budget")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-3 bg-vic-green/20 text-primary-dark"
          >
            <span className="material-symbols-outlined text-vic-green">attach_money</span>
            <span className="text-xs font-medium leading-normal text-slate-800 dark:text-white truncate">Budget</span>
          </button>
        </div>

        {/* Calendar */}
        <div className="p-4 calendar-font">
          <div className="bg-white dark:bg-[#1C2A3C] rounded-lg relative">
            <div className="progress-badge" onClick={() => setCurrentView("progress")} title="View Monthly Progress">
              📊
            </div>
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-bold text-vic-deep-blue dark:text-white">November 2025</h3>
              <div className="flex items-center space-x-2">
                <button className="flex size-8 items-center justify-center rounded-lg bg-vic-soft-gray dark:bg-slate-700 text-vic-deep-blue dark:text-white">
                  <span className="material-symbols-outlined !text-xl !font-light">chevron_left</span>
                </button>
                <button className="flex size-8 items-center justify-center rounded-lg bg-vic-soft-gray dark:bg-slate-700 text-vic-deep-blue dark:text-white">
                  <span className="material-symbols-outlined !text-xl !font-light">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 px-4 pb-2 text-center">
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Sun</span>
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Mon</span>
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Tue</span>
              <span className="text-sm font-medium text-vic-deep-blue dark:text-white">Wed</span>
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Thu</span>
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Fri</span>
              <span className="text-sm font-medium text-vic-deep-blue/60 dark:text-white/60">Sat</span>
            </div>
            <div className="grid grid-cols-7 gap-y-2 p-4 pt-0 text-center text-sm">
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">12</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">13</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">14</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg bg-vic-deep-blue font-bold text-white">15</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">16</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">17</button>
              <button className="flex h-10 w-full items-center justify-center rounded-lg font-medium text-vic-deep-blue dark:text-white">18</button>
            </div>
          </div>
        </div>


        {/* 3D Card Deck Food Carousel - VicCalary Design */}
        <FoodCarousel
          breakfastMeals={meals.breakfast}
          lunchMeals={meals.lunch}
          dinnerMeals={meals.dinner}
        />
      </div>

      {/* Monthly Progress View */}
      <div className={`view ${currentView === "progress" ? "active" : ""}`}>
        <MonthlyProgressView onClose={() => setCurrentView("dashboard")} />
      </div>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-10 grid grid-cols-4 gap-2 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm p-2">
        <Link
          to="/dashboard"
          className="nav-item nav-active flex flex-col items-center justify-center gap-1 rounded-lg p-2"
        >
          <span className="material-symbols-outlined icon-filled">home</span>
          <span className="text-xs font-bold">Home</span>
        </Link>
        <Link
          to="/notifications"
          className="nav-item flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-slate-500 dark:text-slate-400"
        >
          <span className="material-symbols-outlined icon-filled text-vic-deep-blue">notifications</span>
          <span className="text-xs font-medium">Notifications</span>
        </Link>
        <Link
          to="/chat"
          className="nav-item flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-slate-500 dark:text-slate-400"
        >
          <span className="material-symbols-outlined icon-filled text-vic-deep-blue">chat</span>
          <span className="text-xs font-medium">Chat</span>
        </Link>
        <Link
          to="/profile"
          className="nav-item flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-slate-500 dark:text-slate-400"
        >
          <span className="material-symbols-outlined icon-filled text-vic-deep-blue">person</span>
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

function MealSection({
  title,
  position,
  timeLabel,
  onNext,
  onPrevious
}: {
  title: string;
  position: string;
  timeLabel: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const meals = {
    Breakfast: [
      { name: "Avocado Toast", calories: 250, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCmUxQ6NbOzTTaIyGz0_EfSnvqv-mO-559OKvattxYVXTAmiJ8WnGmsBs1R56M4ioMUgX9J8N5S8QwKd9vCfc9h60VdAlzB-1HR5YDkmKw6QC6hU059qOgZciyKqnXM385yc6nfx5ucHW9iYwQPM1X8Sv66iip0RgHnkUFF3gvp7N1YqbpXZ5G6tufTVyukyuMBd0nqpq0NE3Lxqd5EWoLiRIBs9MwuNBLT5gLEWvkdhXNGhm0_mhIjxykvYFjl3TzkMAB_t5fzHEgW" },
      { name: "Oatmeal with Berries", calories: 300, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_JFzVBg3EGrdw7pTraYiwQ2sdflRXDPM5FGyMNjYjBAcWkek8WeacSLV9R569NRENWDHOSnun-jEg_Qm_sZFghkKowDl_eyxltxhXQT5En5b4qewn1YTVOe6EuYMsTmXHTuoHOH5Y5J1d7Xi-hISi_oI7PfHZq50fxUhFP6i9f7PWp-3_g7rkzid8dd2zjDWeVX2NUrVoGPavySqa5AYr8Gf9fc1HRfYZAqyqEhEVRALW9VLgoDwe4ODGahgxDPK1209iF976kBj4" },
      { name: "Greek Yogurt Bowl", calories: 180, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBc3cpTIiCAx_NPlg44ztGXtpe-x4Ou8rw54QeWSGUKhBVB390MQf8GUPkv8XNUK5Sz5HwAjeYU8B2UaHGrSgpvOSPDu17VYSxwCpRleMc70dLjD5Yg8XeNWylwi2S64zl-DY5liWJ_TIBOSnpAAzj9l5IEKYt8vdnUPiehGF-X07rFZXEVV9oWNs8IRCVJ19IAdm_grwjOfCTLCKfNxbl3qc78TptZOHj1OtfYyBZ4ngtiA7XNTqhURf2W_BtI5s8A8IbgN88YxI7y" }
    ],
    Lunch: [
      { name: "Chicken Salad", calories: 450, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfrTJjjWETGiBeLf_GChs8iOh7oC_IL8YHnGk7scH2MgliM2x1QY-CsJ8Rzgq0n4zZKQ6vGivu6_oJkfML4UTeC1uIhbhkqUyBy_s5kacpIx1ogEDFdaVn89z0YhKIRkzHePy8tYb1qdnpQcPPlUjFJrndgnRJiU7u2dJ-q0QDJD7trkhlR1OnV3az6av6rR6KHJ0gbszp3WxsA0tJjey9HIC0oAmW1ZLCKWDG-jIM4CUhJOUtZzGzqgPTjTl9AtUIt-Yb9TRkiTtG" },
      { name: "Quinoa Bowl", calories: 400, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAh9Jzzg_M7Fu-A1G-ASKaTgJhrkX71cXHj_WRxp3_UJBN4KL8aW25n5C7Sj6mZjRPkG3vWXSl6YlF714z4ZOQ1on40JAMMZwYguf9SYmitxZEQiW6mhRh5RH6Xk-wMe7qomJ6EiXcPX5c7DO9hZY0TeyEahyenj4ChK9qjnTMzVTCHGiuZPsiJwsCNLNeZeCqO3JzxuU2NtdH-_KzgwYfT3DY4z77O0un6yLAfE6ZJvbhDLS0DDqpamNmg96Qmcwim9nqnTFzkDn0X" },
      { name: "Veggie Wrap", calories: 350, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDn6tRQ5GG-XIWc9WB4KV0czHaCG7Gr3GFIH1iqsG4hqytAL5IoecHqIslOTYmubGXnCDuZOsbLbQlOYjuI1UWqNCxh8wyDxmLXHubTKvmjTUCfoCSVC7hEyDNZicnHbp42pXA9nYS7Ffslsh663FHrqBgTPJK_cGAcjlV5ZdG56JNBMuFniTOgdijStX0FOXbiDbB2KvjFAoTSHRpf9IyBaGNXcmYHNUfz-AjBfQxy-YMDPEYePJ3mAvmJDiD9Zj--1qB-KIoF9YiK" }
    ],
    Dinner: [
      { name: "Salmon & Asparagus", calories: 550, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBY-NEv7iKfcT_2aEpMYrwH1015FYmA9tFcN5QKWl92VTWI-oncDxVAhl3uKWupns97YefFMBZ8P7Om6hxYuW99RFlX3AwKNxgsGqi9Gnr5DoEkN6rw7Z77RLB1L3NH1EyiTgsDoAA2mJInLgnF-WBRlvNor3wIIvfKIGwkMIsFf36OzLbNS4x74AT2WvLp2llnmBX8gftgA7mP-Eni2tyqpUduiRWqtMjjFPHrh6kYl3zz7ZjP8SuwiyOGnBHRxW0l_K1feNiZOHaX" },
      { name: "Lentil Soup", calories: 320, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9688GOt-pMqO3HgMhlPx2H_8cfjNBWipfaorJV3y5ocGLyNScYxubx_P0JeYnQl_tTnhyinPRoVLyK11f9DwS5HgwmFUnF2Cfn1WHn06VJcMtR3sGyMqEstDYmdUv1isYjdvVi3P7Pwtzq4Q-nv3IuvnpPx3Ur0FIyJuMgLeAqOJohZYsM3UAQC2HjTAlw0WzkXLWZQgHoSPbFJlVFqpBgwUPBzqvhy-pnqgqg4dVf568bwnfTcFHzg2OrgjoWUJlhFKdMq6NvXbf" },
      { name: "Stuffed Peppers", calories: 480, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkMeIK10UiJCUWzByzJk7_PeSxdobUZBAiGbTqfQu1zpvsDnEAnsofg7nmhPdgJsRI707U1k6R6QU6ow6wPSHZzPRGf6dypLQfnJddiYd_wQ2Itx71pKg8IoE5LJE9potKo6LUEq3uMvk2VP79vX_kqHhD3BGtuakRjJyQ2cug6SxN161-h6z2gxdGhNwwT1rosti8E_-VaTlfYaKcuWfk05taBJGbKDxHX-Ni0jUnLs2Zvo5c9FPKESZlcn7QHunKWxyvB3qc93oX" }
    ]
  };

  const currentMeals = meals[title as keyof typeof meals] || [];

  return (
    <div className={`meal-section ${position}`}>
      <div className="py-4">
        <div className="flex items-center justify-between px-4 mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onPrevious}
              className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
            <button
              onClick={onNext}
              className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
        <div className="flex overflow-x-auto space-x-4 px-4 pb-4 scrollbar-hide">
          {currentMeals.map((meal, index) => (
            <div key={index} className="flex-shrink-0 w-40">
              <div className="flex flex-col rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none bg-white dark:bg-slate-800">
                <div
                  className="w-full h-24 bg-cover bg-center"
                  style={{ backgroundImage: `url('${meal.image}')` }}
                ></div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-[#111812] dark:text-white truncate">{meal.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{meal.calories} kcal</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthlyProgressView({ onClose }: { onClose: () => void }) {
  return (
    <div className="max-w-md mx-auto p-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            alt="User avatar"
            className="w-14 h-14 rounded-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzJ8kAKj4rBlMd8guyVSmqr-bjYN7mp6d1modzPUNdoRzhwRroLWMKEb86xLl7eZarehlNdKkbLbgjwK9Wj1C6JIfCx3bqgBKEk3fC8fkfrs9qK6vffTt7w-3EkeVP_-vsHSw8cG7F0Ui4UhtB2nB7YeFWplY7Caf5-MhX8enEgCGncuqcD7nwzpr-B5XlLdWNbzNIh4zOouomsN71gUsjV6_tHiz-R6xyoCYYzadWVSji88edoDHztRoCj_PaVHHd0sY3PsQKT6TV"
          />
          <h1 className="text-xl font-bold text-vic-green dark:text-vic-green">Build Muscle and Lose Weight</h1>
        </div>
        <button className="p-2" onClick={onClose}>
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">close</span>
        </button>
      </header>
      <main className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-1 text-slate-800 dark:text-white">Monthly Progress</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Here's your nutritional breakdown.</p>
          <div className="relative w-full aspect-square max-w-[240px] mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="stroke-slate-200 dark:stroke-slate-700" cx="50" cy="50" fill="none" r="45" strokeWidth="10"></circle>
              <circle
                cx="50"
                cy="50"
                fill="none"
                r="45"
                stroke="#13ec37"
                strokeDasharray="212 283"
                strokeLinecap="round"
                strokeWidth="10"
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Overall</p>
              <p className="text-4xl font-bold text-slate-800 dark:text-white">75%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">of goal</p>
            </div>
          </div>
          <div className="flex justify-around text-center">
            <div>
              <p className="font-bold text-lg text-vic-green">70%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Carbs</p>
            </div>
            <div>
              <p className="font-bold text-lg text-slate-500">50%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Protein</p>
            </div>
            <div>
              <p className="font-bold text-lg text-vic-green">85%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Fats</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold mb-1 text-slate-800 dark:text-white">Usage Calendar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Days you logged your meals this month.</p>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            <span>SU</span><span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span>
          </div>
          <div className="progress-calendar-grid">
            <div className="progress-calendar-day"></div>
            <div className="progress-calendar-day"></div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">1</div>
            <div className="progress-calendar-day bg-vic-green text-white">2</div>
            <div className="progress-calendar-day bg-slate-600 text-white">3</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">4</div>
            <div className="progress-calendar-day bg-vic-green text-white">5</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">6</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">7</div>
            <div className="progress-calendar-day bg-slate-600 text-white">8</div>
            <div className="progress-calendar-day bg-vic-green text-white">9</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">10</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">11</div>
            <div className="progress-calendar-day bg-slate-600 text-white">12</div>
            <div className="progress-calendar-day bg-slate-600 text-white">13</div>
            <div className="progress-calendar-day bg-vic-green text-white">14</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">15</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">16</div>
            <div className="progress-calendar-day bg-vic-green text-white">17</div>
            <div className="progress-calendar-day bg-vic-green text-white">18</div>
            <div className="progress-calendar-day bg-slate-600 text-white">19</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">20</div>
            <div className="progress-calendar-day bg-vic-green text-white">21</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">22</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">23</div>
            <div className="progress-calendar-day bg-vic-green text-white">24</div>
            <div className="progress-calendar-day bg-slate-600 text-white">25</div>
            <div className="progress-calendar-day bg-slate-600 text-white">26</div>
            <div className="progress-calendar-day bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">27</div>
            <div className="progress-calendar-day bg-vic-green text-white">28</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">29</div>
            <div className="progress-calendar-day bg-vic-green text-white">30</div>
            <div className="progress-calendar-day bg-vic-green/30 text-slate-800 dark:text-white">31</div>
          </div>
        </div>
        <div className="bg-vic-green/20 dark:bg-vic-green/30 p-6 rounded-xl border border-vic-green/30">
          <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Your Summary</h2>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Great job staying consistent this month! Your carb intake is on target, but you could focus on increasing your protein to better support muscle growth and satiety. Remember to log your meals every day to get the most accurate insights. Keep up the fantastic work!
          </p>
        </div>
      </main>
    </div>
  );
}

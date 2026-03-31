"use client"
import { useState } from "react";
import Link from "next/link"
import { usePathname } from "next/navigation";
import { ArrowLeft, Search, Coffee, Sandwich, Utensils, Cookie, Wine, IceCreamCone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { searchRecipes, getDailyMealSuggestions } from "@/lib/api/recipes";
import { useTranslation } from "@/lib/api/translation";

export default function Cookbook() {
    const { user } = useAuth();
    const pathname = usePathname();
    const searchParams = new URLSearchParams(location.search);
    const initialTab = (searchParams.get("tab") as "all" | "favorites" | "suggested") || "all";

    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "favorites" | "suggested">(initialTab);
    const { t } = useTranslation();

    // Fetch daily suggestions (same as Dashboard)
    const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
        queryKey: ['suggestions', user?.id], // Match Dashboard query key
        queryFn: () => getDailyMealSuggestions(user!.id),
        enabled: !!user?.id
    });

    // Search recipes
    const { data: searchResults, isLoading: searchLoading } = useQuery({
        queryKey: ['recipes-search', searchQuery],
        queryFn: () => searchRecipes(searchQuery),
        enabled: searchQuery.length > 2
    });

    const categories = [
        { name: t('breakfast'), icon: Coffee },
        { name: t('lunch'), icon: Sandwich },
        { name: t('dinner'), icon: Utensils },
        { name: t('snacks'), icon: Cookie },
        { name: t('drinks'), icon: Wine },
        { name: t('desserts'), icon: IceCreamCone },
    ];

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto w-full bg-white dark:bg-[#0d1418]">
            {/* Header */}
            <header className="p-4 bg-white dark:bg-[#0d1418] sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <Link href="/dashboard" className="text-vic-deep-blue dark:text-vic-green">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('cookbook')}</h1>
                    <div className="w-6"></div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-[#1f2c34] rounded-xl border-none focus:ring-2 focus:ring-vic-green text-slate-900 dark:text-white"
                    />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                {/* Categories */}
                {!searchQuery && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('categories')}</h2>
                        <div className="grid grid-cols-3 gap-4">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    className="flex flex-col items-center p-4 bg-slate-50 dark:bg-[#1f2c34] rounded-2xl hover:bg-vic-green/10 transition-colors"
                                >
                                    <cat.icon className="text-vic-green mb-2" size={22} />
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === "all" ? "text-vic-green border-b-2 border-vic-green" : "text-slate-400"}`}
                    >
                        {t('all_recipes')}
                    </button>
                    <button
                        onClick={() => setActiveTab("suggested")}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === "suggested" ? "text-vic-green border-b-2 border-vic-green" : "text-slate-400"}`}
                    >
                        {t('for_you')}
                    </button>
                    <button
                        onClick={() => setActiveTab("favorites")}
                        className={`pb-2 text-sm font-bold transition-colors ${activeTab === "favorites" ? "text-vic-green border-b-2 border-vic-green" : "text-slate-400"}`}
                    >
                        {t('favorites')}
                    </button>
                </div>

                {/* Recipe List */}
                <div className="space-y-4">
                    {searchQuery ? (
                        searchResults?.map((recipe: any) => (
                            <CookbookCard key={recipe.id} item={recipe} type="recipe" />
                        ))
                    ) : activeTab === "suggested" ? (
                        // Flatten breakfast, lunch, dinner arrays into one
                        [...(suggestions?.breakfast || []), ...(suggestions?.lunch || []), ...(suggestions?.dinner || [])].map((meal: any, index: number) => (
                            <CookbookCard key={`${meal.id}-${index}`} item={meal} type="meal" />
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <p>{t('select_category_prompt')}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// Unified styled card component
function CookbookCard({ item, type = 'recipe' }: { item: any, type?: 'recipe' | 'meal' }) {
    const isRecipe = type === 'recipe';
    const id = item.id;
    const title = isRecipe ? (item.title || "Untitled Recipe") : (item.name || "Untitled Meal");
    const image = isRecipe ? item.image_url : item.image;
    const calories = isRecipe ? (item.total_calories || item.calories) : item.calories;
    const time = isRecipe ? (item.prep_time_minutes || item.prep_time || "20") : "20"; // Default time for meals if missing

    return (
        <Link href={`/recipe/${id}`} className="block relative h-48 rounded-[32px] overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            {/* Background Image */}
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Utensils className="text-slate-400" size={36} />
                    </div>
                )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="text-xl font-bold leading-tight mb-1 line-clamp-2">{title}</h3>
                <p className="text-sm font-medium opacity-90 mb-0">{time} Minutes</p>

                {/* View Recipe Button (absolute positioning inside relative container) */}
                <div className="absolute bottom-5 right-5 bg-[#AEDC81] text-[#1f2c34] text-xs font-bold px-4 py-1.5 rounded-full">
                    View Recipe
                </div>
            </div>

            {/* Top Badge (Calories) */}
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                {calories || 0} Cal
            </div>
        </Link>
    );
}

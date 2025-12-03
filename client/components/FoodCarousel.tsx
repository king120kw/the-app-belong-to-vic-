import { useState } from "react";
import "../styles/FoodCarousel.css";

interface Meal {
    id: string;
    name: string;
    subtitle: string;
    calories: number;
    image: string;
    meal_type: string;
}

interface FoodCarouselProps {
    breakfastMeals: Meal[];
    lunchMeals: Meal[];
    dinnerMeals: Meal[];
}

export default function FoodCarousel({
    breakfastMeals,
    lunchMeals,
    dinnerMeals,
}: FoodCarouselProps) {
    // Process meals: ensure exactly 12 items and trim images
    const processMeals = (meals: Meal[]) => meals.slice(0, 12).map(m => ({
        ...m,
        image: m.image.trim()
    }));

    // Combine all meals into a single array of 36 cards
    const allMeals = [
        ...processMeals(breakfastMeals),
        ...processMeals(lunchMeals),
        ...processMeals(dinnerMeals)
    ];

    // Global index (0-35) - tracks current card across all meals
    const [globalIndex, setGlobalIndex] = useState(0);

    // Determine which meal type is active based on global index
    const getMealTypeFromIndex = (index: number): 'breakfast' | 'lunch' | 'dinner' => {
        if (index < 12) return 'breakfast';
        if (index < 24) return 'lunch';
        return 'dinner';
    };

    // Get the card to display from the 5 surrounding cards for 3D effect
    const getVisibleCards = () => {
        const cards = [];
        for (let i = -2; i <= 2; i++) {
            const idx = (globalIndex + i + 36) % 36;
            cards.push({
                meal: allMeals[idx],
                position: i + 2, // 0-4, where 2 is front
            });
        }
        return cards;
    };

    const activeMealType = getMealTypeFromIndex(globalIndex);
    const visibleCards = getVisibleCards();

    const mealLabels = {
        breakfast: { title: "Breakfast", time: "Morning", badge: "Morning" },
        lunch: { title: "Lunch", time: "Midday", badge: "Midday" },
        dinner: { title: "Dinner", time: "Evening", badge: "Evening" },
    };

    // Navigation handlers - navigate through all 36 cards
    const handleNext = () => {
        setGlobalIndex((prev) => (prev + 1) % 36);
    };

    const handlePrev = () => {
        setGlobalIndex((prev) => (prev - 1 + 36) % 36);
    };

    return (
        <div className="food-carousel-container">
            <h1 className="carousel-main-title">VicCalary — Meal Suggestions</h1>

            <div className="columns">
                <div className="tile column active">
                    <div className="meal-header">
                        <div>
                            <div className="meal-title">{mealLabels[activeMealType].title}</div>
                            <div className="meal-time">{mealLabels[activeMealType].time}</div>
                        </div>
                        <div className="badge">{mealLabels[activeMealType].badge}</div>
                    </div>

                    <div className="carousel">
                        <button
                            className="nav prev"
                            onClick={handlePrev}
                            aria-label="Previous meal"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>

                        <div className="deck">
                            {visibleCards.map(({ meal, position }) => (
                                meal ? (
                                    <article
                                        key={meal.id}
                                        className={`product-card card-pos-${position}`}
                                        role="group"
                                    >
                                        <div className="product-media">
                                            <img
                                                src={meal.image}
                                                alt={meal.name}
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <header className="product-head">
                                            <h2 className="product-name">{meal.name}</h2>
                                            <p className="product-sub">{meal.subtitle}</p>
                                            <p className="product-calories">{meal.calories} cal</p>
                                        </header>
                                    </article>
                                ) : null
                            ))}
                        </div>

                        <button
                            className="nav next"
                            onClick={handleNext}
                            aria-label="Next meal"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

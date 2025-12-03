import { useState, useEffect, useRef } from "react";
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

class MealDeckController {
    deckEl: HTMLElement;
    cards: HTMLElement[];
    prevBtn: HTMLButtonElement | null;
    nextBtn: HTMLButtonElement | null;
    colEl: HTMLElement;
    cardOrder: number[];
    nextCount: number;

    constructor(
        deckEl: HTMLElement,
        prevBtn: HTMLButtonElement | null,
        nextBtn: HTMLButtonElement | null,
        colEl: HTMLElement
    ) {
        this.deckEl = deckEl;
        this.cards = Array.from(deckEl.querySelectorAll(".product-card"));
        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
        this.colEl = colEl;
        this.cardOrder = this.cards.map((_, i) => i);
        this.nextCount = 0;

        this.bindEvents();
        this.setDeckHeight();
        this.applyCardPositions();

        window.addEventListener("resize", () => this.setDeckHeight());
    }

    setDeckHeight() {
        if (!this.cards.length) return;
        const h = Math.max(...this.cards.map((c) => c.offsetHeight));
        this.deckEl.style.height = h + "px";
    }

    bindEvents() {
        this.nextBtn?.addEventListener("click", () => this.handleNext());
        this.prevBtn?.addEventListener("click", () => this.handlePrev());

        let startX = 0,
            dragging = false,
            pid: number | null = null;
        this.deckEl.addEventListener("pointerdown", (e) => {
            dragging = true;
            startX = e.clientX;
            pid = e.pointerId;
            this.deckEl.setPointerCapture(pid);
        });
        this.deckEl.addEventListener("pointerup", (e) => {
            if (!dragging) return;
            dragging = false;
            const dx = e.clientX - startX;
            if (dx > 40) this.handlePrev();
            else if (dx < -40) this.handleNext();
            try {
                if (pid !== null) this.deckEl.releasePointerCapture(pid);
            } catch (err) { }
        });
        this.deckEl.addEventListener("pointercancel", () => (dragging = false));
    }

    handleNext() {
        this.cardOrder.push(this.cardOrder.shift()!);
        this.nextCount++;
        this.applyCardPositions();
        if (this.nextCount % this.cards.length === 0 && this.nextCount > 0) {
            this.dispatchCycleComplete();
        }
    }

    handlePrev() {
        this.cardOrder.unshift(this.cardOrder.pop()!);
        this.applyCardPositions();
    }

    applyCardPositions() {
        this.cards.forEach((card) => {
            card.classList.forEach((k) => {
                if (/^card-pos-/.test(k)) card.classList.remove(k);
            });
        });
        this.cardOrder.forEach((cardIndex, posIndex) => {
            const card = this.cards[cardIndex];
            const pos = Math.min(posIndex, 5);
            card.classList.add(`card-pos-${pos}`);
        });
    }

    dispatchCycleComplete() {
        const ev = new CustomEvent("mealCycleComplete", {
            detail: { meal: this.colEl.dataset.meal },
            bubbles: true,
        });
        document.dispatchEvent(ev);
    }
}

export default function FoodCarousel({
    breakfastMeals,
    lunchMeals,
    dinnerMeals,
}: FoodCarouselProps) {
    const [activeMeal, setActiveMeal] = useState<"breakfast" | "lunch" | "dinner">("breakfast");
    const controllersRef = useRef<{ [key: string]: MealDeckController }>({});

    useEffect(() => {
        // Initialize deck controllers
        const configs = [
            { meal: "breakfast", deckId: "deck-breakfast" },
            { meal: "lunch", deckId: "deck-lunch" },
            { meal: "dinner", deckId: "deck-dinner" },
        ];

        configs.forEach((cfg) => {
            const deckEl = document.getElementById(cfg.deckId);
            const colEl = document.getElementById(`col-${cfg.meal}`);
            const prevBtn = document.querySelector<HTMLButtonElement>(
                `.nav.prev[data-deck="${cfg.meal}"]`
            );
            const nextBtn = document.querySelector<HTMLButtonElement>(
                `.nav.next[data-deck="${cfg.meal}"]`
            );

            if (deckEl && colEl) {
                controllersRef.current[cfg.meal] = new MealDeckController(
                    deckEl,
                    prevBtn,
                    nextBtn,
                    colEl
                );
            }
        });

        // Listen for cycle complete events
        const handleCycleComplete = (e: Event) => {
            const customEvent = e as CustomEvent<{ meal: string }>;
            const currentMeal = customEvent.detail.meal;
            const mealOrder = ["breakfast", "lunch", "dinner"];
            const idx = mealOrder.indexOf(currentMeal);
            const next = mealOrder[(idx + 1) % mealOrder.length] as "breakfast" | "lunch" | "dinner";
            setActiveMeal(next);
        };

        document.addEventListener("mealCycleComplete", handleCycleComplete);

        return () => {
            document.removeEventListener("mealCycleComplete", handleCycleComplete);
        };
    }, []);

    useEffect(() => {
        // Update column states based on active meal
        const mealOrder = ["breakfast", "lunch", "dinner"];
        mealOrder.forEach((m) => {
            const col = document.getElementById(`col-${m}`);
            if (col) {
                const isActive = m === activeMeal;
                col.classList.toggle("active", isActive);
                col.classList.toggle("dimmed", !isActive);
            }
        });
    }, [activeMeal]);

    const mealData = {
        breakfast: breakfastMeals,
        lunch: lunchMeals,
        dinner: dinnerMeals,
    };

    const mealLabels = {
        breakfast: { title: "Breakfast", time: "Morning", badge: "Morning" },
        lunch: { title: "Lunch", time: "Midday", badge: "Midday" },
        dinner: { title: "Dinner", time: "Evening", badge: "Evening" },
    };

    return (
        <div className="food-carousel-container">
            <h1 className="carousel-main-title">VicCalary — Meal Suggestions</h1>

            <div className="columns">
                {(["breakfast", "lunch", "dinner"] as const).map((mealType) => (
                    <div
                        key={mealType}
                        className="tile column"
                        id={`col-${mealType}`}
                        data-meal={mealType}
                    >
                        <div className="meal-header">
                            <div>
                                <div className="meal-title">
                                    {mealLabels[mealType].title}
                                </div>
                                <div className="meal-time" id={`time-${mealType}`}>
                                    {mealLabels[mealType].time}
                                </div>
                            </div>
                            <div className="badge">{mealLabels[mealType].badge}</div>
                        </div>

                        <div className="carousel">
                            <button
                                className="nav prev"
                                data-deck={mealType}
                                aria-label={`Previous ${mealType}`}
                            >
                                ←
                            </button>

                            <div
                                className="deck"
                                id={`deck-${mealType}`}
                                role="region"
                                aria-label={`${mealType} deck`}
                            >
                                {mealData[mealType].map((meal) => (
                                    <article key={meal.id} className="product-card" role="group">
                                        <div className="product-media">
                                            <img src={meal.image} alt={meal.name} />
                                        </div>
                                        <header className="product-head">
                                            <h2 className="product-name">{meal.name}</h2>
                                            <p className="product-sub">{meal.subtitle}</p>
                                            <p className="product-calories">{meal.calories} cal</p>
                                        </header>
                                    </article>
                                ))}
                            </div>

                            <button
                                className="nav next"
                                data-deck={mealType}
                                aria-label={`Next ${mealType}`}
                            >
                                →
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

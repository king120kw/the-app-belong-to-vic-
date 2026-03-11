-- ============================================================================
-- FIX: RECALCULATE DAILY PROGRESS TRIGGER TYPE MISMATCH
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_daily_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id TEXT; -- CHANGED FROM UUID TO TEXT
    v_date DATE;
    v_total_calories DECIMAL := 0;
    v_total_protein DECIMAL := 0;
    v_total_carbs DECIMAL := 0;
    v_total_fat DECIMAL := 0;
    v_meals_count INT := 0;
    v_calorie_goal DECIMAL := 2000;
BEGIN
    -- Determine target user and date
    IF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
        v_date := (OLD.analyzed_at)::DATE;
    ELSE
        v_user_id := NEW.user_id;
        v_date := (NEW.analyzed_at)::DATE;
    END IF;

    -- Aggregate historical data for that day
    SELECT 
        COALESCE(SUM(calories_consumed), 0),
        COALESCE(COUNT(*), 0)
    INTO v_total_calories, v_meals_count
    FROM public.food_analysis_history
    WHERE user_id = v_user_id AND (analyzed_at::DATE) = v_date;
    
    -- Aggregate macros from the linked food_items
    SELECT 
        COALESCE(SUM(fi.protein), 0),
        COALESCE(SUM(fi.carbs), 0),
        COALESCE(SUM(fi.fat), 0)
    INTO v_total_protein, v_total_carbs, v_total_fat
    FROM public.food_analysis_history fah
    JOIN public.food_items fi ON fah.food_item_id = fi.id
    WHERE fah.user_id = v_user_id AND (fah.analyzed_at::DATE) = v_date;

    -- Get calorie goal (fallback to 2000)
    SELECT COALESCE(daily_calorie_goal, 2000) INTO v_calorie_goal
    FROM public.onboarding_responses
    WHERE user_id = v_user_id
    LIMIT 1;

    -- Upsert daily_progress
    INSERT INTO public.daily_progress (
        user_id, 
        progress_date, 
        calories_consumed, 
        calories_goal,
        protein_consumed,
        carbs_consumed,
        fat_consumed,
        meals_logged
    )
    VALUES (
        v_user_id, 
        v_date, 
        v_total_calories, 
        v_calorie_goal,
        v_total_protein,
        v_total_carbs,
        v_total_fat,
        v_meals_count
    )
    ON CONFLICT (user_id, progress_date) 
    DO UPDATE SET
        calories_consumed = EXCLUDED.calories_consumed,
        calories_goal = EXCLUDED.calories_goal,
        protein_consumed = EXCLUDED.protein_consumed,
        carbs_consumed = EXCLUDED.carbs_consumed,
        fat_consumed = EXCLUDED.fat_consumed,
        meals_logged = EXCLUDED.meals_logged,
        updated_at = NOW();

    -- Cleanup if no meals left for that day
    IF (TG_OP = 'DELETE') THEN
        IF v_meals_count = 0 THEN
            DELETE FROM public.daily_progress
            WHERE user_id = v_user_id AND progress_date = v_date;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

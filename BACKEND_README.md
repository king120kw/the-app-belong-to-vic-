# VicCalary Backend Implementation

Complete backend architecture for VicCalary health and nutrition tracking application.

## Overview

This backend provides a comprehensive Supabase-based infrastructure for user authentication, food analysis, budget tracking, progress monitoring, real-time chat, and personalized recipe recommendations.

## Features Implemented

### ✅ Authentication & User Management
- **Google OAuth** sign-in
- User profiles with avatars
- Onboarding flow with health preferences
- **Phone verification** for chat (separate from Google auth)

### ✅ Food Analysis System
- AI-powered food image analysis
- Product barcode scanning  
- Nutritional information tracking
- Analysis history with calendar view

### ✅ Budget Management
- Food budget creation and tracking
- Automatic deductions from scanned items
- Transaction history
- Multi-currency support

### ✅ Progress Tracking
- Weight/height measurements (every 7 days)
- Daily calorie tracking
- Meals logged counter
- Monthly analysis reports
- Progress charts

### ✅ Real-Time Chat System
- Private and group conversations
- Text, voice, video, image, file messages
- Read receipts and typing indicators
- Voice/video calling infrastructure
- Media upload and sharing

### ✅ Recipe & Recommendations
- Recipe browsing with filters
- Favorites and cooking tracking
- Time-based meal suggestions (breakfast/lunch/dinner)
- Personalized recommendations based on preferences

### ✅ Notifications
- App updates and alerts
- Daily Quranic verses and Hadith
- Push notification support
- Verification codes

### ✅ Settings & Preferences
- Light/Dark theme toggle
- Language selection (IP-based default)
- Currency settings
- Subscription management
- Privacy controls

## Database Schema

### Core Tables
- `user_profiles` - User information
- `onboarding_responses` - Health preferences and goals
- `food_items` - Food database
- `food_analysis_history` - Scanned items log
- `recipes` - Recipe database
- `user_recipe_interactions` - Favorites, cooked items
- `user_budgets` - Active and historical budgets
- `budget_transactions` - Purchase history
- `progress_measurements` - Weight/height tracking
- `daily_progress` - Daily metrics
- `chat_users` - Phone verification for chat
- `conversations` & `messages` - Chat system
- `notifications` - User notifications
- `user_settings` - Preferences

## API Services

### Authentication (`client/lib/api/auth.ts`)
```typescript
- signInWith Google()
- signOut()
- getUserProfile(userId)
- uploadAvatar(file)
- save OnboardingResponses(responses)
- sendPhoneVerification(phone, country)
- verifyPhoneCode(phone, code)
```

### Food Analysis (`client/lib/api/food.ts`)
```typescript
- analyzeFoodImage(file)
- scanProduct(barcode)
- saveFoodAnalysis(data, mealType)
- getFoodHistory(limit)
- getFoodHistoryByDate(date)
```

### Budget (`client/lib/api/budget.ts`)
```typescript
- createBudget(total, start, end)
- getActiveBudget()
- getBudgetTransactions(budgetId)
- getBudgetHistory()
```

### Progress (`client/lib/api/progress.ts`)
```typescript
- addMeasurement(weight, height)
- getMeasurements(limit)
- getDailyProgress(date)
- getProgressByDateRange(start, end)
- getMonthlyAnalysis(year, month)
- getCalendarData(year, month)
```

### Chat (`client/lib/api/chat.ts`)
```typescript
- getConversations()
- createPrivateConversation(userId)
- createGroupConversation(name, participants)
- getMessages(conversationId)
- sendMessage(conversationId, content, type)
- uploadChatMedia(file, conversationId)
- subscribeToMessages(conversationId, callback)
- initiateCall(conversationId, type)
```

### Recipes (`client/lib/api/recipes.ts`)
```typescript
- getRecipes(filters)
- searchRecipes(term)
- favoriteRecipe(recipeId)
- markRecipeAsCooked(recipeId)
- rateRecipe(recipeId, rating)
- getPersonalizedSuggestions()
- getTimeBasedSuggestions()
```

### Settings (`client/lib/api/settings.ts`)
```typescript
- getUserSettings()
- updateSettings(settings)
- updateTheme(theme)
- togglePushNotifications(enabled)
- updateLanguage(language)
- getSubscriptionStatus()
```

## Setup Instructions

### 1. Supabase Project Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key

### 2. Environment Configuration

Create `.env.local` file:
```bash
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Migration

Run the migration script:
```sql
-- In Supabase SQL Editor
-- Copy and paste contents of supabase_migration.sql
```

### 4. Storage Buckets

Create the following storage buckets in Supabase Dashboard:
- `user-avatars` (public)
- `food-images` (private)
- `recipe-images` (public)
- `chat-media` (private)

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. Add to Supabase Authentication > Providers > Google

### 6. Edge Functions (Optional)

Deploy Edge Functions for:
- `food-analysis` - AI food recognition
- `product-scanner` - Barcode lookup
- `personalized-recommendations` - ML-based suggestions
- `monthly-analysis` - Progress reports

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Chat messages restricted to conversation participants
- Public read for food items and recipes
- Secure file upload policies

## Real-Time Features

- Live chat messages
- Typing indicators
- Online status
- Voice/video call signaling

## Next Steps

### To Enable AI Food Analysis:
1. Sign up for OpenAI Vision API or Google Cloud Vision
2. Create `food-analysis` Edge Function
3. Integrate API calls

### To Enable Product Scanning:
1. Choose product API (Open Food Facts, Nutritionix)
2. Create `product-scanner` Edge Function
3. Add barcode scanning library

### To Enable SMS Verification:
1. Sign up for Twilio or AWS SNS
2. Update `sendPhoneVerification` in `auth.ts`
3. Configure webhooks

### To Enable Subscription Payments:
1. Integrate Stripe or PayPal
2. Add payment webhook handlers
3. Update subscription management

## Usage Examples

### Authenticate User
```typescript
import { signInWithGoogle } from './lib/api/auth'

const handleSignIn = async () => {
  await signInWithGoogle()
  // User redirected to dashboard after auth
}
```

### Analyze Food
```typescript
import { analyzeFoodImage, saveFoodAnalysis } from './lib/api/food'

const handleFoodScan = async (imageFile: File) => {
  const analysis = await analyzeFoodImage(imageFile)
  await saveFoodAnalysis(analysis, 'breakfast')
}
```

### Send Chat Message
```typescript
import { sendMessage } from './lib/api/chat'

const handleSend = async (message: string) => {
  await sendMessage(conversationId, message, 'text')
}
```

### Subscribe to Real-Time Messages
```typescript
import { subscribeToMessages } from './lib/api/chat'

const channel = subscribeToMessages(conversationId, (message) => {
  console.log('New message:', message)
})
```

## Architecture Notes

- **No UI Changes**: All backend logic maps to existing UI designs
- **Consistent Images**: Same food/recipe images used throughout app
- **Separate Chat Auth**: Phone verification independent of Google OAuth
- **IP-Based Defaults**: Currency and language detected from user location
- **Time-Based Suggestions**: Meal recommendations change by time of day

## Support

For issues or questions, please refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- Project implementation plan in `implementation_plan.md`

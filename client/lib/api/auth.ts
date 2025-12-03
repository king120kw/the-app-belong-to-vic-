// Mock Authentication using localStorage

const STORAGE_KEY = 'vic_app_user';
const PROFILE_KEY = 'vic_app_profile';
const ONBOARDING_KEY = 'vic_app_onboarding';

export const signInWithName = async (name: string) => {
    const user = {
        id: 'mock-user-id-' + Date.now(),
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        user_metadata: {
            full_name: name,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // Create initial profile
    const profile = {
        id: user.id,
        full_name: name,
        avatar_url: user.user_metadata.avatar_url,
        onboarding_completed: false
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    return { user, session: { user } };
};

export const signInWithGoogle = async () => {
    // Mock Google Sign In - just use a default name
    return signInWithName("Vic User");
};

export const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
};

export const getSession = async () => {
    const userStr = localStorage.getItem(STORAGE_KEY);
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return { user };
};

export const getUser = async () => {
    const userStr = localStorage.getItem(STORAGE_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
};

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

export const getUserProfile = async (userId: string) => {
    const profileStr = localStorage.getItem(PROFILE_KEY);
    if (!profileStr) return null;
    return JSON.parse(profileStr);
};

export const updateUserProfile = async (userId: string, updates: any) => {
    const profileStr = localStorage.getItem(PROFILE_KEY);
    let profile = profileStr ? JSON.parse(profileStr) : {};
    
    profile = { ...profile, ...updates };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    
    return profile;
};

export const uploadAvatar = async (userId: string, file: File) => {
    // Mock upload - just return a fake URL or object URL
    const objectUrl = URL.createObjectURL(file);
    await updateUserProfile(userId, { avatar_url: objectUrl });
    return objectUrl;
};

// ============================================================================
// ONBOARDING
// ============================================================================

export const saveOnboardingResponses = async (userId: string, responses: any) => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
        user_id: userId,
        ...responses
    }));

    // Mark onboarding as complete
    await updateUserProfile(userId, { onboarding_completed: true });

    return responses;
};

export const getOnboardingResponses = async (userId: string) => {
    const data = localStorage.getItem(ONBOARDING_KEY);
    return data ? JSON.parse(data) : null;
};

// ============================================================================
// PHONE VERIFICATION FOR CHAT
// ============================================================================

export const sendPhoneVerification = async (phoneNumber: string, countryCode: string) => {
    console.log(`Mock sending verification to ${countryCode}${phoneNumber}`);
    return { success: true };
};

export const verifyPhoneCode = async (phoneNumber: string, code: string) => {
    if (code === '123456') {
        return { success: true };
    }
    throw new Error('Invalid verification code');
};

export const isChatVerified = async () => {
    return true; // Mock as always verified for now
};

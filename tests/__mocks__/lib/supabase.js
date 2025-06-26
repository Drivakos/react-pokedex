// Mock Supabase client for testing
export const supabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    setSession: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithOtp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    onAuthStateChange: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    data: null,
    error: null
  }))
};

// Mock profile type
export const Profile = {}; 
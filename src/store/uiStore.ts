import { create } from 'zustand';

interface UIState {
  showShareModal: boolean;
  showFriendsModal: boolean;
  showMobileMenu: boolean;
  
  // Actions
  setShowShareModal: (show: boolean) => void;
  setShowFriendsModal: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  
  // Helpers
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showShareModal: false,
  showFriendsModal: false,
  showMobileMenu: false,

  setShowShareModal: (show) => set({ showShareModal: show }),
  setShowFriendsModal: (show) => set({ showFriendsModal: show }),
  setShowMobileMenu: (show) => set({ showMobileMenu: show }),

  closeAllModals: () => set({
    showShareModal: false,
    showFriendsModal: false,
    showMobileMenu: false
  })
}));

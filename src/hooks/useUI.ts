import { useState, useRef, useCallback } from 'react';

export const useUI = () => {
  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);
  
  // Observer for infinite scrolling
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPokemonElementRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return null;
    
    // Setup IntersectionObserver for infinite scrolling
    const setupObserver = (onIntersect: () => void) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          onIntersect();
        }
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      });
      
      observerRef.current.observe(node);
    };
    
    return setupObserver;
  }, []);

  return {
    // Filter panel
    showFilters,
    setShowFilters,
    
    // Infinite scrolling
    lastPokemonElementRef,
  };
};

export default useUI;

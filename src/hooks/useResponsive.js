import { useState, useEffect } from 'react';

/**
 * RESPONSIVE HOOK - Fixes: Issue #7 (Mobile admin broken), Issue #28 (Mobile incomplete)
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />;
 */
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    width: windowSize.width,
  };
};

/**
 * RESPONSIVE STYLES - Copy-paste for mobile layouts
 */
export const responsiveStyles = {
  // Admin sections
  adminContainer: {
    desktop: { display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20 },
    mobile: { display: 'flex', flexDirection: 'column' },
  },
  kanbanRow: {
    desktop: { display: 'flex', gap: 16, overflowX: 'auto' },
    mobile: { display: 'flex', flexDirection: 'column', gap: 12 },
  },
  // Modals
  modalContent: {
    desktop: { maxWidth: 600 },
    mobile: { width: '100%', maxHeight: '90vh', overflowY: 'auto' },
  },
};

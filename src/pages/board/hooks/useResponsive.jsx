
import { useState, useEffect } from 'react';

const useResponsive = () => {
  const [isPC, setIsPC] = useState(() => {
    // SSR 환경 체크 (window가 undefined인 경우)
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });
  
  useEffect(() => {
    const checkDevice = () => {
      setIsPC(window.innerWidth >= 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isPC;
};

export default useResponsive;
import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Variable a nivel de módulo para capturar el evento antes de que cualquier componente se monte
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa:promptready'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem('pwa_installed', 'true');
    } catch {}
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  });
}

const checkIsStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsStandalone());
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return checkIsStandalone() || localStorage.getItem('pwa_installed') === 'true';
  });

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches));

  useEffect(() => {
    const onPromptReady = () => {
      setDeferredPrompt(globalDeferredPrompt);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('pwa:promptready', onPromptReady);
    window.addEventListener('pwa:installed', onInstalled);
    window.addEventListener('appinstalled', onInstalled);

    const mql = window.matchMedia('(display-mode: standalone)');
    const onMqlChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    mql.addEventListener?.('change', onMqlChange);

    return () => {
      window.removeEventListener('pwa:promptready', onPromptReady);
      window.removeEventListener('pwa:installed', onInstalled);
      window.removeEventListener('appinstalled', onInstalled);
      mql.removeEventListener?.('change', onMqlChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_instructions'> => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          setIsInstalled(true);
          try {
            localStorage.setItem('pwa_installed', 'true');
          } catch {}
        }
        return outcome;
      } catch (err) {
        console.warn('Error al invocar prompt de instalación:', err);
        return 'manual_instructions';
      }
    }
    return 'manual_instructions';
  }, [deferredPrompt]);

  // Solo se solicita instalar si es un dispositivo móvil (celular/tablet), no en PC/escritorio
  const debeInstalar = isMobile && !isStandalone && !isInstalled;

  return {
    isInstallable: isMobile && (!!deferredPrompt || isIOS || debeInstalar),
    isInstalled: isStandalone || isInstalled,
    isStandalone,
    debeInstalar,
    isIOS,
    isMobile,
    promptInstall,
    deferredPrompt,
  };
}

"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running in PWA mode on iOS
    if ((window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
      // Show the prompt after a slight delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = () => {
    if (!promptInstall) {
      // For iOS devices, show instructions
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        alert(
          "Om deze app te installeren:\n" +
          "1. Tik op het 'Delen' icoon onderaan\n" +
          "2. Kies 'Zet op beginscherm'\n" +
          "3. Tik op 'Voeg toe'"
        );
        return;
      }
      return;
    }

    promptInstall.prompt();

    promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setSupportsPWA(false);
        setShowPrompt(false);
      }
      setPromptInstall(null);
    });
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Check if user already dismissed the prompt
  useEffect(() => {
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
      setShowPrompt(false);
    }
  }, []);

  // Don't show if already installed or dismissed
  if (isInstalled || !supportsPWA || !showPrompt) {
    return null;
  }

  // Mobile-first install prompt banner
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-lg md:border">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Installeer Kookboek App
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Voeg toe aan je beginscherm voor snelle toegang en offline gebruik
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-500"
          aria-label="Sluiten"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Installeer
        </Button>
        <Button
          onClick={handleDismiss}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Niet nu
        </Button>
      </div>
    </div>
  );
}

// Also export a hook for manual installation trigger
export function useInstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = () => {
    if (!promptInstall) {
      // For iOS devices
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        return {
          success: false,
          message: "Op iOS: Tik op 'Delen' > 'Zet op beginscherm'"
        };
      }
      return { success: false, message: "Installatie niet beschikbaar" };
    }

    promptInstall.prompt();
    return promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setSupportsPWA(false);
        return { success: true };
      }
      return { success: false, message: "Installatie geannuleerd" };
    });
  };

  return { supportsPWA, install };
}
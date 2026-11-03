import { useEffect, useState } from 'react';
import { sound } from '../utils/audio';
import { getUserSettingsFromFirestore, saveUserSettingsToFirestore } from '../lib/firebase';

/** Chế độ sáng/tối và bật/tắt âm thanh, lưu trên máy và đồng bộ lên tài khoản */
export const useThemeAndSound = (email?: string) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mcq_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sound.isEnabled());

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mcq_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mcq_theme', 'light');
    }
  }, [isDarkMode]);

  // Load user settings from Firestore when user logs in
  useEffect(() => {
    if (email) {
      getUserSettingsFromFirestore(email).then((settings) => {
        if (settings) {
          if (typeof settings.isDarkMode === 'boolean') {
            setIsDarkMode(settings.isDarkMode);
          }
          if (typeof settings.soundEnabled === 'boolean') {
            sound.setEnabled(settings.soundEnabled);
            setSoundEnabled(settings.soundEnabled);
          }
        }
      });
    }
  }, [email]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (email) {
        saveUserSettingsToFirestore(email, { isDarkMode: next, soundEnabled });
      }
      return next;
    });
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
    if (next) sound.playCorrect();
    if (email) {
      saveUserSettingsToFirestore(email, { isDarkMode, soundEnabled: next });
    }
  };

  return { isDarkMode, soundEnabled, handleToggleDarkMode, handleToggleSound };
};

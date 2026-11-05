import { subscribeStorageKeys } from '../utils/storageEvents';
import { useEffect, useState } from 'react';
import { sound } from '../utils/audio';
import { auth,onAuthStateChanged,subscribeUserSettings, saveUserSettingsToFirestore } from '../lib/firebase';

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
    // Thanh trạng thái / thanh địa chỉ trên điện thoại cùng màu với thanh trên của app
    // (trước là tím #4f46e5 cố định nên lệch màu, nhất là ở chế độ tối)
    const color = isDarkMode ? '#020617' : '#ffffff';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  }, [isDarkMode]);

  useEffect(()=>subscribeStorageKeys(key=>key==='mcq_theme'||key==='mcq_sound_enabled',()=>{
    setIsDarkMode(localStorage.getItem('mcq_theme')==='dark');setSoundEnabled(sound.isEnabled());
  }),[]);

  // Restore/subscribe only after Firebase has validated this account.
  useEffect(()=>{let stop=()=>{};const off=onAuthStateChanged(auth,user=>{stop();if(!email||!user?.emailVerified||user.email?.toLowerCase()!==email.toLowerCase())return;stop=subscribeUserSettings(email,settings=>{if(typeof settings.isDarkMode==='boolean')setIsDarkMode(settings.isDarkMode);if(typeof settings.soundEnabled==='boolean'){sound.setEnabled(settings.soundEnabled);setSoundEnabled(settings.soundEnabled);}});});return()=>{off();stop();};},[email]);

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

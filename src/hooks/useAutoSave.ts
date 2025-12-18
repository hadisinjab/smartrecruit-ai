import { useState, useEffect, useCallback } from 'react';

export function useAutoSave<T>(key: string, initialData: T, delay = 1000) {
  const [data, setData] = useState<T>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(key);
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error parsing auto-saved data:', error);
      }
    }
    setIsLoaded(true);
  }, [key]);

  // Save to localStorage when data changes (debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const handler = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(data));
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [data, key, delay, isLoaded]);

  const clearSavedData = useCallback(() => {
    localStorage.removeItem(key);
    setData(initialData);
  }, [key, initialData]);

  return [data, setData, clearSavedData] as const;
}

import { EstimationResult } from "../types";
import { AnalysisConfig } from "./geminiService";

export interface HistoryItem {
  id: string;
  timestamp: number;
  result: EstimationResult;
  config: AnalysisConfig;
  thumbnail: string; // Small base64 for list view
  previewImage: string; // Compressed base64 for result view
}

const STORAGE_KEY = 'lathe_estimator_history';
const MAX_ITEMS = 10;

// Helper to compress image for storage
// This is critical to prevent exceeding the 5-10MB localStorage limit
const compressImage = (base64Str: string, maxWidth: number, quality: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    // Check if it already has the prefix, add if missing
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill white background for transparent images (e.g. PNGs)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Export as JPEG to save space
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(''); // Fail safe
      }
    };
    img.onerror = () => {
        console.warn("Failed to compress image for history");
        resolve(''); // Fail safe
    };
  });
};

export const saveHistoryItem = async (
  result: EstimationResult,
  config: AnalysisConfig,
  originalImageBase64: string
) => {
  try {
    // 1. Generate Thumbnail (Very small ~100px)
    const thumbnail = await compressImage(originalImageBase64, 150, 0.6);
    
    // 2. Generate Preview (Medium quality ~600px for viewing in result)
    // We avoid storing full 4k images in localstorage to prevent quota exceeded errors
    const previewImage = await compressImage(originalImageBase64, 800, 0.7);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      result,
      config,
      thumbnail,
      previewImage
    };

    const existing = getHistory();
    // Add new item to beginning
    // Remove duplicates based on ID (though ID is unique timestamp) or maybe partName+timestamp? 
    // For now, just prepend.
    const updated = [newItem, ...existing].slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save history (likely quota exceeded):", e);
    // Optional: could try to save without images if quota exceeded
  }
};

export const getHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn("Failed to load history:", e);
    return [];
  }
};

export const deleteHistoryItem = (id: string) => {
  try {
    const existing = getHistory();
    const updated = existing.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
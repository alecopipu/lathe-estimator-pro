import React, { useState } from 'react';
import { analyzeBlueprint, AnalysisConfig } from './services/geminiService';
import { EstimationResult, AppState } from './types';
import { EmptyState } from './components/EmptyState';
import { ResultsView } from './components/ResultsView';
import { saveHistoryItem, HistoryItem } from './services/storageService';
import * as pdfjsLib from 'pdfjs-dist';

// Use a specific version of the worker from a reliable CDN
// Matching the version specified in the importmap (5.4.449)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@5.4.449/build/pdf.worker.min.js`;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileToGenerativePart = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Handle PDF Files
        if (file.type === 'application/pdf') {
          try {
            const arrayBuffer = await file.arrayBuffer();
            // Load the PDF file
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            // Get the first page
            const page = await pdf.getPage(1);
            
            // Set scale for quality (2.0 is good for clear text reading by AI)
            const viewport = page.getViewport({ scale: 2.0 });
            
            // Prepare canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error("Could not create canvas context");
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render PDF page into canvas context
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Convert canvas to image base64 (JPEG is efficient)
            const base64String = canvas.toDataURL('image/jpeg', 0.85);
            // Remove the "data:image/jpeg;base64," prefix
            const base64Data = base64String.split(',')[1];
            
            // Resolve as an IMAGE (so preview works)
            resolve({ base64: base64Data, mimeType: 'image/jpeg' });
            return;
          } catch (pdfError) {
            console.error("PDF Processing Error:", pdfError);
            reject(new Error("PDF 轉換失敗，請確認檔案未損壞或嘗試轉存為圖片。"));
            return;
          }
        }

        // Handle Image Files (Standard)
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve({ base64: base64Data, mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);

      } catch (error) {
        reject(error);
      }
    });
  };

  const handleAnalyze = async (file: File, config: AnalysisConfig) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      // fileToGenerativePart now handles PDF->Image conversion
      const { base64, mimeType } = await fileToGenerativePart(file);
      
      const fullDataUrl = `data:${mimeType};base64,${base64}`;
      setPreviewImage(fullDataUrl); // This will now always be an image, even if source was PDF

      // Send the Image (converted from PDF if necessary) to AI
      const data = await analyzeBlueprint(base64, mimeType, config);

      setResult(data);
      setAppState(AppState.SUCCESS);

      // Auto-save to local history
      await saveHistoryItem(data, config, fullDataUrl);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setAppState(AppState.ERROR);

      let message = "分析圖片失敗。請確認圖片清晰度並重試。";

      const errorStr = err?.toString() || '';
      const errorMsgDetail = err?.message || '';
      const errorDetails = JSON.stringify(err);

      if (
        errorMsgDetail.includes("API key") ||
        errorStr.includes("API key") ||
        errorDetails.includes("API_KEY") ||
        errorMsgDetail.includes("400") ||
        errorMsgDetail.includes("403")
      ) {
        message = "⚠️ API Key 設定無效。請檢查 Vercel 環境變數，或直接在網頁下方輸入 API Key。";
      } else if (errorMsgDetail.includes("503") || errorMsgDetail.includes("Overloaded")) {
        message = "服務暫時繁忙 (Model Overloaded)，請稍後再試。";
      } else if (errorMsgDetail.includes("PDF")) {
        message = "PDF 處理失敗 (請確認檔案是否加密或損壞)。";
      }

      setErrorMsg(message);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setResult(item.result);
    setPreviewImage(item.previewImage);
    setAppState(AppState.SUCCESS);
    setErrorMsg(null);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMsg(null);
    setPreviewImage(null);
  };

  return (
    <div className="flex flex-col h-screen print:block print:h-auto print:bg-white print:overflow-visible">

      {/* Ambient Light Effect (Background) */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-100 rounded-full blur-[120px] opacity-40"></div>
      </div>

      {/* Navigation / Header - Glassmorphism */}
      <nav className="bg-industrial-50/95 backdrop-blur-md shadow-lg border-b border-industrial-200 z-50 sticky top-0 print:hidden transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={resetApp}>
              {/* SOHWA Official Logo Image */}
              <div className="h-10 w-auto flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                <img
                  src="https://raw.githubusercontent.com/alecopipu/lathe-estimator-pro/refs/heads/main/sohwa_logo.png"
                  alt="SOHWA Logo"
                  className="h-full w-auto object-contain"
                />
              </div>

              {/* Text Label */}
              <div className="flex flex-col justify-center border-l border-industrial-300 pl-4 h-8">
                <div className="text-industrial-900 font-bold text-base tracking-widest leading-none">
                  旭華光學
                </div>
                <div className="text-industrial-500 text-[10px] uppercase tracking-wider font-medium leading-none mt-1">
                  AI Estimator
                </div>
              </div>
            </div>

            <div>
              <button className="text-industrial-500 hover:text-industrial-900 text-sm font-medium transition-colors px-3 py-2 rounded-md hover:bg-industrial-100">
                Designed by 阿志
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative print:overflow-visible print:static print:h-auto print:block">
        <div className="absolute inset-0 p-4 sm:p-6 lg:p-8 print:static print:p-0 print:h-auto print:w-auto print:block overflow-y-auto scroll-smooth">
          <div className="min-h-full max-w-7xl mx-auto print:h-auto print:w-full flex flex-col">

            {/* Error Message */}
            {appState === AppState.ERROR && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-md print:hidden animate-slide-up">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 w-full">
                    <h3 className="text-sm font-bold text-red-800">分析發生錯誤</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {errorMsg || "發生未知錯誤，請稍後再試。"}
                    </p>
                    <div className="mt-2 flex gap-3">
                      <button onClick={resetApp} className="text-sm font-medium text-red-600 hover:text-red-800 underline">
                        重新嘗試
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0 print:min-h-0">
              {(appState === AppState.IDLE || appState === AppState.ANALYZING || appState === AppState.ERROR) && (
                <EmptyState
                  onAnalyze={handleAnalyze}
                  isAnalyzing={appState === AppState.ANALYZING}
                  onLoadHistory={handleLoadHistory}
                />
              )}

              {appState === AppState.SUCCESS && result && (
                <ResultsView
                  result={result}
                  onReset={resetApp}
                  imageUrl={previewImage || undefined}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-12 py-8 border-t border-industrial-200/50 text-center print:hidden">
              <div className="flex flex-col items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                <p className="text-industrial-900 text-sm font-bold">
                  &copy; 2025 旭華光學 SOHWA optical.
                </p>
                <p className="text-industrial-500 text-xs tracking-wide">
                  AI generation results for reference only. | System Designed by 阿志
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
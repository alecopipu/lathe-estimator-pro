import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { AnalysisConfig } from '../services/geminiService';
import { HistoryItem, getHistory, deleteHistoryItem } from '../services/storageService';

interface EmptyStateProps {
  onAnalyze: (file: File, config: AnalysisConfig) => void;
  isAnalyzing: boolean;
  onLoadHistory: (item: HistoryItem) => void;
}

const COMMON_MATERIALS = [
  "自動判斷 (依圖面)",
  "S45C 中碳鋼",
  "SUS304 不鏽鋼",
  "SUS316 不鏽鋼",
  "AL6061和5056鋁合金",
  "AL7075 航太鋁",
  "SCM440 鉻鉬合金鋼",
  "SCM415 綠十字",
  "1215 快削鋼",
  "SKD11 模具鋼",
  "C3604 黃銅 (Brass)",
  "POM/ABS 工程塑膠",
  "FC/FCD 鑄鐵",
  "其他 (自訂)"
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onAnalyze, isAnalyzing, onLoadHistory }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Configuration State
  const [materialSelection, setMaterialSelection] = useState(COMMON_MATERIALS[0]);
  const [customMaterial, setCustomMaterial] = useState("");
  const [od, setOd] = useState("");
  const [id, setId] = useState("");
  const [length, setLength] = useState("");
  
  const [sides, setSides] = useState<'1-left' | '1-right' | '1-complete' | '2'>('1-right');
  const [strategy, setStrategy] = useState<'conservative' | 'standard' | 'aggressive'>('standard');
  const [spindleMode, setSpindleMode] = useState<'G96' | 'G97'>('G96');
  const [userRemarks, setUserRemarks] = useState("");
  const [apiKey, setApiKey] = useState(""); // UI Input for API Key
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (inputRef.current && !isAnalyzing) {
      inputRef.current.click();
    }
  };

  const handleConfirmAnalysis = () => {
    if (!selectedFile) return;
    
    const finalMaterial = materialSelection === "其他 (自訂)" 
      ? customMaterial 
      : (materialSelection === "自動判斷 (依圖面)" ? "" : materialSelection);
      
    onAnalyze(selectedFile, {
      material: finalMaterial,
      od,
      id,
      length,
      sides,
      strategy,
      spindleMode,
      userRemarks,
      apiKey // Pass the UI key
    });
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setMaterialSelection(COMMON_MATERIALS[0]);
    setCustomMaterial("");
    setOd("");
    setId("");
    setLength("");
    setSides('1-right');
    setStrategy('standard');
    setSpindleMode('G96');
    setUserRemarks("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteHistoryItem(id);
    setHistory(updated);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '剛剛';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  };

  // State: Analyzing (Show Loading)
  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="flex flex-col items-center max-w-lg mx-auto bg-white/50 backdrop-blur-sm p-12 rounded-2xl shadow-xl border border-white/50">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-safety rounded-full blur-xl opacity-20 animate-pulse-slow"></div>
            <div className="relative h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-inner border border-industrial-100">
               <svg className="animate-spin h-12 w-12 text-safety" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-industrial-900 mb-2">AI 正在計算刀具路徑</h2>
          <div className="h-1 w-16 bg-gradient-to-r from-safety to-orange-600 rounded-full mb-4"></div>
          <p className="text-industrial-500 text-sm leading-relaxed">
            正在分析圖面幾何特徵、識別公差與結構，<br/>並根據您的材質設定與轉速模式優化切削參數...
          </p>
        </div>
      </div>
    );
  }

  // State: File Selected (Configuration)
  if (selectedFile) {
    return (
      <div className="w-full animate-slide-up pb-10">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-industrial-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-industrial-900 px-8 py-5 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-industrial-800 to-industrial-900 z-0"></div>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right z-0"></div>
            
            <div className="relative z-10 flex items-center gap-4">
               <div className="h-10 w-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/10 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
               </div>
               <div>
                  <h3 className="text-white font-bold text-lg tracking-wide">加工參數設定</h3>
                  <p className="text-industrial-400 text-xs">設定材質與尺寸以獲得精確估算</p>
               </div>
            </div>
            <button onClick={handleResetFile} className="relative z-10 text-industrial-400 hover:text-white text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-white/20">
              ✕ 取消
            </button>
          </div>
          
          <div className="p-8 space-y-8 bg-industrial-50/50">
            {/* File Info Card */}
            <div className="flex items-center p-4 bg-white rounded-xl border border-industrial-100 shadow-sm">
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mr-4 flex-shrink-0 border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-industrial-900 truncate">{selectedFile.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs px-2 py-0.5 bg-industrial-100 text-industrial-600 rounded font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                   <span className="text-xs text-green-600 font-medium">● 準備就緒</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column */}
              <div className="space-y-6">
                {/* 1. Material */}
                <div>
                  <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">1</span>
                    選擇工件材質
                  </label>
                  <div className="relative">
                    <select
                      value={materialSelection}
                      onChange={(e) => setMaterialSelection(e.target.value)}
                      className="block w-full rounded-lg border-industrial-300 shadow-sm focus:border-safety focus:ring-safety sm:text-sm p-3 border bg-white appearance-none hover:border-industrial-400 transition-colors cursor-pointer"
                    >
                      {COMMON_MATERIALS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-industrial-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  
                  {materialSelection === "其他 (自訂)" && (
                    <input
                      type="text"
                      placeholder="輸入材質 (例如: S15C)"
                      value={customMaterial}
                      onChange={(e) => setCustomMaterial(e.target.value)}
                      className="mt-3 block w-full rounded-lg border-industrial-300 border p-3 text-sm focus:border-safety focus:ring-safety shadow-sm"
                    />
                  )}
                </div>

                {/* 2. Dimensions */}
                <div>
                  <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">2</span>
                    毛胚尺寸 (Raw Stock)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="group">
                      <label className="block text-xs font-semibold text-industrial-500 mb-1.5 uppercase tracking-wider">外徑 OD</label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          value={od}
                          onChange={(e) => setOd(e.target.value)}
                          className="focus:ring-safety focus:border-safety block w-full text-sm border-industrial-300 rounded-lg border p-2.5 pl-3 group-hover:border-industrial-400 transition-colors"
                          placeholder="mm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                           <span className="text-industrial-400 text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-xs font-semibold text-industrial-500 mb-1.5 uppercase tracking-wider">內徑 ID</label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          value={id}
                          onChange={(e) => setId(e.target.value)}
                          className="focus:ring-safety focus:border-safety block w-full text-sm border-industrial-300 rounded-lg border p-2.5 pl-3 group-hover:border-industrial-400 transition-colors"
                          placeholder="0"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                           <span className="text-industrial-400 text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                     <div className="group">
                      <label className="block text-xs font-semibold text-industrial-500 mb-1.5 uppercase tracking-wider">長度 L</label>
                      <div className="relative rounded-lg shadow-sm">
                        <input
                          type="number"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          className="focus:ring-safety focus:border-safety block w-full text-sm border-industrial-300 rounded-lg border p-2.5 pl-3 group-hover:border-industrial-400 transition-colors"
                          placeholder="mm"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                           <span className="text-industrial-400 text-xs">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. User Remarks (New Feature) */}
                <div>
                   <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">6</span>
                    額外備註 / 特別指示
                  </label>
                  <textarea
                    value={userRemarks}
                    onChange={(e) => setUserRemarks(e.target.value)}
                    placeholder="例如：中心孔已經預鑽、溝槽不需要倒角、公差要求嚴格..."
                    className="block w-full rounded-lg border-industrial-300 shadow-sm focus:border-safety focus:ring-safety sm:text-sm p-3 border bg-white hover:border-industrial-400 transition-colors h-24 resize-none"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* 3. Sides */}
                <div>
                   <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">3</span>
                    加工方向
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: '1-right', label: '右側加工', desc: '標準 (夾左車右)', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9' },
                      { id: '1-left', label: '左側加工', desc: '反向 (夾右車左)', icon: 'M7 16l-4-4m0 0l4-4m-4 4h18' },
                      { id: '1-complete', label: '一次完成', desc: '全序 (無掉頭)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { id: '2', label: '雙面加工', desc: 'OP10 + OP20', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' }
                    ].map((opt) => (
                      <div 
                        key={opt.id}
                        onClick={() => setSides(opt.id as any)}
                        className={`
                          relative cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 flex items-start gap-3
                          ${sides === opt.id 
                            ? 'border-safety bg-orange-50/50 shadow-md ring-1 ring-safety/20 transform scale-[1.02]' 
                            : 'border-industrial-200 bg-white hover:border-industrial-300 hover:shadow-sm'
                          }
                        `}
                      >
                         <div className={`mt-0.5 p-1.5 rounded-full ${sides === opt.id ? 'bg-safety text-white' : 'bg-industrial-100 text-industrial-400'}`}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                         </div>
                         <div>
                           <div className={`text-sm font-bold ${sides === opt.id ? 'text-industrial-900' : 'text-industrial-600'}`}>{opt.label}</div>
                           <div className="text-xs text-industrial-500 mt-0.5">{opt.desc}</div>
                         </div>
                         {sides === opt.id && (
                           <div className="absolute top-2 right-2 text-safety">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Strategy */}
                <div>
                   <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">4</span>
                    加工策略
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'conservative', label: '保守 (Conservative)', desc: '低轉速、重視穩定性', color: 'border-blue-200 bg-blue-50/30' },
                      { id: 'standard', label: '標準 (Standard)', desc: '原廠建議參數，平衡壽命', color: 'border-industrial-200 bg-white' },
                      { id: 'aggressive', label: '高效率 (Aggressive)', desc: '最高速切削，縮短時間', color: 'border-red-200 bg-red-50/30' }
                    ].map((opt) => (
                      <div
                         key={opt.id}
                         onClick={() => setStrategy(opt.id as any)}
                         className={`
                           flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all
                           ${strategy === opt.id 
                             ? 'border-safety bg-orange-50 shadow-sm ring-1 ring-safety/20' 
                             : 'border-industrial-200 bg-white hover:bg-industrial-50 hover:border-industrial-300'
                           }
                         `}
                      >
                         <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${strategy === opt.id ? 'border-safety' : 'border-industrial-300'}`}>
                               {strategy === opt.id && <div className="w-2 h-2 rounded-full bg-safety" />}
                            </div>
                            <div>
                               <div className="text-sm font-semibold text-industrial-800">{opt.label}</div>
                               <div className="text-xs text-industrial-500">{opt.desc}</div>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Spindle Mode */}
                <div>
                   <label className="flex items-center text-sm font-bold text-industrial-800 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-industrial-900 text-white text-xs mr-2">5</span>
                    主軸轉速模式
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'G96', label: 'G96 (周速一定)', desc: '轉速隨直徑變化，時間較短' },
                      { id: 'G97', label: 'G97 (固定轉速)', desc: '轉速固定，時間較長' }
                    ].map((opt) => (
                      <div
                         key={opt.id}
                         onClick={() => setSpindleMode(opt.id as any)}
                         className={`
                           relative cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 text-center
                           ${spindleMode === opt.id 
                             ? 'border-safety bg-orange-50/50 shadow-md ring-1 ring-safety/20' 
                             : 'border-industrial-200 bg-white hover:border-industrial-300'
                           }
                         `}
                      >
                         <div className="text-sm font-bold text-industrial-900">{opt.label}</div>
                         <div className="text-[10px] text-industrial-500 mt-1">{opt.desc}</div>
                         {spindleMode === opt.id && (
                           <div className="absolute top-2 right-2 text-safety">
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Optional API Key Input */}
            <div className="pt-2 border-t border-industrial-100">
              <label className="block text-xs font-semibold text-industrial-400 mb-1">
                 Google Gemini API Key (若系統未設定/Vercel變數無效時請輸入，選填)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full rounded border-industrial-200 bg-white p-2 text-xs focus:border-safety focus:ring-safety"
              />
            </div>

            <div className="pt-4 border-t border-industrial-200">
              <Button 
                onClick={handleConfirmAnalysis} 
                variant="secondary"
                className="w-full justify-center text-lg py-4 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
                disabled={
                  (materialSelection === "其他 (自訂)" && !customMaterial.trim()) ||
                  !od || !length
                }
              >
                {!od || !length ? "請填寫完整毛胚尺寸" : "開始 AI 分析與估價 →"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State: Empty (Dropzone & History)
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative z-10 overflow-y-auto">
      {/* Decorative Title */}
      <div className="mb-10 animate-slide-up flex flex-col items-center mt-12">
         <h1 className="text-4xl md:text-5xl font-bold text-industrial-900 tracking-tight mb-2">
           旭華光學 AI 車床估價系統
         </h1>
         <div className="flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-industrial-300"></span>
            <span className="text-xs font-mono text-industrial-500 uppercase tracking-widest">System Designed by 阿志</span>
            <span className="h-px w-8 bg-industrial-300"></span>
         </div>
         <p className="text-industrial-500 text-lg max-w-2xl mx-auto font-light">
           上傳工程圖紙，AI 將自動識別幾何特徵、規劃工序並計算精確的加工週期時間。
         </p>
      </div>

      {/* Main Card */}
      <div 
        className={`w-full max-w-2xl p-12 rounded-3xl border-2 border-dashed transition-all duration-300 bg-white/80 backdrop-blur-md shadow-2xl cursor-pointer group mb-16
          ${dragActive 
            ? 'border-safety bg-orange-50/90 scale-[1.02] shadow-orange-500/20' 
            : 'border-industrial-200 hover:border-safety/50 hover:shadow-2xl hover:bg-white'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ${dragActive ? 'bg-white text-safety scale-110' : 'bg-industrial-50 text-industrial-400 group-hover:bg-orange-50 group-hover:text-safety group-hover:scale-110'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-industrial-800 mb-2">點擊或拖放圖紙至此</h3>
            <p className="text-industrial-500 text-sm">支援格式: PNG, JPG, WEBP, PDF (最大 10MB)</p>
          </div>

          <div className="pt-2">
            <input
              ref={inputRef}
              id="file-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleChange}
            />
            <Button 
              variant="secondary" 
              className="px-8 py-3 rounded-full text-base font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onButtonClick();
              }}
            >
              選擇檔案
            </Button>
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="w-full max-w-5xl animate-slide-up mb-12">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-xl font-bold text-industrial-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-industrial-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              最近估價紀錄
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onLoadHistory(item)}
                className="bg-white/80 backdrop-blur rounded-xl border border-industrial-200 p-3 hover:shadow-lg hover:border-safety/50 hover:bg-white transition-all cursor-pointer group relative overflow-hidden text-left"
              >
                <div className="aspect-square bg-industrial-50 rounded-lg mb-3 overflow-hidden border border-industrial-100 relative">
                   {item.thumbnail ? (
                     <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="thumbnail" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-industrial-300">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                <div className="space-y-1">
                  <div className="font-bold text-sm text-industrial-900 truncate" title={item.result.partName || '未命名零件'}>
                    {item.result.partName || '未命名零件'}
                  </div>
                  <div className="flex justify-between items-center text-xs text-industrial-500">
                     <span className="truncate max-w-[60px]" title={item.result.material}>{item.result.material}</span>
                     <span className="font-mono text-safety font-bold">{Math.round(item.result.totalTimeSeconds)}s</span>
                  </div>
                  <div className="text-[10px] text-industrial-400 text-right pt-1 border-t border-industrial-100 mt-2">
                    {formatTimeAgo(item.timestamp)}
                  </div>
                </div>

                <button 
                  onClick={(e) => handleDeleteHistory(e, item.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-industrial-400 hover:text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                  title="刪除紀錄"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl text-left w-full opacity-80 hover:opacity-100 transition-opacity">
        <div className="p-6 bg-white/40 backdrop-blur rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-blue-50/50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="font-bold text-industrial-900 text-lg">智能工序拆解</h4>
          <p className="text-sm text-industrial-500 mt-2 leading-relaxed">AI 自動識別車削、鑽孔、攻牙等特徵，生成最佳化加工順序。</p>
        </div>
        <div className="p-6 bg-white/40 backdrop-blur rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-amber-50/50 rounded-lg flex items-center justify-center text-amber-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-bold text-industrial-900 text-lg">精確時間預估</h4>
          <p className="text-sm text-industrial-500 mt-2 leading-relaxed">內建工程材料資料庫，依據 S45C, SUS304 等材質特性計算 S/F 值。</p>
        </div>
        <div className="p-6 bg-white/40 backdrop-blur rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-shadow">
          <div className="h-10 w-10 bg-emerald-50/50 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="font-bold text-industrial-900 text-lg">專業報表輸出</h4>
          <p className="text-sm text-industrial-500 mt-2 leading-relaxed">一鍵生成包含詳細參數與工時的估價單，支援直接列印功能。</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { EstimationResult } from '../types';
import { OperationChart } from './OperationChart';
import { Button } from './Button';
import { Part3DPreview } from './Part3DPreview';
import { CostAnalysisCard } from './CostAnalysisCard';

interface ResultsViewProps {
  result: EstimationResult;
  onReset: () => void;
  imageUrl?: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset, imageUrl }) => {
  const [showPrintHint, setShowPrintHint] = useState(false);
  // Use local state to allow editing
  const [localResult, setLocalResult] = useState<EstimationResult>(result);

  // Sync local state if prop changes (e.g. re-analysis)
  useEffect(() => {
    setLocalResult(result);
  }, [result]);

  const handlePartNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalResult({ ...localResult, partName: e.target.value });
  };

  const handleParamChange = (index: number, field: 'rpm' | 'feedRate', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const newOperations = [...localResult.operations];
    
    // Create a copy of the operation to update
    const currentOp = { ...newOperations[index] };
    
    // Update the changed field
    currentOp[field] = isNaN(numValue) ? undefined : numValue;
    
    // Recalculate estimated time based on the change
    // Formula: Time = Constant / (RPM * Feed)
    // We derive the Constant from the ORIGINAL result to prevent drift from repeated edits
    const originalOp = result.operations[index];

    if (originalOp.estimatedTimeSeconds && originalOp.rpm && originalOp.feedRate) {
      // Calculate work factor (Geometry Constant) from original AI estimation
      const workFactor = originalOp.estimatedTimeSeconds * originalOp.rpm * originalOp.feedRate;
      
      // Get effective new parameters
      // If the field is RPM, use the new value, otherwise use the current local value (or original if local is missing)
      const newRpm = currentOp.rpm || 0;
      const newFeed = currentOp.feedRate || 0;

      if (newRpm > 0 && newFeed > 0) {
         const newTime = workFactor / (newRpm * newFeed);
         currentOp.estimatedTimeSeconds = Math.round(newTime * 10) / 10;
      }
    }
    
    newOperations[index] = currentOp;

    // Recalculate Total Time
    const newTotalTime = newOperations.reduce((acc, op) => acc + (op.estimatedTimeSeconds || 0), 0);

    setLocalResult({ 
      ...localResult, 
      operations: newOperations, 
      totalTimeSeconds: Math.round(newTotalTime * 10) / 10
    });
  };

  const handleOpTextChange = (index: number, field: 'name' | 'description', value: string) => {
    const newOperations = [...localResult.operations];
    newOperations[index] = { ...newOperations[index], [field]: value };
    setLocalResult({ ...localResult, operations: newOperations });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalResult({ ...localResult, notes: e.target.value });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}分 ${remainingSeconds}秒`;
  };

  const getDifficultyLabel = (rating: string) => {
    switch (rating) {
      case 'High': return { text: '困難', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'Medium': return { text: '中等', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'Low': return { text: '簡易', color: 'bg-green-100 text-green-800 border-green-200' };
      default: return { text: rating, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Helper to check if ID indicates a hollow part for display
  const hasInnerDiameter = (idVal?: string) => {
    if (!idVal) return false;
    // Remove "ID" prefix and "mm" suffix to check the number
    const str = String(idVal).replace(/ID/gi, '').replace(/\s*mm$/i, '').trim();
    if (str === '' || str === '0' || str === '0.0') return false;
    const num = parseFloat(str);
    return !isNaN(num) && num > 0;
  };

  // Clean ID string for display (remove 'ID' prefix)
  const formatInnerDiameter = (idVal?: string) => {
    if (!idVal) return '';
    return String(idVal).replace(/ID/gi, '').trim();
  };

  // Calculate L1/L2 split if double sided
  const splitTimes = useMemo(() => {
    let l1 = 0;
    let l2 = 0;
    let isSide2 = false;

    localResult.operations.forEach(op => {
       const n = op.name.toLowerCase();
       
       // Trigger to switch to side 2 based on keywords
       if (n.includes('op20') || n.includes('side 2') || n.includes('第二序') || n.includes('背面')) {
         isSide2 = true;
       }
       
       // Flip is usually the transition. Add Flip time to L1 (as setup) or L2.
       // Here we add to L1 and switch subsequent ops to L2.
       if (n.includes('flip') || n.includes('掉頭') || n.includes('反轉') || n.includes('接料') || n.includes('副主軸')) {
          l1 += op.estimatedTimeSeconds;
          isSide2 = true;
          return;
       }

       if (isSide2) {
         l2 += op.estimatedTimeSeconds;
       } else {
         l1 += op.estimatedTimeSeconds;
       }
    });

    return { l1: Math.round(l1), l2: Math.round(l2) };
  }, [localResult.operations]);

  const difficulty = getDifficultyLabel(localResult.difficultyRating);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn("Auto-print failed, showing hint.");
    }
    setShowPrintHint(true);
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-industrial-200 print:shadow-none print:border-0 print:h-auto print:overflow-visible print:block relative animate-fade-in">
      {/* Print Styles Injection */}
      <style>{`
        @media print {
          @page {
            margin: 0.8cm;
            size: auto;
          }
          html, body, #root {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          /* Fix Table Breaks */
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          
          /* Clean Page Breaks for Cards */
          .print-card {
             break-inside: avoid;
             page-break-inside: avoid;
             height: 100%; /* Ensure equal height in grid */
             overflow: hidden; /* Prevent spillover */
          }

          /* Remove shadows and backgrounds for clean print */
          .shadow-xl, .shadow-2xl, .shadow-lg, .shadow-sm {
             box-shadow: none !important;
          }
          
          /* Improve text inputs for print */
          input, textarea {
             border: none !important;
             background: transparent !important;
             resize: none !important;
             padding: 0 !important;
          }
          input[type="number"] {
            -moz-appearance: textfield;
            font-weight: bold;
            color: #0f172a;
          }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        }
      `}</style>

      {/* Print Instruction Banner */}
      {showPrintHint && (
        <div className="bg-blue-50 text-blue-800 px-4 py-2 text-sm text-center border-b border-blue-200 flex justify-between items-center no-print">
          <span>💡 建議使用 A4 直向列印，並開啟「背景圖形」選項。</span>
          <button onClick={() => setShowPrintHint(false)} className="text-blue-500 hover:text-blue-700">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-industrial-50 px-8 py-6 border-b border-industrial-200 flex justify-between items-start print:bg-white print:px-0 print:py-4 print:border-b-2 print:border-black">
        <div className="flex-1 mr-4">
          <div className="flex items-center gap-3 mb-1">
             <input
                type="text"
                value={localResult.partName}
                onChange={handlePartNameChange}
                placeholder="未命名零件"
                className="text-3xl font-bold text-industrial-900 tracking-tight bg-transparent border-b-2 border-transparent hover:border-industrial-200 focus:border-safety focus:outline-none transition-colors w-full print:text-2xl print:border-none px-1 -ml-1"
             />
             <span className={`flex-shrink-0 text-xs px-2 py-1 rounded border ${difficulty.color} uppercase tracking-wider whitespace-nowrap`}>
               難度: {difficulty.text}
             </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-industrial-600 font-mono">
            <span className="bg-white px-2 py-0.5 rounded border border-industrial-200 print:border-0 print:p-0">
              材質: <span className="font-bold text-industrial-900">{localResult.material}</span>
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-industrial-200 print:border-0 print:p-0">
              尺寸: <span className="font-bold text-industrial-900">
                Ø{localResult.stockDiameter}
                {hasInnerDiameter(localResult.stockInnerDiameter) && (
                  <span className="text-industrial-600 mx-1">x {formatInnerDiameter(localResult.stockInnerDiameter)}</span>
                )}
                {' '}x {localResult.stockLength}L
              </span>
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
           <div className="flex items-center gap-4">
              
              {/* Company Logo */}
              <div className="hidden sm:block text-center mr-2 opacity-80 print:opacity-100 select-none whitespace-nowrap flex-shrink-0">
                 <div className="text-2xl font-black text-industrial-900 tracking-[0.2em] leading-none">旭華光學</div>
                 <div className="text-[10px] font-bold text-industrial-500 tracking-[0.3em] uppercase mt-1">SOHWA OPTICAL</div>
              </div>

              {/* Watermark relocated here */}
              <div className="hidden sm:block transform -rotate-12 border-4 border-red-600/20 text-red-600/20 px-4 py-1 rounded-lg font-black text-3xl tracking-widest uppercase select-none print:block print:border-red-600/30 print:text-red-600/30">
                 估價用
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-industrial-400 uppercase tracking-widest mb-1">總加工週期 CYCLE TIME</div>
                <div className="text-4xl font-bold text-industrial-900 tabular-nums tracking-tight leading-none print:text-3xl">
                  {formatTime(localResult.totalTimeSeconds)}
                </div>
                {splitTimes.l2 > 0 && (
                   <div className="text-xs text-industrial-500 mt-1 font-mono tracking-tight bg-industrial-100 px-2 py-0.5 rounded text-center">
                     L1: <span className="font-bold text-industrial-700">{formatTime(splitTimes.l1)}</span>
                     <span className="mx-1 text-industrial-400">|</span>
                     L2: <span className="font-bold text-industrial-700">{formatTime(splitTimes.l2)}</span>
                   </div>
                )}
              </div>
           </div>

           <div className="flex gap-2 no-print">
              <Button onClick={onReset} variant="outline" className="text-xs py-1.5 h-8">
                重新分析
              </Button>
              <Button onClick={handlePrint} variant="primary" className="text-xs py-1.5 h-8 bg-industrial-800">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                列印報表
              </Button>
           </div>
           
           {/* Print Only Header Info */}
           <div className="hidden print:block text-xs text-industrial-400">
              SOHWA Optical AI Estimator
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        {/* 
          Main Layout Structure 
          - Screen: Grid 12 columns (Left 4, Right 8)
          - Print: Block (Top section grid, Bottom section full width)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
          
          {/* 
            LEFT COLUMN (Screen) -> TOP GRID (Print)
            Print Layout: 
            - Fills Page 1
            - 2 Columns Grid, 2 Rows
            Row 1: Preview (Col 1) | Cost (Col 2)
            Row 2: Chart (Col 1)   | Notes (Col 2)
            
            ADJUSTMENT: Height set to calc(100vh - 220px) to allow header space without overflow.
          */}
          <div className="lg:col-span-4 flex flex-col gap-6 print:grid print:grid-cols-2 print:grid-rows-2 print:gap-2 print:w-full print:h-[calc(100vh-220px)] print:mb-0 print:[page-break-after:always]">
            
            {/* 1. 2D Preview */}
            <div className="print-card print:col-span-1 print:h-full">
               <Part3DPreview 
                diameter={localResult.stockDiameter} 
                length={localResult.stockLength} 
                id={localResult.stockInnerDiameter || '0'} 
                imageUrl={imageUrl}
              />
            </div>

            {/* 2. Cost Analysis Card (New Feature) */}
            <div className="print-card print:col-span-1 print:h-full">
              <CostAnalysisCard 
                material={localResult.material}
                odStr={localResult.stockDiameter}
                idStr={localResult.stockInnerDiameter}
                lengthStr={localResult.stockLength}
                totalTimeSeconds={localResult.totalTimeSeconds}
              />
            </div>

            {/* 3. Chart Card */}
            <div className="bg-white rounded-xl border border-industrial-200 p-5 shadow-sm flex flex-col items-center justify-center print-card print:border print:p-2 print:col-span-1 print:h-full">
               <h3 className="font-bold text-industrial-900 mb-2 w-full text-left text-sm print:mb-1">時間佔比分析</h3>
               <div className="w-full h-64 print:h-full print:max-h-none flex-1">
                 <OperationChart operations={localResult.operations} />
               </div>
               <div className="mt-4 flex flex-wrap gap-2 justify-center print:mt-1">
                 {localResult.operations.slice(0, 4).map((op, i) => (
                   <div key={i} className="flex items-center gap-1.5 text-[10px] text-industrial-500">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: ['#323f4b', '#f59e0b', '#7b8794', '#52606d'][i] }}></span>
                      <span className="truncate max-w-[60px]">{op.name}</span>
                   </div>
                 ))}
               </div>
            </div>

            {/* 4. Notes Card (Editable) */}
            {localResult.notes !== undefined && (
              <div className="bg-white rounded-xl border border-industrial-200 p-5 shadow-sm print-card print:col-span-1 print:h-full flex flex-col print:p-3">
                 <h3 className="font-bold text-industrial-900 mb-3 flex items-center gap-2 print:mb-2">
                   <svg className="w-5 h-5 text-industrial-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   工程註記
                 </h3>
                 <textarea
                   value={localResult.notes}
                   onChange={handleNotesChange}
                   className="w-full text-sm text-industrial-600 leading-relaxed bg-transparent border-b border-transparent hover:border-industrial-200 focus:border-safety focus:ring-0 transition-colors resize-y min-h-[120px] focus:outline-none p-1 -ml-1 rounded flex-1 print:resize-none print:min-h-0"
                   placeholder="在此輸入工程註記..."
                 />
              </div>
            )}
          </div>

          {/* 
            RIGHT COLUMN (Screen) -> PAGE 2 (Print)
          */}
          <div className="lg:col-span-8 space-y-8 print:w-full print:pl-0 print:[break-before:page] print:mt-4">
             {/* Operation Table */}
             <div className="bg-white rounded-xl border border-industrial-200 shadow-sm overflow-hidden print:overflow-visible print:border-0 print:shadow-none">
               <div className="bg-industrial-50 px-6 py-4 border-b border-industrial-200 flex justify-between items-center print:bg-white print:px-0 print:py-2">
                 <h3 className="font-bold text-industrial-900 flex items-center gap-2 uppercase tracking-widest text-sm">
                   <span className="text-industrial-400 font-mono">OP LIST</span>
                   工序明細表
                 </h3>
               </div>
               
               <div className="overflow-x-auto print:overflow-visible">
                 <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-industrial-50/50 text-industrial-500 font-medium border-b border-industrial-200 print:bg-white">
                        <th className="px-6 py-3 w-1/4">工序 / 刀具</th>
                        <th className="px-6 py-3">加工說明 & 參數</th>
                        <th className="px-6 py-3 text-right w-24">預估時間</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-100">
                      {localResult.operations.map((op, idx) => (
                        <tr key={idx} className="hover:bg-industrial-50/50 transition-colors group print:hover:bg-transparent">
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-start gap-3">
                              <span className="font-mono text-industrial-300 text-xs mt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                              <div className="w-full">
                                <input
                                  type="text"
                                  value={op.name}
                                  onChange={(e) => handleOpTextChange(idx, 'name', e.target.value)}
                                  className="font-bold text-industrial-900 w-full bg-transparent border-b border-transparent focus:border-safety focus:outline-none px-1 -ml-1 hover:border-industrial-200 transition-colors"
                                />
                                <div className="mt-1 text-xs text-industrial-500 bg-industrial-100 px-2 py-1 rounded inline-block border border-industrial-200 font-mono print:bg-transparent print:border-industrial-300">
                                  {op.toolType}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="mb-3 w-full">
                              <textarea
                                value={op.description}
                                onChange={(e) => handleOpTextChange(idx, 'description', e.target.value)}
                                className="w-full text-industrial-700 bg-transparent border-b border-transparent focus:border-safety focus:outline-none px-1 -ml-1 hover:border-industrial-200 transition-colors resize-y leading-relaxed min-h-[40px]"
                                rows={2}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-industrial-500">
                               <div className="flex items-center gap-2 group-hover:text-industrial-800 transition-colors">
                                 <span className="font-bold">S</span>
                                 <input 
                                   type="number" 
                                   className="w-16 border-b border-industrial-200 focus:border-safety focus:outline-none bg-transparent hover:border-industrial-400 transition-colors py-0.5 font-bold text-industrial-900"
                                   value={op.rpm || ''}
                                   placeholder="-"
                                   onChange={(e) => handleParamChange(idx, 'rpm', e.target.value)}
                                 />
                               </div>
                               <div className="flex items-center gap-2 group-hover:text-industrial-800 transition-colors">
                                 <span className="font-bold">F</span>
                                 <input 
                                   type="number" 
                                   className="w-16 border-b border-industrial-200 focus:border-safety focus:outline-none bg-transparent hover:border-industrial-400 transition-colors py-0.5 font-bold text-industrial-900"
                                   value={op.feedRate || ''}
                                   placeholder="-"
                                   step="0.01"
                                   onChange={(e) => handleParamChange(idx, 'feedRate', e.target.value)}
                                 />
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top text-right font-mono font-bold text-industrial-900">
                             {op.estimatedTimeSeconds} s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-industrial-50/30 print:bg-white print:border-t-2 print:border-black">
                         <td colSpan={2} className="px-6 py-4 text-right font-bold text-industrial-600">Total Cycle Time</td>
                         <td className="px-6 py-4 text-right font-bold text-xl text-industrial-900">
                            {Math.round(localResult.totalTimeSeconds)} s
                         </td>
                      </tr>
                    </tfoot>
                 </table>
               </div>
             </div>
             
             {/* Disclaimer for print */}
             <div className="hidden print:block text-[10px] text-industrial-400 text-center pt-8">
               Lathe Estimator Pro - AI Generated Estimate. For reference only.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

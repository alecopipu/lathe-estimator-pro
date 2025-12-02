
import React, { useState, useEffect, useMemo } from 'react';

interface CostAnalysisCardProps {
  material: string;
  odStr: string;
  idStr?: string;
  lengthStr: string;
  totalTimeSeconds: number;
}

// Common densities in g/cm3
const DENSITY_MAP: Record<string, number> = {
  "S45C": 7.85,
  "SUS304": 7.93,
  "SUS316": 7.98,
  "AL6061": 2.70,
  "AL7075": 2.81,
  "SCM440": 7.85,
  "SCM415": 7.85,
  "1215": 7.87,
  "SKD11": 7.80,
  "C3604": 8.50, // Brass
  "POM": 1.41,
  "ABS": 1.05,
  "FC": 7.20,
  "FCD": 7.10
};

export const CostAnalysisCard: React.FC<CostAnalysisCardProps> = ({ 
  material, 
  odStr, 
  idStr, 
  lengthStr, 
  totalTimeSeconds 
}) => {
  // --- State ---
  const [hourlyRate, setHourlyRate] = useState<number>(600); // TWD/hr default
  const [materialPriceKg, setMaterialPriceKg] = useState<number>(45); // TWD/kg default
  const [customDensity, setCustomDensity] = useState<number>(7.85);
  const [useCustomDensity, setUseCustomDensity] = useState(false);

  // --- Helpers ---
  const parseDim = (val?: string) => {
    if (!val) return 0;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // --- Effects ---
  // Try to auto-detect density when material changes
  useEffect(() => {
    let detected = 7.85; // Default to steel
    let found = false;
    
    // Safety check: ensure material string exists before manipulation
    const matUpper = (material || "").toUpperCase();
    
    // Check map keys
    for (const key in DENSITY_MAP) {
      if (matUpper.includes(key)) {
        detected = DENSITY_MAP[key];
        found = true;
        break;
      }
    }
    
    // Fallback checks
    if (!found) {
        if (matUpper.includes("鋁") || matUpper.includes("ALUMINUM")) detected = 2.7;
        else if (matUpper.includes("不鏽鋼") || matUpper.includes("STAINLESS")) detected = 7.93;
        else if (matUpper.includes("銅") || matUpper.includes("BRASS")) detected = 8.5;
        else if (matUpper.includes("塑膠") || matUpper.includes("PLASTIC")) detected = 1.2;
    }

    setCustomDensity(detected);
    setUseCustomDensity(false); // Reset to auto mode initially
  }, [material]);

  // --- Calculations ---
  const calculation = useMemo(() => {
    const od = parseDim(odStr);
    const id = parseDim(idStr);
    const len = parseDim(lengthStr);
    const density = customDensity;

    // Volume in mm^3 = Pi * (R_out^2 - R_in^2) * L
    // Radius = Dia / 2
    const rOut = od / 2;
    const rIn = id / 2;
    const volumeMm3 = Math.PI * (Math.pow(rOut, 2) - Math.pow(rIn, 2)) * len;
    
    // Weight in kg
    // Density is g/cm^3
    // 1 cm^3 = 1000 mm^3
    // Weight(g) = (VolumeMm3 / 1000) * Density
    // Weight(kg) = Weight(g) / 1000
    const weightKg = (volumeMm3 / 1000 * density) / 1000;

    // Costs
    // Machining Cost = (Seconds / 3600) * HourlyRate
    const machiningCost = (totalTimeSeconds / 3600) * hourlyRate;
    
    // Material Cost = WeightKg * PricePerKg
    const materialCost = weightKg * materialPriceKg;

    return {
      volume: volumeMm3,
      weight: weightKg,
      machiningCost,
      materialCost,
      totalCost: machiningCost + materialCost
    };
  }, [odStr, idStr, lengthStr, customDensity, totalTimeSeconds, hourlyRate, materialPriceKg]);


  return (
    <div className="bg-white rounded-xl border border-industrial-200 shadow-sm print-card overflow-hidden flex flex-col h-full justify-between">
      <div className="bg-gradient-to-r from-industrial-50 to-white px-5 py-3 border-b border-industrial-100 flex justify-between items-center print:px-4 print:py-1">
        <h3 className="font-bold text-industrial-900 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          成本估算儀表板
        </h3>
        <span className="text-[10px] text-industrial-400 bg-industrial-100 px-2 py-0.5 rounded-full font-mono">ESTIMATOR</span>
      </div>

      <div className="p-5 space-y-5 flex-1 flex flex-col justify-between print:p-2 print:space-y-1">
        
        {/* Input Group - Flexbox for Print Safety */}
        <div className="space-y-4 print:space-y-1">
            <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div className="group">
                    <label className="block text-[10px] font-bold text-industrial-500 uppercase tracking-wider mb-1">機台費率 ($/hr)</label>
                    <div className="flex items-center w-full border-b border-industrial-200 bg-industrial-50/50 focus-within:bg-white focus-within:border-safety transition-colors rounded-t">
                        <span className="pl-2 text-industrial-400 text-xs select-none">$</span>
                        <input 
                            type="number" 
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                            className="w-full text-sm bg-transparent border-none focus:ring-0 outline-none py-1.5 px-1 font-mono font-bold text-industrial-800 print:py-0.5"
                        />
                    </div>
                </div>
                <div className="group">
                    <label className="block text-[10px] font-bold text-industrial-500 uppercase tracking-wider mb-1">材料單價 ($/kg)</label>
                    <div className="flex items-center w-full border-b border-industrial-200 bg-industrial-50/50 focus-within:bg-white focus-within:border-safety transition-colors rounded-t">
                        <span className="pl-2 text-industrial-400 text-xs select-none">$</span>
                        <input 
                            type="number" 
                            value={materialPriceKg}
                            onChange={(e) => setMaterialPriceKg(parseFloat(e.target.value) || 0)}
                            className="w-full text-sm bg-transparent border-none focus:ring-0 outline-none py-1.5 px-1 font-mono font-bold text-industrial-800 print:py-0.5"
                        />
                    </div>
                </div>
            </div>

            {/* Density Tweaker */}
            <div className="flex items-center gap-2 text-xs text-industrial-500 bg-industrial-50 p-2 rounded border border-industrial-100 print:p-1">
                <span className="whitespace-nowrap">密度 (g/cm³):</span>
                <input 
                    type="number" 
                    step="0.01"
                    value={customDensity}
                    onChange={(e) => {
                        setCustomDensity(parseFloat(e.target.value) || 0);
                        setUseCustomDensity(true);
                    }}
                    className={`w-16 bg-white border border-industrial-200 rounded px-1 py-0.5 text-center font-mono focus:border-safety focus:outline-none ${useCustomDensity ? 'text-industrial-900 font-bold' : 'text-industrial-500'}`}
                />
                <span className="ml-auto text-[10px] opacity-60 truncate max-w-[80px]">{material}</span>
            </div>
        </div>

        {/* Result Grid */}
        <div className="bg-industrial-900 rounded-lg p-4 text-white shadow-inner mt-auto print:bg-transparent print:text-industrial-900 print:border print:border-industrial-900 print:p-2">
            <div className="flex justify-between items-end mb-3 border-b border-white/10 pb-3 print:border-industrial-200 print:mb-1 print:pb-1">
                <div className="text-xs text-industrial-400 print:text-industrial-600">預估重量</div>
                <div className="text-xl font-mono font-bold tracking-tight">
                    {calculation.weight < 0.01 && calculation.weight > 0 ? "< 0.01" : calculation.weight.toFixed(3)} 
                    <span className="text-sm text-industrial-500 ml-1 print:text-industrial-600">kg</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mb-3 print:mb-1 print:gap-y-1">
                 <div className="flex justify-between">
                    <span className="text-industrial-400 print:text-industrial-600">加工成本</span>
                    <span className="font-mono text-industrial-200 print:text-industrial-800">${calculation.machiningCost.toFixed(1)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-industrial-400 print:text-industrial-600">材料成本</span>
                    <span className="font-mono text-industrial-200 print:text-industrial-800">${calculation.materialCost.toFixed(1)}</span>
                 </div>
            </div>

            <div className="pt-2 border-t border-dashed border-white/20 flex justify-between items-center print:border-industrial-300">
                <span className="text-xs font-bold text-safety uppercase tracking-widest print:text-industrial-900">Total Price</span>
                <span className="text-2xl font-bold font-mono tracking-tight text-white print:text-industrial-900">
                    <span className="text-base align-top mr-1 opacity-50">$</span>
                    {Math.ceil(calculation.totalCost).toLocaleString()}
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};

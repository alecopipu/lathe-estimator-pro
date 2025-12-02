
import React from 'react';

interface PartPreviewProps {
  diameter: string | number;
  length: string | number;
  id: string | number; // Inner Diameter
  imageUrl?: string;
}

export const Part3DPreview: React.FC<PartPreviewProps> = ({ diameter, length, id, imageUrl }) => {
  
  const formatValue = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '-';
    // Ensure val is a string before manipulation to prevent crashes if API returns numbers
    const strVal = String(val);
    // Remove "ID" prefix and existing "mm" if present
    const clean = strVal.replace(/ID/gi, '').replace(/\s*mm$/i, '').trim();
    return `${clean} mm`;
  };

  const isSolid = () => {
    if (!id) return true;
    const str = String(id).replace(/ID/gi, '').replace(/\s*mm$/i, '').trim();
    if (str === '' || str === '0' || str === '0.0') return true;
    const num = parseFloat(str);
    return isNaN(num) || num === 0;
  };

  return (
    <div className="relative w-full h-full bg-industrial-50 rounded-lg overflow-hidden border border-industrial-200 flex flex-col">
        {/* Header / Label */}
        <div className="absolute top-2 left-2 z-20">
             <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-industrial-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-industrial-800 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-industrial-800 font-mono tracking-wider">2D VIEW</span>
             </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 relative flex items-center justify-center p-4 print:p-0 overflow-hidden">
            {/* Engineering Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', 
                     backgroundSize: '20px 20px' 
                 }}>
            </div>

            {imageUrl ? (
                <div className="relative shadow-lg inline-block max-w-full max-h-full print:shadow-none h-full flex items-center justify-center">
                    {/* The Image */}
                    <img 
                        src={imageUrl} 
                        alt="Engineering Drawing" 
                        className="max-w-full max-h-[400px] object-contain bg-white border border-gray-100 print:max-h-full print:h-auto print:w-auto" 
                    />
                    
                    {/* Optional: Simple decorative corner markers to look like a viewfinder */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-safety -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-safety -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-safety -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-safety -mb-1 -mr-1"></div>
                </div>
            ) : (
                <div className="text-industrial-400 text-sm flex flex-col items-center">
                    <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>No Image Available</span>
                </div>
            )}
        </div>

        {/* Footer Stats Overlay */}
        <div className="bg-white/95 backdrop-blur border-t border-industrial-200 px-4 py-2 print:py-1 flex justify-around text-xs font-mono text-industrial-600">
            <div className="flex flex-col items-center">
                <span className="text-industrial-400 text-[10px] uppercase">OD (外徑)</span>
                <span className="font-bold text-industrial-900">{formatValue(diameter)}</span>
            </div>
            <div className="w-px bg-industrial-200 h-full mx-2"></div>
            <div className="flex flex-col items-center">
                <span className="text-industrial-400 text-[10px] uppercase">ID (內徑)</span>
                <span className="font-bold text-industrial-900">
                    {isSolid() ? 'SOLID (實心)' : formatValue(id)}
                </span>
            </div>
            <div className="w-px bg-industrial-200 h-full mx-2"></div>
            <div className="flex flex-col items-center">
                <span className="text-industrial-400 text-[10px] uppercase">Length (長)</span>
                <span className="font-bold text-industrial-900">{formatValue(length)}</span>
            </div>
        </div>
    </div>
  );
};

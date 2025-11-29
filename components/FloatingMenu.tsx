import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, X, RefreshCw } from 'lucide-react';

interface FloatingMenuProps {
  position: { x: number; y: number } | null;
  selectedText: string;
  onClose: () => void;
  onSubmit: (instruction: string) => void;
  isProcessing: boolean;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ 
  position, 
  selectedText, 
  onClose, 
  onSubmit,
  isProcessing 
}) => {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (position && inputRef.current) {
      inputRef.current.focus();
    }
  }, [position]);

  if (!position) return null;

  // Simple preset commands
  const presets = [
    "Make it punchier",
    "Expand this",
    "Fix grammar",
    "Change tone to professional"
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (instruction.trim()) {
      onSubmit(instruction);
      setInstruction('');
    }
  };

  return (
    <div 
      className="fixed z-50 flex flex-col gap-2 p-1 animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        left: position.x, 
        top: position.y + 20, // Offset below cursor
        transform: 'translateX(-50%)' 
      }}
    >
      <div className="bg-white/90 backdrop-blur-xl shadow-2xl border border-gray-200/50 rounded-xl overflow-hidden w-80 text-sm">
        {/* Input Area */}
        <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
                <span>Edit Selection</span>
                <button onClick={onClose} className="hover:text-gray-600">
                    <X className="w-3 h-3" />
                </button>
            </div>
            <form onSubmit={handleSubmit} className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500">
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Ask Gemini to change this..."
                    className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-800 placeholder-gray-400"
                    disabled={isProcessing}
                />
                <button 
                    type="submit"
                    disabled={!instruction.trim() || isProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
            </form>
        </div>

        {/* Presets */}
        <div className="p-2 bg-gray-50/50 grid grid-cols-2 gap-1">
            {presets.map((preset) => (
                <button
                    key={preset}
                    onClick={() => onSubmit(preset)}
                    disabled={isProcessing}
                    className="text-left px-3 py-2 rounded-md text-xs text-gray-600 hover:bg-white hover:shadow-sm hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100 truncate"
                >
                    {preset}
                </button>
            ))}
        </div>
      </div>
      
      {/* Selection context indicator (Triangle) */}
      <div className="w-3 h-3 bg-white rotate-45 absolute -top-1.5 left-1/2 -translate-x-1/2 border-l border-t border-gray-200/50 shadow-[0_-1px_1px_rgba(0,0,0,0.02)]"></div>
    </div>
  );
};

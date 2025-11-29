import React, { useState, useRef } from 'react';
import { PenTool, Paperclip, X, Sparkles, FileText, Image as ImageIcon, Video, Mic, ArrowRight } from 'lucide-react';
import { FileAttachment } from '../types';

interface WelcomeScreenProps {
  onGenerate: (prompt: string, files: FileAttachment[]) => void;
  isGenerating: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileAttachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = (ev) => {
            if (ev.target?.result) {
              newFiles.push({
                name: file.name,
                type: file.type,
                data: ev.target.result as string
              });
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onGenerate(prompt, files);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-gray-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-gray-400" />;
    if (mimeType.startsWith('audio/')) return <Mic className="w-4 h-4 text-gray-400" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-paper">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
             <div className="p-3 bg-indigo-50 rounded-xl">
                <Sparkles className="w-8 h-8 text-indigo-600" />
             </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">Muse</h1>
          <p className="text-lg text-gray-500 font-light">Your AI thought partner for writing.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10"></div>
            
            <div className="p-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="What would you like to write about today? Describe your goals, tone, and audience..."
                            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-base resize-none transition-shadow"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Reference Materials</label>
                            <span className="text-xs text-gray-400">Optional</span>
                        </div>
                        
                        <div className="space-y-3">
                            {files.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate text-sm font-medium text-gray-700">{file.name}</span>
                                            <span className="text-xs text-gray-400 capitalize">{file.type.split('/')[0]}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/10 transition-all flex items-center justify-center gap-2 group"
                            >
                                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-indigo-50 transition-colors">
                                    <Paperclip className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium">Attach files, images, or audio</span>
                            </button>
                            <input 
                                type="file" 
                                multiple
                                accept="image/*,audio/*,video/*,application/pdf,text/*"
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-50">
                    <button
                        onClick={handleSubmit}
                        disabled={isGenerating}
                        className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-medium text-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 shadow-xl shadow-gray-200"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="animate-pulse">Crafting your draft...</span>
                            </>
                        ) : (
                            <>
                                <PenTool className="w-5 h-5" />
                                {prompt.trim() || files.length > 0 ? "Generate Draft" : "Start Writing Blank"}
                            </>
                        )}
                    </button>
                    {prompt.trim() === '' && files.length === 0 && (
                        <p className="text-center mt-3 text-xs text-gray-400">
                            Click to start with a blank document
                        </p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

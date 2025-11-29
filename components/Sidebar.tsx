import React, { useState, useRef } from 'react';
import { PenTool, Paperclip, X, Sparkles, FileText, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { FileAttachment } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onGenerate: (prompt: string, files: FileAttachment[]) => void;
  isGenerating: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onGenerate, isGenerating, toggleSidebar }) => {
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
    if (!prompt.trim() && files.length === 0) return;
    onGenerate(prompt, files);
    setPrompt('');
    setFiles([]);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-gray-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-gray-400" />;
    if (mimeType.startsWith('audio/')) return <Mic className="w-4 h-4 text-gray-400" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div 
      className={`fixed top-0 left-0 h-full bg-white shadow-2xl transition-all duration-300 ease-in-out z-40 flex flex-col border-r border-gray-100 ${
        isOpen ? 'w-96 translate-x-0' : 'w-96 -translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <h2 className="text-lg font-serif font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            New Draft
        </h2>
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What would you like to write about? Leave empty to just transcribe/draft from attached files..."
                className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm resize-none"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Materials</label>
            <div className="space-y-2">
                {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm group">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {getFileIcon(file.type)}
                            <span className="truncate text-gray-600">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 text-sm"
                >
                    <Paperclip className="w-4 h-4" />
                    Attach files, images, or audio
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

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/30">
        <button
            onClick={handleSubmit}
            disabled={(!prompt.trim() && files.length === 0) || isGenerating}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
            {isGenerating ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <PenTool className="w-4 h-4" />
                    Generate Draft
                </>
            )}
        </button>
      </div>
    </div>
  );
};
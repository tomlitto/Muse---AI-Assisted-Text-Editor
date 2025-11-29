import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Menu, 
  Wand2, 
  Lightbulb, 
  ChevronRight, 
  Check, 
  History,
  Info,
  FileText,
  Type,
  Eye,
  Edit3,
  ClipboardCopy
} from 'lucide-react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Sidebar } from './components/Sidebar';
import { FloatingMenu } from './components/FloatingMenu';
import { WelcomeScreen } from './components/WelcomeScreen';
import { generateDraft, refineSelection, scanForImprovements } from './services/geminiService';
import { FileAttachment, Suggestion } from './types';

// Initialize Turndown service for HTML -> Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

// Rich Text Editor Component
const RichTextEditor: React.FC<{ content: string; onChange: (val: string) => void }> = ({ content, onChange }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  // Sync content prop to DOM only if we are NOT focused (avoid cursor jumps while typing)
  useEffect(() => {
    if (divRef.current && !isFocused.current) {
      try {
        const html = marked.parse(content);
        if (divRef.current.innerHTML !== html) {
          divRef.current.innerHTML = html as string;
        }
      } catch (e) {
        console.error("Markdown parsing error", e);
      }
    }
  }, [content]);

  const handleInput = () => {
    if (divRef.current) {
      const html = divRef.current.innerHTML;
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    }
  };

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      className="rich-text animate-in fade-in duration-300 outline-none"
      onFocus={() => isFocused.current = true}
      onBlur={() => {
        isFocused.current = false;
        handleInput(); // Ensure final sync on blur
      }}
      onInput={handleInput}
      spellCheck={false}
    />
  );
};

function App() {
  const [content, setContent] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRichTextMode, setIsRichTextMode] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // New state for Welcome Screen
  const [isWelcome, setIsWelcome] = useState(true);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (editorRef.current && !isRichTextMode) {
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = editorRef.current.scrollHeight + 'px';
    }
  }, [content, isRichTextMode]);

  // Handle text selection for Floating Menu
  const handleSelect = () => {
    if (isRichTextMode) return; // Disable AI selection menu in Rich Text mode for now
    
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);

    if (text.trim().length > 0) {
      // Calculate position only on mouse up to avoid flickering while dragging
    } else {
      setSelection(null);
      setMenuPosition(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isRichTextMode) return; // Disable AI selection menu in Rich Text mode for now

    const textarea = editorRef.current;
    if (!textarea) return;
    
    // Defer to allow selection to settle
    setTimeout(() => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        const text = textarea.value.substring(start, end);
        setSelection({ start, end, text });
        
        setMenuPosition({ x: e.clientX, y: e.clientY });
      } else {
        setSelection(null);
        setMenuPosition(null);
      }
    }, 10);
  };

  const handleGenerateDraft = async (prompt: string, files: FileAttachment[]) => {
    setIsGenerating(true);
    try {
      if (!prompt.trim() && files.length === 0) {
          // If empty, just start blank
          if (isWelcome) {
              setIsWelcome(false);
              setContent("# Untitled Draft\n\nStart writing here...");
          }
          setIsGenerating(false);
          return;
      }

      const draft = await generateDraft(prompt, files);
      setContent(draft);
      
      // If we are coming from Welcome screen, switch to editor
      if (isWelcome) {
          setIsWelcome(false);
      }
      
      setIsSidebarOpen(false);
      setSuggestions([]); // Clear old suggestions
    } catch (err) {
      alert("Failed to generate draft. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineSelection = async (instruction: string) => {
    if (!selection) return;
    setIsGenerating(true); 
    
    try {
      const refinedText = await refineSelection(selection.text, instruction, content);
      
      // Replace text
      const before = content.substring(0, selection.start);
      const after = content.substring(selection.end);
      const newContent = before + refinedText + after;
      
      setContent(newContent);
      setSelection(null);
      setMenuPosition(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScanForImprovements = async () => {
    setIsGenerating(true);
    try {
      const results = await scanForImprovements(content);
      setSuggestions(results);
      setShowSuggestions(true);
      // Automatically switch to markdown mode to show/apply suggestions correctly
      if (isRichTextMode) {
        setIsRichTextMode(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const newContent = content.replace(suggestion.originalText, suggestion.suggestedText);
    setContent(newContent);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleCopyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
        console.error('Failed to copy', err);
        alert('Failed to copy text to clipboard');
    }
  };

  // If viewing the Welcome Screen
  if (isWelcome) {
      return (
          <WelcomeScreen 
            onGenerate={handleGenerateDraft} 
            isGenerating={isGenerating} 
          />
      );
  }

  return (
    <>
      {/* Main Application Interface */}
      <div className="relative z-10 min-h-screen bg-paper text-ink font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 h-16 bg-paper/80 backdrop-blur-sm z-30 flex items-center justify-between px-6 border-b border-gray-100 relative no-print">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-serif font-semibold tracking-tight">Muse</h1>
          </div>

          {/* View Toggle - Centered */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="bg-gray-100/80 p-1 rounded-lg flex items-center gap-1 shadow-sm border border-gray-200/50">
                  <button
                      onClick={() => setIsRichTextMode(true)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isRichTextMode 
                          ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                      <Eye className="w-3 h-3" />
                      Rich Text
                  </button>
                  <button
                      onClick={() => setIsRichTextMode(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          !isRichTextMode 
                          ? 'bg-white text-gray-800 shadow-sm ring-1 ring-black/5' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                      <Edit3 className="w-3 h-3" />
                      Markdown
                  </button>
              </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="relative group">
                <button 
                    onClick={handleCopyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-indigo-600"
                >
                    {copySuccess ? (
                        <Check className="w-5 h-5 text-green-600" />
                    ) : (
                        <ClipboardCopy className="w-5 h-5" />
                    )}
                </button>
                <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                    Copy to clipboard
                </div>
              </div>
              
              <button 
                  onClick={handleScanForImprovements}
                  disabled={isGenerating || content.length < 50}
                  className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-base font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                      suggestions.length > 0 
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 ring-2 ring-indigo-500/20' 
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50'
                  } disabled:opacity-50 disabled:shadow-none disabled:transform-none`}
              >
                  {isGenerating && !selection ? (
                    <Wand2 className="w-5 h-5 animate-spin text-indigo-600" />
                  ) : (
                    <Lightbulb className={`w-5 h-5 ${suggestions.length === 0 ? "fill-amber-400 text-amber-500" : ""}`} />
                  )}
                  {suggestions.length > 0 ? `${suggestions.length} Suggestions` : 'Analyze'}
              </button>
          </div>
        </nav>

        {/* Main Layout */}
        <main className="flex-1 flex pt-16 relative">
          {/* Editor Area */}
          <div className="flex-1 max-w-3xl mx-auto p-8 md:p-16 min-h-[calc(100vh-4rem)] flex flex-col">
              {isRichTextMode ? (
                  // Rich Text Editor (Editable)
                  <RichTextEditor 
                    content={content} 
                    onChange={setContent}
                  />
              ) : (
                  <>
                      {/* Markdown Editor */}
                      <textarea
                          ref={editorRef}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          onSelect={handleSelect}
                          onMouseUp={handleMouseUp}
                          className="w-full flex-1 bg-transparent resize-none focus:outline-none font-serif text-xl md:text-2xl leading-relaxed text-gray-800 placeholder-gray-300 no-scrollbar no-print"
                          placeholder="Start writing or ask AI to generate a draft..."
                          spellCheck={false}
                      />
                  </>
              )}
          </div>

          {/* Suggestions Panel (Right) */}
          {showSuggestions && suggestions.length > 0 && !isRichTextMode && (
              <div className="w-80 border-l border-gray-100 bg-white/50 h-[calc(100vh-4rem)] overflow-y-auto hidden xl:block sticky top-16 right-0 p-6 animate-in slide-in-from-right duration-300 no-print">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="font-medium text-gray-900">Suggestions</h3>
                      <button onClick={() => setShowSuggestions(false)} className="text-gray-400 hover:text-gray-600">
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="space-y-4">
                      {suggestions.map((suggestion) => (
                          <div key={suggestion.id} className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                              <div className="text-xs font-semibold text-gray-400 uppercase mb-2 tracking-wider">Improvement</div>
                              <div className="mb-3">
                                  <div className="text-sm text-red-400 line-through decoration-red-200 mb-1 opacity-80 font-serif bg-red-50 inline px-1 rounded">{suggestion.originalText}</div>
                                  <div className="text-sm text-gray-800 font-serif bg-green-50 inline px-1 rounded">{suggestion.suggestedText}</div>
                              </div>
                              <p className="text-xs text-gray-500 mb-3 italic">{suggestion.reason}</p>
                              <button 
                                  onClick={() => applySuggestion(suggestion)}
                                  className="w-full py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                  <Check className="w-3 h-3" />
                                  Apply Change
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </main>

        {/* Overlays */}
        <div className="no-print">
          <Sidebar 
            isOpen={isSidebarOpen} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onGenerate={handleGenerateDraft}
            isGenerating={isGenerating}
          />
          
          {!isRichTextMode && (
            <FloatingMenu 
                position={menuPosition}
                selectedText={selection?.text || ''}
                onClose={() => {
                    setSelection(null);
                    setMenuPosition(null);
                }}
                onSubmit={handleRefineSelection}
                isProcessing={isGenerating}
            />
          )}

          {/* Info Tip - Bottom Right */}
          <div className="fixed bottom-6 right-6 z-20">
            <div className="group relative">
                <button className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors">
                    <Info className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                    {isRichTextMode 
                        ? "You are in Rich Text mode. You can edit directly here or switch to Markdown for more control." 
                        : "Select any text to activate the AI editor. Use the sidebar to generate full drafts."}
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
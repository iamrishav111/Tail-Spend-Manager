import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Bot, AlertCircle, Loader, RefreshCw, FileText, UploadCloud, Zap, Sparkles, Search, TrendingUp, BarChart3, Globe, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const NegotiationTab = ({ data }) => {
  const [itemDescription, setItemDescription] = useState('');
  const [l1Category, setL1Category] = useState('');
  const [category, setCategory] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);

  const [rfqContext, setRfqContext] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const handleClassify = async () => {
    if (!itemDescription.trim()) return;
    setIsClassifying(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/api/classify-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: itemDescription })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setL1Category(json.data.l1_category || '');
        setCategory(json.data.predicted_category || '');
      } else {
        alert("Failed to classify item.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error classifying item.");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/api/negotiation/parse-document`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.status === 'success') {
        setRfqContext(prev => prev ? prev + "\n\n" + json.data.text : json.data.text);
      } else {
        alert("Failed to parse document: " + json.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading document.");
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || !category) return;

    const newHistory = [...chatHistory, { role: 'user', content: inputMessage }];
    setChatHistory(newHistory);
    setInputMessage('');
    setIsTyping(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetch(`${API_BASE_URL}/api/negotiation/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          rfq_context: rfqContext,
          history: newHistory
        })
      });
      
      const json = await res.json();
      if (json.status === 'success') {
        setChatHistory(prev => [...prev, { role: 'assistant', content: json.data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Network error. Please check your connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setChatHistory([]);
    setInputMessage('');
    setCategory('');
    setItemDescription('');
    setRfqContext('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-3">

      {/* === HEADER === */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-hover rounded-xl blur-md opacity-30"></div>
            <div className="relative bg-gradient-to-br from-primary to-primary-hover text-white p-2.5 rounded-xl shadow-lg">
              <Sparkles size={20} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-text tracking-tight leading-tight">Negotiation AI</h1>
            <p className="text-[11px] text-secondary font-medium tracking-wide">Strategic co-pilot powered by internal benchmarks &amp; live market intelligence</p>
          </div>
        </div>
        {(chatHistory.length > 0 || category) && (
          <button
            onClick={resetChat}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-secondary bg-white border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            New Session
          </button>
        )}
      </div>

      {/* === SEARCH ROW === */}
      <div className="bg-white border border-border/70 shadow-sm rounded-2xl p-3.5 flex items-center gap-3 ring-1 ring-black/[0.02]">
        <div className="flex items-center gap-2 pl-1 pr-2 border-r border-border/60">
          <Search size={14} className="text-primary" />
          <label className="text-[11px] font-black text-text uppercase tracking-wider whitespace-nowrap">What are you buying?</label>
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="flex-1 p-2.5 px-4 border border-border rounded-2xl text-sm bg-surface/40 focus:bg-white font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm placeholder:text-secondary/60"
            placeholder="e.g. Enterprise Laptops, Steel Pipes, CMMS Licenses..."
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !category && handleClassify()}
            disabled={chatHistory.length > 0 || category !== ''}
          />
          {!category && (
            <button
              className="btn btn-primary px-6 py-2 rounded-2xl flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg text-sm font-bold h-[42px] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-md"
              onClick={handleClassify}
              disabled={!itemDescription.trim() || isClassifying}
            >
              {isClassifying ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
              {isClassifying ? 'Analyzing...' : 'Auto-Classify'}
            </button>
          )}
        </div>
      </div>

      {/* === CLASSIFICATION BADGE === */}
      {category && (
        <div className="bg-gradient-to-r from-[#ECFDF5] via-[#F0FDF4] to-white border border-[#A7F3D0] rounded-2xl p-3 px-4 flex items-center gap-4 shadow-sm animate-fadeIn">
          <div className="relative">
            <div className="absolute inset-0 bg-[#10B981] rounded-xl blur-md opacity-30"></div>
            <div className="relative bg-gradient-to-br from-[#10B981] to-[#059669] text-white p-2.5 rounded-xl shadow-md"><Bot size={18} /></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-black text-[#065F46] tracking-widest mb-0.5 flex items-center gap-1.5">
              <ShieldCheck size={10} /> AI Classification &amp; Context Loaded
            </div>
            <div className="text-sm font-bold text-[#065F46] truncate">
              {l1Category && <span className="opacity-60 font-semibold">{l1Category}</span>}
              {l1Category && <span className="opacity-40 mx-1.5">›</span>}
              <span>{category}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-[#065F46]/70 uppercase tracking-wider">
            <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md border border-[#A7F3D0]/60"><BarChart3 size={10} /> Internal Benchmark</div>
            <div className="flex items-center gap-1 bg-white/60 px-2 py-1 rounded-md border border-[#A7F3D0]/60"><Globe size={10} /> Live Market</div>
          </div>
        </div>
      )}

      {/* === CHAT AREA === */}
      <div className="card p-0 flex-1 flex flex-col overflow-hidden border-border/60 shadow-md relative rounded-2xl">

        {!category && (
          <div className="absolute inset-0 z-10 bg-gradient-to-br from-surface/80 via-white/70 to-surface/80 backdrop-blur-[3px] flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-primary/10 text-center max-w-lg ring-1 ring-black/[0.04]">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-20"></div>
                <div className="relative bg-gradient-to-br from-primary to-primary-hover text-white p-4 rounded-2xl shadow-lg inline-flex">
                  <MessageSquare size={32} />
                </div>
              </div>
              <h3 className="text-xl font-black text-text mb-2 tracking-tight">Negotiation Co-Pilot</h3>
              <p className="text-sm text-secondary leading-relaxed mb-5">
                Describe the item you are buying above and click <strong className="text-text">Auto-Classify</strong> to inject your company's historical benchmarks and live market data into the conversation.
              </p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <BarChart3 size={16} className="text-primary" />
                  <span className="font-bold text-text">Internal Volume</span>
                  <span className="text-secondary text-center leading-tight">Historical category spend</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="font-bold text-text">Benchmarks</span>
                  <span className="text-secondary text-center leading-tight">Competitor &amp; contract rates</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  <Globe size={16} className="text-primary" />
                  <span className="font-bold text-text">Market Signal</span>
                  <span className="text-secondary text-center leading-tight">Live web trends</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#fafbfc] to-[#f5f6f8]">
          {chatHistory.length === 0 && category && (
            <div className="flex justify-center my-8">
              <div className="bg-white border border-primary/20 text-text p-5 rounded-2xl text-sm max-w-lg text-center font-medium shadow-sm">
                <div className="flex items-center justify-center gap-2 text-primary font-bold mb-1">
                  <Sparkles size={14} />
                  <span className="text-xs uppercase tracking-wider">Context Ready</span>
                </div>
                <p className="text-secondary leading-relaxed">
                  Negotiation context loaded for <span className="font-bold text-text">{category}</span>.<br/>
                  Paste the supplier's initial offer below to begin the strategy analysis.
                </p>
              </div>
            </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'max-w-[75%] flex-row-reverse' : 'w-full md:max-w-[95%] flex-row'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md ring-2 ring-white ${msg.role === 'user' ? 'bg-gradient-to-br from-primary to-primary-hover text-white' : 'bg-gradient-to-br from-[#1f2937] to-[#374151] text-white'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-5 rounded-2xl text-sm shadow-sm flex-1 ${msg.role === 'user' ? 'bg-gradient-to-br from-primary to-primary-hover text-white rounded-tr-none' : 'bg-white border border-border/70 rounded-tl-none ring-1 ring-black/[0.02]'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm md:prose-base prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-primary prose-headings:tracking-tight prose-a:text-primary prose-strong:text-text prose-ul:my-3 prose-li:my-0.5 max-w-none text-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1f2937] to-[#374151] text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-md ring-2 ring-white">
                  <Bot size={16} />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-border/70 rounded-tl-none shadow-sm flex items-center gap-3 ring-1 ring-black/[0.02]">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs text-secondary font-semibold tracking-wide">Analyzing leverage &amp; drafting response</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* === BOTTOM ACTION ROW === */}
        <div className="p-4 bg-white border-t border-border/70 shadow-[0_-6px_16px_rgba(0,0,0,0.03)]">
          <div className="max-w-4xl mx-auto w-full flex items-end gap-3">

            {/* Upload RFQ Button */}
            <div className="flex-shrink-0 mb-0.5">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.txt,.csv"
                onChange={handleFileUpload}
                disabled={chatHistory.length > 0 || isUploading || !category}
              />
              <button
                className={`h-[44px] px-4 rounded-2xl flex items-center justify-center border gap-2 text-xs font-bold transition-all shadow-sm ${!category ? 'bg-surface border-border text-[#ccc] cursor-not-allowed' : (rfqContext ? 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-[#10B981] hover:shadow-md' : 'bg-white text-secondary border-border hover:bg-primary/5 hover:border-primary/30 hover:text-primary')}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={chatHistory.length > 0 || isUploading || !category}
              >
                {isUploading ? <Loader size={16} className="animate-spin" /> : (rfqContext ? <FileText size={16} /> : <UploadCloud size={16} />)}
                <span>{rfqContext ? "RFQ Uploaded" : "Upload RFQ"}</span>
              </button>
            </div>

            {/* Main Input */}
            <div className="flex-1 flex items-end gap-2 bg-surface/40 border border-border rounded-2xl shadow-sm focus-within:shadow-lg focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 transition-all p-1.5 mb-0.5">
              <textarea
                className="flex-1 p-2.5 px-3 bg-transparent text-sm outline-none resize-none min-h-[44px] max-h-[200px] font-medium placeholder:font-normal placeholder:text-secondary/60"
                placeholder={category ? "Paste the supplier's message or offer here..." : "Classify an item above to start..."}
                rows={1}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                }}
                onKeyDown={handleKeyPress}
                disabled={!category || isTyping}
              />
              <button
                className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${(!inputMessage.trim() || !category || isTyping) ? 'bg-surface text-secondary cursor-not-allowed' : 'bg-gradient-to-br from-primary to-primary-hover text-white hover:shadow-lg hover:-translate-y-0.5 shadow-md'}`}
                onClick={handleSend}
                disabled={!inputMessage.trim() || !category || isTyping}
              >
                <Send size={18} className={inputMessage.trim() && !isTyping ? 'translate-x-[0.5px] -translate-y-[0.5px]' : ''} />
              </button>
            </div>

          </div>
          <div className="max-w-4xl mx-auto w-full mt-3">
             <div className="text-[10px] text-secondary text-center font-semibold flex items-center justify-center gap-1.5 tracking-wide">
                <AlertCircle size={10} className="text-primary/60" />
                AI analyzes historical volume, competitor prices, and live web market trends to draft strategy and counter-offer emails.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationTab;

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Bot, AlertCircle, Loader, RefreshCw, FileText, UploadCloud, Zap } from 'lucide-react';
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
    <div className="flex flex-col h-[calc(100vh-140px)] gap-2">
      {/* Section 1: Compact Search Row */}
      <div className="bg-white border border-border shadow-sm rounded-xl p-3 flex items-center gap-3">
        <label className="text-[11px] font-bold text-secondary uppercase tracking-wider whitespace-nowrap pl-1">What are you buying?</label>
        <div className="flex-1 flex gap-2">
          <input 
            type="text"
            className="flex-1 p-2.5 px-4 border border-border rounded-2xl text-sm bg-surface/30 focus:bg-white font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
            placeholder="e.g. Enterprise Laptops, Steel Pipes..."
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !category && handleClassify()}
            disabled={chatHistory.length > 0 || category !== ''}
          />
          {!category && (
            <button 
              className="btn btn-primary px-6 py-2 rounded-2xl flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md text-sm h-[42px] transition-all hover:-translate-y-0.5"
              onClick={handleClassify}
              disabled={!itemDescription.trim() || isClassifying}
            >
              {isClassifying ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
              Auto-Classify
            </button>
          )}
        </div>
      </div>

      {/* Section 2: AI Classification Card */}
      {category && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-3 px-4 flex items-center gap-3 shadow-sm animate-fadeIn">
          <div className="bg-[#10B981] text-white p-2 rounded-xl shadow-sm"><Bot size={18} /></div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#065F46] tracking-wider mb-0.5">AI Classification</div>
            <div className="text-sm font-bold text-[#065F46]">
              {l1Category && <span className="opacity-70 font-semibold">{l1Category} &rarr; </span>}
              {category}
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Chat Area */}
      <div className="card p-0 flex-1 flex flex-col overflow-hidden border-border/60 shadow-sm relative">
        {!category && (
          <div className="absolute inset-0 z-10 bg-surface/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-primary/10 text-center max-w-md">
              <MessageSquare size={32} className="text-primary mx-auto mb-3" />
              <h3 className="text-lg font-bold text-text mb-2">Negotiation Co-Pilot</h3>
              <p className="text-sm text-secondary">Describe the item you are buying above and click Auto-Classify to inject your company's historical benchmarks and live market data.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f8f9fa]">
          {chatHistory.length === 0 && category && (
            <div className="flex justify-center my-8">
              <div className="bg-primary/5 border border-primary/20 text-primary p-4 rounded-lg text-sm max-w-lg text-center font-medium">
                Context loaded for <span className="font-bold">{category}</span>. <br/>
                Paste the supplier's initial offer below to begin the strategy analysis.
              </div>
            </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'max-w-[75%] flex-row-reverse' : 'w-full md:max-w-[95%] flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-5 rounded-2xl text-sm shadow-sm flex-1 ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-border rounded-tl-none'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm md:prose-base prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-primary prose-a:text-primary prose-strong:text-text max-w-none text-text">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-xl bg-white border border-border rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader className="animate-spin text-secondary" size={16} />
                  <span className="text-xs text-secondary font-medium">Analyzing leverage & drafting response...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Section 4: Bottom Action Row */}
        <div className="p-3 bg-white border-t border-border shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
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
                className={`h-[42px] px-4 rounded-2xl flex items-center justify-center border gap-2 text-xs font-bold transition-all shadow-sm ${!category ? 'bg-surface border-border text-[#ccc] cursor-not-allowed' : (rfqContext ? 'bg-[#10B981] text-white border-[#10B981] hover:bg-[#059669]' : 'bg-white text-secondary border-border hover:bg-gray-50 hover:border-secondary/30')}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={chatHistory.length > 0 || isUploading || !category}
              >
                {isUploading ? <Loader size={16} className="animate-spin" /> : (rfqContext ? <FileText size={16} /> : <UploadCloud size={16} />)}
                <span>{rfqContext ? "RFQ Uploaded" : "Upload RFQ"}</span>
              </button>
            </div>

            {/* Main Input */}
            <div className="flex-1 flex items-end gap-2 bg-gray-50/50 border border-border rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5 transition-all p-1.5 mb-0.5">
              <textarea
                className="flex-1 p-2.5 px-3 bg-transparent text-sm outline-none resize-none min-h-[42px] max-h-[200px] font-medium placeholder:font-normal"
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
                className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${(!inputMessage.trim() || !category || isTyping) ? 'bg-surface text-secondary cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-hover shadow-lg hover:-translate-y-0.5'}`}
                onClick={handleSend}
                disabled={!inputMessage.trim() || !category || isTyping}
              >
                <Send size={18} className={inputMessage.trim() && !isTyping ? 'translate-x-[0.5px] -translate-y-[0.5px]' : ''} />
              </button>
            </div>
            
          </div>
          <div className="max-w-4xl mx-auto w-full mt-2">
             <div className="text-[10px] text-secondary text-center font-medium flex items-center justify-center gap-1.5">
                <AlertCircle size={10} /> AI Agent analyzes historical volume, competitor prices, and live web market trends.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationTab;

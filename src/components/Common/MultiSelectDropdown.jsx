import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

const MultiSelectDropdown = ({ label, options, selectedValues, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const newSelected = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    onChange(newSelected);
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-1 w-full" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">{label}</label>
      <div 
        className={`relative flex items-center min-h-[32px] w-full bg-white border rounded px-2 py-1 cursor-pointer transition-all ${isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-secondary'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1 pr-4">
          {selectedValues.length === 0 ? (
            <span className="text-xs text-tertiary">All {label}s</span>
          ) : (
            selectedValues.slice(0, 2).map((val) => (
              <span key={val} className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                {val}
                <X size={10} className="hover:text-danger" onClick={(e) => { e.stopPropagation(); toggleOption(val); }} />
              </span>
            ))
          )}
          {selectedValues.length > 2 && (
            <span className="text-[10px] font-bold text-secondary self-center">+{selectedValues.length - 2}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
            <X size={12} className="text-tertiary hover:text-danger" onClick={clearAll} />
          )}
          <ChevronDown size={14} className={`text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded shadow-xl z-50 max-h-[200px] overflow-y-auto animate-fadeIn">
            <div className="p-1">
              {options.length === 0 ? (
                <div className="p-2 text-xs text-center text-tertiary">No options available</div>
              ) : (
                options.map((option) => (
                  <div 
                    key={option}
                    className={`flex items-center justify-between p-2 text-xs rounded hover:bg-surface cursor-pointer ${selectedValues.includes(option) ? 'text-primary font-bold bg-primary/5' : 'text-text'}`}
                    onClick={(e) => { e.stopPropagation(); toggleOption(option); }}
                  >
                    <span className="truncate">{option}</span>
                    {selectedValues.includes(option) && <Check size={12} />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;

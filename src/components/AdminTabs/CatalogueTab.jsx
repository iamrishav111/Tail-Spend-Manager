import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, LayoutGrid, CheckCircle, Loader, Info } from 'lucide-react';

const CatalogueTab = ({ formatCurrency }) => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedL1, setSelectedL1] = useState('All');
  const [selectedL2, setSelectedL2] = useState('All');

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/catalog`);
      const json = await res.json();
      if (json.status === 'success') {
        setCatalog(json.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const l1Categories = ['All', ...Array.from(new Set(catalog.map(item => item.l1)))];
  const l2Categories = ['All', ...Array.from(new Set(catalog.filter(item => selectedL1 === 'All' || item.l1 === selectedL1).map(item => item.l2)))];

  const filteredCatalog = catalog.filter(item => {
    const matchL1 = selectedL1 === 'All' || item.l1 === selectedL1;
    const matchL2 = selectedL2 === 'All' || item.l2 === selectedL2;
    return matchL1 && matchL2;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4 flex flex-wrap gap-4 items-center justify-between bg-surface border-b">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-secondary" />
            <span className="text-xs font-bold text-secondary uppercase">Level 1:</span>
            <select className="input text-sm py-1.5 px-3" value={selectedL1} onChange={(e) => { setSelectedL1(e.target.value); setSelectedL2('All'); }}>
              {l1Categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary uppercase">Level 2:</span>
            <select className="input text-sm py-1.5 px-3" value={selectedL2} onChange={(e) => setSelectedL2(e.target.value)}>
              {l2Categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="text-xs font-bold text-secondary">{filteredCatalog.length} Items listed</div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader size={40} className="text-primary animate-spin" />
          <p className="text-secondary font-medium">Loading Catalogue...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCatalog.map((item, i) => (
            <div key={i} className="card p-5 hover:shadow-xl transition-all border-t-4 border-t-primary flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-primary-light p-2 rounded-lg"><Package size={20} className="text-primary"/></div>
                <span className="badge badge-success text-[10px] font-bold">CONTRACTED</span>
              </div>
              <h4 className="font-bold text-base mb-1 line-clamp-2" title={item.name}>{item.name}</h4>
              <div className="text-[10px] text-tertiary font-bold uppercase mb-4">{item.l1} • {item.l2}</div>
              
              <div className="mt-auto">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-[10px] text-secondary font-bold uppercase">Contracted Price</div>
                    <div className="text-xl font-black text-text">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-secondary font-bold uppercase text-right">Supplier</div>
                    <div className="text-xs font-bold text-primary">{item.supplier_name || 'Preferred Vendor'}</div>
                  </div>
                </div>
                
                <div className="p-3 bg-surface rounded-lg border border-border/50 flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-secondary">MOQ</span>
                     <span className="text-text">{item.moq} Units</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold">
                     <span className="text-secondary">Lead Time</span>
                     <span className="text-text">{item.lead_time || '3-5'} Days</span>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {filteredCatalog.length === 0 && (
            <div className="col-span-full py-20 text-center bg-surface rounded-xl border border-dashed">
               <Info size={40} className="mx-auto text-secondary mb-4 opacity-50"/>
               <p className="text-secondary font-medium">No items found matching the selected filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogueTab;

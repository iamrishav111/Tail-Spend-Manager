import React, { useState } from 'react';
import { Activity, Info, ChevronDown, ChevronRight, X } from 'lucide-react';

const SavingsLeakageTab = ({ data, formatCurrency }) => {
  const sle = data.savings_leakage_extended || {};
  const [expandedL2, setExpandedL2] = useState({});
  const [catPage, setCatPage] = useState(1);
  const [plantPage, setPlantPage] = useState(1);
  const PAGE_SIZE = 5;

  const catItems = sle.leakage_category_wise || [];
  const plantItems = sle.leakage_plant_wise || [];
  const rootCauseItems = sle.leakage_by_root_cause || [];

  const toggleL2 = (cat) => {
    setExpandedL2(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const [liveSort, setLiveSort] = useState('date');
  const [liveSortDesc, setLiveSortDesc] = useState(true);

  const rawLiveItems = (sle.live_alert_feed || []).filter(f => f.leakage > 0);
  const liveItems = [...rawLiveItems].sort((a, b) => {
    let valA, valB;
    if (liveSort === 'date') {
      valA = a.invoice_date || '';
      valB = b.invoice_date || '';
    } else if (liveSort === 'leakage') {
      valA = a.leakage || 0;
      valB = b.leakage || 0;
    } else {
      valA = a.amount || 0;
      valB = b.amount || 0;
    }
    if (valA < valB) return liveSortDesc ? 1 : -1;
    if (valA > valB) return liveSortDesc ? -1 : 1;
    return 0;
  });

  const handleLiveSort = (col) => {
    if (liveSort === col) setLiveSortDesc(d => !d);
    else { setLiveSort(col); setLiveSortDesc(true); }
  };

  const severityClass = (action = '') => {
    if (action.includes('CRITICAL') || action.includes('IMMEDIATE')) return 'text-danger font-bold';
    if (action.includes('HIGH') || action.includes('STRATEGIC')) return 'text-warning font-bold';
    if (action.includes('MEDIUM')) return 'text-primary font-semibold';
    return 'text-secondary';
  };

  const catTotalPages = Math.max(1, Math.ceil(catItems.length / PAGE_SIZE));
  const plantTotalPages = Math.max(1, Math.ceil(plantItems.length / PAGE_SIZE));

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const navSections = [
    { id: 'sl-kpis', label: 'KPIs' },
    { id: 'sl-live', label: 'Live Feed' },
    { id: 'sl-cat', label: 'By Category' },
    { id: 'sl-root', label: 'Root Cause' },
    { id: 'sl-plant', label: 'By Plant' },
  ];

  const [activePopover, setActivePopover] = useState(null);

  const ActionCell = ({ action, id }) => {
    const isExpanded = activePopover === id;

    return (
      <td className="relative py-2 px-1" style={{ minWidth: '140px' }}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(isExpanded ? null : id);
          }}
          className="btn btn-outline border-primary/30 text-primary text-[10px] font-bold py-1 px-3 hover:bg-primary/5 flex items-center gap-1.5 shadow-sm"
          style={{ borderRadius: '12px' }}
        >
          <Activity size={12} />
          {isExpanded ? 'Closing Plan...' : 'Check Action'}
        </button>

        {isExpanded && action && (
          <div 
            className="absolute right-0 top-0 translate-x-[-10px] translate-y-[-50%] z-[100] w-[450px] bg-white shadow-2xl rounded-2xl border border-border/50 p-5 animate-in fade-in zoom-in-95 duration-200"
            style={{ filter: 'drop-shadow(0 25px 30px rgb(0 0 0 / 0.2))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-primary tracking-widest uppercase">STRATEGIC PLAYBOOK</span>
              </div>
              <button onClick={() => setActivePopover(null)} className="text-secondary hover:text-danger p-1 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {(() => {
                const lines = (action || '').split('\n');
                return lines.map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-2" />;

                  const isHeader = trimmed.includes('📊') || trimmed.includes('⚡') || trimmed.includes('🏗️');
                  
                  if (isHeader) {
                    return (
                      <div key={idx} className="text-[11px] font-black text-primary uppercase tracking-wider mt-6 first:mt-0 pb-1 border-b border-primary/10 mb-3">
                        {trimmed}
                      </div>
                    );
                  }

                  // Diagnosis row parsing: Driver | Evidence | Why
                  if (trimmed.includes('|') && trimmed.split('|').length >= 2) {
                    const parts = trimmed.split('|');
                    return (
                      <div key={idx} className="playbook-diagnosis-row mb-1 flex flex-col gap-1 p-2 bg-primary/5 rounded border-l-2 border-primary">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-primary">{parts[0].trim()}</span>
                          <span className="text-secondary italic">{parts[1].trim()}</span>
                        </div>
                        {parts[2] && <div className="text-[10px] text-text/70 mt-1 border-t border-primary/5 pt-1"><strong>Why:</strong> {parts[2].trim()}</div>}
                      </div>
                    );
                  }

                  // Action | Why parsing
                  if (trimmed.includes('Action:') && trimmed.includes('Why:')) {
                    const [actionPart, whyPart] = trimmed.split('|');
                    return (
                      <div key={idx} className="mb-3 pl-4 relative text-[12px]">
                        <span className="absolute left-0 text-primary">•</span>
                        <div className="font-bold text-text">{actionPart.replace('Action:', '').trim()}</div>
                        <div className="text-[11px] text-secondary mt-0.5 bg-surface-alt p-1.5 rounded italic">
                           {whyPart.trim()}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="text-[12px] leading-relaxed mb-2 text-secondary/90 font-medium pl-4 relative">
                      {!isHeader && <span className="absolute left-0 text-primary/40">•</span>}
                      {trimmed.startsWith('-') || trimmed.startsWith('*') ? trimmed.substring(1).trim() : trimmed}
                    </div>
                  );
                });
              })()}
            </div>




          </div>
        )}
      </td>
    );
  };

  return (
    <div className="flex flex-col gap-3 relative" onClick={() => setActivePopover(null)}>
      {/* Floating Section Nav */}
      <div className="sticky top-[124px] z-30 flex gap-2 flex-wrap bg-white/80 backdrop-blur-md border-b border-border py-2 px-1 shadow-sm mb-2 rounded-xl">
        {navSections.map(s => (
          <button
            key={s.id}
            className="btn btn-outline text-xs py-1 px-3 font-bold"
            style={{ borderRadius: '20px' }}
            onClick={() => scrollTo(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* KPI Tiles */}
      <div id="sl-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        <div className="kpi-card kpi-card-danger p-3 relative group">
          <Info size={14} className="absolute top-2 right-2 text-danger opacity-30 group-hover:opacity-100 transition-opacity" title="Total spend that exceeded contracted rates in the last 90 days." />
          <div className="text-xs font-semibold text-danger mb-1">Leakage (Last 90d)</div>
          <div className="text-xl font-bold text-danger">{formatCurrency(sle.leakage_last_quarter ?? 0)}</div>
        </div>
        <div className="kpi-card kpi-card-warning p-3 relative group">
          <Info size={14} className="absolute top-2 right-2 text-warning opacity-30 group-hover:opacity-100 transition-opacity" title="Count of purchases made outside preferred supplier contracts." />
          <div className="text-xs font-semibold text-warning mb-1">Off-Contract Txns</div>
          <div className="text-xl font-bold">{(sle.off_contract_transactions ?? 0).toLocaleString()}</div>
        </div>
        <div className="kpi-card kpi-card-success p-3 relative group">
          <Info size={14} className="absolute top-2 right-2 text-success opacity-30 group-hover:opacity-100 transition-opacity" title="Estimated annual savings if all maverick spend is redirected." />
          <div className="text-xs font-semibold text-success mb-1">Total Leakage</div>
          <div className="text-xl font-bold text-danger">{formatCurrency(sle.total_leakage ?? 0)}</div>
        </div>
        <div className="kpi-card kpi-card-primary p-3 relative group">
          <Info size={14} className="absolute top-2 right-2 text-primary opacity-30 group-hover:opacity-100 transition-opacity" title="The primary reason why users are buying outside the contract." />
          <div className="text-xs font-semibold text-primary mb-1">Biggest Root Cause</div>
          <div className="text-sm font-bold truncate" title={sle.biggest_root_cause}>{sle.biggest_root_cause ?? 'N/A'}</div>
          <div className="text-xs text-secondary mt-0.5">by leakage value</div>
        </div>
      </div>

      {/* Live Alert Feed */}
      <div id="sl-live" className="card p-0 overflow-hidden border-t-4" style={{ borderTopColor: '#ef4444' }}>
        <div className="p-3 border-b bg-danger-bg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-danger animate-pulse" />
            <h3 className="mb-0 text-danger text-sm font-bold">Live Alert Feed — Recent Maverick Transactions</h3>
          </div>
        </div>
        <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '260px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th>Invoice ID</th>
                <th className="cursor-pointer select-none" onClick={() => handleLiveSort('date')}>
                  Date {liveSort === 'date' ? (liveSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th>Requester</th>
                <th>Supplier</th>
                <th>Category</th>
                <th className="numeric cursor-pointer select-none" onClick={() => handleLiveSort('amount')}>
                  Amount {liveSort === 'amount' ? (liveSortDesc ? '▼' : '▲') : '↕'}
                </th>
                <th className="numeric text-danger cursor-pointer select-none" onClick={() => handleLiveSort('leakage')}>
                  Leakage ₹ {liveSort === 'leakage' ? (liveSortDesc ? '▼' : '▲') : '↕'}
                </th>
              </tr>
            </thead>
            <tbody>
              {liveItems.map((item, i) => (
                <tr key={i}>
                  <td className="font-bold text-xs text-primary">{item.invoice_id}</td>
                  <td className="text-xs text-secondary">{item.invoice_date}</td>
                  <td className="font-semibold text-xs">{item.requester_id}</td>
                  <td className="text-xs font-medium truncate max-w-[140px]">{item.supplier_name}</td>
                  <td className="text-xs font-medium truncate max-w-[120px]">{item.category}</td>
                  <td className="numeric text-xs font-semibold">{formatCurrency(item.amount)}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                </tr>
              ))}
              {liveItems.length === 0 && <tr><td colSpan={7} className="text-center text-secondary py-4 text-sm">No maverick transactions with leakage found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Leakage Table */}
      <div id="sl-cat" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Leakage by Category (Top 10)</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Category</th>
                <th className="numeric">Leakage</th>
                <th className="numeric">Txns</th>
                <th className="numeric">Total Spent</th>
                <th className="numeric">Leakage %</th>
                <th>Action Strategy (AI)</th>
              </tr>
            </thead>
            <tbody>
              {catItems.slice((catPage - 1) * PAGE_SIZE, catPage * PAGE_SIZE).map((item, i) => {
                const isExpanded = expandedL2[item['Booked Category']];
                return (
                  <React.Fragment key={i}>
                    <tr>
                      <td>
                        <button onClick={(e) => { e.stopPropagation(); toggleL2(item['Booked Category']); }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="font-semibold text-sm">{item['Booked Category']}</td>
                      <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                      <td className="numeric text-xs">{item.txn_count}</td>
                      <td className="numeric text-secondary text-xs">{formatCurrency(item.total_spent)}</td>
                      <td className="numeric">
                        <span className={`font-bold text-xs ${item.leakage_pct > 30 ? 'text-danger' : item.leakage_pct > 15 ? 'text-warning' : 'text-success'}`}>
                          {item.leakage_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <ActionCell action={item.action} id={`cat-${i}`} />
                    </tr>
                    {isExpanded && (item.l3_breakdown || []).map((l3, j) => (
                      <tr key={`l3-${i}-${j}`} className="bg-surface/30">
                        <td></td>
                        <td className="pl-6 text-xs text-secondary font-medium">↳ {l3.name}</td>
                        <td className="numeric text-xs font-bold text-danger/70">{formatCurrency(l3.leakage)}</td>
                        <td className="numeric text-[10px] text-secondary">{l3.transactions} txns</td>
                        <td colSpan={3}></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {catItems.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-secondary font-medium italic">No category-wise leakage detected for the selected period.</td></tr>}
            </tbody>
          </table>
        </div>
        {catTotalPages > 1 && (
          <div className="p-2 border-t flex justify-between items-center bg-surface">
            <button className="btn btn-outline text-xs py-0.5 px-2" disabled={catPage <= 1} onClick={() => setCatPage(p => p - 1)}>Prev</button>
            <span className="text-xs font-bold text-secondary">{catPage} / {catTotalPages}</span>
            <button className="btn btn-outline text-xs py-0.5 px-2" disabled={catPage >= catTotalPages} onClick={() => setCatPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {/* Root Cause Analysis Table */}
      <div id="sl-root" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Leakage by Root Cause</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Root Cause</th>
                <th className="numeric">Leakage ₹</th>
                <th className="numeric">% of Total</th>
                <th>Pattern Insight</th>
                <th className="text-center">Procurement Action</th>
                <th className="numeric">Savings Potential</th>
              </tr>
            </thead>
            <tbody>
              {rootCauseItems.map((item, i) => (
                <tr key={i}>
                  <td className="font-bold text-sm">{item.root_cause}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                  <td className="numeric font-bold text-xs">{item.leakage_pct?.toFixed(1)}%</td>
                  <td className="text-[10px] text-secondary italic font-medium">{item.insight}</td>
                  <ActionCell action={item.action} id={`rc-${i}`} />
                  <td className="numeric">
                    <span className="badge badge-success text-[10px] py-0.5 px-2 font-bold">{item.savings}</span>
                  </td>
                </tr>
              ))}
              {rootCauseItems.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-secondary font-medium italic">No maverick spend root causes identified.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plant-wise Leakage Table */}
      <div id="sl-plant" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Plant Wise Leakage (Top 10)</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Plant</th>
                <th className="numeric">Leakage ₹</th>
                <th className="numeric">Txns</th>
                <th>Root Cause</th>
                <th>Action Strategy (AI)</th>
              </tr>
            </thead>
            <tbody>
              {plantItems.slice((plantPage - 1) * PAGE_SIZE, plantPage * PAGE_SIZE).map((item, i) => (
                <tr key={i}>
                  <td className="font-semibold text-sm">{item.plant}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                  <td className="numeric text-xs">{item.txn_count}</td>
                  <td><span className="badge badge-warning text-xs">{item.root_cause}</span></td>
                  <ActionCell action={item.action} id={`rc-${i}`} />
                </tr>
              ))}
              {plantItems.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-secondary font-medium italic">No plant-level leakage data available.</td></tr>}
            </tbody>
          </table>
        </div>
        {plantTotalPages > 1 && (
          <div className="p-2 border-t flex justify-between items-center bg-surface">
            <button className="btn btn-outline text-xs py-0.5 px-2" disabled={plantPage <= 1} onClick={() => setPlantPage(p => p - 1)}>Prev</button>
            <span className="text-xs font-bold text-secondary">{plantPage} / {plantTotalPages}</span>
            <button className="btn btn-outline text-xs py-0.5 px-2" disabled={plantPage >= plantTotalPages} onClick={() => setPlantPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsLeakageTab;

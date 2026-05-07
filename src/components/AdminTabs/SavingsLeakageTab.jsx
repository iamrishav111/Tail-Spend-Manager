import React, { useState } from 'react';
import { Activity, Info } from 'lucide-react';

const SavingsLeakageTab = ({ data, formatCurrency }) => {
  const sle = data.savings_leakage_extended || {};
  const [catPage, setCatPage] = useState(1);
  const [plantPage, setPlantPage] = useState(1);
  const PAGE_SIZE = 5;

  // Live feed sort state — default: date desc, then leakage desc
  const [liveSort, setLiveSort] = useState('date');
  const [liveSortDesc, setLiveSortDesc] = useState(true);

  const catItems = sle.leakage_category_wise || [];
  const plantItems = sle.leakage_plant_wise || [];
  const rootCauseItems = sle.leakage_by_root_cause || [];
  // Filter out leakage=0 from live feed, then sort
  const rawLiveItems = (sle.live_alert_feed || []).filter(f => f.leakage > 0);
  const liveItems = [...rawLiveItems].sort((a, b) => {
    let valA, valB;
    if (liveSort === 'date') {
      valA = a.invoice_date || '';
      valB = b.invoice_date || '';
    } else if (liveSort === 'leakage') {
      valA = a.leakage || 0;
      valB = b.leakage || 0;
    } else { // amount
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
    if (action.startsWith('CRITICAL')) return 'text-danger font-bold';
    if (action.startsWith('HIGH')) return 'text-warning font-bold';
    if (action.startsWith('MEDIUM')) return 'text-primary font-semibold';
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

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Floating Section Nav */}
      <div className="sticky top-0 z-20 flex gap-2 flex-wrap bg-white border-b border-border py-2 px-1 shadow-sm">
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
            <h3 className="mb-0 text-danger text-sm font-bold">Live Alert Feed — Recent Maverick Transactions (Leakage &gt; 0)</h3>
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
                  <td className="text-xs font-medium" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.supplier_name}</td>
                  <td className="text-xs font-medium" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.category}</td>
                  <td className="numeric text-xs font-semibold">{formatCurrency(item.amount)}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                </tr>
              ))}
              {liveItems.length === 0 && <tr><td colSpan={7} className="text-center text-secondary py-4 text-sm">No maverick transactions with leakage found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Leakage */}
      <div id="sl-cat" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Leakage by Category (Top 10)</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '280px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th>Category</th>
                <th className="numeric">Leakage</th>
                <th className="numeric">Txns</th>
                <th className="numeric">Total Spent</th>
                <th className="numeric">Leakage %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {catItems.slice((catPage - 1) * PAGE_SIZE, catPage * PAGE_SIZE).map((item, i) => (
                <tr key={i}>
                  <td className="font-semibold text-sm">{item['Booked Category']}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                  <td className="numeric text-xs">{item.txn_count}</td>
                  <td className="numeric text-secondary text-xs">{formatCurrency(item.total_spent)}</td>
                  <td className="numeric">
                    <span className={`font-bold text-xs ${item.leakage_pct > 30 ? 'text-danger' : item.leakage_pct > 15 ? 'text-warning' : 'text-success'}`}>
                      {item.leakage_pct?.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`text-xs ${severityClass(item.action)}`} style={{ maxWidth: '180px' }}>{item.action}</td>
                </tr>
              ))}
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

      {/* Root Cause Table */}
      <div id="sl-root" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Leakage by Root Cause</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '240px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th>Root Cause</th>
                <th className="numeric">Leakage ₹</th>
                <th className="numeric">% of Total</th>
                <th>What It Means</th>
                <th>Recommended Fix</th>
              </tr>
            </thead>
            <tbody>
              {rootCauseItems.map((item, i) => (
                <tr key={i}>
                  <td className="font-bold text-sm">{item.root_cause}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                  <td className="numeric">
                    <div className="flex items-center gap-1">
                      <div style={{ width: `${Math.min(Math.round(item.leakage_pct), 80)}px`, height: '5px', background: '#ef4444', borderRadius: '3px', flexShrink: 0 }} />
                      <span className="font-bold text-xs">{item.leakage_pct?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="text-xs text-secondary font-medium" style={{ maxWidth: '170px' }}>{item.meaning}</td>
                  <td className="text-xs text-primary font-semibold" style={{ maxWidth: '190px' }}>{item.recommended_fix}</td>
                </tr>
              ))}
              {rootCauseItems.length === 0 && <tr><td colSpan={5} className="text-center text-secondary py-4">No data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plant-wise Leakage */}
      <div id="sl-plant" className="card p-0 overflow-hidden">
        <div className="p-3 border-b bg-surface"><h3 className="mb-0 text-sm font-bold">Plant Wise Leakage (Top 10)</h3></div>
        <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '260px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th>Plant</th>
                <th className="numeric">Leakage ₹</th>
                <th className="numeric">Txns</th>
                <th>Root Cause</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {plantItems.slice((plantPage - 1) * PAGE_SIZE, plantPage * PAGE_SIZE).map((item, i) => (
                <tr key={i}>
                  <td className="font-semibold text-sm">{item.plant}</td>
                  <td className="numeric font-bold text-danger">{formatCurrency(item.leakage)}</td>
                  <td className="numeric text-xs">{item.txn_count}</td>
                  <td><span className="badge badge-warning text-xs">{item.root_cause}</span></td>
                  <td className={`text-xs ${severityClass(item.action)}`} style={{ maxWidth: '190px' }}>{item.action}</td>
                </tr>
              ))}
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

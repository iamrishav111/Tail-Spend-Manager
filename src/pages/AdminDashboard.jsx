import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, TrendingUp, AlertOctagon, ShieldAlert, Package, Search, DollarSign, Users, AlertTriangle, ArrowUpRight, Loader, UserCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info, Send, X, CheckCircle, Mail, Zap, Filter, BarChart2, Activity, ShieldCheck } from 'lucide-react';


// ──────────────────────────────────────────────────────────────────────────────
// BUYER BEHAVIOUR TAB COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const BuyerBehaviourTab = ({ data, formatCurrency }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [patternFilter, setPatternFilter] = useState('All');
  const [mailBuyer, setMailBuyer] = useState(null);
  const [mailContent, setMailContent] = useState('');
  const [mailSent, setMailSent] = useState(false);
  const PAGE_SIZE = 10;

  const kpis = data.kpis || {};
  const buyers = data.buyer_behavior || [];
  const insight = data.insight || '';

  const patterns = ['All', ...Array.from(new Set(buyers.map(b => b.pattern)))];

  const filtered = buyers.filter(b => {
    const matchSearch = b.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.top_category || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.plant || '').toLowerCase().includes(search.toLowerCase());
    const matchPattern = patternFilter === 'All' || b.pattern === patternFilter;
    return matchSearch && matchPattern;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openMail = (buyer) => {
    let subject, body;
    const leakageStr = buyer.last_leakage ? Number(buyer.last_leakage).toLocaleString('en-IN') : '0';
    
    if (buyer.buyer_type === 'Maverick') {
      subject = encodeURIComponent("Advisory: Purchase Outside Preferred Supplier");
      body = encodeURIComponent(`Dear ${buyer.buyer_name},

You recently made a purchase in ${buyer.last_category} outside the preferred supplier.

Recommended:
• Use preferred supplier for better pricing and compliance
• Contract pricing is already available

Estimated impact:
₹${leakageStr} potential savings missed

Please ensure future purchases follow preferred supplier guidelines.

Regards,
Procurement Team`);
    } else {
      // Off-System
      subject = encodeURIComponent("Compliance Notice: Purchase Made Outside Procurement System");
      body = encodeURIComponent(`Dear ${buyer.buyer_name},

You recently made a purchase using ${buyer.last_payment_method}, outside the standard procurement process.

Impact:
• Reduced visibility
• No approval tracking
• Potential pricing inefficiencies

Recommended:
• Route future purchases through the system
• Use PO-based buying instead of direct payments

This helps ensure compliance and cost optimization.

Regards,
Procurement Team`);
    }
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const patternBadgeClass = (p) => {
    if (p.includes('Repeat')) return 'badge-danger';
    if (p.includes('Multi')) return 'badge-warning';
    if (p.includes('System')) return 'badge-warning';
    if (p.includes('Process')) return 'badge-neutral';
    return 'badge-neutral';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-card-danger p-4">
          <div className="text-xs font-semibold text-danger mb-1 flex items-center gap-1"><Zap size={13}/>Repeat Maverick Buyers</div>
          <div className="text-3xl font-bold">{kpis.repeat_maverick_buyers ?? 0}</div>
          <div className="text-xs text-secondary mt-1">≥3 off-contract buys</div>
        </div>
        <div className="kpi-card kpi-card-warning p-4">
          <div className="text-xs font-semibold text-warning mb-1 flex items-center gap-1"><Users size={13}/>Total Maverick Buyers</div>
          <div className="text-3xl font-bold">{kpis.total_maverick_buyers ?? 0}</div>
          <div className="text-xs text-secondary mt-1">Preferred supplier bypassed</div>
        </div>
        <div className="kpi-card kpi-card-primary p-4">
          <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1"><BarChart2 size={13}/>Avg Leakage / Buyer</div>
          <div className="text-3xl font-bold">{formatCurrency(kpis.avg_leakage_per_buyer ?? 0)}</div>
          <div className="text-xs text-secondary mt-1">Across all maverick buyers</div>
        </div>
        <div className="kpi-card kpi-card-success p-4">
          <div className="text-xs font-semibold text-success mb-1 flex items-center gap-1"><DollarSign size={13}/>Total Leakage</div>
          <div className="text-3xl font-bold">{formatCurrency(kpis.total_leakage_all_buyers ?? 0)}</div>
          <div className="text-xs text-secondary mt-1">All maverick buyers combined</div>
        </div>
      </div>

      {/* Insight Banner */}
      {insight && (
        <div className="card p-4 flex gap-3 items-start" style={{ background: 'linear-gradient(135deg,#f0f7ff,#e8f5e9)', border: '1.5px solid #4f8ef7' }}>
          <Activity size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-primary mb-1 text-sm">Insight</div>
            <div className="text-sm text-text font-medium leading-relaxed">{insight}</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-secondary" />
          <input
            type="text"
            placeholder="Search buyer, category, plant…"
            className="input input-bordered text-sm py-1.5 px-3"
            style={{ minWidth: '240px' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-secondary" />
          <span className="text-xs font-semibold text-secondary uppercase">Pattern:</span>
          <select
            className="input text-sm py-1.5 px-3"
            value={patternFilter}
            onChange={e => { setPatternFilter(e.target.value); setPage(1); }}
          >
            {patterns.map((p, i) => <option key={i} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="text-xs text-secondary font-medium">{filtered.length} buyers found</div>
      </div>

      {/* Buyer Table */}
      <div className="card p-0 overflow-hidden border-t-4 border-t-primary">
        <div className="p-4 border-b bg-surface flex items-center gap-2">
          <UserCheck size={18} className="text-primary" />
          <h3 className="mb-0">Maverick Buyer Profiles</h3>
          <span className="badge badge-neutral ml-auto text-xs">Top 20 by Leakage</span>
        </div>
        <div className="table-container border-none" style={{ borderRadius: 0 }}>
          <table>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th>Buyer ID</th>
                <th>Plant</th>
                <th>Buyer Type</th>
                <th>Top Category</th>
                <th className="numeric">Avg Leakage/Buy</th>
                <th>Pattern</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="text-center text-secondary py-8">No buyers match your filters.</td></tr>
              )}
              {paginated.map((b, i) => (
                <tr key={i}>
                  <td className="font-bold text-primary text-sm">{b.buyer_name}</td>
                  <td className="text-secondary text-sm font-medium">{b.plant}</td>
                  <td>
                    <span className={`badge ${b.buyer_type === 'Maverick' ? 'badge-danger' : 'badge-warning'} text-xs font-bold`}>
                      {b.buyer_type}
                    </span>
                  </td>
                  <td className="text-sm font-medium" style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.top_category}</td>
                  <td className="numeric font-bold text-warning">{formatCurrency(b.avg_leakage_per_buy)}</td>
                  <td><span className={`badge ${patternBadgeClass(b.pattern)} text-xs`}>{b.pattern}</span></td>
                  <td className="text-center">
                    <button
                      className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1"
                      onClick={() => openMail(b)}
                    >
                      <Mail size={13} /> Take Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-3 border-t flex justify-between items-center bg-surface">
          <button className="btn btn-outline text-xs py-1 px-3" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button>
          <span className="text-xs font-bold text-secondary">Page {currentPage} of {totalPages} ({filtered.length} buyers)</span>
          <button className="btn btn-outline text-xs py-1 px-3" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
        </div>
      </div>

    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// SAVINGS LEAKAGE TAB COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const SavingsLeakageTab = ({ data, formatCurrency, renderBadge }) => {
  const sle = data.savings_leakage_extended || {};
  const [catPage, setCatPage] = useState(1);
  const [plantPage, setPlantPage] = useState(1);
  const PAGE_SIZE = 5;

  const catItems = sle.leakage_category_wise || [];
  const plantItems = sle.leakage_plant_wise || [];
  const rootCauseItems = sle.leakage_by_root_cause || [];
  // Filter out leakage=0 from live feed
  const liveItems = (sle.live_alert_feed || []).filter(f => f.leakage > 0);

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
        <div className="kpi-card kpi-card-danger p-3">
          <div className="text-xs font-semibold text-danger mb-1">Leakage (Last 90d)</div>
          <div className="text-xl font-bold text-danger">{formatCurrency(sle.leakage_last_quarter ?? 0)}</div>
        </div>
        <div className="kpi-card kpi-card-warning p-3">
          <div className="text-xs font-semibold text-warning mb-1">Off-Contract Txns</div>
          <div className="text-xl font-bold">{(sle.off_contract_transactions ?? 0).toLocaleString()}</div>
        </div>
        <div className="kpi-card kpi-card-success p-3">
          <div className="text-xs font-semibold text-success mb-1">Total Leakage</div>
          <div className="text-xl font-bold text-danger">{formatCurrency(sle.total_leakage ?? 0)}</div>
        </div>
        <div className="kpi-card kpi-card-primary p-3">
          <div className="text-xs font-semibold text-primary mb-1">Biggest Root Cause</div>
          <div className="text-sm font-bold truncate" title={sle.biggest_root_cause}>{sle.biggest_root_cause ?? 'N/A'}</div>
          <div className="text-xs text-secondary mt-0.5">by leakage value</div>
        </div>
      </div>

      {/* Live Alert Feed */}
      <div id="sl-live" className="card p-0 overflow-hidden border-t-4" style={{ borderTopColor: '#ef4444' }}>
        <div className="p-3 border-b bg-danger-bg flex items-center gap-2">
          <Activity size={16} className="text-danger animate-pulse" />
          <h3 className="mb-0 text-danger text-sm font-bold">Live Alert Feed — Recent Maverick Transactions (Leakage &gt; 0)</h3>
        </div>
        <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '260px', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Requester</th>
                <th>Supplier</th>
                <th>Category</th>
                <th className="numeric">Amount</th>
                <th className="numeric text-danger">Leakage ₹</th>
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

// ──────────────────────────────────────────────────────────────────────────────
// CATALOG TAB COMPONENT
// ──────────────────────────────────────────────────────────────────────────────


// ──────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────


const AdminDashboard = () => {
  const navigate = useNavigate();
  const tabs = [
    { name: 'Dashboard', slug: 'dashboard', endpoint: '/api/dashboard/kpis', icon: <TrendingUp size={16} /> },
    { name: 'Savings Leakage', slug: 'savings-leakage', endpoint: '/api/dashboard/savings-leakage', icon: <DollarSign size={16} /> },
    { name: 'Compliance', slug: 'compliance', endpoint: '/api/dashboard/compliance', icon: <ShieldAlert size={16} /> },
    { name: 'Category Suppliers', slug: 'category-suppliers', endpoint: '/api/dashboard/category-suppliers', icon: <Package size={16} /> },
    { name: 'Consolidation', slug: 'consolidation', endpoint: '/api/dashboard/consolidation', icon: <AlertOctagon size={16} /> },
    { name: 'Demand Forecast', slug: 'demand-forecast', endpoint: '/api/dashboard/demand-forecast', icon: <TrendingUp size={16} /> },
    { name: 'Buyer Behaviour', slug: 'buyer-behavior', endpoint: '/api/dashboard/buyer-behavior', icon: <UserCheck size={16} /> },
    { name: 'Purchase History', slug: 'purchase-history', endpoint: '/api/purchase-history', icon: <Package size={16} /> }
  ];

  const { tab: tabSlug } = useParams();

  // Find active tab from slug or default to first
  const currentTab = useMemo(() => {
    return tabs.find(t => t.slug === tabSlug) || tabs[0];
  }, [tabSlug]);

  const activeTab = currentTab.name;

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Specific states
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showOtherSuppliers, setShowOtherSuppliers] = useState(false);
  const [showMorePlants, setShowMorePlants] = useState(false);
  const [showMoreSpends, setShowMoreSpends] = useState(false);
  const [selectedActionCategory, setSelectedActionCategory] = useState(null);
  const [selectedContractAction, setSelectedContractAction] = useState(null);
  const [selectedCatalogAdd, setSelectedCatalogAdd] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [contractDecisions, setContractDecisions] = useState([]);
  const [catalogRecommendations, setCatalogRecommendations] = useState([]);
  const [rfqStatus, setRfqStatus] = useState(null); // null, 'sending', 'sent'
  const [consolidationPage, setConsolidationPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const CONSOLIDATION_PAGE_SIZE = 10;
  const CATEGORY_PAGE_SIZE = 5;

  const [plantSearch, setPlantSearch] = useState('');
  const [plantSortCol, setPlantSortCol] = useState('tail_spend');
  const [plantSortDesc, setPlantSortDesc] = useState(true);

  const [spendSearch, setSpendSearch] = useState('');
  const [spendSortCol, setSpendSortCol] = useState('amount');
  const [selectedBuyItem, setSelectedBuyItem] = useState(null);
  const [spendSortDesc, setSpendSortDesc] = useState(true);
  const [selectedPoolItem, setSelectedPoolItem] = useState(null);
  const [selectedPoolSupplier, setSelectedPoolSupplier] = useState(null);

  const [plantPage, setPlantPage] = useState(1);
  const [spendPage, setSpendPage] = useState(1);
  const [leakageCatPage, setLeakageCatPage] = useState(1);
  const [leakagePlantPage, setLeakagePlantPage] = useState(1);
  const [consolidationSearch, setConsolidationSearch] = useState('');
  const TABLE_PAGE_SIZE = 5;

  useEffect(() => {
    const fetchTab = async () => {
      setLoading(true);
      setError(null);
      const tabMeta = tabs.find(t => t.name === activeTab);
      if (!tabMeta) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
        const res = await fetch(`${API_BASE_URL}${tabMeta.endpoint}`);
        const json = await res.json();
        if (json.status === 'success') {
          setDashboardData(json.data);
          if (activeTab === 'Category Suppliers' && json.data.category_analysis?.length > 0) {
              setSelectedCategory(json.data.category_analysis[0].category);
          }
          if (activeTab === 'Consolidation') {
            try {
              const resDec = await fetch(`${API_BASE_URL}/api/dashboard/contract-decisions`);
              const jsonDec = await resDec.json();
              if (jsonDec.status === 'success') {
                setContractDecisions(jsonDec.data);
              }
              const resRec = await fetch(`${API_BASE_URL}/api/dashboard/catalog-recommendations`);
              const jsonRec = await resRec.json();
              if (jsonRec.status === 'success') {
                setCatalogRecommendations(jsonRec.data);
              }
            } catch (e) { console.error(e); }
          }
        } else {
          setError(json.message);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    
    fetchTab();
  }, [activeTab]);

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${value}`;
  };

  const handleBuy = (item) => {
    if (item.contract_flag) {
      alert(`PO created successfully for ${item.name} at ${formatCurrency(item.price)} (Contracted Price)`);
    } else {
      setSelectedBuyItem(item);
    }
  };

  const renderBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
      case 'good':
      case 'low': return <span className="badge badge-success">{status}</span>;
      case 'expiring soon':
      case 'medium': return <span className="badge badge-warning">{status}</span>;
      case 'expired':
      case 'high':
      case 'critical':
      case 'no contract': return <span className="badge badge-danger">{status}</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <Loader className="animate-spin mb-4" size={32} />
          <div className="font-medium">Loading {activeTab} Data...</div>
        </div>
      );
    }

    if (error || !dashboardData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-danger">
          <AlertOctagon size={48} className="mb-4 opacity-50" />
          <div className="font-medium text-lg">Failed to load {activeTab} data</div>
          <div className="text-sm opacity-80 mt-2">{error || "Server unreachable"}</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="kpi-card kpi-card-danger p-4">
                <div className="text-sm font-semibold text-danger mb-1 flex justify-between items-center">
                  <span>Total Tail Spend</span>
                  <AlertOctagon size={16} />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.kpis.total_tail_spend)}</div>
              </div>
              <div className="kpi-card kpi-card-warning p-4">
                <div className="text-sm font-semibold text-warning mb-1 flex justify-between items-center">
                  <span>Maverick Spend</span>
                  <AlertTriangle size={16} />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.kpis.maverick_spend)}</div>
              </div>
              <div className="kpi-card kpi-card-primary p-4">
                <div className="text-sm font-semibold text-primary mb-1 flex justify-between items-center">
                  <span>Contract Coverage</span>
                  <Package size={16} />
                </div>
                <div className="text-2xl font-bold">{(dashboardData.kpis.contract_coverage_pct * 100).toFixed(0)}%</div>
              </div>
              <div className="kpi-card kpi-card-success p-4">
                <div className="text-sm font-semibold text-success mb-1 flex justify-between items-center">
                  <span>Tail Suppliers</span>
                  <Users size={16} />
                </div>
                <div className="text-2xl font-bold">{dashboardData.kpis.tail_supplier_count}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-0 overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="mb-0">Top Tail Spend Root Causes</h3>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Root Cause</th>
                        <th className="numeric">Amount</th>
                        <th className="numeric">Txns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.root_causes.map((item, i) => (
                        <tr key={i}>
                          <td className="font-semibold">{item.root_cause}</td>
                          <td className="numeric font-bold">{formatCurrency(item.total_amount)}</td>
                          <td className="numeric text-secondary">{item.transaction_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="mb-0">Category-wise Tail Spend</h3>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="numeric">Tail Spend</th>
                        <th style={{ width: '40%' }}>% of Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.category_analysis.slice((categoryPage - 1) * CATEGORY_PAGE_SIZE, categoryPage * CATEGORY_PAGE_SIZE).map((item, i) => {
                        const pct = (item.tail_pct * 100).toFixed(1);
                        return (
                          <tr key={i}>
                            <td className="font-semibold">{item.category}</td>
                            <td className="numeric font-bold">{formatCurrency(item.tail_spend)}</td>
                            <td>
                              <div className="flex items-center gap-3">
                                <progress className="progress progress-primary w-full" value={pct} max="100"></progress>
                                <span className="text-xs font-bold w-12 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {dashboardData.category_analysis.length > CATEGORY_PAGE_SIZE && (
                    <div className="p-4 border-t flex justify-between items-center bg-surface">
                        <button 
                            className="btn btn-outline text-xs py-1" 
                            disabled={categoryPage === 1}
                            onClick={() => setCategoryPage(p => p - 1)}
                        >Previous</button>
                        <span className="text-xs font-bold text-secondary">Page {categoryPage} of {Math.ceil(dashboardData.category_analysis.length / CATEGORY_PAGE_SIZE)}</span>
                        <button 
                            className="btn btn-outline text-xs py-1" 
                            disabled={categoryPage === Math.ceil(dashboardData.category_analysis.length / CATEGORY_PAGE_SIZE)}
                            onClick={() => setCategoryPage(p => p + 1)}
                        >Next</button>
                    </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                        <h3 className="mb-0">Tail Spend by Plant</h3>
                        <input 
                            type="text" 
                            placeholder="Search plants..." 
                            className="input input-bordered input-sm" 
                            value={plantSearch} 
                            onChange={e => setPlantSearch(e.target.value)}
                        />
                    </div>
                    <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                        <tr>
                            <th className="cursor-pointer" onClick={() => { setPlantSortCol('plant'); setPlantSortDesc(plantSortCol === 'plant' ? !plantSortDesc : false); }}>Cost Centre {plantSortCol === 'plant' ? (plantSortDesc ? '▼' : '▲') : ''}</th>
                            <th className="numeric cursor-pointer" onClick={() => { setPlantSortCol('tail_spend'); setPlantSortDesc(plantSortCol === 'tail_spend' ? !plantSortDesc : true); }}>Tail Spend {plantSortCol === 'tail_spend' ? (plantSortDesc ? '▼' : '▲') : ''}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(() => {
                            const filtered = dashboardData.plant_analysis
                                .filter(item => item.plant.toLowerCase().includes(plantSearch.toLowerCase()))
                                .sort((a, b) => {
                                    let valA = a[plantSortCol]; let valB = b[plantSortCol];
                                    if (typeof valA === 'string') valA = valA.toLowerCase();
                                    if (typeof valB === 'string') valB = valB.toLowerCase();
                                    if (valA < valB) return plantSortDesc ? 1 : -1;
                                    if (valA > valB) return plantSortDesc ? -1 : 1;
                                    return 0;
                                });
                            
                            const maxPages = Math.ceil(filtered.length / TABLE_PAGE_SIZE) || 1;
                            const currentP = Math.min(plantPage, maxPages);
                            const paginated = filtered.slice((currentP - 1) * TABLE_PAGE_SIZE, currentP * TABLE_PAGE_SIZE);
                            
                            return paginated.map((item, i) => (
                                <tr key={i}>
                                <td className="font-semibold">{item.plant}</td>
                                <td className="numeric font-bold text-primary">{formatCurrency(item.tail_spend)}</td>
                                </tr>
                            ));
                        })()}
                        </tbody>
                    </table>
                    </div>
                    {(() => {
                        const filteredCount = dashboardData.plant_analysis.filter(item => item.plant.toLowerCase().includes(plantSearch.toLowerCase())).length;
                        const maxPages = Math.ceil(filteredCount / TABLE_PAGE_SIZE) || 1;
                        if (maxPages <= 1) return null;
                        return (
                            <div className="p-4 border-t flex justify-between items-center bg-surface">
                                <button 
                                    className="btn btn-outline text-xs py-1" 
                                    disabled={plantPage <= 1}
                                    onClick={() => setPlantPage(p => Math.max(1, p - 1))}
                                >Previous</button>
                                <span className="text-xs font-bold text-secondary">Page {Math.min(plantPage, maxPages)} of {maxPages}</span>
                                <button 
                                    className="btn btn-outline text-xs py-1" 
                                    disabled={plantPage >= maxPages}
                                    onClick={() => setPlantPage(p => Math.min(maxPages, p + 1))}
                                >Next</button>
                            </div>
                        );
                    })()}
                </div>

                <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                        <h3 className="mb-0">Top Spends Overall</h3>
                        <input 
                            type="text" 
                            placeholder="Search categories..." 
                            className="input input-bordered input-sm" 
                            value={spendSearch} 
                            onChange={e => setSpendSearch(e.target.value)}
                        />
                    </div>
                    <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                        <tr>
                            <th className="cursor-pointer" onClick={() => { setSpendSortCol('category'); setSpendSortDesc(spendSortCol === 'category' ? !spendSortDesc : false); }}>Category {spendSortCol === 'category' ? (spendSortDesc ? '▼' : '▲') : ''}</th>
                            <th className="numeric cursor-pointer" onClick={() => { setSpendSortCol('amount'); setSpendSortDesc(spendSortCol === 'amount' ? !spendSortDesc : true); }}>Total Spend {spendSortCol === 'amount' ? (spendSortDesc ? '▼' : '▲') : ''}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(() => {
                            const filtered = dashboardData.top_spends_category
                                .filter(item => item.category.toLowerCase().includes(spendSearch.toLowerCase()))
                                .sort((a, b) => {
                                    let valA = a[spendSortCol]; let valB = b[spendSortCol];
                                    if (typeof valA === 'string') valA = valA.toLowerCase();
                                    if (typeof valB === 'string') valB = valB.toLowerCase();
                                    if (valA < valB) return spendSortDesc ? 1 : -1;
                                    if (valA > valB) return spendSortDesc ? -1 : 1;
                                    return 0;
                                });
                            
                            const maxPages = Math.ceil(filtered.length / TABLE_PAGE_SIZE) || 1;
                            const currentP = Math.min(spendPage, maxPages);
                            const paginated = filtered.slice((currentP - 1) * TABLE_PAGE_SIZE, currentP * TABLE_PAGE_SIZE);
                            
                            return paginated.map((item, i) => (
                                <tr key={i}>
                                <td className="font-semibold">{item.category}</td>
                                <td className="numeric font-bold text-primary">{formatCurrency(item.amount)}</td>
                                </tr>
                            ));
                        })()}
                        </tbody>
                    </table>
                    </div>
                    {(() => {
                        const filteredCount = dashboardData.top_spends_category.filter(item => item.category.toLowerCase().includes(spendSearch.toLowerCase())).length;
                        const maxPages = Math.ceil(filteredCount / TABLE_PAGE_SIZE) || 1;
                        if (maxPages <= 1) return null;
                        return (
                            <div className="p-4 border-t flex justify-between items-center bg-surface">
                                <button 
                                    className="btn btn-outline text-xs py-1" 
                                    disabled={spendPage <= 1}
                                    onClick={() => setSpendPage(p => Math.max(1, p - 1))}
                                >Previous</button>
                                <span className="text-xs font-bold text-secondary">Page {Math.min(spendPage, maxPages)} of {maxPages}</span>
                                <button 
                                    className="btn btn-outline text-xs py-1" 
                                    disabled={spendPage >= maxPages}
                                    onClick={() => setSpendPage(p => Math.min(maxPages, p + 1))}
                                >Next</button>
                            </div>
                        );
                    })()}
                </div>
            </div>
          </div>
        );
      
      case 'Savings Leakage':
        return <SavingsLeakageTab data={dashboardData} formatCurrency={formatCurrency} renderBadge={renderBadge} />;

      case 'Category Suppliers':
        const selectedCatData = dashboardData.category_analysis.find(c => c.category === selectedCategory);
        const uniqueCategories = dashboardData.category_analysis.map(c => c.category);
        
        return (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="kpi-card kpi-card-primary p-4">
                <div className="text-sm font-semibold text-primary mb-1">Total Categories</div>
                <div className="text-2xl font-bold">{dashboardData.kpis.total_tracked}</div>
              </div>
              <div className="kpi-card kpi-card-success p-4">
                <div className="text-sm font-semibold text-success mb-1">Categories with Contracts</div>
                <div className="text-2xl font-bold">{dashboardData.kpis.with_contracts}</div>
              </div>
              <div className="kpi-card kpi-card-danger p-4">
                <div className="text-sm font-semibold text-danger mb-1">No Contracts Yet</div>
                <div className="text-2xl font-bold">{dashboardData.kpis.no_contracts}</div>
              </div>
              <div className="kpi-card kpi-card-warning p-4">
                <div className="text-sm font-semibold text-warning mb-1">Expiring in 90 Days</div>
                <div className="text-2xl font-bold">{dashboardData.kpis.expiring_90d}</div>
              </div>
            </div>



            <div className="card p-6 flex flex-wrap gap-4 justify-between items-center bg-surface border-b border-t-4 border-t-primary" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                  <h2 className="mb-1 flex items-center gap-2 text-primary"><Package size={24}/> Supplier Analysis</h2>
                  <p className="text-sm text-secondary font-medium">Analyze preferred and non-preferred supplier risks.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-secondary uppercase tracking-wide">Filter Category:</span>
                <select 
                  className="input text-sm py-2 px-3 font-medium" 
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setShowOtherSuppliers(false); }}
                  style={{ minWidth: '300px' }}
                >
                  {uniqueCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCatData && (() => {
                const nonPrefSuppliers = selectedCatData.suppliers.filter(s => !s.is_preferred);
                const preferredCount = selectedCatData.preferred_suppliers.length;
                const topNonPrefCount = Math.max(0, 3 - preferredCount);
                
                const topSuppliers = [
                    ...selectedCatData.preferred_suppliers,
                    ...nonPrefSuppliers.slice(0, topNonPrefCount)
                ];
                
                const otherSuppliers = nonPrefSuppliers.slice(topNonPrefCount);

                return (
                    <div className="flex flex-col gap-8">
                        <div>
                            <h3 className="text-xl font-bold text-text mb-4 border-b pb-2 flex items-center gap-2">
                                Top Available Suppliers <span className="badge badge-success px-3">{topSuppliers.length} Found</span>
                            </h3>
                            {topSuppliers.length === 0 ? (
                                <div className="text-secondary p-8 bg-surface border rounded-lg text-center font-medium">No suppliers found for this category.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {topSuppliers.map((supp, i) => (
                                        <div key={i} className={`card p-5 ${!supp.is_preferred ? 'opacity-95' : ''}`} style={{ borderTop: `4px solid ${supp.is_preferred ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-base truncate pr-2" title={supp.supplier_name}>{supp.supplier_name}</h4>
                                                {supp.is_preferred ? (
                                                    renderBadge(supp.contract?.status || 'Active')
                                                ) : (
                                                    <span className="badge badge-neutral text-[10px]">Non-Preferred</span>
                                                )}
                                            </div>
                                            <div className="text-2xl font-bold text-text mb-2">{formatCurrency(supp.spend)}</div>
                                            <div className="text-xs text-secondary font-medium mb-4">{supp.transaction_count} Transactions</div>
                                            
                                            <div className="flex flex-col gap-3 pt-4 border-t border-border">
                                                {supp.contract?.value && (
                                                    <div className="flex justify-between text-sm font-bold text-primary">
                                                        <span>Contract Rate</span>
                                                        <span>{formatCurrency(supp.contract.value)}</span>
                                                    </div>
                                                )}
                                                {supp.contract?.moq && (
                                                    <div className="flex justify-between text-xs font-medium text-secondary">
                                                        <span>MOQ</span>
                                                        <span>{supp.contract.moq}</span>
                                                    </div>
                                                )}
                                                {supp.contract?.expiry && (
                                                    <div className="flex justify-between text-xs font-medium text-secondary">
                                                        <span>Expiry Date</span>
                                                        <span>{supp.contract.expiry}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Geo Risk</span>
                                                    <span className={`font-bold ${supp.geography_risk > 6 ? 'text-danger' : supp.geography_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.geography_risk}/10</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Comp Risk</span>
                                                    <span className={`font-bold ${supp.compliance_risk > 6 ? 'text-danger' : supp.compliance_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.compliance_risk}/10</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Del Risk</span>
                                                    <span className={`font-bold ${supp.delivery_risk > 6 ? 'text-danger' : supp.delivery_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.delivery_risk}/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {otherSuppliers.length > 0 && (
                            <div>
                                <button 
                                    className="w-full btn bg-surface text-secondary py-4 flex items-center justify-center gap-2 hover:bg-surface-hover transition-colors border font-bold text-sm shadow-sm"
                                    onClick={() => setShowOtherSuppliers(!showOtherSuppliers)}
                                >
                                    {showOtherSuppliers ? 'Hide' : 'Show'} Other Non-Preferred Suppliers ({otherSuppliers.length})
                                    {showOtherSuppliers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                
                                {showOtherSuppliers && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                                        {otherSuppliers.map((supp, i) => (
                                            <div key={i} className="card p-5 opacity-90" style={{ borderTop: '4px solid var(--color-danger)' }}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-base truncate pr-2" title={supp.supplier_name}>{supp.supplier_name}</h4>
                                                <span className="badge badge-neutral text-[10px]">Non-Preferred</span>
                                            </div>
                                            <div className="text-2xl font-bold text-text mb-2">{formatCurrency(supp.spend)}</div>
                                            <div className="text-xs text-secondary font-medium mb-4">{supp.transaction_count} Transactions</div>
                                            
                                            <div className="flex flex-col gap-3 pt-4 border-t border-border">
                                                {supp.contract.value && (
                                                    <div className="flex justify-between text-sm font-bold text-primary">
                                                        <span>Contract Rate</span>
                                                        <span>{formatCurrency(supp.contract.value)}</span>
                                                    </div>
                                                )}
                                                {supp.contract.moq && (
                                                    <div className="flex justify-between text-xs font-medium text-secondary">
                                                        <span>MOQ</span>
                                                        <span>{supp.contract.moq}</span>
                                                    </div>
                                                )}
                                                {supp.contract.expiry && (
                                                    <div className="flex justify-between text-xs font-medium text-secondary">
                                                        <span>Expiry Date</span>
                                                        <span>{supp.contract.expiry}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Geo Risk</span>
                                                    <span className={`font-bold ${supp.geography_risk > 6 ? 'text-danger' : supp.geography_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.geography_risk}/10</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Comp Risk</span>
                                                    <span className={`font-bold ${supp.compliance_risk > 6 ? 'text-danger' : supp.compliance_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.compliance_risk}/10</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-secondary">Del Risk</span>
                                                    <span className={`font-bold ${supp.delivery_risk > 6 ? 'text-danger' : supp.delivery_risk > 3 ? 'text-warning' : 'text-success'}`}>{supp.delivery_risk}/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                );
            })()}
          </div>
        );

      case 'Consolidation':
        const consData = dashboardData.risk_and_consolidation;
        const consKpis = dashboardData.kpis;
        
        return (
          <div className="flex flex-col gap-6 relative">
            {/* Floating Quick Navigation */}
            <div className="floating-nav">
                <a href="#consolidation-kpis" className="floating-nav-item" data-label="KPI Overview"></a>
                <a href="#supplier-consolidation" className="floating-nav-item" data-label="Supplier Consolidation"></a>
                <a href="#contract-actions" className="floating-nav-item" data-label="Contract Actions"></a>
                <a href="#catalog-recommendations" className="floating-nav-item" data-label="Catalog Recommendations"></a>
                <a href="#agent-strategies" className="floating-nav-item" data-label="Agent Strategies"></a>
            </div>
            <div id="consolidation-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="kpi-card kpi-card-primary p-4">
                <div className="text-sm font-semibold text-primary mb-1">Categories Analyzed</div>
                <div className="text-2xl font-bold">{consKpis.total_categories}</div>
              </div>
              <div className="kpi-card kpi-card-warning p-4">
                <div className="text-sm font-semibold text-warning mb-1">Tail Suppliers</div>
                <div className="text-2xl font-bold">{consKpis.tail_suppliers}</div>
              </div>
              <div className="kpi-card kpi-card-danger p-4">
                <div className="text-sm font-semibold text-danger mb-1">Can Be Removed</div>
                <div className="text-2xl font-bold">{consKpis.suppliers_removable}</div>
              </div>
              <div className="kpi-card kpi-card-success p-4">
                <div className="text-sm font-semibold text-success mb-1">Potential Savings</div>
                <div className="text-2xl font-bold">{formatCurrency(consKpis.potential_savings)}</div>
              </div>
            </div>

            <div id="supplier-consolidation" className="card p-0 overflow-hidden border-t-4 border-t-success">
                <div className="p-4 border-b flex flex-wrap justify-between items-center bg-surface gap-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                        <h2 className="mb-0 text-lg flex items-center gap-2 text-text font-bold"><AlertOctagon size={20} className="text-success" /> Supplier Consolidation Opportunities</h2>
                        <p className="text-xs text-secondary font-medium">Reduce supplier fragmentation by consolidating purchases with fewer, better suppliers.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Search size={16} className="text-secondary" />
                        <input 
                            type="text" 
                            placeholder="Search category..." 
                            className="input text-sm py-1.5 px-3"
                            style={{ minWidth: '200px' }}
                            value={consolidationSearch}
                            onChange={(e) => setConsolidationSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                <table>
                    <thead>
                    <tr>
                        <th>Category</th>
                        <th className="numeric">Current Suppliers</th>
                        <th className="numeric text-primary">Target Suppliers</th>
                        <th className="numeric">Savings Impact</th>
                        <th className="text-center">Avg Risk Before → After</th>
                        <th className="text-center">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {consData.filter(item => item.category.toLowerCase().includes(consolidationSearch.toLowerCase())).map((item, i) => (
                        <tr key={i}>
                        <td className="font-semibold text-sm">{item.category}</td>
                        <td className="numeric font-semibold">{item.supplier_count}</td>
                        <td className="numeric font-bold text-primary">{item.target_suppliers}</td>
                        <td className="numeric font-bold text-success text-sm">{formatCurrency(item.estimated_savings)}</td>
                        <td className="text-center">
                            <div className="flex items-center justify-center gap-2 text-xs">
                                <span className="font-bold text-danger px-1.5 py-0.5 bg-danger-bg rounded">{item.avg_risk_before.toFixed(1)}</span>
                                <span className="text-tertiary">→</span>
                                <span className="font-bold text-success px-1.5 py-0.5 bg-success-bg rounded">{item.avg_risk_after.toFixed(1)}</span>
                            </div>
                        </td>
                        <td className="text-center">
                            <button 
                                className="btn btn-primary text-xs py-1 px-3 font-bold"
                                onClick={() => setSelectedActionCategory(item)}
                            >
                                Take Action
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Contract Actions (Table 2) */}
            <div id="contract-actions" className="card p-0 overflow-hidden border-t-4 border-t-primary mt-6">
                <div className="p-4 border-b bg-surface flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                        <h2 className="mb-0 text-lg flex items-center gap-2 text-text font-bold"><Zap size={20} className="text-primary" /> Contract Actions</h2>
                        <p className="text-xs text-secondary font-medium">Identify categories where creating a contract or running an RFQ can control future spend.</p>
                    </div>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th className="numeric">Spend</th>
                                <th className="numeric">Suppliers</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contractDecisions.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-secondary">No recommendations found for this period.</td></tr>
                            )}
                            {contractDecisions.map((item, i) => (
                                <tr key={i}>
                                    <td className="font-semibold text-sm">{item.category}</td>
                                    <td className="numeric font-bold text-primary">{formatCurrency(item.spend)}</td>
                                    <td className="numeric font-medium">{item.suppliers}</td>
                                    <td className="text-center">
                                        <button 
                                            className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold"
                                            style={{ backgroundColor: '#6d28d9' }}
                                            onClick={() => setSelectedContractAction(item)}
                                        >
                                            Take Action
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Contract Action Modal */}
            {selectedContractAction && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-40 z-[60] animate-fadeIn" onClick={() => setSelectedContractAction(null)}></div>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] overflow-hidden animate-scaleIn">
                        <div className="p-6 bg-surface border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-text">Recommended Action</h2>
                            <button onClick={() => setSelectedContractAction(null)} className="text-secondary hover:text-danger"><X size={24}/></button>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div>
                                <div className="text-xs font-bold text-secondary uppercase mb-2">Category</div>
                                <div className="text-lg font-bold text-primary">{selectedContractAction.category}</div>
                            </div>

                            <div className="p-4 bg-primary-light rounded-lg border border-primary border-opacity-20">
                                <div className="flex items-center gap-3 mb-2">
                                    <Zap size={18} className="text-primary"/>
                                    <span className="font-bold text-primary">{selectedContractAction.action_type}</span>
                                </div>
                                <div className="text-sm font-medium text-secondary italic">
                                    "{selectedContractAction.reason}"
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="text-xs font-bold text-secondary uppercase">Next Steps</div>
                                <div className="text-sm text-text font-medium leading-relaxed">
                                    {selectedContractAction.action_type === 'Create Contract' ? (
                                        <ul className="list-disc pl-5 flex flex-col gap-1">
                                            <li>Select top 2 preferred suppliers</li>
                                            <li>Set baseline price using median historical price</li>
                                            <li>Create contract draft</li>
                                        </ul>
                                    ) : (
                                        <ul className="list-disc pl-5 flex flex-col gap-1">
                                            <li>Invite 3–4 suppliers</li>
                                            <li>Collect quotations</li>
                                            <li>Recommend best supplier</li>
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <button 
                                className="btn btn-primary w-full py-3 rounded-lg font-bold mt-4 shadow-lg"
                                style={{ backgroundColor: '#6d28d9' }}
                                onClick={() => {
                                    alert(`${selectedContractAction.action_type} initiated for ${selectedContractAction.category}`);
                                    setSelectedContractAction(null);
                                }}
                            >
                                Proceed to {selectedContractAction.action_type}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* RFQ Take Action Side Pane */}
            {selectedActionCategory && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 animate-fadeIn" onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}></div>
                    <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-slideInRight border-l border-border">
                        <div className="p-5 border-b flex justify-between items-center bg-surface">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2"><Zap size={20} className="text-primary"/> Action: {selectedActionCategory.category}</h2>
                                <p className="text-xs text-secondary font-medium mt-0.5">Consolidate {selectedActionCategory.supplier_count} suppliers into {selectedActionCategory.target_suppliers}.</p>
                            </div>
                            <button className="text-secondary hover:text-danger p-1" onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 bg-surface">
                            <div className="flex flex-col gap-5">
                                {/* Fragmentation View */}
                                <div className="card p-0 border border-danger border-opacity-30">
                                    <div className="p-3 bg-danger-bg border-b border-danger border-opacity-30 font-bold text-danger text-xs flex items-center gap-2">
                                        <AlertTriangle size={14}/> Current Fragmentation ({selectedActionCategory.supplier_count} Suppliers)
                                    </div>
                                    <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                        {selectedActionCategory.suppliers.map((s, i) => (
                                            <div key={i} className="p-2.5 border rounded bg-white text-xs">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold">{s.supplier_name}</div>
                                                    <div className="font-bold text-danger">Risk: {s.risk_score}/10</div>
                                                </div>
                                                <div className="flex justify-between text-tertiary">
                                                    <span>Volume: {formatCurrency(s.spend)}</span>
                                                    <span>Rate: {s.contract_value ? `₹${s.contract_value}` : 'No Contract'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recommendation View */}
                                <div className="card p-0 border border-success">
                                    <div className="p-3 bg-success-bg border-b border-success font-bold text-success text-xs flex items-center gap-2">
                                        <CheckCircle size={14}/> Recommended Targets ({selectedActionCategory.target_suppliers} Suppliers)
                                    </div>
                                    <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                        {selectedActionCategory.target_suppliers_list.map((s, i) => (
                                            <div key={i} className="p-2.5 border border-success border-opacity-30 rounded bg-success-bg bg-opacity-20 text-xs">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-bold text-success">{s.supplier_name}</div>
                                                    <div className="font-bold text-success">Risk: {s.risk_score}/10</div>
                                                </div>
                                                <div className="flex justify-between text-secondary">
                                                    <span>Current Vol: {formatCurrency(s.spend)}</span>
                                                    <span className="font-bold">Proposed Target</span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-success border-opacity-20 text-[10px] text-success font-bold">
                                                    Estimated Capacity Threshold: {formatCurrency(selectedActionCategory.suppliers.reduce((acc, curr) => acc + curr.spend, 0) / selectedActionCategory.target_suppliers)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Impact Summary */}
                                <div className="p-4 bg-primary-light rounded-lg border border-primary flex flex-col gap-2">
                                    <div className="text-xs font-bold text-primary flex items-center gap-2"><TrendingUp size={14}/> Impact Projection</div>
                                    <div className="grid grid-cols-2 gap-4 mt-1">
                                        <div>
                                            <div className="text-[10px] text-secondary uppercase font-bold">Est. Savings</div>
                                            <div className="text-lg font-bold text-success">{formatCurrency(selectedActionCategory.estimated_savings)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-secondary uppercase font-bold">Risk Reduction</div>
                                            <div className="text-lg font-bold text-text">{selectedActionCategory.avg_risk_before.toFixed(1)} → {selectedActionCategory.avg_risk_after.toFixed(1)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* RFQ Document Preview */}
                                {rfqStatus === 'preparing' && (
                                    <div className="card p-4 border-2 border-dashed border-primary bg-primary-light animate-pulse">
                                        <div className="text-center text-sm font-bold text-primary">Generating RFQ Document Pack...</div>
                                    </div>
                                )}

                                {rfqStatus && rfqStatus !== 'preparing' && (
                                    <div className="card p-5 border bg-white shadow-sm flex flex-col gap-4 animate-scaleIn">
                                        <div className="flex justify-between items-start border-b pb-3">
                                            <div>
                                                <div className="text-xs font-bold text-tertiary">REQUEST FOR QUOTATION (DRAFT)</div>
                                                <div className="text-base font-bold text-primary">RFQ-2024-{selectedActionCategory.category.substring(0,3).toUpperCase()}-001</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-secondary">DATE</div>
                                                <div className="text-xs font-bold">{new Date().toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs leading-relaxed text-secondary">
                                            <p className="mb-2">We are inviting you to participate in a consolidation RFQ for the <strong>{selectedActionCategory.category}</strong> category.</p>
                                            <p className="mb-2"><strong>Total Estimated Annual Volume:</strong> {formatCurrency(selectedActionCategory.suppliers.reduce((acc, curr) => acc + curr.spend, 0))}</p>
                                            <p className="mb-4">Please submit your best commercial offer and capacity commitment within 7 business days.</p>
                                            <div className="p-3 bg-surface rounded border text-[10px]">
                                                <div className="font-bold mb-1">Submission Deadline:</div>
                                                <div>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-2">
                                            {rfqStatus === 'sent' ? (
                                                <div className="text-success font-bold text-sm flex items-center gap-2 bg-success-bg px-3 py-1.5 rounded-lg border border-success">
                                                    <CheckCircle size={16}/> RFQ Dispatched to {selectedActionCategory.target_suppliers} Targets
                                                </div>
                                            ) : (
                                                <button 
                                                    className="btn btn-primary w-full font-bold flex items-center justify-center gap-2"
                                                    onClick={() => {
                                                        setRfqStatus('sending');
                                                        setTimeout(() => {
                                                            setRfqStatus('sent');
                                                        }, 1200);
                                                    }}
                                                >
                                                    {rfqStatus === 'sending' ? 'Dispatching...' : 'Confirm & Send RFQ'} <Send size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {(!rfqStatus || rfqStatus === 'preparing') && (
                            <div className="p-4 border-t bg-white flex justify-end gap-3 items-center sticky bottom-0 shadow-lg">
                                <button className="btn btn-outline font-bold" onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}>Close</button>
                                <button 
                                    className="btn btn-primary font-bold flex items-center gap-2 px-6"
                                    onClick={() => {
                                        setRfqStatus('preparing');
                                        setTimeout(() => { setRfqStatus('preview'); }, 1200);
                                    }}
                                >
                                    Generate RFQ Pack <Send size={16}/>
                                </button>
                            </div>
                        )}
                        {rfqStatus === 'preview' && (
                            <div className="p-4 border-t bg-white sticky bottom-0 shadow-lg">
                                <button 
                                    className="btn btn-primary w-full font-bold flex items-center justify-center gap-2 py-3 bg-success hover:bg-success-text"
                                    onClick={() => {
                                        setRfqStatus('sending');
                                        setTimeout(() => { setRfqStatus('sent'); }, 1500);
                                    }}
                                >
                                    Confirm & Dispatch RFQ <CheckCircle size={18}/>
                                </button>
                            </div>
                        )}
                        {rfqStatus === 'sent' && (
                            <div className="p-4 border-t bg-white sticky bottom-0">
                                <button className="btn btn-outline w-full font-bold py-3" onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}>Finish & Close</button>
                            </div>
                        )}
                    </div>
                </>
            )}
            {dashboardData.strategies && dashboardData.strategies.length > 0 && (
                <div id="agent-strategies" className="flex flex-col gap-3 mt-6">
                    {dashboardData.strategies.map((strat, i) => (
                        <div key={i} className={`alert-card ${strat.priority === 'High' ? 'alert-card-danger' : 'alert-card-warning'} flex items-start gap-3 p-4 border rounded-lg`}>
                            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold mb-1 flex items-center gap-2">
                                    Agent Recommendation
                                    <span className={`badge ${strat.priority === 'High' ? 'badge-danger' : 'badge-warning'} text-[10px]`}>{strat.priority} Priority</span>
                                </h4>
                                <div className="text-sm font-medium leading-relaxed">
                                    {strat.text}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Catalog Recommendations (Table 3) */}
            <div id="catalog-recommendations" className="card p-0 overflow-hidden border-t-4 border-t-warning mt-6">
                <div className="p-4 border-b bg-surface flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                        <h2 className="mb-0 text-lg flex items-center gap-2 text-text font-bold"><TrendingUp size={20} className="text-warning" /> Catalog Recommendations</h2>
                        <p className="text-xs text-secondary font-medium">Standardize frequently purchased items into a catalog for faster and consistent buying.</p>
                    </div>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th className="numeric">Frequency (Days)</th>
                                <th className="numeric">Forecast (90d)</th>
                                <th className="numeric text-success">Potential Savings</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalogRecommendations.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-8 text-secondary">No catalogue recommendations found.</td></tr>
                            )}
                            {catalogRecommendations.map((item, i) => (
                                <tr key={i}>
                                    <td className="font-semibold text-sm max-w-[300px] truncate" title={item.description}>{item.description}</td>
                                    <td className="numeric font-bold text-danger">{item.frequency.toFixed(0)} days</td>
                                    <td className="numeric font-medium">{item.forecast_qty.toLocaleString()}</td>
                                    <td className="numeric font-bold text-success">{formatCurrency(item.potential_savings)}</td>
                                    <td className="text-center">
                                        <button 
                                            className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold"
                                            style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                                            onClick={async () => {
                                                setSelectedCatalogAdd(item);
                                                setClassifying(true);
                                                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
                                                try {
                                                    const res = await fetch(`${API_BASE_URL}/api/classify-purchase`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ description: item.description })
                                                    });
                                                    const json = await res.json();
                                                    setClassificationResult(json.data);
                                                } finally { setClassifying(false); }
                                            }}
                                        >
                                            Add to Catalog
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add to Catalog Modal */}
            {selectedCatalogAdd && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-40 z-[60] animate-fadeIn" onClick={() => setSelectedCatalogAdd(null)}></div>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] overflow-hidden animate-scaleIn">
                        <div className="p-6 bg-surface border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-text">Standardize for Catalog</h2>
                            <button onClick={() => setSelectedCatalogAdd(null)} className="text-secondary hover:text-danger"><X size={24}/></button>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div>
                                <div className="text-[10px] font-bold text-secondary uppercase mb-1">Item to Standardize</div>
                                <div className="text-sm font-bold text-text">{selectedCatalogAdd.description}</div>
                            </div>

                            <div className="p-4 bg-primary-light rounded-xl border border-primary border-opacity-10">
                                <h4 className="text-xs font-bold text-primary uppercase mb-3 flex items-center gap-2">
                                    <ShieldCheck size={14}/> AI Classification Result
                                </h4>
                                {classifying ? (
                                    <div className="flex items-center gap-2 text-secondary text-sm font-medium animate-pulse">
                                        <Loader size={16} className="animate-spin" /> Classifying item...
                                    </div>
                                ) : classificationResult ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-primary border-opacity-20">
                                            <span className="text-[10px] font-bold text-secondary uppercase">Level 1</span>
                                            <span className="text-xs font-black text-primary">{classificationResult.l1}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-primary border-opacity-20">
                                            <span className="text-[10px] font-bold text-secondary uppercase">Level 2</span>
                                            <span className="text-xs font-black text-primary">{classificationResult.l2}</span>
                                        </div>
                                    </div>
                                ) : <div className="text-xs text-danger">Failed to classify.</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Est. Savings</label>
                                    <div className="text-lg font-bold text-success">{formatCurrency(selectedCatalogAdd.potential_savings)}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Forecast Qty</label>
                                    <div className="text-lg font-bold text-text">{selectedCatalogAdd.forecast_qty.toLocaleString()}</div>
                                </div>
                            </div>

                            <button 
                                className="btn btn-primary w-full py-4 rounded-xl font-bold mt-2 shadow-lg"
                                style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                                disabled={classifying || !classificationResult}
                                onClick={async () => {
                                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
                                    const res = await fetch(`${API_BASE_URL}/api/add-to-catalog`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            description: selectedCatalogAdd.description,
                                            l1: classificationResult.l1,
                                            l2: classificationResult.l2,
                                            price: selectedCatalogAdd.potential_savings / selectedCatalogAdd.forecast_qty * 14, // Mock math for contract price
                                            moq: 1,
                                            supplier_id: 'S-VAR-999'
                                        })
                                    });
                                    const json = await res.json();
                                    if (json.status === 'success') {
                                        setSelectedCatalogAdd(null);
                                        alert('Item standardized and added to catalog successfully.');
                                    }
                                }}
                            >
                                <CheckCircle size={18}/> Confirm & Add to Catalog
                            </button>
                        </div>
                    </div>
                </>
            )}
          </div>
        );

      case 'Demand Forecast':
        const dfData = dashboardData;
        const scrollToDf = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        return (
          <div className="flex flex-col gap-6">
            {/* Floating Nav */}
            <div className="floating-nav">
                <a href="#df-kpis" className="floating-nav-item" data-label="KPI Overview"></a>
                <a href="#df-pooling" className="floating-nav-item" data-label="Pooling Opportunities"></a>
                <a href="#df-recurring" className="floating-nav-item" data-label="Recurring Tail Items"></a>
            </div>

            <div className="sticky top-[125px] z-20 flex gap-2 bg-white/80 backdrop-blur-md border border-border/50 py-2 px-3 rounded-full shadow-sm mb-2 w-fit mx-auto transition-all hover:shadow-md">
                <button className="btn btn-outline text-[10px] py-1 px-3 font-bold rounded-full border-none hover:bg-primary-light hover:text-primary transition-colors" onClick={() => scrollToDf('df-pooling')}>Pooling Opportunities</button>
                <div className="w-px h-3 bg-border self-center"></div>
                <button className="btn btn-outline text-[10px] py-1 px-3 font-bold rounded-full border-none hover:bg-primary-light hover:text-primary transition-colors" onClick={() => scrollToDf('df-recurring')}>Recurring Tail Items</button>
            </div>

            {/* KPI Tiles */}
            <div id="df-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="kpi-card kpi-card-primary p-4">
                    <div className="text-xs font-semibold text-primary mb-1">Predicted Tail Spend (30d)</div>
                    <div className="text-2xl font-bold">{formatCurrency(dfData.kpis.predicted_tail_30d)}</div>
                    <div className="text-[10px] text-secondary mt-1">Rolling 30d avg × 1.05 trend</div>
                </div>
                <div className="kpi-card kpi-card-success p-4">
                    <div className="text-xs font-semibold text-success mb-1">Pool Opportunities Now</div>
                    <div className="text-2xl font-bold">{dfData.kpis.pool_opportunities}</div>
                    <div className="text-[10px] text-secondary mt-1">Same SKU, 2+ plants, reorder ≤30d</div>
                </div>
                <div className="kpi-card kpi-card-warning p-4">
                    <div className="text-xs font-semibold text-warning mb-1 flex items-center gap-1"><ShieldCheck size={13}/>Preferred Supplier Coverage</div>
                    <div className="text-2xl font-bold">{dfData.kpis.supplier_coverage_pct?.toFixed(1)}%</div>
                    <div className="text-[10px] text-secondary mt-1">Unique SKUs under active contract</div>
                </div>
                <div className="kpi-card kpi-card-danger p-4">
                    <div className="text-xs font-semibold text-danger mb-1">Recurring Tail Needing Contract</div>
                    <div className="text-2xl font-bold">{dfData.kpis.recurring_tail_needing_contract}</div>
                    <div className="text-[10px] text-secondary mt-1">Reorder ≤14d + appears in tail</div>
                </div>
            </div>

            {/* Section 1 — Cross-BU demand pooling */}
            <div id="df-pooling" className="card p-0 overflow-hidden">
                <div className="p-4 border-b bg-surface flex justify-between items-center">
                    <div>
                        <h3 className="mb-0 text-sm font-bold flex items-center gap-2 text-primary"><Package size={16}/> Cross-BU Demand Pooling</h3>
                        <p className="text-[10px] text-secondary font-medium">Consolidate multiple plant needs into single volume orders.</p>
                    </div>
                    <span className="badge badge-primary text-[10px] font-bold">SAVINGS OPPORTUNITY</span>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Item SKU</th>
                                <th>Plants & Qty</th>
                                <th className="numeric">Total Qty</th>
                                <th className="numeric">Reorder Freq</th>
                                <th className="numeric">Est. Saving</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dfData.pooling_opportunities.map((item, i) => (
                                <tr key={i}>
                                    <td className="font-bold text-xs">{item.sku}</td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(item.plant_distribution).map(([plt, qty], idx) => (
                                                <div key={idx} className="px-1.5 py-0.5 bg-surface-hover border rounded text-[9px] font-bold text-secondary flex items-center gap-1">
                                                    {plt} <span className="text-primary">{qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="numeric font-semibold">{item.total_qty.toLocaleString()}</td>
                                    <td className="numeric text-secondary text-xs">{item.avg_reorder_freq.toFixed(1)} days</td>
                                    <td className="numeric font-bold text-success">{formatCurrency(item.est_saving)}</td>
                                    <td className="text-center">
                                        <button 
                                            className="btn btn-primary text-[10px] py-1 px-3 font-bold"
                                            onClick={() => { setSelectedPoolItem(item); setSelectedPoolSupplier(item.top_suppliers[0]); }}
                                        >
                                            Pool Order
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {dfData.pooling_opportunities.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-secondary">No pooling opportunities found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pool Order Side Drawer */}
            {selectedPoolItem && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 animate-fadeIn" onClick={() => setSelectedPoolItem(null)}></div>
                    <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-slideInRight border-l border-border" style={{ fontFamily: 'var(--font-family)' }}>
                        <div className="p-5 border-b flex justify-between items-center bg-surface">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2 text-primary"><Package size={20}/> Consolidated Pool Order</h2>
                                <p className="text-[10px] text-secondary font-medium mt-0.5">Aggregate demand across {selectedPoolItem.plants_list.length} plants for volume pricing.</p>
                            </div>
                            <button className="text-secondary hover:text-danger p-1" onClick={() => setSelectedPoolItem(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 bg-surface">
                            <div className="flex flex-col gap-6">
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white border rounded-xl shadow-sm">
                                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">SKU / Item</div>
                                        <div className="text-base font-bold truncate text-text">{selectedPoolItem.sku}</div>
                                    </div>
                                    <div className="p-4 bg-white border rounded-xl shadow-sm">
                                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Total Qty</div>
                                        <div className="text-base font-bold text-text">{selectedPoolItem.total_qty.toLocaleString()}</div>
                                    </div>
                                    <div className="p-4 bg-white border rounded-xl shadow-sm">
                                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Category</div>
                                        <div className="text-base font-bold text-text">{selectedPoolItem.category}</div>
                                    </div>
                                    <div className="p-4 bg-success-light rounded-xl border border-success border-opacity-30 shadow-sm">
                                        <div className="text-[10px] font-bold text-success uppercase tracking-wider mb-1">Est. Savings</div>
                                        <div className="text-base font-bold text-success">{formatCurrency(selectedPoolItem.est_saving)}</div>
                                    </div>
                                </div>

                                {/* Plant Distribution */}
                                <div className="card p-5 bg-white border-none shadow-sm">
                                    <h4 className="text-xs font-bold text-tertiary uppercase mb-4 flex items-center gap-2">
                                        <Activity size={14} className="text-primary"/> Plant Distribution
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(selectedPoolItem.plant_distribution).map(([plt, qty], idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-border border-opacity-50">
                                                <span className="text-sm font-semibold text-secondary">{plt}</span>
                                                <span className="text-sm font-black text-primary">{qty.toLocaleString()} <span className="text-[10px] font-bold text-tertiary">UNITS</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Supplier Selection (Tiles) */}
                                <div className="flex flex-col gap-3">
                                    <h4 className="text-xs font-bold text-tertiary uppercase flex items-center gap-2">
                                        <Zap size={14} className="text-primary"/> Select Supplier (Top 3 Contract-Backed)
                                    </h4>
                                    <div className="flex flex-col gap-3">
                                        {selectedPoolItem.top_suppliers.map((s, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedPoolSupplier(s)}
                                                className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${selectedPoolSupplier?.supplier_id === s.supplier_id ? 'border-primary bg-primary-light' : 'border-border bg-white'}`}
                                            >
                                                {s.is_recommended && (
                                                    <span className="absolute -top-2 -right-2 bg-success text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">RECOMMENDED</span>
                                                )}
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="font-bold text-sm text-text">{s.supplier_name}</div>
                                                    <div className="text-xs font-bold text-primary">{formatCurrency(s.price)}</div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <AlertOctagon size={12} className={s.risk > 7 ? 'text-danger' : s.risk > 4 ? 'text-warning' : 'text-success'}/>
                                                        <span className="text-[10px] font-bold text-secondary">Risk: <span className="text-text">{s.risk}/10</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Loader size={12} className="text-primary"/>
                                                        <span className="text-[10px] font-bold text-secondary">Lead Time: <span className="text-text">{s.lead_time} days</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t bg-white shadow-lg">
                            <button 
                                className="btn btn-primary w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
                                disabled={!selectedPoolSupplier}
                                onClick={async () => {
                                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
                                    const poData = {
                                        supplier_id: selectedPoolSupplier.supplier_id,
                                        supplier_name: selectedPoolSupplier.supplier_name,
                                        total_quantity: selectedPoolItem.total_qty,
                                        category: selectedPoolItem.category,
                                        sku: selectedPoolItem.sku,
                                        delivery_distribution: selectedPoolItem.plant_distribution,
                                        po_type: "Consolidated",
                                        is_pooled: true,
                                        amount: selectedPoolItem.total_qty * selectedPoolSupplier.price,
                                        status: 'Created',
                                        created_at: new Date().toISOString()
                                    };
                                    try {
                                        const res = await fetch(`${API_BASE_URL}/api/submit-po`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(poData)
                                        });
                                        const json = await res.json();
                                        if (json.status === 'success') {
                                            setSelectedPoolItem(null);
                                            // Redirect to Purchase History
                                            navigate('/admin/purchase-history');
                                        }
                                    } catch (e) { console.error(e); }
                                }}
                            >
                                <CheckCircle size={18}/> Confirm & Create Consolidated PO
                            </button>
                        </div>
                    </div>
                </>
            )}


            {/* Section 2 — Recurring tail items that should be contracted */}
            <div id="df-recurring" className="card p-0 overflow-hidden border-t-4 border-t-warning">
                <div className="p-4 border-b bg-surface flex justify-between items-center">
                    <div>
                        <h3 className="mb-0 text-sm font-bold flex items-center gap-2 text-warning"><AlertTriangle size={16}/> Recurring Tail Needs Contract</h3>
                        <p className="text-[10px] text-secondary font-medium">High frequency tail items bypassing standard procurement.</p>
                    </div>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Item SKU</th>
                                <th className="numeric">Reorder Every</th>
                                <th className="numeric">Forecast Qty (90d)</th>
                                <th>Plants</th>
                                <th>Contract?</th>
                                <th>Agent Recommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dfData.recurring_tail_items.map((item, i) => (
                                <tr key={i}>
                                    <td className="font-bold text-xs">{item['Item SKU']}</td>
                                    <td className="numeric font-semibold text-danger">{item.reorder_freq.toFixed(1)} days</td>
                                    <td className="numeric">{item.forecast_qty.toLocaleString()}</td>
                                    <td className="text-xs text-secondary">{item.plants_list}</td>
                                    <td><span className="badge badge-danger text-[10px]">No Contract</span></td>
                                    <td className="text-xs font-medium text-primary" style={{ maxWidth: '200px' }}>Urgent: Fast moving item. Strategic sourcing recommended.</td>
                                </tr>
                            ))}
                            {dfData.recurring_tail_items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-secondary">No recurring tail items requiring urgent contracting.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        );

      case 'Buyer Behaviour':
        return <BuyerBehaviourTab data={dashboardData} formatCurrency={formatCurrency} />;

      case 'Compliance':
        const cData = dashboardData.compliance;
        return (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="kpi-card">
                <div className="text-sm font-semibold text-secondary mb-2">Pref. Supplier Compliance</div>
                <div className="text-3xl font-bold mb-1 text-primary">{cData.kpis.compliance_rate.toFixed(1)}%</div>
              </div>
              <div className="kpi-card">
                <div className="text-sm font-semibold text-secondary mb-2">Avg Contract Utilisation</div>
                <div className="text-3xl font-bold mb-1 text-primary">{cData.kpis.contract_utilisation_avg.toFixed(1)}%</div>
              </div>
              <div className="kpi-card kpi-card-danger">
                <div className="text-sm font-semibold text-danger mb-2">Invoice Holds (Amt)</div>
                <div className="text-3xl font-bold mb-1 text-danger">{formatCurrency(cData.kpis.invoice_hold_amount)}</div>
                <div className="text-sm font-medium text-danger opacity-90">{cData.kpis.invoice_hold_count} invoices blocked</div>
              </div>
              <div className="kpi-card kpi-card-warning">
                <div className="text-sm font-semibold text-warning mb-2">3-Way Match Risk</div>
                <div className="text-3xl font-bold mb-1 text-warning">{formatCurrency(cData.kpis.three_way_risk_amount)}</div>
                <div className="text-sm font-medium text-warning opacity-90">{cData.kpis.three_way_risk_count} price outliers</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-0 overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="mb-0 text-danger flex items-center gap-2"><AlertOctagon size={18} /> High Priority Alerts</h3>
                </div>
                <div className="p-5 flex flex-col gap-4">
                    {cData.alerts.length === 0 ? <p className="text-sm text-secondary font-medium">No alerts.</p> : cData.alerts.map((a, i) => (
                        <div key={i} className={`alert-card ${a.severity === 'High' ? 'alert-high' : 'alert-medium'}`}>
                            <div className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${a.severity === 'High' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <div className="w-full">
                                <div className="font-bold flex justify-between text-base mb-1">
                                    <span>Inv {a.invoice_id} — {a.supplier}</span>
                                    <span className={a.severity === 'High' ? 'text-danger' : 'text-warning'}>{formatCurrency(a.amount)}</span>
                                </div>
                                <div className="text-sm font-medium text-secondary">{a.hold_reason} ({a.category})</div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
              
              <div className="card p-0 overflow-hidden">
                <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <h3 className="mb-0">Invoice Hold Queue</h3>
                </div>
                <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '600px', overflowY: 'auto' }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Issue</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cData.invoice_holds.map((issue, i) => (
                        <tr key={i}>
                          <td className="font-bold text-sm">{issue.invoice_id}</td>
                          <td>
                            <div className="font-bold mb-1">{issue.hold_reason}</div>
                            <div className="text-sm font-medium text-secondary">{issue.supplier}</div>
                          </td>
                          <td>{renderBadge(issue.severity === 'High' ? 'Critical' : 'Medium')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-0 overflow-hidden">
                    <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="mb-0">Category Compliance Status</h3>
                    </div>
                    <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
                    <table>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th>Category</th>
                            <th className="numeric">Spend</th>
                            <th className="numeric">Compliance %</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cData.category_compliance.map((c, i) => (
                            <tr key={i}>
                            <td className="font-semibold">{c.category}</td>
                            <td className="numeric font-semibold">{formatCurrency(c.total_spend)}</td>
                            <td className="numeric font-bold">{c.compliance_pct.toFixed(1)}%</td>
                            <td>{renderBadge(c.status)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="card p-0 overflow-hidden">
                    <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="mb-0">Contract Utilisation</h3>
                    </div>
                    <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
                    <table>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th>Category</th>
                            <th className="numeric">Pref Spend</th>
                            <th className="numeric">Utilisation</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cData.contract_utilisation.map((c, i) => (
                            <tr key={i}>
                            <td className="font-semibold">{c.category}</td>
                            <td className="numeric font-semibold">{formatCurrency(c.preferred_spend)}</td>
                            <td className="numeric font-bold text-primary text-base">{c.utilisation_pct.toFixed(1)}%</td>
                            <td>{renderBadge(c.status)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
          </div>
        );

      case 'Purchase History':
        return (
          <div className="flex flex-col gap-6">
            <div className="card p-0 overflow-hidden border-t-4 border-t-primary">
              <div className="p-4 border-b bg-surface flex justify-between items-center">
                <div>
                    <h3 className="mb-0 text-sm font-bold flex items-center gap-2 text-primary"><Package size={16}/> Purchase History / Orders</h3>
                    <p className="text-[10px] text-secondary font-medium">Monitoring created POs and fulfillment status.</p>
                </div>
                <button 
                    className="btn btn-outline text-xs py-1 px-3"
                    onClick={async () => {
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
                        const res = await fetch(`${API_BASE_URL}/api/purchase-history`);
                        const json = await res.json();
                        if (json.status === 'success') setDashboardData(json.data);
                    }}
                >
                    Refresh List
                </button>
              </div>
              <div className="table-container border-none" style={{ borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>PO ID</th>
                      <th>Supplier</th>
                      <th>Item / Category</th>
                      <th className="numeric">Total Qty</th>
                      <th>Distribution</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData && Array.isArray(dashboardData) && dashboardData.length > 0 ? (
                      dashboardData.map((po, i) => (
                        <tr key={i}>
                          <td className="font-bold text-xs">{po.po_number}</td>
                          <td className="font-medium text-xs">
                            {po.supplier_name}
                            {po.is_pooled && <span className="badge badge-primary text-[8px] ml-2 font-black">POOLED ORDER</span>}
                          </td>
                          <td>
                            <div className="text-xs font-bold">{po.sku}</div>
                            <div className="text-[10px] text-secondary">{po.category}</div>
                          </td>
                          <td className="numeric font-bold">{po.total_quantity?.toLocaleString()}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(po.delivery_distribution || {}).map(([p, q], idx) => (
                                <span key={idx} className="badge badge-neutral text-[9px]">{p}: {q}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${po.status === 'Created' ? 'badge-success' : 'badge-warning'} text-[10px] font-bold`}>{po.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="text-center py-10 text-secondary">No purchase history found. Try creating a pooled order.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="admin-body min-h-screen">
        <div className="header-nav flex justify-between items-center mb-8">
            <div>
            <h1 className="mb-1 text-primary">Control Tower Analytics</h1>
            <p className="text-secondary font-medium">Enterprise tail spend monitoring and compliance dashboard.</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="btn btn-outline flex items-center gap-2 border-primary text-primary hover:bg-primary-light" onClick={() => navigate('/admin/purchase-history')}>
                    <Package size={16} /> Orders
                </button>
                <button className="btn btn-outline flex items-center gap-2" onClick={() => navigate('/')}>
                    <LogOut size={16} /> Exit
                </button>
            </div>
        </div>
        
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div className="tabs-container sticky top-[72px] z-[40] backdrop-blur-md bg-white/90">
            {tabs.filter(t => t.slug !== 'purchase-history').map((tab) => (
                <button
                key={tab.name}
                className={`tab ${activeTab === tab.name ? 'active' : ''}`}
                onClick={() => {
                  if (activeTab !== tab.name) {
                    setLoading(true);
                    setDashboardData(null);
                    navigate(`/admin/${tab.slug}`);
                  }
                }}
                >
                <span className="flex items-center justify-center gap-2">
                    {tab.icon} {tab.name}
                </span>
                </button>
            ))}
            </div>

            <div className="animate-fade-in">
            {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;

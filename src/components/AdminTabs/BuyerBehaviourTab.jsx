import React, { useState } from 'react';
import { Zap, Users, BarChart2, DollarSign, Activity, Search, Filter, UserCheck, Mail } from 'lucide-react';

const BuyerBehaviourTab = ({ data, formatCurrency }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [patternFilter, setPatternFilter] = useState('All');
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
                <tr><td colSpan={7} className="text-center text-secondary py-8">No buyers match your filters.</td></tr>
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

export default BuyerBehaviourTab;

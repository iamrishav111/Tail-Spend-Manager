import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Check, 
  AlertTriangle, 
  AlertOctagon, 
  Users, 
  Info,
  Package,
  ArrowRight,
  Factory,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import MultiSelectDropdown from '../Common/MultiSelectDropdown';

const OverviewTab = ({ dashboardData, formatCurrency }) => {
  const [expandedL2s, setExpandedL2s] = useState(new Set());

  const toggleL2 = (cat) => {
    const newExpanded = new Set(expandedL2s);
    if (newExpanded.has(cat)) {
      newExpanded.delete(cat);
    } else {
      newExpanded.add(cat);
    }
    setExpandedL2s(newExpanded);
  };

  const [filterSuppliers, setFilterSuppliers] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterCostCentres, setFilterCostCentres] = useState([]);

  const [mavSuppliers, setMavSuppliers] = useState([]);
  const [mavCategories, setMavCategories] = useState([]);
  const [mavCostCentres, setMavCostCentres] = useState([]);

  const tailFilterData = dashboardData.tail_filter_data || [];
  const maverickFilterData = dashboardData.maverick_filter_data || [];

  const supplierOptions = useMemo(() => Array.from(new Set(tailFilterData.map(r => r.supplier_id))).sort(), [tailFilterData]);
  const categoryOptions = useMemo(() => Array.from(new Set(tailFilterData.map(r => r.category))).sort(), [tailFilterData]);
  const costCentreOptions = useMemo(() => Array.from(new Set(tailFilterData.map(r => r.cost_centre))).sort(), [tailFilterData]);

  const mavSupplierOptions = useMemo(() => Array.from(new Set(maverickFilterData.map(r => r.supplier_id))).sort(), [maverickFilterData]);
  const mavCategoryOptions = useMemo(() => Array.from(new Set(maverickFilterData.map(r => r.category))).sort(), [maverickFilterData]);
  const mavCostCentreOptions = useMemo(() => Array.from(new Set(maverickFilterData.map(r => r.cost_centre))).sort(), [maverickFilterData]);

  const filteredTailRows = useMemo(() => {
    return tailFilterData.filter(r =>
      (filterSuppliers.length === 0 || filterSuppliers.includes(r.supplier_id)) &&
      (filterCategories.length === 0 || filterCategories.includes(r.category)) &&
      (filterCostCentres.length === 0 || filterCostCentres.includes(r.cost_centre))
    ).slice(0, 10);
  }, [tailFilterData, filterSuppliers, filterCategories, filterCostCentres]);

  const filteredMavRows = useMemo(() => {
    return maverickFilterData.filter(r =>
      (mavSuppliers.length === 0 || mavSuppliers.includes(r.supplier_id)) &&
      (mavCategories.length === 0 || mavCategories.includes(r.category)) &&
      (mavCostCentres.length === 0 || mavCostCentres.includes(r.cost_centre))
    ).slice(0, 10);
  }, [maverickFilterData, mavSuppliers, mavCategories, mavCostCentres]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 140; // Accounts for sticky header + tabs + nav bar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const navSections = [
    { id: 'ov-kpis', label: 'KPIs' },
    { id: 'ov-mav-summary', label: 'Maverick Summary' },
    { id: 'ov-mav-cat', label: 'Maverick Categories' },
    { id: 'ov-tail-cat', label: 'Tail Categories' },
    { id: 'ov-tail-summary', label: 'Tail Summary' },
    { id: 'ov-explorers', label: 'Explorers' },
    { id: 'ov-root', label: 'Root Causes' },
  ];

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Sticky Table Navigation */}
      <div className="sticky top-[124px] z-30 flex gap-2 flex-wrap bg-white/80 backdrop-blur-md border-b border-border py-2 px-1 shadow-sm mb-2 rounded-xl">
        {navSections.map(s => (
          <button
            key={s.id}
            className="btn btn-outline text-[10px] py-1 px-3 font-bold uppercase tracking-wider"
            style={{ borderRadius: '20px', borderColor: 'var(--color-primary-border)' }}
            onClick={() => scrollTo(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 4 KPI TILES */}
      <div id="ov-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="kpi-card p-5 relative group" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderLeft: '4px solid #ef4444' }}>
          <div className="text-[10px] font-bold text-danger mb-1 uppercase tracking-wider">Total Tail Spend</div>
          <div className="text-2xl font-black text-danger">{formatCurrency(dashboardData.kpis?.total_tail_spend || 0)}</div>
        </div>

        <div className="kpi-card p-5 relative group" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderLeft: '4px solid #f59e0b' }}>
          <div className="text-[10px] font-bold text-warning mb-1 uppercase tracking-wider">Maverick Spend</div>
          <div className="text-2xl font-black text-warning">{formatCurrency(dashboardData.kpis?.maverick_spend || 0)}</div>
        </div>

        <div className="kpi-card p-5 relative group" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderLeft: '4px solid #22c55e' }}>
          <div className="text-[10px] font-bold text-success mb-1 uppercase tracking-wider">On-Contract Spend</div>
          <div className="text-2xl font-black text-success">{formatCurrency(dashboardData.kpis?.on_contract_spend || 0)}</div>
        </div>

        <div className="kpi-card p-5 relative group" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderLeft: '4px solid #6366f1' }}>
          <div className="text-[10px] font-bold text-secondary mb-1 uppercase tracking-wider">Tail Suppliers</div>
          <div className="text-2xl font-black text-secondary">{dashboardData.kpis?.tail_supplier_count || 0}</div>
        </div>
      </div>

      {/* ROW 1: Maverick CC & Supplier */}
      <div id="ov-mav-summary" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="card p-0 overflow-hidden border-warning/20">
          <div className="p-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
            <BarChart2 size={16} className="text-warning" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-warning">Maverick by Cost Centre</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Cost Centre</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.maverick_by_cc || []).map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs font-semibold">{row.cost_centre}</td>
                    <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                    <td className="numeric text-xs text-secondary">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0 overflow-hidden border-warning/20">
          <div className="p-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
            <Users size={16} className="text-warning" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-warning">Maverick by Supplier</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Supplier Name</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.maverick_by_supplier || []).map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs font-semibold truncate max-w-[120px]">{row.supplier_name}</td>
                    <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                    <td className="numeric text-xs text-secondary">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 2: Maverick Category & Tail Category (The Drill-downs) */}
      <div id="ov-mav-cat" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="card p-0 overflow-hidden border-warning/20">
          <div className="p-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
            <Package size={16} className="text-warning" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-warning">Maverick by Category</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase w-8"></th>
                  <th className="text-[10px] uppercase">Category</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.maverick_by_category || []).map((row, i) => {
                  const isExpanded = expandedL2s.has('mav_' + row.category);
                  return (
                    <React.Fragment key={i}>
                      <tr className="cursor-pointer hover:bg-warning/5 transition-colors" onClick={() => toggleL2('mav_' + row.category)}>
                        <td>{isExpanded ? <ChevronDown size={14} className="text-warning" /> : <ChevronRight size={14} className="text-secondary" />}</td>
                        <td className="text-xs font-semibold">{row.category}</td>
                        <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                        <td className="numeric text-xs text-secondary">{row.transactions}</td>
                      </tr>
                      {isExpanded && row.l3_breakdown && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="p-0 border-none">
                            <div className="pl-8 pr-3 py-2 border-l-2 border-warning/20 ml-4 mb-2">
                              <table className="w-full border-none">
                                <tbody className="border-none">
                                  {row.l3_breakdown.map((l3, j) => (
                                    <tr key={j} className="border-none bg-transparent h-auto">
                                      <td className="text-[10px] font-medium text-secondary py-1 border-none">{l3.name}</td>
                                      <td className="numeric text-[10px] font-bold text-warning py-1 border-none">{formatCurrency(l3.amount)}</td>
                                      <td className="numeric text-[10px] text-secondary/70 py-1 border-none">{l3.transactions}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div id="ov-tail-cat" className="card p-0 overflow-hidden border-danger/20">
          <div className="p-3 bg-danger/5 border-b border-danger/20 flex items-center gap-2">

            <Package size={16} className="text-danger" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-danger">Tail Spend by Category</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase w-8"></th>
                  <th className="text-[10px] uppercase">Category</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.tail_by_category || []).map((row, i) => {
                  const isExpanded = expandedL2s.has('tail_' + row.category);
                  return (
                    <React.Fragment key={i}>
                      <tr className="cursor-pointer hover:bg-danger/5 transition-colors" onClick={() => toggleL2('tail_' + row.category)}>
                        <td>{isExpanded ? <ChevronDown size={14} className="text-danger" /> : <ChevronRight size={14} className="text-secondary" />}</td>
                        <td className="text-xs font-semibold">{row.category}</td>
                        <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                        <td className="numeric text-xs text-secondary">{row.transactions}</td>
                      </tr>
                      {isExpanded && row.l3_breakdown && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="p-0 border-none">
                            <div className="pl-8 pr-3 py-2 border-l-2 border-danger/20 ml-4 mb-2">
                              <table className="w-full border-none">
                                <tbody className="border-none">
                                  {row.l3_breakdown.map((l3, j) => (
                                    <tr key={j} className="border-none bg-transparent h-auto">
                                      <td className="text-[10px] font-medium text-secondary py-1 border-none">{l3.name}</td>
                                      <td className="numeric text-[10px] font-bold text-danger py-1 border-none">{formatCurrency(l3.amount)}</td>
                                      <td className="numeric text-[10px] text-secondary/70 py-1 border-none">{l3.transactions}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 3: Tail Plant & Supplier */}
      <div id="ov-tail-summary" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="card p-0 overflow-hidden border-danger/20">
          <div className="p-3 bg-danger/5 border-b border-danger/20 flex items-center gap-2">
            <Factory size={16} className="text-danger" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-danger">Tail Spend by Plant</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Plant/CC</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.tail_by_plant || []).map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs font-semibold">{row.cost_centre}</td>
                    <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                    <td className="numeric text-xs text-secondary">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0 overflow-hidden border-danger/20">
          <div className="p-3 bg-danger/5 border-b border-danger/20 flex items-center gap-2">
            <Users size={16} className="text-danger" />
            <h4 className="mb-0 text-sm font-bold uppercase tracking-tight text-danger">Tail Spend by Supplier</h4>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Supplier Name</th>
                  <th className="numeric text-[10px] uppercase">Amount</th>
                  <th className="numeric text-[10px] uppercase">Txns</th>
                </tr>
              </thead>
              <tbody>
                {(dashboardData.tail_by_supplier || []).map((row, i) => (
                  <tr key={i}>
                    <td className="text-xs font-semibold truncate max-w-[120px]">{row.supplier_name}</td>
                    <td className="numeric text-xs font-bold">{formatCurrency(row.amount)}</td>
                    <td className="numeric text-xs text-secondary">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 4: Explorers */}
      <div id="ov-explorers" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b bg-surface" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="mb-0 flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning" />
                Maverick Spend Explorer
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MultiSelectDropdown label="Supplier ID" options={mavSupplierOptions} selectedValues={mavSuppliers} onChange={setMavSuppliers} />
              <MultiSelectDropdown label="Category" options={mavCategoryOptions} selectedValues={mavCategories} onChange={setMavCategories} />
              <MultiSelectDropdown label="Cost Centre" options={mavCostCentreOptions} selectedValues={mavCostCentres} onChange={setMavCostCentres} />
            </div>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Supplier ID</th>
                  <th className="text-[10px] uppercase">Category</th>
                  <th className="text-[10px] uppercase">Cost Centre</th>
                  <th className="numeric text-[10px] uppercase">Maverick Spend</th>
                </tr>
              </thead>
              <tbody>
                {filteredMavRows.length === 0
                  ? <tr><td colSpan={4} className="text-center text-secondary py-4 text-xs">No violations found.</td></tr>
                  : filteredMavRows.map((row, i) => (
                    <tr key={i}>
                      <td className="font-bold text-xs text-primary">{row.supplier_id}</td>
                      <td className="font-semibold text-xs">{row.category}</td>
                      <td className="text-secondary text-xs">{row.cost_centre}</td>
                      <td className="numeric font-bold text-warning text-xs">{formatCurrency(row.maverick_spend)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b bg-surface" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="mb-0 flex items-center gap-2">
                <AlertOctagon size={18} className="text-danger" />
                Tail Spend Explorer
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MultiSelectDropdown label="Supplier ID" options={supplierOptions} selectedValues={filterSuppliers} onChange={setFilterSuppliers} />
              <MultiSelectDropdown label="Category" options={categoryOptions} selectedValues={filterCategories} onChange={setFilterCategories} />
              <MultiSelectDropdown label="Cost Centre" options={costCentreOptions} selectedValues={filterCostCentres} onChange={setFilterCostCentres} />
            </div>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-[10px] uppercase">Supplier ID</th>
                  <th className="text-[10px] uppercase">Category</th>
                  <th className="text-[10px] uppercase">Cost Centre</th>
                  <th className="numeric text-[10px] uppercase">Tail Spend</th>
                </tr>
              </thead>
              <tbody>
                {filteredTailRows.length === 0
                  ? <tr><td colSpan={4} className="text-center text-secondary py-4 text-xs">No items found.</td></tr>
                  : filteredTailRows.map((row, i) => (
                    <tr key={i}>
                      <td className="font-bold text-xs text-primary">{row.supplier_id}</td>
                      <td className="font-semibold text-xs">{row.category}</td>
                      <td className="text-secondary text-xs">{row.cost_centre}</td>
                      <td className="numeric font-bold text-danger text-xs">{formatCurrency(row.tail_spend)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 5: Root Causes */}
      <div id="ov-root" className="card p-0 overflow-hidden mt-6">

        <div className="p-3 bg-surface border-b flex items-center gap-2">
          <AlertOctagon size={16} className="text-danger" />
          <h4 className="mb-0 text-sm font-bold uppercase tracking-tight">Tail Root Causes</h4>
        </div>
        <div className="table-container border-none" style={{ borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="text-[10px] uppercase">Root Cause</th>
                <th className="numeric text-[10px] uppercase">Amount</th>
                <th className="numeric text-[10px] uppercase">Txns</th>
              </tr>
            </thead>
            <tbody>
              {(dashboardData.root_causes || []).map((row, i) => (
                <tr key={i}>
                  <td className="text-xs font-semibold">{row.root_cause}</td>
                  <td className="numeric text-xs font-bold">{formatCurrency(row.total_amount)}</td>
                  <td className="numeric text-xs text-secondary">{row.transaction_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;


import React, { useState } from 'react';
import { Package, ShieldCheck, Activity, X, CheckCircle, Zap, AlertTriangle, AlertOctagon, Loader, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DemandForecastTab = ({ dashboardData, formatCurrency }) => {
  const navigate = useNavigate();
  const [selectedPoolItem, setSelectedPoolItem] = useState(null);
  const [selectedPoolSupplier, setSelectedPoolSupplier] = useState(null);

  const dfData = dashboardData;
  const scrollToDf = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex flex-col gap-6">
      {/* Floating Nav */}
      <div className="floating-nav">
          <button onClick={() => scrollToDf('df-kpis')} className="floating-nav-item" data-label="KPI Overview"></button>
          <button onClick={() => scrollToDf('df-pooling')} className="floating-nav-item" data-label="Pooling Opportunities"></button>
          <button onClick={() => scrollToDf('df-recurring')} className="floating-nav-item" data-label="Recurring Tail Items"></button>
      </div>

      <div className="sticky top-[125px] z-20 flex gap-2 bg-white/80 backdrop-blur-md border border-border/50 py-2 px-3 rounded-full shadow-sm mb-2 w-fit mx-auto transition-all hover:shadow-md">
          <button className="btn btn-outline text-[10px] py-1 px-3 font-bold rounded-full border-none hover:bg-primary-light hover:text-primary transition-colors" onClick={() => scrollToDf('df-pooling')}>Pooling Opportunities</button>
          <div className="w-px h-3 bg-border self-center"></div>
          <button className="btn btn-outline text-[10px] py-1 px-3 font-bold rounded-full border-none hover:bg-primary-light hover:text-primary transition-colors" onClick={() => scrollToDf('df-recurring')}>Recurring Tail Items</button>
      </div>

      {/* KPI Tiles */}
      <div id="df-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="kpi-card kpi-card-primary p-4 relative group">
              <Info size={14} className="absolute top-2 right-2 text-primary opacity-30 group-hover:opacity-100 transition-opacity" title="Projected tail spend for the next 30 days based on historical trends." />
              <div className="text-xs font-semibold text-primary mb-1">Predicted Tail Spend (30d)</div>
              <div className="text-2xl font-bold">{formatCurrency(dfData.kpis.predicted_tail_30d)}</div>
              <div className="text-[10px] text-secondary mt-1">Rolling 30d avg × 1.05 trend</div>
          </div>
          <div className="kpi-card kpi-card-success p-4 relative group">
              <Info size={14} className="absolute top-2 right-2 text-success opacity-30 group-hover:opacity-100 transition-opacity" title="Immediate opportunities to pool demand across different plants." />
              <div className="text-xs font-semibold text-success mb-1">Pool Opportunities Now</div>
              <div className="text-2xl font-bold">{dfData.kpis.pool_opportunities}</div>
              <div className="text-[10px] text-secondary mt-1">Same SKU, 2+ plants, reorder ≤30d</div>
          </div>
          <div className="kpi-card kpi-card-warning p-4 relative group">
              <Info size={14} className="absolute top-2 right-2 text-warning opacity-30 group-hover:opacity-100 transition-opacity" title="Percentage of unique tail SKUs that are covered by preferred supplier contracts." />
              <div className="text-xs font-semibold text-warning mb-1 flex items-center gap-1"><ShieldCheck size={13}/>Preferred Supplier Coverage</div>
              <div className="text-2xl font-bold">{dfData.kpis.supplier_coverage_pct?.toFixed(1)}%</div>
              <div className="text-[10px] text-secondary mt-1">Unique SKUs under active contract</div>
          </div>
          <div className="kpi-card kpi-card-danger p-4 relative group">
              <Info size={14} className="absolute top-2 right-2 text-danger opacity-30 group-hover:opacity-100 transition-opacity" title="High-frequency tail items that appear regularly but lack a formal contract." />
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
              <div className="fixed top-0 right-0 h-full w-full max-lg bg-white shadow-2xl z-50 flex flex-col animate-slideInRight border-l border-border" style={{ fontFamily: 'var(--font-family)' }}>
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
                              <td className="text-xs font-medium text-primary" style={{ maxWidth: '200px' }}>{item.agent_recommendation}</td>
                          </tr>
                      ))}
                      {dfData.recurring_tail_items.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-secondary">No recurring tail items requiring urgent contracting.</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default DemandForecastTab;

import React, { useState } from 'react';
import { AlertOctagon, Search, Zap, X, CheckCircle, ShieldCheck, TrendingUp, AlertTriangle, Send, Loader, Package, Activity, Info } from 'lucide-react';

const ConsolidationTab = ({ dashboardData, formatCurrency, contractDecisions, catalogRecommendations }) => {
  const [consolidationSearch, setConsolidationSearch] = useState('');
  const [selectedActionCategory, setSelectedActionCategory] = useState(null);
  const [selectedContractAction, setSelectedContractAction] = useState(null);
  const [rfqStatus, setRfqStatus] = useState(null);
  const [selectedCatalogAdd, setSelectedCatalogAdd] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);

  const consData = dashboardData.risk_and_consolidation;
  const consKpis = dashboardData.kpis;

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const navSections = [
    { id: 'consolidation-kpis', label: 'KPI Overview' },
    { id: 'supplier-consolidation', label: 'Supplier Consolidation' },
    { id: 'contract-actions', label: 'Contract Actions' },
    { id: 'catalog-recommendations', label: 'Catalog Recommendations' },
    { id: 'agent-strategies', label: 'Agent Strategies' },
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

      <div id="consolidation-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="kpi-card kpi-card-primary p-4 relative group">
          <Info size={14} className="absolute top-2 right-2 text-primary opacity-30 group-hover:opacity-100 transition-opacity" title="Total number of tail categories analyzed for consolidation." />
          <div className="text-sm font-semibold text-primary mb-1">Categories Analyzed</div>
          <div className="text-2xl font-bold">{consKpis.total_categories}</div>
        </div>
        <div className="kpi-card kpi-card-warning p-4 relative group">
          <Info size={14} className="absolute top-2 right-2 text-warning opacity-30 group-hover:opacity-100 transition-opacity" title="Unique suppliers identified within tail spend categories." />
          <div className="text-sm font-semibold text-warning mb-1">Tail Suppliers</div>
          <div className="text-2xl font-bold">{consKpis.tail_suppliers}</div>
        </div>
        <div className="kpi-card kpi-card-danger p-4 relative group">
          <Info size={14} className="absolute top-2 right-2 text-danger opacity-30 group-hover:opacity-100 transition-opacity" title="Number of redundant suppliers that can be eliminated through consolidation." />
          <div className="text-sm font-semibold text-danger mb-1">Can Be Removed</div>
          <div className="text-2xl font-bold">{consKpis.suppliers_removable}</div>
        </div>
        <div className="kpi-card kpi-card-success p-4 relative group">
          <Info size={14} className="absolute top-2 right-2 text-success opacity-30 group-hover:opacity-100 transition-opacity" title="Estimated annual savings achievable by consolidating tail suppliers." />
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
                          <th className="numeric">Uncontrolled spend</th>
                          <th className="numeric">Suppliers</th>
                          <th>Agent Recommends</th>
                          <th>Why</th>
                          <th className="text-center">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {contractDecisions.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-8 text-secondary">No recommendations found for this period.</td></tr>
                      )}
                      {contractDecisions.map((item, i) => (
                          <tr key={i}>
                              <td className="font-semibold text-sm">{item.category}</td>
                              <td className="numeric font-bold text-primary">{formatCurrency(item.spend)}</td>
                              <td className="numeric font-medium">{item.suppliers}</td>
                              <td><span className="badge badge-primary bg-primary/10 text-primary border-primary/20">{item.recommendation}</span></td>
                              <td className="text-xs text-secondary font-medium italic max-w-[300px]">{item.why}</td>
                              <td className="text-center">
                                  <button 
                                      className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold"
                                      style={{ backgroundColor: '#6d28d9' }}
                                      onClick={() => {
                                          if (item.recommendation === 'Run RFQ' || item.recommendation === 'Blanket PO') {
                                              setSelectedActionCategory({
                                                  ...item,
                                                  supplier_count: item.suppliers,
                                                  target_suppliers: 1,
                                                  suppliers: [], 
                                                  target_suppliers_list: [],
                                                  estimated_savings: item.spend * 0.08,
                                                  avg_risk_before: 6.5,
                                                  avg_risk_after: 2.1,
                                                  is_blanket_po: item.recommendation === 'Blanket PO'
                                              });
                                          } else {
                                              setSelectedContractAction(item);
                                          }
                                      }}
                                  >
                                      Create Contract
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
                              <span className="font-bold text-primary">{selectedContractAction.recommendation}</span>
                          </div>
                          <div className="text-sm font-medium text-secondary italic">
                              "{selectedContractAction.why}"
                          </div>
                      </div>

                      <div className="flex flex-col gap-3">
                          <div className="text-xs font-bold text-secondary uppercase">Next Steps</div>
                          <div className="text-sm text-text font-medium leading-relaxed">
                              {selectedContractAction.recommendation === 'Run RFQ' ? (
                                  <ul className="list-disc pl-5 flex flex-col gap-1">
                                      <li>Invite top 3-5 potential vendors</li>
                                      <li>Standardize technical specifications</li>
                                      <li>Request competitive commercial offers</li>
                                  </ul>
                              ) : selectedContractAction.recommendation === 'Blanket PO' ? (
                                  <ul className="list-disc pl-5 flex flex-col gap-1">
                                      <li>Select preferred vendor for volume aggregation</li>
                                      <li>Negotiate tiered pricing based on annual forecast</li>
                                      <li>Establish call-off mechanism for easier buying</li>
                                  </ul>
                              ) : (
                                  <ul className="list-disc pl-5 flex flex-col gap-1">
                                      <li>Verify historical pricing trends</li>
                                      <li>Establish direct negotiation with incumbent</li>
                                      <li>Finalize contract terms</li>
                                  </ul>
                              )}
                          </div>
                      </div>

                      <button 
                          className="btn btn-primary w-full py-3 rounded-lg font-bold mt-4 shadow-lg"
                          style={{ backgroundColor: '#6d28d9' }}
                          onClick={() => {
                              alert(`${selectedContractAction.recommendation} initiated for ${selectedContractAction.category}`);
                              setSelectedContractAction(null);
                          }}
                      >
                          Proceed to {selectedContractAction.recommendation}
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
                          <h2 className="text-lg font-bold flex items-center gap-2">
                              <Zap size={20} className="text-primary"/> {selectedActionCategory.is_blanket_po ? 'Blanket PO' : 'Action'}: {selectedActionCategory.category}
                          </h2>
                          <p className="text-xs text-secondary font-medium mt-0.5">
                              {selectedActionCategory.is_blanket_po 
                                  ? `Establish blanket agreement for ${selectedActionCategory.category}`
                                  : `Consolidate ${selectedActionCategory.supplier_count} suppliers into ${selectedActionCategory.target_suppliers}.`}
                          </p>
                      </div>
                      <button className="text-secondary hover:text-danger p-1" onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}>
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 bg-surface">
                      <div className="flex flex-col gap-5">
                          {/* Fragmentation View */}
                          <div id="consolidation-fragmentation" className="card p-0 border border-danger border-opacity-30">
                              <div className="p-3 bg-danger-bg border-b border-danger border-opacity-30 font-bold text-danger text-xs flex items-center gap-2">
                                  <AlertTriangle size={14}/> Current Fragmentation ({selectedActionCategory.supplier_count} Suppliers)
                              </div>
                              <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                  {(selectedActionCategory.suppliers || []).length > 0 ? (
                                      selectedActionCategory.suppliers.map((s, i) => (
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
                                      ))
                                  ) : (
                                      <div className="p-4 text-center text-xs text-secondary italic">Fragmentation data being calculated...</div>
                                  )}
                              </div>
                          </div>

                          {/* Recommendation View */}
                          <div className="card p-0 border border-success">
                              <div className="p-3 bg-success-bg border-b border-success font-bold text-success text-xs flex items-center gap-2">
                                  <CheckCircle size={14}/> {selectedActionCategory.is_blanket_po ? 'Recommended Strategy' : `Recommended Targets (${selectedActionCategory.target_suppliers} Suppliers)`}
                              </div>
                              <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                  {(selectedActionCategory.target_suppliers_list || []).length > 0 ? (
                                      selectedActionCategory.target_suppliers_list.map((s, i) => (
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
                                      ))
                                  ) : (
                                      <div className="p-4 bg-success-bg bg-opacity-10 text-success text-xs leading-relaxed">
                                          <strong>Optimization Strategy:</strong>
                                          <p className="mt-1">
                                              {selectedActionCategory.is_blanket_po 
                                                  ? "Aggregation of recurring volumes under a single master agreement to leverage volume-based discounting." 
                                                  : "Strategic RFQ to consolidate fragmented spend and eliminate high-risk/low-volume suppliers."}
                                          </p>
                                      </div>
                                  )}
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
                                          <div className="text-xs font-bold text-tertiary">{selectedActionCategory.is_blanket_po ? 'BLANKET PURCHASE ORDER (DRAFT)' : 'REQUEST FOR QUOTATION (DRAFT)'}</div>
                                          <div className="text-base font-bold text-primary">{selectedActionCategory.is_blanket_po ? 'BPO' : 'RFQ'}-2024-{selectedActionCategory.category.substring(0,3).toUpperCase()}-001</div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-[10px] font-bold text-secondary">DATE</div>
                                          <div className="text-xs font-bold">{new Date().toLocaleDateString()}</div>
                                      </div>
                                  </div>
                                  <div className="text-xs leading-relaxed text-secondary">
                                      <p className="mb-2">We are {selectedActionCategory.is_blanket_po ? 'issuing a draft Blanket Purchase Order' : 'inviting you to participate in a consolidation RFQ'} for the <strong>{selectedActionCategory.category}</strong> category.</p>
                                      <p className="mb-2"><strong>Total Estimated Annual Volume:</strong> {formatCurrency(selectedActionCategory.spend || (selectedActionCategory.suppliers || []).reduce((acc, curr) => acc + curr.spend, 0))}</p>
                                      <p className="mb-4">{selectedActionCategory.is_blanket_po ? 'This agreement will cover all standard requirements for the next 12 months.' : 'Please submit your best commercial offer and capacity commitment within 7 business days.'}</p>
                                      <div className="p-3 bg-surface rounded border text-[10px]">
                                          <div className="font-bold mb-1">{selectedActionCategory.is_blanket_po ? 'Contract Period:' : 'Submission Deadline:'}</div>
                                          <div>{selectedActionCategory.is_blanket_po ? '01/06/2024 - 31/05/2025' : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                                      </div>
                                  </div>
                                  <div className="flex justify-end pt-2">
                                      {rfqStatus === 'sent' ? (
                                          <div className="text-success font-bold text-sm flex items-center gap-2 bg-success-bg px-3 py-1.5 rounded-lg border border-success">
                                              <CheckCircle size={16}/> {selectedActionCategory.is_blanket_po ? 'BPO Dispatched to Supplier' : `RFQ Dispatched to ${selectedActionCategory.target_suppliers} Targets`}
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
                                              {rfqStatus === 'sending' ? 'Dispatching...' : (selectedActionCategory.is_blanket_po ? 'Confirm & Send BPO' : 'Confirm & Send RFQ')} <Send size={16}/>
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
                              {selectedActionCategory.is_blanket_po ? 'Generate BPO Document' : 'Generate RFQ Pack'} <Send size={16}/>
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
                              {selectedActionCategory.is_blanket_po ? 'Confirm & Dispatch BPO' : 'Confirm & Dispatch RFQ'} <CheckCircle size={18}/>
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
};

export default ConsolidationTab;

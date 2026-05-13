import React, { useState } from 'react';
import { AlertOctagon, Search, Zap, X, CheckCircle, ShieldCheck, TrendingUp, AlertTriangle, Send, Loader, Package, Activity, Info, List } from 'lucide-react';

const ConsolidationTab = ({ dashboardData, formatCurrency, contractDecisions, catalogRecommendations }) => {
  const [consolidationSearch, setConsolidationSearch] = useState('');
  const [selectedActionCategory, setSelectedActionCategory] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedContractAction, setSelectedContractAction] = useState(null);
  const [selectedGovernanceAction, setSelectedGovernanceAction] = useState(null);
  const [selectedGovAdvice, setSelectedGovAdvice] = useState(null);
  const [governanceStep, setGovernanceStep] = useState(0);
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

  const floatToK = (val) => {
    if (!val) return '0';
    if (val >= 10000000) return (val / 10000000).toFixed(1) + ' Cr';
    if (val >= 100000) return (val / 100000).toFixed(1) + ' L';
    if (val >= 1000) return (val / 1000).toFixed(1) + ' K';
    return val.toString();
  };

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
                  <th className="text-center">AI Strategy</th>
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
                          className="btn btn-outline text-[10px] py-1 px-3 font-bold border-primary/30 text-primary flex items-center gap-1.5 mx-auto"
                          onClick={() => setSelectedStrategy(item)}
                      >
                          <Info size={12}/> View Logic
                      </button>
                  </td>
                  <td className="text-center">
                      <button 
                          className="btn btn-primary text-xs py-1 px-3 font-bold whitespace-nowrap"
                          onClick={() => setSelectedActionCategory(item)}
                      >
                          {item.ai_strategy?.action_type || "Take Action"}
                      </button>
                  </td>
                  </tr>
              ))}
              </tbody>
          </table>
          </div>
      </div>

      <div id="contract-actions" className="card p-0 overflow-hidden border-t-4 border-t-primary mt-6">
          <div className="p-4 border-b bg-surface flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                  <h2 className="mb-0 text-lg flex items-center gap-2 text-text font-bold"><Zap size={20} className="text-primary" /> Commercial Governance Actions</h2>
                  <p className="text-xs text-secondary font-medium">Establish commercial controls and pricing governance for unmanaged tail spend categories.</p>
              </div>
          </div>
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
              <table>
                  <thead>
                      <tr>
                          <th>Category</th>
                          <th className="numeric">Uncontrolled spend</th>
                          <th className="numeric">Suppliers</th>
                          <th>AI Recommendation</th>
                          <th className="text-center">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {contractDecisions.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-8 text-secondary">No recommendations found for this period.</td></tr>
                      )}
                      {contractDecisions.map((item, i) => (
                          <tr key={i}>
                              <td className="font-semibold text-sm">{item.category}</td>
                              <td className="numeric font-bold text-primary">{formatCurrency(item.spend)}</td>
                              <td className="numeric font-medium">{item.suppliers}</td>
                              <td className="text-center">
                                  <button 
                                      className="btn btn-outline text-[10px] py-1 px-3 font-bold border-primary/30 text-primary flex items-center gap-1.5 mx-auto rounded-full hover:bg-primary/5 transition-colors"
                                      onClick={() => setSelectedGovAdvice(item)}
                                  >
                                      <Info size={12}/> View Advice
                                  </button>
                              </td>
                              <td className="text-center">
                                  <button 
                                      className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                                      style={{ backgroundColor: '#6d28d9', borderColor: '#6d28d9' }}
                                      onClick={() => {
                                          setSelectedGovernanceAction(item);
                                          setGovernanceStep(0);
                                      }}
                                  >
                                      {item.action_label || "Take Action"}
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Strategic Governance Advice Popover */}
      {selectedGovAdvice && (
          <>
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120] animate-fadeIn" onClick={() => setSelectedGovAdvice(null)}></div>
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-3xl shadow-3xl z-[130] overflow-hidden animate-scaleIn border border-primary/20">
                  <div className="p-6 bg-surface border-b flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-black text-text flex items-center gap-2">
                              <Zap size={24} className="text-primary"/> Strategic Governance Advice
                          </h2>
                          <p className="text-xs text-secondary font-bold uppercase tracking-widest mt-1">{selectedGovAdvice.category}</p>
                      </div>
                      <button onClick={() => setSelectedGovAdvice(null)} className="text-secondary hover:text-danger p-1"><X size={24}/></button>
                  </div>
                  
                  <div className="p-8 flex flex-col gap-8">
                      {/* Recommendation Section */}
                      <div>
                          <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-2">Recommendation</div>
                          <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl">
                              <div className="text-base font-black text-primary leading-tight">
                                  {selectedGovAdvice.gov_recommendation}
                              </div>
                          </div>
                      </div>

                      {/* Reasoning Section */}
                      <div>
                          <div className="text-[10px] font-black text-secondary/60 uppercase tracking-widest mb-2">Reasoning</div>
                          <div className="p-6 bg-surface-alt border border-border/50 rounded-2xl">
                              <div className="text-sm font-bold text-secondary leading-relaxed whitespace-pre-line italic">
                                  {selectedGovAdvice.gov_reasoning}
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-4 mt-2">
                          <button 
                              className="btn btn-primary flex-1 py-4 rounded-xl font-bold text-base shadow-xl flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#6d28d9' }}
                              onClick={() => {
                                  setSelectedGovernanceAction(selectedGovAdvice);
                                  setSelectedGovAdvice(null);
                                  setGovernanceStep(0);
                              }}
                          >
                              {selectedGovAdvice.action_label} <Send size={20}/>
                          </button>
                      </div>
                  </div>
              </div>
          </>
      )}

      {/* AI Strategy Popover (Table 1) */}
      {selectedStrategy && (
          <>
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] animate-fadeIn" onClick={() => setSelectedStrategy(null)}></div>
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-3xl z-[90] overflow-hidden animate-scaleIn border border-primary/20">
                  <div className="p-6 bg-surface border-b flex justify-between items-center">
                      <div>
                          <h2 className="text-xl font-black text-text flex items-center gap-2">
                              <Zap size={24} className="text-primary"/> Strategic Sourcing Brief
                          </h2>
                          <p className="text-xs text-secondary font-bold uppercase tracking-widest mt-1">{selectedStrategy.category}</p>
                      </div>
                      <button onClick={() => setSelectedStrategy(null)} className="text-secondary hover:text-danger p-1"><X size={24}/></button>
                  </div>
                  
                  <div className="p-8 flex flex-col gap-8">
                      <div>
                          <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-2">AI Decision</div>
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                              <div className="text-base font-bold text-primary leading-tight">
                                  {String(selectedStrategy.ai_strategy?.decision || "").replace('AI DECISION:', '').trim() || "Consolidate to preferred vendors"}
                              </div>
                          </div>
                      </div>
                      <div>
                          <div className="text-[10px] font-black text-secondary/60 uppercase tracking-widest mb-2">Why</div>
                          <div className="text-sm font-medium text-secondary leading-relaxed bg-surface-alt p-4 rounded-xl border border-border/50">
                              {String(selectedStrategy.ai_strategy?.why || "").replace('WHY:', '').trim() || "Fragmentation is causing price variance."}
                          </div>
                      </div>
                      <div>
                          <div className="text-[10px] font-black text-success/70 uppercase tracking-widest mb-2">Analysis</div>
                          <div className="p-5 bg-success/5 border border-success/20 rounded-xl">
                              <div className="text-sm text-secondary font-bold leading-relaxed whitespace-pre-line">
                                  {String(selectedStrategy.ai_strategy?.strategy || "").replace('ANALYSIS:', '').trim() || "Analyze and consolidate."}
                              </div>
                          </div>
                      </div>
                      <button 
                          className="btn btn-primary w-full py-4 rounded-xl font-bold"
                          onClick={() => {
                              setSelectedActionCategory(selectedStrategy);
                              setSelectedStrategy(null);
                          }}
                      >
                          {selectedStrategy.ai_strategy?.action_type || "Take Action"}
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
                          {/* Metrics Strip */}
                          <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                                  <div className="text-[10px] font-bold text-secondary uppercase">Current</div>
                                  <div className="text-lg font-black text-danger">{selectedActionCategory.supplier_count} Vendors</div>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                                  <div className="text-[10px] font-bold text-secondary uppercase">Target</div>
                                  <div className="text-lg font-black text-success">{selectedActionCategory.target_suppliers} Vendors</div>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                                  <div className="text-[10px] font-bold text-secondary uppercase">Benefit</div>
                                  <div className="text-lg font-black text-primary">₹{floatToK(selectedActionCategory.estimated_savings)}</div>
                              </div>
                          </div>

                          {/* Recommendation Logic Branching */}
                          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                              selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' 
                              ? 'bg-primary/5 border-primary/20' 
                              : 'bg-success/5 border-success/20'
                          }`}>
                              <Zap size={20} className={selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'text-primary' : 'text-success'}/>
                              <div>
                                  <div className="text-sm font-bold text-text">
                                      {selectedActionCategory.ai_strategy?.action_type || 'Execute RFQ'}
                                  </div>
                                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                                      {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' 
                                      ? 'AI suggests immediate migration. Stop buying from tail vendors and shift volume to the primary partner.'
                                      : 'AI suggests a competitive bid. Consolidate volume to lock in better market rates with core vendors.'}
                                  </p>
                              </div>
                          </div>

                          {/* Dynamic Content: Matrix vs Migration Notice */}
                          {selectedActionCategory.ai_strategy?.action_type !== 'Migrate Spend' ? (
                            <div className="card p-0 border border-border overflow-hidden rounded-2xl shadow-sm">
                                <div className="p-3 bg-surface border-b font-bold text-xs flex justify-between items-center">
                                    <span className="flex items-center gap-2"><Package size={14}/> Supplier Matrix</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-danger/10 text-danger rounded-full uppercase">Current Status</span>
                                </div>
                                <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto bg-surface-alt">
                                    {(selectedActionCategory.suppliers || []).map((s, i) => (
                                        <div key={i} className="p-3 border rounded-xl bg-white shadow-sm flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-sm">{s.supplier_name}</div>
                                                <div className="text-[10px] text-secondary font-medium">Vol: {formatCurrency(s.spend)} | Risk: {s.risk_score}</div>
                                            </div>
                                            <div className="text-right">
                                                {i < selectedActionCategory.target_suppliers ? (
                                                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-lg">RETAIN</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-1 rounded-lg">REMOVE</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                          ) : (
                            <div className="p-5 bg-primary/5 border border-dashed border-primary/40 rounded-2xl text-center flex flex-col items-center gap-3">
                                <Send size={32} className="text-primary/40 mt-2"/>
                                <div className="text-sm font-bold text-primary">Migration Execution Flow</div>
                                <p className="text-xs text-secondary leading-relaxed px-4">
                                    This category is ready for immediate migration. No RFQ needed. Generating "Notice of Intent to Migrate" for tail suppliers.
                                </p>
                            </div>
                          )}

                          {/* Document Preview */}
                          {rfqStatus && rfqStatus !== 'preparing' && (
                              <div className="card p-5 border bg-white shadow-xl flex flex-col gap-4 animate-scaleIn rounded-2xl border-primary/20">
                                  <div className="flex justify-between items-start border-b pb-3">
                                      <div>
                                          <div className="text-[10px] font-black text-tertiary uppercase">
                                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'MIGRATION NOTICE (DRAFT)' : 'RFQ DOCUMENT (DRAFT)'}
                                          </div>
                                          <div className="text-base font-black text-primary">
                                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'MIG' : 'RFQ'}-2026-{selectedActionCategory.category.substring(0,3).toUpperCase()}
                                          </div>
                                      </div>
                                      <Zap size={24} className="text-primary/20"/>
                                  </div>
                                  <div className="text-xs leading-relaxed text-secondary font-medium">
                                      {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? (
                                          <p>Notify <strong>{selectedActionCategory.supplier_count - selectedActionCategory.target_suppliers}</strong> vendors of spend redirection to primary partners within 48 hours.</p>
                                      ) : (
                                          <p>Launch bid for ₹{floatToK(selectedActionCategory.estimated_savings)} consolidation volume. Deadline: 7 days.</p>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="p-6 border-t bg-surface flex flex-col gap-3">
                      {!rfqStatus || rfqStatus === 'preparing' ? (
                          <button 
                              className="btn btn-primary w-full py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 text-base"
                              onClick={() => {
                                  setRfqStatus('preparing');
                                  setTimeout(() => setRfqStatus('preview'), 800);
                              }}
                          >
                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'Review Migration Notice' : 'Review RFQ Document'} <Send size={20}/>
                          </button>
                      ) : rfqStatus === 'preview' ? (
                          <button 
                              className="btn btn-success w-full py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 text-base"
                              onClick={() => {
                                  setRfqStatus('sending');
                                  setTimeout(() => setRfqStatus('sent'), 1200);
                              }}
                          >
                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'Confirm Migration' : 'Confirm & Send RFQ'} <CheckCircle size={20}/>
                          </button>
                      ) : rfqStatus === 'sending' ? (
                          <button className="btn btn-outline w-full py-4 rounded-xl font-bold opacity-70 animate-pulse" disabled>
                              Processing...
                          </button>
                      ) : (
                          <button 
                              className="btn btn-outline w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-base"
                              onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}
                          >
                              <CheckCircle size={20} className="text-success"/> Done & Close
                          </button>
                      )}
                      <button 
                          className="btn btn-ghost w-full py-2 text-xs font-bold text-secondary"
                          onClick={() => { setSelectedActionCategory(null); setRfqStatus(null); }}
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </>
      )}

      {/* Governance Workflow Side Pane */}
      {selectedGovernanceAction && (
          <>
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] animate-fadeIn" onClick={() => setSelectedGovernanceAction(null)}></div>
              <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-3xl z-[110] flex flex-col animate-slideInRight border-l border-primary/20">
                  <div className="p-6 border-b bg-surface flex justify-between items-center">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <Zap size={20} className="text-primary"/>
                              <h2 className="text-lg font-black text-text uppercase">Sourcing Workflow</h2>
                          </div>
                          <p className="text-xs text-secondary font-bold">{selectedGovernanceAction.category} | {selectedGovernanceAction.gov_strategy}</p>
                      </div>
                      <button className="text-secondary hover:text-danger p-1" onClick={() => setSelectedGovernanceAction(null)}>
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 bg-surface">
                      <div className="flex flex-col gap-6">
                          {/* Strategy Summary */}
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                              <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Commercial Goal</div>
                              <div className="text-base font-bold text-primary mb-2">{selectedGovernanceAction.gov_strategy}</div>
                              <p className="text-xs text-secondary leading-relaxed font-medium mb-3">
                                  {selectedGovernanceAction.gov_why}
                              </p>
                              <div className="text-[10px] font-black text-success/70 uppercase tracking-widest mb-1 pt-3 border-t border-primary/10">Expected Impact</div>
                              <p className="text-xs text-secondary leading-relaxed font-medium whitespace-pre-line">
                                  {selectedGovernanceAction.gov_impact}
                              </p>
                          </div>

                          {/* Interactive Workflow Steps */}
                          <div className="flex flex-col gap-3">
                              <div className="text-[10px] font-black text-secondary uppercase tracking-widest px-1">Execution Steps</div>
                              {(selectedGovernanceAction.workflow || []).map((step, idx) => (
                                  <div 
                                      key={idx} 
                                      className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${
                                          idx < governanceStep 
                                          ? 'bg-success/5 border-success/30 opacity-60' 
                                          : idx === governanceStep 
                                          ? 'bg-white border-primary shadow-md scale-[1.02]' 
                                          : 'bg-surface-alt border-border opacity-40'
                                      }`}
                                  >
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                          idx < governanceStep ? 'bg-success text-white' : 'bg-primary text-white'
                                      }`}>
                                          {idx < governanceStep ? <CheckCircle size={16}/> : idx + 1}
                                      </div>
                                      <div className="flex-1">
                                          <div className={`text-sm font-bold ${idx < governanceStep ? 'text-success line-through' : 'text-text'}`}>
                                              {step}
                                          </div>
                                      </div>
                                      {idx === governanceStep && (
                                          <button 
                                              className="btn btn-primary text-[10px] py-1 px-3 font-bold uppercase rounded-lg"
                                              onClick={() => setGovernanceStep(idx + 1)}
                                          >
                                              Complete
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-6 border-t bg-surface flex flex-col gap-3">
                      {governanceStep >= (selectedGovernanceAction.workflow || []).length ? (
                          <div className="flex flex-col gap-4 animate-scaleIn">
                              {/* Document Draft Preview */}
                              <div className="p-5 bg-white border-2 border-primary/20 rounded-2xl shadow-inner mb-2">
                                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                                      <div>
                                          <div className="text-[10px] font-black text-tertiary uppercase tracking-widest">Generated Document</div>
                                          <div className="text-sm font-black text-primary uppercase">
                                              {selectedGovernanceAction.action_label.split(' ').slice(-1)[0]}-2026-{selectedGovernanceAction.category.substring(0,3).toUpperCase()}
                                          </div>
                                      </div>
                                      <div className="bg-primary/10 p-2 rounded-lg">
                                          <Package size={20} className="text-primary"/>
                                      </div>
                                  </div>
                                  <div className="text-xs text-secondary font-medium leading-relaxed italic">
                                      {selectedGovernanceAction.action_label.includes('RFQ') ? (
                                          <p>This <strong>Sourcing RFQ</strong> covers ₹{floatToK(selectedGovernanceAction.spend)} of fragmented spend. It includes technical specs and commercial T&Cs ready for market bidding.</p>
                                      ) : selectedGovernanceAction.action_label.includes('Blanket') ? (
                                          <p>This <strong>Blanket Purchase Agreement</strong> locks in pricing for {selectedGovernanceAction.category} for the next 12 months based on historical volume.</p>
                                      ) : selectedGovernanceAction.action_label.includes('Rate') ? (
                                          <p>This <strong>Rate Contract (MSA)</strong> standardizes pricing for all services. Vendors will be required to align with these fixed rate cards.</p>
                                      ) : (
                                          <p>This <strong>Mini-Bid Framework</strong> establishes a panel of {selectedGovernanceAction.suppliers} approved vendors. Future projects will be bid among this group.</p>
                                      )}
                                  </div>
                              </div>
                              
                              <button 
                                  className="btn btn-success w-full py-4 rounded-xl font-black shadow-xl flex items-center justify-center gap-2 text-base animate-pulse"
                                  onClick={() => {
                                      alert(`${selectedGovernanceAction.action_label} finalized! Draft document has been sent to the Category Manager for approval.`);
                                      setSelectedGovernanceAction(null);
                                  }}
                              >
                                  Confirm & Lock Terms <ShieldCheck size={20}/>
                              </button>
                          </div>
                      ) : (
                          <div className="text-center text-[10px] font-bold text-secondary uppercase tracking-widest py-2">
                              {governanceStep} of {(selectedGovernanceAction.workflow || []).length} steps completed
                          </div>
                      )}
                      <button 
                          className="btn btn-ghost w-full py-2 text-xs font-bold text-secondary"
                          onClick={() => setSelectedGovernanceAction(null)}
                      >
                          Cancel Workflow
                      </button>
                  </div>
              </div>
          </>
      )}

      {/* Catalog Recommendations */}
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
    </div>
  );
};

export default ConsolidationTab;

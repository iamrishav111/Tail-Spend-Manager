import React, { useState } from 'react';
import { TrendingUp, AlertOctagon, Package, Users, AlertTriangle, Zap, BarChart2, Activity, Search, Filter, UserCheck, Mail, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

const OverviewTab = ({ dashboardData, formatCurrency }) => {
  const TABLE_PAGE_SIZE = 10;
  const CATEGORY_PAGE_SIZE = 5;

  const [categoryPage, setCategoryPage] = useState(1);
  
  const [plantSearch, setPlantSearch] = useState('');
  const [plantSortCol, setPlantSortCol] = useState('tail_spend');
  const [plantSortDesc, setPlantSortDesc] = useState(true);
  const [plantPage, setPlantPage] = useState(1);

  const [spendSearch, setSpendSearch] = useState('');
  const [spendSortCol, setSpendSortCol] = useState('amount');
  const [spendSortDesc, setSpendSortDesc] = useState(true);
  const [spendPage, setSpendPage] = useState(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="kpi-card kpi-card-danger p-4">
          <div className="text-sm font-semibold text-danger mb-1 flex justify-between items-center">
            <span>Total Tail Spend</span>
            <AlertOctagon size={16} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(dashboardData.kpis?.total_tail_spend || 0)}</div>
        </div>
        <div className="kpi-card kpi-card-warning p-4">
          <div className="text-sm font-semibold text-warning mb-1 flex justify-between items-center">
            <span>Maverick Spend</span>
            <AlertTriangle size={16} />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(dashboardData.kpis?.maverick_spend || 0)}</div>
        </div>
        <div className="kpi-card kpi-card-primary p-4">
          <div className="text-sm font-semibold text-primary mb-1 flex justify-between items-center">
            <span>Contract Coverage</span>
            <Package size={16} />
          </div>
          <div className="text-2xl font-bold">{((dashboardData.kpis?.contract_coverage_pct || 0) * 100).toFixed(0)}%</div>
        </div>
        <div className="kpi-card kpi-card-success p-4">
          <div className="text-sm font-semibold text-success mb-1 flex justify-between items-center">
            <span>Tail Suppliers</span>
            <Users size={16} />
          </div>
          <div className="text-2xl font-bold">{dashboardData.kpis?.tail_supplier_count || 0}</div>
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
                {(dashboardData.root_causes || []).map((item, i) => (
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
                {(dashboardData.category_analysis || []).slice((categoryPage - 1) * CATEGORY_PAGE_SIZE, categoryPage * CATEGORY_PAGE_SIZE).map((item, i) => {
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
};

export default OverviewTab;

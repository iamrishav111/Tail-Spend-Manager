import React, { useState } from 'react';
import { Package } from 'lucide-react';

const CategorySuppliersTab = ({ dashboardData, formatCurrency, renderBadge }) => {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [showOtherSuppliers, setShowOtherSuppliers] = useState(false);

  const categoryAnalysis = dashboardData.category_analysis || [];
  const selectedCatData = categoryAnalysis.find(c => c.category === selectedCategory);
  const uniqueCategories = categoryAnalysis.map(c => c.category);

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
                      <div className="card p-0 overflow-hidden bg-surface border border-dashed border-border">
                          <button 
                              className="w-full p-4 flex justify-between items-center hover:bg-surface-hover transition-colors"
                              onClick={() => setShowOtherSuppliers(!showOtherSuppliers)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className="bg-white p-2 rounded-lg border border-border shadow-sm"><Package size={18} className="text-secondary"/></div>
                                  <div className="text-left">
                                      <h4 className="text-sm font-bold text-text">Other Available Suppliers</h4>
                                      <p className="text-[10px] text-tertiary font-medium">Explore {otherSuppliers.length} additional non-preferred vendors for this category.</p>
                                  </div>
                              </div>
                              <div className="btn btn-outline text-xs px-4 py-1.5 font-bold">{showOtherSuppliers ? 'Hide' : 'Show All'}</div>
                          </button>
                          
                          {showOtherSuppliers && (
                              <div className="table-container border-none p-2 bg-white" style={{ borderRadius: 0 }}>
                                  <table>
                                      <thead>
                                          <tr>
                                              <th>Supplier Name</th>
                                              <th className="numeric">Spend</th>
                                              <th className="numeric">Risk Avg</th>
                                              <th className="text-center">Comp. Risk</th>
                                              <th className="text-center">Del. Risk</th>
                                              <th className="text-center">Geo Risk</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {otherSuppliers.map((supp, i) => {
                                              const avgRisk = (supp.geography_risk + supp.compliance_risk + supp.delivery_risk) / 3;
                                              return (
                                                  <tr key={i}>
                                                      <td className="font-bold text-sm">{supp.supplier_name}</td>
                                                      <td className="numeric font-bold text-primary">{formatCurrency(supp.spend)}</td>
                                                      <td className="numeric font-black" style={{ color: avgRisk > 6 ? 'var(--color-danger)' : avgRisk > 3 ? 'var(--color-warning)' : 'var(--color-success)' }}>{avgRisk.toFixed(1)}</td>
                                                      <td className="text-center font-bold text-xs">{supp.compliance_risk}/10</td>
                                                      <td className="text-center font-bold text-xs">{supp.delivery_risk}/10</td>
                                                      <td className="text-center font-bold text-xs">{supp.geography_risk}/10</td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          );
      })()}
    </div>
  );
};

export default CategorySuppliersTab;

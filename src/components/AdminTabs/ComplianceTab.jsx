import React from 'react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';

const ComplianceTab = ({ dashboardData, formatCurrency, renderBadge }) => {
  const cData = dashboardData.compliance;
  
  if (!cData) return null;

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
              {(!cData.alerts || cData.alerts.length === 0) ? <p className="text-sm text-secondary font-medium">No alerts.</p> : cData.alerts.map((a, i) => (
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
                {(cData.invoice_holds || []).map((issue, i) => (
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
                  {(cData.category_compliance || []).map((c, i) => (
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
              <h3 className="mb-0">Buyer Compliance Leaderboard</h3>
              </div>
              <div className="table-container border-none" style={{ borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                      <th>Buyer</th>
                      <th className="numeric">Maverick Spend</th>
                      <th className="numeric">Compliance</th>
                  </tr>
                  </thead>
                  <tbody>
                  {(cData.buyer_compliance || []).map((b, i) => (
                      <tr key={i}>
                      <td className="font-semibold">{b.buyer_name}</td>
                      <td className="numeric font-bold text-danger">{formatCurrency(b.maverick_spend)}</td>
                      <td className="numeric">
                          <div className="flex items-center justify-end gap-2">
                              <progress className={`progress w-16 ${b.compliance_pct > 80 ? 'progress-success' : b.compliance_pct > 50 ? 'progress-warning' : 'progress-danger'}`} value={b.compliance_pct} max="100"></progress>
                              <span className="text-xs font-bold">{b.compliance_pct.toFixed(0)}%</span>
                          </div>
                      </td>
                      </tr>
                  ))}
                  </tbody>
              </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ComplianceTab;

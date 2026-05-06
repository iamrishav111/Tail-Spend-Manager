import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader, Info, CheckCircle, Clock, Zap } from 'lucide-react';

const PurchaseHistoryTab = ({ formatCurrency }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    try {
      const res = await fetch(`${API_BASE_URL}/api/purchase-history`);
      const json = await res.json();
      if (json.status === 'success') {
        setHistory(json.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredHistory = history.filter(item => {
    const matchSearch = (item.sku || '').toLowerCase().includes(search.toLowerCase()) || 
                        (item.supplier_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ['All', ...Array.from(new Set(history.map(item => item.status)))];

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4 flex flex-wrap gap-4 items-center justify-between bg-surface border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-secondary" />
            <input 
              type="text" 
              placeholder="Search SKU, Supplier, Category..." 
              className="input text-sm py-1.5 px-3"
              style={{ minWidth: '300px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-secondary" />
            <span className="text-xs font-bold text-secondary uppercase">Status:</span>
            <select className="input text-sm py-1.5 px-3" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="text-xs font-bold text-secondary">{filteredHistory.length} Transactions found</div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader size={40} className="text-primary animate-spin" />
          <p className="text-secondary font-medium">Loading Purchase History...</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border-t-4 border-t-primary">
          <div className="table-container border-none" style={{ borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Order Date</th>
                  <th>SKU / Item</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th className="numeric">Quantity</th>
                  <th className="numeric">Total Amount</th>
                  <th className="text-center">Status</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, i) => (
                  <tr key={i}>
                    <td className="text-xs font-medium text-secondary">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="font-bold text-sm">{item.sku}</td>
                    <td className="text-xs font-semibold text-tertiary">{item.category}</td>
                    <td className="text-xs font-bold text-primary">{item.supplier_name}</td>
                    <td className="numeric font-medium">{item.total_quantity?.toLocaleString()}</td>
                    <td className="numeric font-bold text-text">{formatCurrency(item.amount)}</td>
                    <td className="text-center">
                      <span className={`badge ${item.status === 'Created' ? 'badge-primary' : 'badge-success'} text-[10px] font-bold`}>
                        {item.status === 'Created' ? <Clock size={10} className="mr-1"/> : <CheckCircle size={10} className="mr-1"/>}
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.is_pooled ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-warning">
                          <Zap size={10}/> POOLED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-secondary">REGULAR</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-secondary italic">No purchase history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistoryTab;

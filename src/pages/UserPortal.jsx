import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CheckCircle, ShieldAlert, Package, Clock, Users, AlertTriangle } from 'lucide-react';

const UserPortal = () => {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const [predictedL1, setPredictedL1] = useState(null);
  const [predictedL2, setPredictedL2] = useState(null);
  const [preferredSuppliers, setPreferredSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [activeTab, setActiveTab] = useState('Request');
  
  const [showNonPreferredWarning, setShowNonPreferredWarning] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState([]);
  const [poHistory, setPoHistory] = useState([]);
  const [viewingPO, setViewingPO] = useState(null);

  const THRESHOLD = 10000;

  useEffect(() => {
    document.body.classList.remove('admin-body');
  }, []);

  useEffect(() => {
    if (activeTab === 'History') {
        fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
      try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
          const res = await fetch(`${API_BASE_URL}/api/purchase-history`);
          const json = await res.json();
          if (json.status === 'success') {
              setPoHistory(json.data);
          }
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    const classify = async () => {
        if (!description || description.length < 5) {
            setPredictedL1(null);
            setPredictedL2(null);
            setPreferredSuppliers([]);
            setSelectedSupplier(null);
            return;
        }
        setIsClassifying(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
            const res = await fetch(`${API_BASE_URL}/api/classify-purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setPredictedL1(json.data.l1_category);
                setPredictedL2(json.data.predicted_category);
                setPreferredSuppliers(json.data.preferred_suppliers || []);
                setSelectedSupplier(null); // Reset selection
            }
        } catch (e) {
            console.error(e);
        }
        setIsClassifying(false);
    };

    const debounce = setTimeout(() => { classify(); }, 800);
    return () => clearTimeout(debounce);
  }, [description]);

  const handleSupplierSelect = (supp) => {
      setSelectedSupplier(supp);
      if (!supp.is_preferred) {
          setShowNonPreferredWarning(true);
      } else {
          setShowNonPreferredWarning(false);
      }
  };

  const amount = selectedSupplier ? selectedSupplier.contracted_price * quantity : 0;
  
  const bestPrice = preferredSuppliers.length > 0 
      ? Math.min(...preferredSuppliers.map(s => s.contracted_price)) 
      : 0;
      
  const leakage = selectedSupplier ? (selectedSupplier.contracted_price - bestPrice) * quantity : 0;
  
  const requiresApproval = amount > THRESHOLD;

  const formatCurrency = (value) => `₹${value.toLocaleString('en-IN')}`;

  const submitPO = async (status) => {
      const poData = {
          description,
          quantity: parseInt(quantity),
          category: predictedL2,
          supplier_id: selectedSupplier.supplier_id,
          supplier_name: selectedSupplier.supplier_name,
          amount,
          status,
          timestamp: new Date().toISOString()
      };
      
      try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
          await fetch(`${API_BASE_URL}/api/submit-po`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(poData)
          });
          // Reset form and go to history
          setDescription('');
          setQuantity(1);
          setPredictedL1(null);
          setPredictedL2(null);
          setPreferredSuppliers([]);
          setSelectedSupplier(null);
          setSelectedApprovers([]);
          setActiveTab('History');
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="min-h-screen bg-background">
        <div className="header-nav flex justify-between items-center mb-8 bg-surface">
            <div className="flex items-center gap-3">
                <div className="bg-primary text-white p-2 rounded-lg"><ShoppingBag size={20} /></div>
                <div>
                    <h1 className="mb-0 text-xl text-primary">Employee Purchasing</h1>
                </div>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
                <div className="text-secondary">Logged in as: <span className="text-text font-bold">Ravi Kumar</span></div>
                <button className="btn btn-outline py-1 px-3" onClick={() => navigate('/')}>Logout</button>
            </div>
        </div>

        <div className="container" style={{ maxWidth: '1000px', paddingBottom: '4rem' }}>
            <div className="tabs-container" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
                <button className={`tab ${activeTab === 'Request' ? 'active' : ''}`} onClick={() => setActiveTab('Request')}>
                    New Request
                </button>
                <button className={`tab ${activeTab === 'History' ? 'active' : ''}`} onClick={() => setActiveTab('History')}>
                    Purchase History
                </button>
            </div>

            {activeTab === 'Request' && (
                <div className="card border-t-4 border-t-primary p-8">
                    <h2 className="mb-6">Create Purchase Request</h2>
                    
                    <div className="flex flex-col gap-6">
                        {/* Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-3">
                                <label className="input-label">WHAT DO YOU WANT TO BUY?</label>
                                <input 
                                    type="text" 
                                    className="input" 
                                    placeholder="e.g. Safety helmets, hydraulic fluid, laptops" 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="input-label">QUANTITY</label>
                                <input 
                                    type="number" 
                                    className="input font-bold" 
                                    min="1"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Classification Box */}
                        {(isClassifying || predictedL2) && (
                            <div className="flex flex-col gap-4">
                                <div className="p-5 bg-blue-light border border-blue-border rounded-lg flex flex-col gap-2">
                                    <label className="input-label flex items-center gap-2 mb-0">
                                        AUTO-FILLED CATEGORY
                                        <span className="badge badge-blue">AI CLASSIFIED</span>
                                    </label>
                                    {isClassifying ? (
                                        <div className="font-bold text-blue animate-pulse">Analyzing semantics...</div>
                                    ) : (
                                        <div className="font-bold text-blue text-lg flex items-center gap-2">
                                            <Package size={20}/> {predictedL1} → {predictedL2}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Suppliers Array */}
                                {!isClassifying && preferredSuppliers.length > 0 && (
                                    <div className="border border-border rounded-lg p-5 bg-surface">
                                        <label className="input-label flex items-center gap-2 mb-3 text-primary">
                                            SELECT SUPPLIER
                                            <span className="badge badge-primary px-2 py-0.5 text-[10px]">ACTIVE CONTRACTS</span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {preferredSuppliers.map((supp, i) => {
                                                const isSelected = selectedSupplier?.supplier_id === supp.supplier_id;
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => handleSupplierSelect(supp)}
                                                        className={`card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${isSelected ? 'border-primary bg-primary-light' : 'border-border'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-bold text-sm truncate" title={supp.supplier_name}>{supp.supplier_name}</div>
                                                            {supp.is_preferred && <span className="badge badge-success text-[10px]">Pref</span>}
                                                        </div>
                                                        <div className="text-xl font-bold text-text mb-1">
                                                            {formatCurrency(supp.contracted_price)} <span className="text-xs font-medium text-secondary">/ unit</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] text-secondary font-medium">
                                                            <span className={supp.risk_score > 6 ? 'text-danger' : supp.risk_score > 3 ? 'text-warning' : 'text-success'}>Risk: {supp.risk_score}/10</span>
                                                            <span>MOQ: {supp.moq}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Order Summary & Routing */}
                        {selectedSupplier && (
                            <div className="mt-4 border-t pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="mb-0">Order Summary</h3>
                                    <div className="text-2xl font-bold text-text">Total: {formatCurrency(amount)}</div>
                                </div>
                                
                                {leakage > 0 && (
                                    <div className="mb-4 alert-card alert-high bg-danger-bg">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-danger text-white flex-shrink-0">
                                            <AlertTriangle size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-danger">Price Leakage Warning</div>
                                            <div className="text-sm font-medium text-danger opacity-90">
                                                You selected a more expensive supplier. Estimated leakage: <strong>{formatCurrency(leakage)}</strong>.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showNonPreferredWarning && (
                                    <div className="mb-4 alert-card alert-high border-warning">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-warning text-white flex-shrink-0">
                                            <ShieldAlert size={16} />
                                        </div>
                                        <div className="w-full">
                                            <div className="font-bold text-warning">Non-Preferred Supplier Selected</div>
                                            <div className="text-sm font-medium text-secondary mt-1">
                                                You are selecting a non-preferred supplier. This may impact compliance and savings.
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <input type="checkbox" id="confirm_nonpref" className="cursor-pointer" />
                                                <label htmlFor="confirm_nonpref" className="text-xs font-bold cursor-pointer text-text">I acknowledge the risks</label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {requiresApproval ? (
                                    <div className="card bg-surface border-warning-border border mt-4">
                                        <h4 className="font-bold text-warning flex items-center gap-2 mb-3"><ShieldAlert size={18}/> Requires Management Approval</h4>
                                        <p className="text-sm text-secondary font-medium mb-4">Amount {formatCurrency(amount)} exceeds the {formatCurrency(THRESHOLD)} auto-approval limit.</p>
                                        
                                        <label className="input-label">ADD APPROVERS (Select up to 3)</label>
                                        <div className="flex gap-3 mb-6">
                                            {['Manager', 'Finance', 'Procurement'].map(role => (
                                                <button 
                                                    key={role}
                                                    onClick={() => {
                                                        if (selectedApprovers.includes(role)) setSelectedApprovers(selectedApprovers.filter(r => r !== role));
                                                        else if (selectedApprovers.length < 3) setSelectedApprovers([...selectedApprovers, role]);
                                                    }}
                                                    className={`btn ${selectedApprovers.includes(role) ? 'btn-primary' : 'btn-outline'} text-sm py-1`}
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <button 
                                            className="btn btn-primary w-full py-3 text-base"
                                            disabled={selectedApprovers.length === 0}
                                            onClick={() => submitPO('Pending Approval')}
                                        >
                                            <Users size={18}/> Submit for Approval
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <button 
                                            className="btn btn-primary bg-success hover:bg-success border-none w-full py-3 text-base font-bold shadow-sm"
                                            onClick={() => submitPO('Approved')}
                                        >
                                            <CheckCircle size={18}/> Submit PO (Auto-Approved)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'History' && (
                <div className="card p-0 overflow-hidden border-t-4 border-t-primary">
                    <div className="p-6 border-b bg-surface flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                        <Clock size={20} className="text-primary"/> <h2 className="mb-0">My Purchase History</h2>
                    </div>
                    <div className="table-container border-none" style={{ borderRadius: 0 }}>
                        <table>
                        <thead>
                            <tr>
                            <th>Date</th>
                            <th>PO Number</th>
                            <th>Description</th>
                            <th>Category L2</th>
                            <th>Supplier</th>
                            <th className="numeric">Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {poHistory.length === 0 ? (
                                <tr><td colSpan="9" className="text-center py-8 text-secondary font-medium">No purchase history found.</td></tr>
                            ) : (
                                poHistory.slice().reverse().map((po, i) => (
                                    <tr key={i}>
                                        <td className="font-medium text-secondary">{new Date(po.timestamp).toLocaleDateString()}</td>
                                        <td className="font-bold text-primary">{po.po_number || 'N/A'}</td>
                                        <td className="font-bold">{po.description} <span className="text-xs text-tertiary ml-1">×{po.quantity}</span></td>
                                        <td className="font-medium text-secondary">{po.category}</td>
                                        <td className="font-medium text-text">{po.supplier_name}</td>
                                        <td className="numeric font-bold">{formatCurrency(po.amount)}</td>
                                        <td>
                                            <span className={`badge ${po.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn btn-outline text-xs py-1 px-2"
                                                onClick={() => setViewingPO(po)}
                                            >
                                                View PO
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
        
        {viewingPO && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="card w-full max-w-2xl">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="mb-0 flex items-center gap-2 text-primary"><Package size={24}/> Purchase Order: {viewingPO.po_number || 'N/A'}</h2>
                        <button className="btn btn-outline" onClick={() => setViewingPO(null)}>Close</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <div className="text-xs font-bold text-secondary mb-1">DATE</div>
                            <div className="font-semibold">{new Date(viewingPO.timestamp).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-secondary mb-1">STATUS</div>
                            <span className={`badge ${viewingPO.status === 'Approved' ? 'badge-success' : 'badge-warning'}`}>{viewingPO.status}</span>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-secondary mb-1">CATEGORY</div>
                            <div className="font-semibold">{viewingPO.category}</div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-secondary mb-1">SUPPLIER</div>
                            <div className="font-semibold">{viewingPO.supplier_name}</div>
                        </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden mb-6">
                        <table className="mb-0">
                            <thead>
                                <tr>
                                    <th className="bg-surface">Item Description</th>
                                    <th className="bg-surface numeric">Qty</th>
                                    <th className="bg-surface numeric">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="font-bold">{viewingPO.description}</td>
                                    <td className="numeric font-semibold">{viewingPO.quantity}</td>
                                    <td className="numeric font-bold text-lg">{formatCurrency(viewingPO.amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button className="btn btn-outline" onClick={() => setViewingPO(null)}>Done</button>
                        <button className="btn btn-primary" onClick={() => {
                            alert('Downloading PDF...');
                        }}>Download PDF</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserPortal;

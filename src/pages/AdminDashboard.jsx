import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, TrendingUp, AlertOctagon, Package, DollarSign, UserCheck, LayoutGrid, Loader, ShieldAlert } from 'lucide-react';

import OverviewTab from '../components/AdminTabs/OverviewTab';
import SavingsLeakageTab from '../components/AdminTabs/SavingsLeakageTab';
import ComplianceTab from '../components/AdminTabs/ComplianceTab';
import CategorySuppliersTab from '../components/AdminTabs/CategorySuppliersTab';
import ConsolidationTab from '../components/AdminTabs/ConsolidationTab';
import DemandForecastTab from '../components/AdminTabs/DemandForecastTab';
import BuyerBehaviourTab from '../components/AdminTabs/BuyerBehaviourTab';
import CatalogueTab from '../components/AdminTabs/CatalogueTab';
import PurchaseHistoryTab from '../components/AdminTabs/PurchaseHistoryTab';
// ADMIN DASHBOARD MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────


const AdminDashboard = () => {
  const navigate = useNavigate();
  const tabs = [
    { name: 'Dashboard', slug: 'dashboard', endpoint: '/api/dashboard/kpis', icon: <TrendingUp size={16} /> },
    { name: 'Savings Leakage', slug: 'savings-leakage', endpoint: '/api/dashboard/savings-leakage', icon: <DollarSign size={16} /> },
    { name: 'Compliance', slug: 'compliance', endpoint: '/api/dashboard/compliance', icon: <ShieldAlert size={16} /> },
    { name: 'Category Suppliers', slug: 'category-suppliers', endpoint: '/api/dashboard/category-suppliers', icon: <Package size={16} /> },
    { name: 'Consolidation', slug: 'consolidation', endpoint: '/api/dashboard/consolidation', icon: <AlertOctagon size={16} /> },
    { name: 'Demand Forecast', slug: 'demand-forecast', endpoint: '/api/dashboard/demand-forecast', icon: <TrendingUp size={16} /> },
    { name: 'Buyer Behaviour', slug: 'buyer-behavior', endpoint: '/api/dashboard/buyer-behavior', icon: <UserCheck size={16} /> },
    { name: 'Catalogue', slug: 'catalog', endpoint: '/api/dashboard/catalog', icon: <LayoutGrid size={16} /> },
    { name: 'Purchase History', slug: 'purchase-history', endpoint: '/api/purchase-history', icon: <Package size={16} /> }
  ];

  const { tab: tabSlug } = useParams();

  // Find active tab from slug or default to first
  const currentTab = useMemo(() => {
    return tabs.find(t => t.slug === tabSlug) || tabs[0];
  }, [tabSlug]);

  const activeTab = currentTab.name;

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractDecisions, setContractDecisions] = useState([]);
  const [catalogRecommendations, setCatalogRecommendations] = useState([]);


  useEffect(() => {
    const fetchTab = async () => {
      setLoading(true);
      setError(null);
      const tabMeta = tabs.find(t => t.name === activeTab);
      if (!tabMeta) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
        const res = await fetch(`${API_BASE_URL}${tabMeta.endpoint}`);
        const json = await res.json();
        if (json.status === 'success') {
          setDashboardData(json.data);
          
          if (activeTab === 'Consolidation') {
            try {
              const resDec = await fetch(`${API_BASE_URL}/api/dashboard/contract-decisions`);
              const jsonDec = await resDec.json();
              if (jsonDec.status === 'success') {
                setContractDecisions(jsonDec.data);
              }
              const resRec = await fetch(`${API_BASE_URL}/api/dashboard/catalog-recommendations`);
              const jsonRec = await resRec.json();
              if (jsonRec.status === 'success') {
                setCatalogRecommendations(jsonRec.data);
              }
            } catch (e) { console.error(e); }
          }
        } else {
          setError(json.message);
        }
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    
    fetchTab();
  }, [activeTab]);

  const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${value}`;
  };


  const renderBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
      case 'good':
      case 'low': return <span className="badge badge-success">{status}</span>;
      case 'expiring soon':
      case 'medium': return <span className="badge badge-warning">{status}</span>;
      case 'expired':
      case 'high':
      case 'critical':
      case 'no contract': return <span className="badge badge-danger">{status}</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <Loader className="animate-spin mb-4" size={32} />
          <div className="font-medium">Loading {activeTab} Data...</div>
        </div>
      );
    }

    if (error || !dashboardData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-danger">
          <AlertOctagon size={48} className="mb-4 opacity-50" />
          <div className="font-medium text-lg">Failed to load {activeTab} data</div>
          <div className="text-sm opacity-80 mt-2">{error || "Server unreachable"}</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return <OverviewTab dashboardData={dashboardData} formatCurrency={formatCurrency} />;
      
      case 'Savings Leakage':
        return <SavingsLeakageTab data={dashboardData} formatCurrency={formatCurrency} renderBadge={renderBadge} />;

      case 'Category Suppliers':
        return <CategorySuppliersTab dashboardData={dashboardData} formatCurrency={formatCurrency} renderBadge={renderBadge} />;

      case 'Consolidation':
        return (
          <ConsolidationTab 
            dashboardData={dashboardData} 
            formatCurrency={formatCurrency} 
            contractDecisions={contractDecisions} 
            catalogRecommendations={catalogRecommendations} 
          />
        );

      case 'Demand Forecast':
        return <DemandForecastTab dashboardData={dashboardData} formatCurrency={formatCurrency} />;

      case 'Buyer Behaviour':
        return <BuyerBehaviourTab data={dashboardData} formatCurrency={formatCurrency} />;

      case 'Compliance':
        return <ComplianceTab dashboardData={dashboardData} formatCurrency={formatCurrency} renderBadge={renderBadge} />;

      case 'Catalogue':
        return <CatalogueTab formatCurrency={formatCurrency} />;

      case 'Purchase History':
        return <PurchaseHistoryTab formatCurrency={formatCurrency} />;

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="admin-body min-h-screen">
        <div className="header-nav flex justify-between items-center mb-8">
            <div>
            <h1 className="mb-1 text-primary">Control Tower Analytics</h1>
            <p className="text-secondary font-medium">Enterprise tail spend monitoring and compliance dashboard.</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="btn btn-outline flex items-center gap-2 border-primary text-primary hover:bg-primary-light" onClick={() => navigate('/admin/purchase-history')}>
                    <Package size={16} /> Orders
                </button>
                <button className="btn btn-outline flex items-center gap-2" onClick={() => navigate('/')}>
                    <LogOut size={16} /> Exit
                </button>
            </div>
        </div>
        
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div className="tabs-container sticky top-[72px] z-[40] backdrop-blur-md bg-white/90">
            {tabs.filter(t => t.slug !== 'purchase-history').map((tab) => (
                <button
                key={tab.name}
                className={`tab ${activeTab === tab.name ? 'active' : ''}`}
                onClick={() => {
                  if (activeTab !== tab.name) {
                    setLoading(true);
                    setDashboardData(null);
                    navigate(`/admin/${tab.slug}`);
                  }
                }}
                >
                <span className="flex items-center justify-center gap-2">
                    {tab.icon} {tab.name}
                </span>
                </button>
            ))}
            </div>

            <div className="animate-fade-in">
            {renderContent()}
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;

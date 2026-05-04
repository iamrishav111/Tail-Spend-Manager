export const purchaseHistory = [
  { id: 'PO-1042', item: 'Safety helmets ×50', category: 'Safety PPE', supplier: 'Honeywell', amount: 47500, status: 'Auto-approved' },
  { id: 'PO-1043', item: 'Office chairs ×5', category: 'Facilities', supplier: 'Godrej', amount: 220000, status: 'Pending approval' },
  { id: 'PO-1044', item: 'Welding rods', category: 'MRO', supplier: 'Local supplier', amount: 8400, status: 'Flagged — off-contract' },
];

export const supplierRecommendations = [
  { id: 1, type: 'recommended', name: 'Castrol India Pvt Ltd', price: 800, unit: 'L', leadTime: '3 days', tag: 'Preferred Contract' },
  { id: 2, type: 'alternate', name: 'Servo Lubricants', price: 820, unit: 'L', leadTime: '5 days', tag: 'Approved Vendor' },
  { id: 3, type: 'off-contract', name: 'Local Auto Parts', price: 950, unit: 'L', leadTime: '1 day', tag: 'Non-compliant', warning: 'Outside contract — higher cost' }
];

export const dashboardKPIs = {
  totalTailSpend: '2.894 Cr',
  maverickSpend: '48 L',
  tailSuppliers: 147
};

export const topSpendReasons = [
  { reason: 'Catalogue gap', amount: '68L' },
  { reason: 'Maverick buy', amount: '48L' },
  { reason: 'No contract', amount: '41L' }
];

export const categoryWiseSpend = [
  { category: 'MRO', amount: '82L', percentage: 34 },
  { category: 'Facilities', amount: '41L', percentage: 26 },
  { category: 'IT Consumables', amount: '28L', percentage: 18 },
  { category: 'Marketing', amount: '15L', percentage: 10 }
];

export const leakageKPIs = {
  leakageThisMonth: '4.82L',
  recoverable: '4.82L',
  offContractTxns: 23
};

export const alerts = [
  { id: 1, message: 'PO held — unknown vendor (No GST match)', severity: 'high' },
  { id: 2, message: 'Non-preferred supplier selected — ₹32,000 leakage', severity: 'high' },
  { id: 3, message: 'P-card transaction — outside contract', severity: 'medium' }
];

export const departmentLeakage = [
  { dept: 'Manufacturing', amount: '2.1L' },
  { dept: 'Facilities', amount: '1.4L' },
  { dept: 'IT', amount: '82K' }
];

export const complianceIssues = [
  { id: 'INV-8902', issue: 'Invoice without PO', action: 'Held', status: 'blocked' },
  { id: 'INV-8915', issue: 'GST mismatch', action: 'Needs review', status: 'warning' },
  { id: 'PO-2199', issue: 'Unknown vendor', action: 'Blocked', status: 'blocked' }
];

export const categorySuppliers = [
  { category: 'Lubricants', supplier: 'Castrol India', spend: '48L/year', status: 'Expiring' },
  { category: 'Safety PPE', supplier: 'Honeywell', spend: '1.2Cr/year', status: 'Active' },
  { category: 'Fasteners', supplier: 'Würth', spend: '35L/year', status: 'Review due' },
  { category: 'Hydraulic parts', supplier: 'Multiple', spend: '22L/year', status: 'No contract' }
];

export const consolidationOpps = [
  { category: 'Lubricants', before: 7, after: 2, savings: '6.2L/year' },
  { category: 'Safety PPE', before: 5, after: 1, savings: '3.8L/year' },
  { category: 'Office Supplies', before: 12, after: 2, savings: '1.4L/year' }
];

export const supplierRisk = [
  { supplier: 'Shree Traders', category: 'Packaging', cost: 'High', delivery: 'Medium', compliance: 'High', financial: 'Low', overall: 'High risk' },
  { supplier: 'Apex Hydraulics', category: 'Hydraulic parts', cost: 'Medium', delivery: 'Low', compliance: 'Medium', financial: 'Medium', overall: 'Medium' },
  { supplier: 'Chennai Tools', category: 'MRO', cost: 'Low', delivery: 'Low', compliance: 'Low', financial: 'Low', overall: 'Low' }
];

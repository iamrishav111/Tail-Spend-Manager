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
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [catalogConfirmed, setCatalogConfirmed] = useState(null);
  const [addedCatalogKeys, setAddedCatalogKeys] = useState(new Set());

  const closeCatalogModal = () => {
    setSelectedCatalogAdd(null);
    setClassificationResult(null);
    setCatalogConfirmed(null);
    setIsSavingCatalog(false);
  };

  const confirmCatalogAddition = async () => {
    if (!selectedCatalogAdd || !classificationResult) return;
    setIsSavingCatalog(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      const estPrice = selectedCatalogAdd.forecast_qty
        ? Math.max(0, (selectedCatalogAdd.potential_savings || 0) / Math.max(1, selectedCatalogAdd.forecast_qty)) * 5
        : 0;
      const res = await fetch(`${API_BASE_URL}/api/add-to-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: selectedCatalogAdd.description,
          l1: classificationResult.l1_category || 'General',
          l2: classificationResult.predicted_category || classificationResult.l2_category || 'General',
          price: estPrice,
          moq: 1,
          supplier_id: classificationResult.top_suppliers?.[0]?.supplier_id || 'PREF-001'
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setCatalogConfirmed(json.data);
        setAddedCatalogKeys(prev => new Set(prev).add(selectedCatalogAdd.description));
      } else {
        alert('Failed to add to catalog');
      }
    } catch (e) {
      console.error(e);
      alert('Network error adding to catalog.');
    } finally {
      setIsSavingCatalog(false);
    }
  };

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

  const openRfqDocument = (cat) => {
    const rfqId = `RFQ-2026-${(cat.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const responseBy = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = cat.spend || cat.total_spend || cat.estimated_savings || 0;
    const supplierCount = cat.supplier_count || 0;
    const targetSuppliers = cat.target_suppliers || 0;

    const emailSubject = `Request for Quotation - ${cat.category} - ${rfqId}`;
    const emailBody = `Dear Supplier,

We are inviting your firm to submit a quotation for the supply of ${cat.category} on an annual rate-contract basis.

RFQ Reference: ${rfqId}
Issue Date: ${today}
Response Deadline: ${responseBy}
Estimated Annual Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

Please find the full Request for Quotation document attached. Kindly submit your response by ${responseBy} covering rate-card per SKU group, commercial terms, company credentials, and a single point of contact for the contract duration.

Best regards,
Procurement Team`;

    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${rfqId} | Request for Quotation</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto 120px;padding:0 48px;color:#0f172a;line-height:1.65;background:#fff}
  .header{border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
  .header h1{margin:0;font-size:28px;color:#2563eb;font-weight:800;letter-spacing:-0.02em}
  .header .id{font-size:13px;color:#475569;font-family:'Courier New',monospace;background:#f1f5f9;padding:8px 14px;border-radius:6px;border:1px solid #e2e8f0}
  h2{color:#1e293b;font-size:17px;margin-top:34px;margin-bottom:14px;padding-bottom:7px;border-bottom:1px solid #e2e8f0;font-weight:700}
  .meta{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 22px;margin-bottom:24px}
  .meta-row{display:flex;gap:12px;margin-bottom:6px;font-size:14px}
  .meta-row:last-child{margin-bottom:0}
  .meta-label{font-weight:700;color:#475569;min-width:200px}
  table{width:100%;border-collapse:collapse;margin:14px 0 22px;font-size:14px}
  th,td{text-align:left;padding:11px 14px;border:1px solid #e2e8f0;vertical-align:top}
  th{background:#f1f5f9;font-weight:700;color:#0f172a}
  ol,ul{margin:8px 0;padding-left:22px}
  ol li,ul li{margin-bottom:8px;font-size:14px}
  p{margin:8px 0;font-size:14.5px}
  .send-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #2563eb;padding:18px;text-align:center;box-shadow:0 -6px 18px rgba(15,23,42,0.08);z-index:10}
  .send-btn{background:#2563eb;color:#fff;border:none;padding:14px 44px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.35);transition:all .15s}
  .send-btn:hover{background:#1d4ed8;transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,0.45)}
  .send-hint{display:block;font-size:11px;color:#64748b;margin-top:8px;font-weight:500}
  strong{color:#0f172a}
</style>
</head>
<body>
  <div class="header">
    <h1>REQUEST FOR QUOTATION</h1>
    <div class="id">${rfqId}</div>
  </div>

  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Response Deadline:</span><span>${responseBy}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${cat.category}</span></div>
    <div class="meta-row"><span class="meta-label">Estimated Annual Spend:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
    <div class="meta-row"><span class="meta-label">Current Supplier Base:</span><span>${supplierCount} suppliers (consolidating to ${targetSuppliers})</span></div>
  </div>

  <h2>1. Scope of Quotation</h2>
  <p>We invite quotations for the supply of <strong>${cat.category}</strong> on an annual rate-contract basis. The supplier(s) selected will be expected to service requirements across multiple plant locations on agreed pricing, lead-time, and quality terms for a minimum period of 12 months.</p>

  <h2>2. Commercial Terms Required</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Requirement</th></tr></thead>
    <tbody>
      <tr><td>Pricing Basis</td><td>Fixed rate-card valid for 12 months from contract effective date</td></tr>
      <tr><td>Payment Terms</td><td>Net 45 days from goods receipt and validated invoice</td></tr>
      <tr><td>Delivery Terms</td><td>DDP (Delivered Duty Paid) to specified plant locations across India</td></tr>
      <tr><td>Lead Time</td><td>Standard catalog items: ≤ 7 days. Non-stock / custom items: ≤ 21 days</td></tr>
      <tr><td>Warranty / SLA</td><td>Minimum 12 months on workmanship; defect returns accepted within 30 days</td></tr>
      <tr><td>Minimum Order Quantity</td><td>To be specified by supplier per SKU; aggregated MOQs preferred</td></tr>
      <tr><td>Price Validity</td><td>Bid prices to remain valid for 90 days from response submission</td></tr>
    </tbody>
  </table>

  <h2>3. Volume Commitment</h2>
  <p>Indicative annual volume for this category is approximately <strong>INR ${(spendVal / 100000).toFixed(1)} Lakh</strong>, based on the trailing 12 months of consumption. This represents directional volume across all consuming locations and is not a guaranteed minimum. Successful bidders should expect a significant share-of-wallet shift relative to current fragmented sourcing.</p>

  <h2>4. Selection Criteria</h2>
  <ol>
    <li><strong>Commercial Competitiveness (40%)</strong> — total landed cost benchmarked against the rate-contract baseline and competing bids.</li>
    <li><strong>Lead Time &amp; Reliability (25%)</strong> — historical on-time delivery, stated lead-time commitments, and contingency for stock-outs.</li>
    <li><strong>Quality &amp; Compliance (20%)</strong> — relevant certifications (ISO 9001 where applicable), defect-rate history, warranty and after-sales terms.</li>
    <li><strong>Service &amp; Coverage (15%)</strong> — multi-plant servicing capability, single point of contact, and stated escalation SLA.</li>
  </ol>

  <h2>5. Response Requirements</h2>
  <p>Please submit your formal response no later than <strong>${responseBy}</strong>. The response must cover:</p>
  <ul>
    <li>Detailed rate-card per SKU group, in INR ex-tax with GST shown separately.</li>
    <li>Commercial terms covering each parameter listed in Section 2.</li>
    <li>Company credentials including registration documents, GST, MSME status (if applicable), and at least two referenceable customers in similar categories.</li>
    <li>Designated point of contact (name, email, phone) for the duration of the contract.</li>
  </ul>

  <h2>6. Confidentiality</h2>
  <p>This RFQ and all information disclosed herein are confidential. Bidder responses, including pricing and commercial structure, will be treated with reciprocal confidentiality and will not be shared with competing bidders.</p>

  <h2>7. Disclaimer</h2>
  <p>This Request for Quotation does not constitute an offer or commitment to award. The buyer reserves the right to accept or reject any or all bids, in whole or in part, and to negotiate further with one or more bidders before final award.</p>

  <div class="send-bar">
    <button class="send-btn" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send via Outlook</button>
    <span class="send-hint">Opens your default mail client (Outlook) addressed to the procurement distribution list</span>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openRenegotiationDocument = (cat) => {
    const renId = `REN-2026-${(cat.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const responseBy = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = cat.spend || cat.total_spend || cat.estimated_savings || 0;
    const supplierCount = cat.supplier_count || 0;

    const emailSubject = `Renegotiation Request - ${cat.category} - ${renId}`;
    const emailBody = `Dear Supplier,

Following our annual contract review for ${cat.category}, we are initiating a commercial renegotiation of our existing rate-card and associated terms.

Reference: ${renId}
Issue Date: ${today}
Response Deadline: ${responseBy}
Indicative Annual Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

Please find the full Commercial Review document attached. Kindly nominate a single point of contact for the duration of this review and respond by ${responseBy}. Further commercial discussion will be conducted through our Procurement Negotiation channel.

Best regards,
Procurement Team`;

    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${renId} | Renegotiation Request</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto 120px;padding:0 48px;color:#0f172a;line-height:1.65;background:#fff}
  .header{border-bottom:3px solid #7c3aed;padding-bottom:18px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
  .header h1{margin:0;font-size:28px;color:#7c3aed;font-weight:800;letter-spacing:-0.02em}
  .header .id{font-size:13px;color:#475569;font-family:'Courier New',monospace;background:#f5f3ff;padding:8px 14px;border-radius:6px;border:1px solid #e9d5ff}
  h2{color:#1e293b;font-size:17px;margin-top:34px;margin-bottom:14px;padding-bottom:7px;border-bottom:1px solid #e2e8f0;font-weight:700}
  .meta{background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:18px 22px;margin-bottom:24px}
  .meta-row{display:flex;gap:12px;margin-bottom:6px;font-size:14px}
  .meta-row:last-child{margin-bottom:0}
  .meta-label{font-weight:700;color:#475569;min-width:200px}
  table{width:100%;border-collapse:collapse;margin:14px 0 22px;font-size:14px}
  th,td{text-align:left;padding:11px 14px;border:1px solid #e2e8f0;vertical-align:top}
  th{background:#f5f3ff;font-weight:700;color:#0f172a}
  ol,ul{margin:8px 0;padding-left:22px}
  ol li,ul li{margin-bottom:8px;font-size:14px}
  p{margin:8px 0;font-size:14.5px}
  .send-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #7c3aed;padding:18px;text-align:center;box-shadow:0 -6px 18px rgba(15,23,42,0.08);z-index:10}
  .send-btn{background:#7c3aed;color:#fff;border:none;padding:14px 44px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,0.35);transition:all .15s}
  .send-btn:hover{background:#6d28d9;transform:translateY(-1px);box-shadow:0 6px 16px rgba(124,58,237,0.45)}
  .send-hint{display:block;font-size:11px;color:#64748b;margin-top:8px;font-weight:500}
  strong{color:#0f172a}
  @media print {.send-bar{display:none}}
</style>
</head>
<body>
  <div class="header">
    <h1>RENEGOTIATION REQUEST</h1>
    <div class="id">${renId}</div>
  </div>

  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Response Deadline:</span><span>${responseBy}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${cat.category}</span></div>
    <div class="meta-row"><span class="meta-label">Indicative Annual Volume:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
    <div class="meta-row"><span class="meta-label">Current Supplier:</span><span>Existing Contracted Supplier (this letter)</span></div>
  </div>

  <h2>1. Subject of Review</h2>
  <p>This letter formally initiates a commercial review of our existing arrangement for <strong>${cat.category}</strong>. The review has been triggered by the following observations from our internal spend analysis:</p>
  <ul>
    <li>Pricing variance against internal benchmark exceeds the acceptable threshold on recurring SKUs in this category.</li>
    <li>Total annual volume of approximately <strong>INR ${(spendVal / 100000).toFixed(1)} Lakh</strong> justifies revised commercial terms that reflect the strategic nature of this engagement.</li>
    <li>Spend continues to be fragmented across ${supplierCount > 0 ? supplierCount + ' suppliers' : 'multiple suppliers'} in this category; we intend to consolidate share-of-wallet behind preferred partners with competitive commercial terms.</li>
  </ul>

  <h2>2. Commercial Asks</h2>
  <p>We request the following revisions to our existing arrangement, to be effective on the new contract effective date:</p>
  <table>
    <thead><tr><th>Parameter</th><th>Current</th><th>Requested Revision</th></tr></thead>
    <tbody>
      <tr><td>Unit Pricing</td><td>Existing rate-card</td><td>Reduction of 6–8% on top-volume SKUs</td></tr>
      <tr><td>Payment Terms</td><td>Net 30</td><td>Net 45 (or Net 60 in exchange for tiered discount)</td></tr>
      <tr><td>Lead Time SLA</td><td>Variable / not formalized</td><td>Standard catalog items ≤ 7 days; non-stock ≤ 21 days</td></tr>
      <tr><td>Volume Tier Discount</td><td>Not currently applied</td><td>Tiered discount applicable above defined quarterly volume thresholds</td></tr>
      <tr><td>Dedicated Account Coverage</td><td>Not formalized</td><td>Named single point of contact + escalation SLA</td></tr>
      <tr><td>Price Validity</td><td>Frequent revisions</td><td>Locked rate-card for 12 months from effective date</td></tr>
    </tbody>
  </table>

  <h2>3. Volume Commitment in Exchange</h2>
  <p>In return for the revised commercial terms above, we commit to consolidating approximately <strong>INR ${(spendVal / 100000).toFixed(1)} Lakh</strong> of annual volume to your firm for a period of 12 months from the contract effective date. This commitment includes first-look priority on new requirements in this category and a defined share-of-wallet target enforced through our procurement catalog.</p>

  <h2>4. Next Steps</h2>
  <p>Please respond to this letter by <strong>${responseBy}</strong> with:</p>
  <ul>
    <li>Acknowledgement of receipt and intent to engage.</li>
    <li>A preliminary position on each parameter listed in Section 2.</li>
    <li>The name and contact details of your designated point of contact for the duration of this review.</li>
  </ul>
  <p>Following your initial response, further commercial discussion — including final pricing, terms, and SLA refinement — will be conducted through our <strong>Procurement Negotiation channel</strong>. Please be prepared to engage in iterative discussion before terms are finalized.</p>

  <h2>5. Confidentiality</h2>
  <p>This letter and all information disclosed herein are confidential. Discussions and proposed terms will be treated with reciprocal confidentiality.</p>

  <div class="send-bar">
    <button class="send-btn" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send Renegotiation Request</button>
    <span class="send-hint">Opens your default mail client (Outlook) addressed to the procurement distribution list</span>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMigrationDocument = (cat) => {
    const migId = `MIG-2026-${(cat.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const responseBy = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = cat.spend || cat.total_spend || cat.estimated_savings || 0;
    const supplierCount = cat.supplier_count || 0;
    const targetSuppliers = cat.target_suppliers || Math.max(2, supplierCount - 1);
    const droppedCount = Math.max(0, supplierCount - targetSuppliers);

    // Email 1: Migration Notice to dropped suppliers
    const migSubject = `Notice of Supplier Consolidation - ${cat.category} - ${migId}`;
    const migBody = `Dear Supplier,

As part of our annual supplier-base review, we are consolidating our sourcing for ${cat.category} to a smaller set of strategic partners effective ${effectiveDate}.

Reference: ${migId}
Issue Date: ${today}
Effective Date: ${effectiveDate}

All open purchase orders will be honored through their stated delivery dates and final invoices will be processed per standard payment terms. You may continue to be considered for spot purchases outside the consolidated scope. We appreciate your past service.

For any queries on open commitments, please respond to this email.

Best regards,
Procurement Team`;
    const migMailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(migSubject)}&body=${encodeURIComponent(migBody)}`;

    // Email 2: Volume-Commit Letter to surviving suppliers (mentions further negotiation)
    const vcSubject = `Volume Commitment Request - ${cat.category} - ${migId}-VC`;
    const vcBody = `Dear Supplier,

Following our annual supplier-base review for ${cat.category}, your firm has been identified as one of ${targetSuppliers} surviving strategic partners. As a result of this consolidation, your share of our annual volume in this category will increase materially effective ${effectiveDate}.

Reference: ${migId}-VC
Issue Date: ${today}
Response Deadline: ${responseBy}
Estimated Annual Category Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

We request the following confirmations within 14 days:

1. Confirmation of capacity to absorb the increased volume.
2. Revised rate-card reflecting the new annual volume tier (we expect a volume-based reduction).
3. Updated lead-time commitments and SLA terms.
4. Single point of contact for the duration of the contract.

Further commercial discussion — including final pricing, payment terms, and SLA refinement — will be conducted through our Procurement Negotiation channel following your initial response.

Best regards,
Procurement Team`;
    const vcMailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(vcSubject)}&body=${encodeURIComponent(vcBody)}`;

    // Internal Action Checklist (downloaded as .txt)
    const checklistText = `SUPPLIER CONSOLIDATION — INTERNAL ACTION CHECKLIST
====================================================
Category: ${cat.category}
Reference: ${migId}
Issued: ${today}
Effective Date: ${effectiveDate}

----------------------------------------------------
DROPPED SUPPLIERS — MARK INACTIVE (${droppedCount} suppliers)
----------------------------------------------------
[ ] Deactivate dropped suppliers in supplier master effective ${effectiveDate}
[ ] Remove dropped suppliers from preferred-supplier list for ${cat.category}
[ ] Disable dropped suppliers from auto-routing in punch-out catalog
[ ] Update categorization rules so PRs for ${cat.category} route to surviving suppliers
[ ] File copy of migration notice in each dropped supplier's record

----------------------------------------------------
SURVIVING SUPPLIERS — UPDATE PREFERRED FLAGS (${targetSuppliers} suppliers)
----------------------------------------------------
[ ] Set surviving suppliers as PREFERRED for ${cat.category}
[ ] Update share-of-wallet routing rules (primary / secondary allocation)
[ ] Confirm Volume-Commit Letter sent and acknowledged
[ ] Track Renegotiation outcome and apply revised pricing to catalog
[ ] Generate Contract Amendment once new terms are agreed
[ ] Load revised rate-card into procurement catalog effective ${effectiveDate}

----------------------------------------------------
OPEN COMMITMENTS — CLOSE OUT
----------------------------------------------------
[ ] Audit open POs with dropped suppliers
[ ] Confirm delivery dates for all open POs
[ ] Process final invoices per standard payment terms
[ ] Reconcile any outstanding returns, warranty claims, or credit notes
[ ] Final zero-balance confirmation before fully deactivating supplier

----------------------------------------------------
COMPLIANCE / AUDIT
----------------------------------------------------
[ ] Document selection criteria for the consolidation decision
[ ] File migration notice copies in supplier records
[ ] Update supplier master audit log with consolidation event ID ${migId}
[ ] Capture sign-off from category manager and procurement head

----------------------------------------------------
TRACKING — POST-MIGRATION
----------------------------------------------------
[ ] Set up spend-shift KPI for ${cat.category} (60 / 90 day checkpoint)
[ ] Set up maverick-detection alert for any spend with dropped suppliers
[ ] Schedule quarterly savings validation against negotiated terms
[ ] Schedule 90-day post-migration review meeting

====================================================
END OF CHECKLIST
`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${migId} | Notice of Supplier Consolidation</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto 140px;padding:0 48px;color:#0f172a;line-height:1.65;background:#fff}
  .header{border-bottom:3px solid #d97706;padding-bottom:18px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
  .header h1{margin:0;font-size:26px;color:#d97706;font-weight:800;letter-spacing:-0.02em}
  .header .id{font-size:13px;color:#475569;font-family:'Courier New',monospace;background:#fffbeb;padding:8px 14px;border-radius:6px;border:1px solid #fde68a}
  h2{color:#1e293b;font-size:17px;margin-top:34px;margin-bottom:14px;padding-bottom:7px;border-bottom:1px solid #e2e8f0;font-weight:700}
  .meta{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:18px 22px;margin-bottom:24px}
  .meta-row{display:flex;gap:12px;margin-bottom:6px;font-size:14px}
  .meta-row:last-child{margin-bottom:0}
  .meta-label{font-weight:700;color:#475569;min-width:200px}
  ol,ul{margin:8px 0;padding-left:22px}
  ol li,ul li{margin-bottom:8px;font-size:14px}
  p{margin:8px 0;font-size:14.5px}
  .send-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #d97706;padding:14px 18px;text-align:center;box-shadow:0 -6px 18px rgba(15,23,42,0.08);z-index:10}
  .send-bar-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
  .btn{border:none;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .15s}
  .btn-primary{background:#d97706;color:#fff;box-shadow:0 4px 12px rgba(217,119,6,0.35)}
  .btn-primary:hover{background:#b45309;transform:translateY(-1px);box-shadow:0 6px 16px rgba(217,119,6,0.45)}
  .btn-secondary{background:#0ea5e9;color:#fff;box-shadow:0 4px 12px rgba(14,165,233,0.35)}
  .btn-secondary:hover{background:#0284c7;transform:translateY(-1px);box-shadow:0 6px 16px rgba(14,165,233,0.45)}
  .btn-tertiary{background:#fff;color:#475569;border:1.5px solid #cbd5e1}
  .btn-tertiary:hover{background:#f8fafc;border-color:#94a3b8;color:#0f172a}
  .send-hint{display:block;font-size:11px;color:#64748b;margin-top:10px;font-weight:500}
  strong{color:#0f172a}
  @media print {.send-bar{display:none}}
</style>
</head>
<body>
  <div class="header">
    <h1>NOTICE OF SUPPLIER CONSOLIDATION</h1>
    <div class="id">${migId}</div>
  </div>

  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Effective Date:</span><span>${effectiveDate}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${cat.category}</span></div>
    <div class="meta-row"><span class="meta-label">Estimated Annual Spend:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
    <div class="meta-row"><span class="meta-label">Consolidation Scope:</span><span>${supplierCount} suppliers → ${targetSuppliers} suppliers (${droppedCount} being phased out)</span></div>
  </div>

  <h2>1. Context</h2>
  <p>As part of our annual supplier-base review, we are consolidating our sourcing for <strong>${cat.category}</strong> to a smaller set of strategic partners. This notice formally communicates the change to suppliers being phased out of the active panel.</p>

  <h2>2. Treatment of Open Commitments</h2>
  <ul>
    <li>All open purchase orders will be honored through their stated delivery dates.</li>
    <li>Final invoices will be processed per standard payment terms.</li>
    <li>Outstanding returns, warranty claims, and credit notes will continue to be honored per existing agreements.</li>
    <li>A final zero-balance confirmation will be issued before suppliers are fully deactivated in our supplier master.</li>
  </ul>

  <h2>3. Future Engagement</h2>
  <p>Phased-out suppliers may continue to be considered for spot purchases that fall outside the consolidated category scope. We appreciate the service provided to date and remain open to future engagement on a case-by-case basis.</p>

  <h2>4. Two-Sided Action</h2>
  <p>This consolidation involves <strong>two communications</strong>:</p>
  <ol>
    <li><strong>Migration Notice</strong> — issued to the ${droppedCount} suppliers being phased out (this document).</li>
    <li><strong>Volume-Commit Letter</strong> — issued to the ${targetSuppliers} surviving suppliers, requesting capacity confirmation and revised commercial terms in exchange for the increased annual volume. Further commercial discussion will follow through our Procurement Negotiation channel.</li>
  </ol>

  <h2>5. Next Steps</h2>
  <p>For any queries related to open commitments or the consolidation timeline, please use the contact details in your existing contract. A 90-day post-migration review will validate spend shift and compliance.</p>

  <h2>6. Confidentiality</h2>
  <p>This notice and all information disclosed herein are confidential.</p>

  <div class="send-bar">
    <div class="send-bar-row">
      <button class="btn btn-primary" onclick="window.location.href='${migMailto.replace(/'/g, "\\'")}'">✉ Send Migration Notice</button>
      <button class="btn btn-secondary" onclick="window.location.href='${vcMailto.replace(/'/g, "\\'")}'">✉ Send Volume-Commit Letter</button>
      <button class="btn btn-tertiary" onclick="downloadChecklist()">⬇ Download Action Checklist</button>
    </div>
    <span class="send-hint">Migration Notice → dropped suppliers. Volume-Commit Letter → surviving suppliers (followed by negotiation). Checklist → internal ops.</span>
  </div>

  <script id="checklist-data" type="text/plain">${checklistText.replace(/</g, '&lt;')}</script>
  <script>
    function downloadChecklist() {
      var text = document.getElementById('checklist-data').textContent;
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Migration_Checklist_${migId}.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // === GOVERNANCE FLOW HELPERS ===
  // Each opens a distinct artifact in a new tab. Sourcing RFQ has one Send button;
  // Blanket PO / Rate Contract / Mini-Bid Framework each have Send + a catalog-style
  // action that reveals an in-tab confirmation card.

  const _baseDocStyles = (themeColor, themeBg, themeBorder) => `
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto 140px;padding:0 48px;color:#0f172a;line-height:1.65;background:#fff}
    .header{border-bottom:3px solid ${themeColor};padding-bottom:18px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
    .header h1{margin:0;font-size:26px;color:${themeColor};font-weight:800;letter-spacing:-0.02em}
    .header .id{font-size:13px;color:#475569;font-family:'Courier New',monospace;background:${themeBg};padding:8px 14px;border-radius:6px;border:1px solid ${themeBorder}}
    h2{color:#1e293b;font-size:17px;margin-top:34px;margin-bottom:14px;padding-bottom:7px;border-bottom:1px solid #e2e8f0;font-weight:700}
    .meta{background:${themeBg};border:1px solid ${themeBorder};border-radius:10px;padding:18px 22px;margin-bottom:24px}
    .meta-row{display:flex;gap:12px;margin-bottom:6px;font-size:14px}
    .meta-row:last-child{margin-bottom:0}
    .meta-label{font-weight:700;color:#475569;min-width:210px}
    table{width:100%;border-collapse:collapse;margin:14px 0 22px;font-size:14px}
    th,td{text-align:left;padding:11px 14px;border:1px solid #e2e8f0;vertical-align:top}
    th{background:${themeBg};font-weight:700;color:#0f172a}
    ol,ul{margin:8px 0;padding-left:22px}
    ol li,ul li{margin-bottom:8px;font-size:14px}
    p{margin:8px 0;font-size:14.5px}
    .send-bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid ${themeColor};padding:14px 18px;text-align:center;box-shadow:0 -6px 18px rgba(15,23,42,0.08);z-index:10}
    .send-bar-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
    .btn{border:none;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .15s}
    .btn-primary{background:${themeColor};color:#fff;box-shadow:0 4px 12px rgba(15,23,42,0.18)}
    .btn-primary:hover{filter:brightness(0.93);transform:translateY(-1px);box-shadow:0 6px 16px rgba(15,23,42,0.22)}
    .btn-secondary{background:#fff;color:${themeColor};border:1.5px solid ${themeColor}}
    .btn-secondary:hover{background:${themeBg}}
    .btn-disabled{background:#10b981!important;color:#fff!important;cursor:default!important;transform:none!important;box-shadow:none!important;border-color:#10b981!important}
    .send-hint{display:block;font-size:11px;color:#64748b;margin-top:10px;font-weight:500}
    strong{color:#0f172a}
    .confirm-card{margin:32px 0;padding:24px 26px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1.5px solid #6ee7b7;border-radius:14px;display:flex;gap:18px;align-items:flex-start;box-shadow:0 4px 16px rgba(16,185,129,0.12)}
    .confirm-icon{flex-shrink:0;width:48px;height:48px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;box-shadow:0 4px 10px rgba(16,185,129,0.35)}
    .confirm-card h3{margin:0 0 6px 0;color:#065f46;font-size:16px;font-weight:800}
    .confirm-card p{margin:4px 0;color:#065f46;font-size:13.5px}
    .confirm-card ul{margin:8px 0;padding-left:18px}
    .confirm-card ul li{font-size:13px;color:#065f46;margin-bottom:4px}
    .confirm-note{margin-top:10px!important;font-style:italic;font-size:12.5px!important;color:#047857!important}
    @media print {.send-bar{display:none}}
  `;

  const openSourcingRfqDocument = (gov) => {
    const docId = `SRC-2026-${(gov.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const responseBy = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = gov.spend || gov.total_spend || 0;

    const subject = `Sourcing RFQ - ${gov.category} - ${docId}`;
    const body = `Dear Supplier,

We are inviting your firm to participate in a competitive sourcing event for ${gov.category}. This category is currently ungoverned in our procurement system with no active rate-contract. The objective is to discover market rates and onboard one or more strategic suppliers under formal commercial terms.

Reference: ${docId}
Issue Date: ${today}
Response Deadline: ${responseBy}
Indicative Annual Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

Please find the full Sourcing RFQ document attached. The winning supplier(s) will be onboarded into our procurement catalog under an agreed rate-card.

Best regards,
Procurement Team`;
    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docId} | Sourcing RFQ</title>
<style>${_baseDocStyles('#2563eb', '#eff6ff', '#bfdbfe')}</style>
</head>
<body>
  <div class="header"><h1>SOURCING RFQ</h1><div class="id">${docId}</div></div>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Response Deadline:</span><span>${responseBy}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${gov.category}</span></div>
    <div class="meta-row"><span class="meta-label">Indicative Annual Volume:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
    <div class="meta-row"><span class="meta-label">Current Governance State:</span><span>Ungoverned — no active rate-contract or preferred supplier</span></div>
  </div>

  <h2>1. Context &amp; Objective</h2>
  <p>This category currently sits outside our formal commercial governance — spend is fragmented across multiple suppliers with no active rate-contract, no preferred-supplier flagging, and no catalog coverage. The objective of this sourcing event is to discover competitive market rates, evaluate supplier capability, and onboard one or more strategic partners under a formal rate-contract.</p>

  <h2>2. Scope</h2>
  <p>We invite quotations for the full annual requirement in <strong>${gov.category}</strong>, with rate-contract pricing valid for 12 months from the contract effective date. Successful bidders will be expected to service requirements across multiple plant locations.</p>

  <h2>3. Commercial Terms Required</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Requirement</th></tr></thead>
    <tbody>
      <tr><td>Pricing Basis</td><td>Fixed rate-card valid for 12 months from contract effective date</td></tr>
      <tr><td>Payment Terms</td><td>Net 45 days from goods receipt and validated invoice</td></tr>
      <tr><td>Delivery Terms</td><td>DDP (Delivered Duty Paid) to specified plant locations across India</td></tr>
      <tr><td>Lead Time</td><td>Standard items: ≤ 7 days. Custom / non-stock: ≤ 21 days</td></tr>
      <tr><td>Price Validity</td><td>Bid prices to remain valid for 90 days from response submission</td></tr>
    </tbody>
  </table>

  <h2>4. Selection Criteria</h2>
  <ol>
    <li><strong>Commercial Competitiveness (40%)</strong> — total landed cost vs benchmark and competing bids.</li>
    <li><strong>Lead Time &amp; Reliability (25%)</strong> — stated commitments + supporting references.</li>
    <li><strong>Quality &amp; Compliance (20%)</strong> — certifications, defect-rate history, warranty terms.</li>
    <li><strong>Service &amp; Coverage (15%)</strong> — multi-plant capability + escalation SLA.</li>
  </ol>

  <h2>5. Downstream Onboarding</h2>
  <p>Following winner selection, the selected supplier(s) will be onboarded into our procurement catalog under the agreed rate-card. Future PRs in this category will route to the catalog rather than free-text spot buying. The rate-contract will run for 12 months with a defined renewal review milestone.</p>

  <h2>6. Confidentiality</h2>
  <p>This RFQ and all information disclosed herein are confidential. Bidder responses will be treated with reciprocal confidentiality and will not be shared with competing bidders.</p>

  <div class="send-bar">
    <div class="send-bar-row">
      <button class="btn btn-primary" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send Sourcing RFQ</button>
    </div>
    <span class="send-hint">Opens your default mail client (Outlook). Winner-selection workflow happens after responses are received.</span>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openBlanketPoDocument = (gov) => {
    const docId = `BPO-2026-${(gov.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const expiryDate = new Date(Date.now() + (14 + 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = gov.spend || gov.total_spend || 0;

    const subject = `Blanket Purchase Agreement - ${gov.category} - ${docId}`;
    const body = `Dear Supplier,

Please find attached our Blanket Purchase Agreement for ${gov.category} covering the period ${effectiveDate} to ${expiryDate}.

Reference: ${docId}
Annual Volume Commitment: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

This agreement consolidates our annual requirement under a single commitment in exchange for the agreed rate-card and SLAs detailed in the document. Kindly counter-sign and return to formalize the arrangement. Once signed, your firm will be loaded into our procurement catalog and future PRs for this category will route to you under these locked terms.

Best regards,
Procurement Team`;
    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docId} | Blanket Purchase Agreement</title>
<style>${_baseDocStyles('#059669', '#ecfdf5', '#a7f3d0')}</style>
</head>
<body>
  <div class="header"><h1>BLANKET PURCHASE AGREEMENT</h1><div class="id">${docId}</div></div>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Effective Date:</span><span>${effectiveDate}</span></div>
    <div class="meta-row"><span class="meta-label">Expiry Date:</span><span>${expiryDate}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${gov.category}</span></div>
    <div class="meta-row"><span class="meta-label">Supplier:</span><span>Selected Preferred Supplier (counter-signature required)</span></div>
    <div class="meta-row"><span class="meta-label">Annual Volume Commitment:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
  </div>

  <h2>1. Commercial Commitment</h2>
  <p>The Buyer commits to an indicative annual volume of <strong>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> in <strong>${gov.category}</strong> across all consuming plant locations for the 12-month period from the Effective Date. Volume is indicative based on trailing 12 months of consumption and is not a guaranteed minimum.</p>

  <h2>2. Locked Commercial Terms</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Locked Term</th></tr></thead>
    <tbody>
      <tr><td>Pricing</td><td>Agreed rate-card per SKU (Annexure A), locked for full agreement period</td></tr>
      <tr><td>Volume Tier Discount</td><td>Tier 1 (baseline): up to ₹X / Tier 2: +X to Y / Tier 3: above Y — escalating discount</td></tr>
      <tr><td>Payment Terms</td><td>Net 45 days from goods receipt and validated invoice</td></tr>
      <tr><td>Delivery</td><td>DDP to specified plant locations; standard items ≤ 7 days; custom ≤ 21 days</td></tr>
      <tr><td>Warranty / SLA</td><td>12 months on workmanship; defective returns accepted within 30 days; on-time delivery SLA ≥ 95%</td></tr>
      <tr><td>Price Revision</td><td>No mid-term price revision; only formal review at month 11 for next-year renewal</td></tr>
    </tbody>
  </table>

  <h2>3. PR Routing &amp; Catalog Onboarding</h2>
  <p>Upon counter-signature, the Supplier will be loaded into the Buyer's procurement catalog as the <strong>Preferred Supplier</strong> for ${gov.category}. Future purchase requisitions in this category will be auto-routed to the Supplier at the locked rate-card. Spot purchases from other suppliers will require category-manager exception approval.</p>

  <h2>4. Performance Monitoring</h2>
  <ul>
    <li>Quarterly performance review on on-time delivery, defect rate, and invoice accuracy.</li>
    <li>Monthly volume tracking against the indicative commit.</li>
    <li>Mid-year (month 6) and pre-renewal (month 11) governance reviews.</li>
  </ul>

  <h2>5. Termination &amp; Renewal</h2>
  <p>Either party may terminate with 60 days written notice for material breach. Renewal will be considered at month 11 based on performance scorecard and revised commercial terms.</p>

  <h2>6. Counter-Signature</h2>
  <p>Please counter-sign and return this Blanket Purchase Agreement by the Effective Date above. On receipt, the supplier will be activated in our procurement catalog.</p>

  <div id="catalog-confirmation" style="display:none">
    <div class="confirm-card">
      <div class="confirm-icon">✓</div>
      <div>
        <h3>Supplier Added to Catalog</h3>
        <p><strong>${gov.category}</strong> is now under blanket-PO governance.</p>
        <ul>
          <li>Supplier: Selected Preferred Supplier</li>
          <li>Effective: ${effectiveDate} → ${expiryDate}</li>
          <li>Annual volume committed: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</li>
          <li>Rate-card: locked per Annexure A</li>
        </ul>
        <p class="confirm-note">Future PRs in ${gov.category} will be auto-routed to this supplier at locked rates. Spot purchases require category-manager exception.</p>
      </div>
    </div>
  </div>

  <div class="send-bar">
    <div class="send-bar-row">
      <button class="btn btn-primary" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send for Counter-Signature</button>
      <button id="catalog-btn" class="btn btn-secondary" onclick="addToCatalog()">＋ Add Supplier + SKUs to Catalog</button>
    </div>
    <span class="send-hint">Send the agreement to the supplier. Once counter-signed, click Add to Catalog to activate routing.</span>
  </div>

  <script>
    function addToCatalog(){
      var c=document.getElementById('catalog-confirmation');
      var b=document.getElementById('catalog-btn');
      c.style.display='block';
      b.textContent='✓ Added to Catalog';
      b.disabled=true;
      b.classList.add('btn-disabled');
      c.scrollIntoView({behavior:'smooth',block:'center'});
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openRateContractDocument = (gov) => {
    const docId = `RC-2026-${(gov.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const expiryDate = new Date(Date.now() + (14 + 365) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = gov.spend || gov.total_spend || 0;
    const panelSize = Math.max(2, Math.min(4, gov.suppliers || 3));

    const subject = `Master Rate Contract - ${gov.category} - ${docId}`;
    const body = `Dear Panel Supplier,

Please find attached our Master Rate Contract for ${gov.category} covering the period ${effectiveDate} to ${expiryDate}.

Reference: ${docId}
Category Annual Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
Panel Size: ${panelSize} qualified suppliers

This rate contract standardizes SKU-level unit pricing across the qualified supplier panel. On counter-signature by each panel member, the rate-card will be loaded into our procurement catalog and buyers will shop the catalog at the locked rates, with the system routing each PR to the appropriate panel supplier.

Kindly counter-sign and return to formalize the rate contract.

Best regards,
Procurement Team`;
    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docId} | Master Rate Contract</title>
<style>${_baseDocStyles('#0891b2', '#ecfeff', '#a5f3fc')}</style>
</head>
<body>
  <div class="header"><h1>MASTER RATE CONTRACT</h1><div class="id">${docId}</div></div>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Effective Date:</span><span>${effectiveDate}</span></div>
    <div class="meta-row"><span class="meta-label">Expiry Date:</span><span>${expiryDate}</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${gov.category}</span></div>
    <div class="meta-row"><span class="meta-label">Supplier Panel:</span><span>${panelSize} qualified suppliers (counter-signature required from each)</span></div>
    <div class="meta-row"><span class="meta-label">Category Annual Volume:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
  </div>

  <h2>1. Purpose</h2>
  <p>This Master Rate Contract (MRC) standardizes unit pricing across a pre-qualified panel of <strong>${panelSize}</strong> suppliers for <strong>${gov.category}</strong>. Volume is not committed exclusively to any single panel member; instead, the system routes individual PRs based on availability, lead time, and plant proximity at the locked SKU-level rates.</p>

  <h2>2. Panel Composition</h2>
  <table>
    <thead><tr><th>Panel Role</th><th>Supplier Reference</th><th>Allocation Logic</th></tr></thead>
    <tbody>
      <tr><td>Primary</td><td>Panel Supplier 1 (counter-signature required)</td><td>First routing; highest reliability score</td></tr>
      <tr><td>Secondary</td><td>Panel Supplier 2 (counter-signature required)</td><td>Routed if Primary stock-out or longer lead time</td></tr>
      ${panelSize >= 3 ? `<tr><td>Tertiary</td><td>Panel Supplier 3 (counter-signature required)</td><td>Geographic / capacity backup</td></tr>` : ''}
      ${panelSize >= 4 ? `<tr><td>Reserve</td><td>Panel Supplier 4 (counter-signature required)</td><td>Capacity overflow / spot</td></tr>` : ''}
    </tbody>
  </table>

  <h2>3. Locked Rate-Card</h2>
  <p>Annexure A (referenced) contains the SKU-level unit pricing applicable to all panel members for the contract period. Key principles:</p>
  <ul>
    <li>All panel members serve PRs at the same locked unit price per SKU — no individual supplier deviation.</li>
    <li>Rate-card valid for 12 months; no mid-term revision except for formally approved force-majeure events.</li>
    <li>New SKUs introduced mid-term require unanimous panel agreement on the rate.</li>
  </ul>

  <h2>4. Commercial Terms</h2>
  <table>
    <thead><tr><th>Parameter</th><th>Term</th></tr></thead>
    <tbody>
      <tr><td>Payment Terms</td><td>Net 45 days from goods receipt</td></tr>
      <tr><td>Lead Time SLA</td><td>Catalog items ≤ 7 days; non-stock ≤ 21 days</td></tr>
      <tr><td>Warranty</td><td>12 months on workmanship; defect-return window 30 days</td></tr>
      <tr><td>Performance Floor</td><td>On-time delivery ≥ 95%; below this triggers panel review</td></tr>
    </tbody>
  </table>

  <h2>5. Catalog &amp; Buyer Experience</h2>
  <p>On counter-signature by all panel members, the locked rate-card is loaded into the procurement catalog. Buyers shop the catalog at fixed prices; the system handles supplier routing. This eliminates free-text spot buying in the category and ensures price discipline regardless of which panel member fulfills the order.</p>

  <h2>6. Panel Governance</h2>
  <ul>
    <li>Quarterly panel scorecard: on-time delivery, defect rate, response time, invoice accuracy.</li>
    <li>Under-performance triggers a written cure period; persistent failure triggers panel removal.</li>
    <li>Panel additions mid-term require category-manager approval and rate-card alignment.</li>
  </ul>

  <h2>7. Counter-Signature</h2>
  <p>Each panel member is required to counter-sign this MRC. Please return the signed agreement by the Effective Date above.</p>

  <div id="catalog-confirmation" style="display:none">
    <div class="confirm-card">
      <div class="confirm-icon">✓</div>
      <div>
        <h3>Rate-Card Loaded to Catalog</h3>
        <p><strong>${gov.category}</strong> is now under rate-contract governance.</p>
        <ul>
          <li>Panel size: ${panelSize} qualified suppliers</li>
          <li>Effective: ${effectiveDate} → ${expiryDate}</li>
          <li>Annual category volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</li>
          <li>Rate-card: locked per Annexure A — uniform across panel</li>
        </ul>
        <p class="confirm-note">Buyers will shop the catalog at locked rates. System routes each PR to the appropriate panel supplier based on reliability and availability.</p>
      </div>
    </div>
  </div>

  <div class="send-bar">
    <div class="send-bar-row">
      <button class="btn btn-primary" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send Rate Contract for Signature</button>
      <button id="catalog-btn" class="btn btn-secondary" onclick="loadToCatalog()">＋ Load Rate-Card to Catalog</button>
    </div>
    <span class="send-hint">Send the MRC to all panel suppliers for counter-signature. On full signature, click Load Rate-Card to activate catalog pricing.</span>
  </div>

  <script>
    function loadToCatalog(){
      var c=document.getElementById('catalog-confirmation');
      var b=document.getElementById('catalog-btn');
      c.style.display='block';
      b.textContent='✓ Rate-Card Loaded';
      b.disabled=true;
      b.classList.add('btn-disabled');
      c.scrollIntoView({behavior:'smooth',block:'center'});
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openMiniBidFrameworkDocument = (gov) => {
    const docId = `MBF-2026-${(gov.category || 'GEN').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const effectiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const termEndDate = new Date(Date.now() + (14 + 730) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const spendVal = gov.spend || gov.total_spend || 0;
    const panelSize = Math.max(3, Math.min(5, gov.suppliers || 4));

    const subject = `Mini-Bid Framework Agreement - ${gov.category} - ${docId}`;
    const body = `Dear Panel Supplier,

Please find attached our Mini-Bid Framework Agreement for ${gov.category} covering the period ${effectiveDate} to ${termEndDate}.

Reference: ${docId}
Panel Size: ${panelSize} pre-qualified suppliers
Category Indicative Annual Volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}

This framework establishes a pre-qualified panel for project-based and variable-scope requirements. Each requirement will be released as a mini-bid to the panel, with structured turnaround and scoring. Your inclusion in the panel is contingent on counter-signature of the framework and acceptance of the qualification standards.

Best regards,
Procurement Team`;
    const mailto = `mailto:iamrishav111@gmail.com,rishav.dhar24@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docId} | Mini-Bid Framework Agreement</title>
<style>${_baseDocStyles('#4f46e5', '#eef2ff', '#c7d2fe')}</style>
</head>
<body>
  <div class="header"><h1>MINI-BID FRAMEWORK AGREEMENT</h1><div class="id">${docId}</div></div>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">Issue Date:</span><span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Effective Date:</span><span>${effectiveDate}</span></div>
    <div class="meta-row"><span class="meta-label">Term End Date:</span><span>${termEndDate} (24 months)</span></div>
    <div class="meta-row"><span class="meta-label">Category:</span><span>${gov.category}</span></div>
    <div class="meta-row"><span class="meta-label">Panel Size:</span><span>${panelSize} pre-qualified suppliers</span></div>
    <div class="meta-row"><span class="meta-label">Indicative Annual Volume:</span><span>INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
  </div>

  <h2>1. Purpose</h2>
  <p>This Framework Agreement establishes a pre-qualified panel of <strong>${panelSize}</strong> suppliers for <strong>${gov.category}</strong> — a category where requirements are project-based or variable, making a fixed rate-card impractical. Each new requirement will be released as a mini-bid to the panel, with structured turnaround and pre-agreed scoring. The panel structure preserves competition while removing per-requirement supplier onboarding overhead.</p>

  <h2>2. Panel Qualification Standards</h2>
  <p>Inclusion in the panel requires the supplier to meet and maintain the following standards throughout the term:</p>
  <ul>
    <li><strong>Financial:</strong> Minimum 2 years of trading history; positive working capital; clean GST filings.</li>
    <li><strong>Technical:</strong> Demonstrated capability in ${gov.category} with at least two reference projects of comparable scope.</li>
    <li><strong>Compliance:</strong> Relevant certifications (ISO 9001 or category-specific); statutory compliance certifications current.</li>
    <li><strong>Capacity:</strong> Stated capacity sufficient to absorb at least 20% of category annual volume.</li>
  </ul>

  <h2>3. Mini-Bid Mechanics</h2>
  <table>
    <thead><tr><th>Stage</th><th>Mechanic</th></tr></thead>
    <tbody>
      <tr><td>Requirement Release</td><td>Issued simultaneously to all panel members with full scope and acceptance criteria</td></tr>
      <tr><td>Response Window</td><td>5 working days (standard) / 2 working days (urgent, with category-manager approval)</td></tr>
      <tr><td>Scoring Weights</td><td>Commercial 50% / Technical 30% / Delivery Timeline 20%</td></tr>
      <tr><td>Award Authority</td><td>Category Manager up to ₹10L; Procurement Head above ₹10L</td></tr>
      <tr><td>Notification</td><td>All bidders notified within 2 working days of award decision</td></tr>
    </tbody>
  </table>

  <h2>4. Volume Distribution</h2>
  <p>No volume is committed to any individual panel member. Over the term, share-of-wallet will reflect competitive performance: best commercials, technical fit, and on-time delivery. A panel-level annual scorecard tracks share-of-wallet, win rate, and SLA performance.</p>

  <h2>5. Panel Governance</h2>
  <ul>
    <li>Quarterly panel review on bid responsiveness, win rate, delivery SLA, and quality.</li>
    <li>Suppliers below performance floor (e.g. &lt;60% bid response, &gt;10% late delivery) receive written cure notice.</li>
    <li>Sustained underperformance results in panel removal at the next quarterly review.</li>
    <li>Mid-term panel additions require category-manager approval and full qualification check.</li>
  </ul>

  <h2>6. Term &amp; Renewal</h2>
  <p>The framework runs for 24 months from the Effective Date. Renewal will be considered 90 days before expiry based on the panel performance scorecard. Either party may exit with 60 days written notice.</p>

  <h2>7. Counter-Signature</h2>
  <p>Please counter-sign and return this Framework Agreement to confirm your inclusion in the panel. Mini-bid invitations will commence upon completion of all panel-member signatures and activation of the panel in our procurement system.</p>

  <div id="catalog-confirmation" style="display:none">
    <div class="confirm-card">
      <div class="confirm-icon">✓</div>
      <div>
        <h3>Bid Panel Established</h3>
        <p><strong>${gov.category}</strong> is now under mini-bid framework governance.</p>
        <ul>
          <li>Panel size: ${panelSize} pre-qualified suppliers</li>
          <li>Effective: ${effectiveDate} → ${termEndDate} (24 months)</li>
          <li>Indicative annual volume: INR ${spendVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</li>
          <li>Scoring: Commercial 50% / Technical 30% / Delivery 20%</li>
        </ul>
        <p class="confirm-note">Future requirements in ${gov.category} will be released as 5-day mini-bids to this panel. Quarterly performance scorecard governs share-of-wallet and panel composition.</p>
      </div>
    </div>
  </div>

  <div class="send-bar">
    <div class="send-bar-row">
      <button class="btn btn-primary" onclick="window.location.href='${mailto.replace(/'/g, "\\'")}'">✉ Send Framework Agreement</button>
      <button id="catalog-btn" class="btn btn-secondary" onclick="establishPanel()">＋ Establish Bid Panel</button>
    </div>
    <span class="send-hint">Send framework to all panel suppliers for counter-signature. Once all signed, click Establish Bid Panel to activate.</span>
  </div>

  <script>
    function establishPanel(){
      var c=document.getElementById('catalog-confirmation');
      var b=document.getElementById('catalog-btn');
      c.style.display='block';
      b.textContent='✓ Panel Established';
      b.disabled=true;
      b.classList.add('btn-disabled');
      c.scrollIntoView({behavior:'smooth',block:'center'});
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
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
                                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'MIGRATION NOTICE (DRAFT)'
                                                : selectedActionCategory.ai_strategy?.action_type === 'Renegotiate' ? 'RENEGOTIATION REQUEST (DRAFT)'
                                                : 'RFQ DOCUMENT (DRAFT)'}
                                          </div>
                                          <div className="text-base font-black text-primary">
                                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'MIG'
                                                : selectedActionCategory.ai_strategy?.action_type === 'Renegotiate' ? 'REN'
                                                : 'RFQ'}-2026-{selectedActionCategory.category.substring(0,3).toUpperCase()}
                                          </div>
                                      </div>
                                      <Zap size={24} className="text-primary/20"/>
                                  </div>
                                  <div className="text-xs leading-relaxed text-secondary font-medium">
                                      {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? (
                                          <p>Notify <strong>{selectedActionCategory.supplier_count - selectedActionCategory.target_suppliers}</strong> vendors of spend redirection to primary partners within 48 hours.</p>
                                      ) : selectedActionCategory.ai_strategy?.action_type === 'Renegotiate' ? (
                                          <p>Renegotiate commercial terms with the existing supplier for <strong>{selectedActionCategory.category}</strong>. Response deadline: 10 business days.</p>
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
                                  const at = selectedActionCategory.ai_strategy?.action_type;
                                  if (at === 'Migrate Spend') {
                                      openMigrationDocument(selectedActionCategory);
                                  } else if (at === 'Renegotiate') {
                                      openRenegotiationDocument(selectedActionCategory);
                                  } else {
                                      openRfqDocument(selectedActionCategory);
                                  }
                                  setRfqStatus('sent');
                              }}
                          >
                              {selectedActionCategory.ai_strategy?.action_type === 'Migrate Spend' ? 'Review Migration Notice'
                                : selectedActionCategory.ai_strategy?.action_type === 'Renegotiate' ? 'Review Renegotiation Request'
                                : 'Review RFQ Document'} <Send size={20}/>
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
                                              {(() => {
                                                const label = selectedGovernanceAction.action_label || '';
                                                const prefix = label.includes('Blanket') ? 'BPO'
                                                  : label.includes('Rate') ? 'RC'
                                                  : (label.includes('Mini-Bid') || label.includes('Mini Bid') || label.includes('Framework')) ? 'MBF'
                                                  : 'SRC';
                                                return `${prefix}-2026-${selectedGovernanceAction.category.substring(0,3).toUpperCase()}`;
                                              })()}
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
                                      const label = selectedGovernanceAction.action_label || '';
                                      if (label.includes('Blanket')) {
                                          openBlanketPoDocument(selectedGovernanceAction);
                                      } else if (label.includes('Rate')) {
                                          openRateContractDocument(selectedGovernanceAction);
                                      } else if (label.includes('Mini-Bid') || label.includes('Mini Bid') || label.includes('Framework')) {
                                          openMiniBidFrameworkDocument(selectedGovernanceAction);
                                      } else {
                                          openSourcingRfqDocument(selectedGovernanceAction);
                                      }
                                      setSelectedGovernanceAction(null);
                                  }}
                              >
                                  {selectedGovernanceAction.action_label || 'Generate Document'} <ShieldCheck size={20}/>
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

      {/* Catalog Addition Side-Pane */}
      {selectedCatalogAdd && (
          <>
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] animate-fadeIn" onClick={closeCatalogModal}></div>
              <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-3xl z-[110] flex flex-col animate-slideInRight border-l border-warning/30">
                  <div className="p-6 border-b bg-surface flex justify-between items-center">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <Package size={20} className="text-warning"/>
                              <h2 className="text-lg font-black text-text uppercase">Add to Catalog</h2>
                          </div>
                          <p className="text-xs text-secondary font-bold truncate max-w-[400px]" title={selectedCatalogAdd.description}>{selectedCatalogAdd.description}</p>
                      </div>
                      <button className="text-secondary hover:text-danger p-1" onClick={closeCatalogModal}>
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-surface flex flex-col gap-5">

                      {classifying && !classificationResult && (
                          <div className="flex flex-col items-center justify-center py-16 gap-4">
                              <Loader className="animate-spin text-primary" size={36} />
                              <p className="text-sm text-secondary font-bold">AI is classifying this item...</p>
                              <p className="text-[11px] text-secondary text-center max-w-xs">Matching against contract taxonomy and supplier preferences.</p>
                          </div>
                      )}

                      {classificationResult && !catalogConfirmed && !isSavingCatalog && (
                          <>
                              <div className="card p-4 bg-white border border-border rounded-2xl">
                                  <div className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Item Details (from spend history)</div>
                                  <div className="text-base font-bold text-text mb-3 leading-snug">{selectedCatalogAdd.description}</div>
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                          <div className="text-secondary font-medium">Reorder Frequency</div>
                                          <div className="font-bold text-danger">{selectedCatalogAdd.frequency.toFixed(0)} days</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">90-day Forecast</div>
                                          <div className="font-bold text-text">{selectedCatalogAdd.forecast_qty.toLocaleString()} units</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">Potential Savings</div>
                                          <div className="font-bold text-success">{formatCurrency(selectedCatalogAdd.potential_savings)}</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">Effective Date</div>
                                          <div className="font-bold text-text">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                      </div>
                                  </div>
                              </div>

                              <div className="card p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                      <Zap size={14} className="text-primary"/>
                                      <div className="text-[10px] font-black text-primary uppercase tracking-widest">AI Classification</div>
                                  </div>
                                  <div className="text-sm font-bold text-text leading-snug">
                                      {classificationResult.l1_category && (<span className="opacity-60">{classificationResult.l1_category} <span className="mx-1">›</span> </span>)}
                                      <span className="text-primary">{classificationResult.predicted_category || classificationResult.l2_category || 'General'}</span>
                                  </div>
                              </div>

                              <div className="card p-4 bg-white border-2 border-warning/30 rounded-2xl">
                                  <div className="text-[10px] font-black text-warning uppercase tracking-widest mb-2">Catalog Entry Preview</div>
                                  <table className="w-full text-xs">
                                      <tbody>
                                          <tr className="border-b border-border/50"><td className="py-2 text-secondary font-medium">SKU</td><td className="py-2 font-bold text-text text-right font-mono text-[11px]">Auto-generated on add</td></tr>
                                          <tr className="border-b border-border/50"><td className="py-2 text-secondary font-medium">Category</td><td className="py-2 font-bold text-text text-right">{classificationResult.predicted_category || 'General'}</td></tr>
                                          <tr className="border-b border-border/50"><td className="py-2 text-secondary font-medium">Routing</td><td className="py-2 font-bold text-text text-right">Preferred supplier (auto-route)</td></tr>
                                          <tr><td className="py-2 text-secondary font-medium">Contract Status</td><td className="py-2 font-bold text-success text-right">Under contract</td></tr>
                                      </tbody>
                                  </table>
                              </div>

                              <p className="text-[11px] text-secondary text-center font-medium leading-relaxed px-2">
                                  Once added, future PRs matching this item will auto-route to the preferred supplier at locked pricing. Spot purchases will require category-manager approval.
                              </p>
                          </>
                      )}

                      {isSavingCatalog && (
                          <div className="flex flex-col items-center justify-center py-16 gap-4">
                              <Loader className="animate-spin text-warning" size={36} />
                              <p className="text-sm text-secondary font-bold">Adding to procurement catalog...</p>
                          </div>
                      )}

                      {catalogConfirmed && (
                          <div className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30 rounded-2xl flex flex-col items-center text-center gap-3 animate-scaleIn">
                              <div className="w-16 h-16 bg-success text-white rounded-full flex items-center justify-center shadow-xl">
                                  <CheckCircle size={32} />
                              </div>
                              <h3 className="text-lg font-black text-success">Added to Catalog</h3>
                              <p className="text-sm text-secondary leading-relaxed max-w-sm">
                                  <span className="font-bold text-text">{selectedCatalogAdd.description}</span> is now part of the procurement catalog.
                              </p>
                              <div className="w-full bg-white border border-success/20 rounded-xl p-4 mt-2">
                                  <div className="grid grid-cols-2 gap-3 text-xs text-left">
                                      <div>
                                          <div className="text-secondary font-medium">New SKU</div>
                                          <div className="font-bold text-text font-mono">{catalogConfirmed.sku}</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">Category</div>
                                          <div className="font-bold text-text truncate" title={catalogConfirmed.l2}>{catalogConfirmed.l2}</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">Effective</div>
                                          <div className="font-bold text-text">{new Date(catalogConfirmed.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                      </div>
                                      <div>
                                          <div className="text-secondary font-medium">Status</div>
                                          <div className="font-bold text-success">Active · Under Contract</div>
                                      </div>
                                  </div>
                              </div>
                              <p className="text-[11px] text-secondary italic mt-1 max-w-sm">
                                  Future PRs for this item will auto-route to the preferred supplier at locked pricing.
                              </p>
                          </div>
                      )}

                  </div>

                  <div className="p-6 border-t bg-surface flex flex-col gap-3">
                      {classificationResult && !catalogConfirmed && !isSavingCatalog && (
                          <button
                              onClick={confirmCatalogAddition}
                              className="btn w-full py-4 rounded-xl font-black shadow-xl flex items-center justify-center gap-2 text-base"
                              style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                          >
                              Confirm &amp; Add to Catalog <CheckCircle size={20}/>
                          </button>
                      )}
                      {catalogConfirmed && (
                          <button
                              onClick={closeCatalogModal}
                              className="btn btn-success w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 text-base"
                          >
                              Done <CheckCircle size={20}/>
                          </button>
                      )}
                      <button
                          onClick={closeCatalogModal}
                          className="btn btn-ghost w-full py-2 text-xs font-bold text-secondary"
                      >
                          {catalogConfirmed ? 'Close' : 'Cancel'}
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
                                  {addedCatalogKeys.has(item.description) ? (
                                      <button
                                          disabled
                                          className="btn text-xs py-1.5 px-4 rounded-full font-bold flex items-center gap-1.5 mx-auto cursor-default"
                                          style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}
                                      >
                                          <CheckCircle size={12} /> Added to Catalog
                                      </button>
                                  ) : (
                                      <button
                                          className="btn btn-primary text-xs py-1.5 px-4 rounded-full font-bold"
                                          style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                                          onClick={async () => {
                                              setSelectedCatalogAdd(item);
                                              setClassificationResult(null);
                                              setCatalogConfirmed(null);
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
                                  )}
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

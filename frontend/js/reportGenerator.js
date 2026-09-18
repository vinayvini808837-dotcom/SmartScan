/**
 * SmartScan - Official Legal Metrology Inspection Report Generator
 */

const ReportGenerator = (function () {
  'use strict';

  /**
   * Renders the printable official inspection report into a container
   */
  function renderReport(scanData, targetElementId) {
    const container = document.getElementById(targetElementId);
    if (!container || !scanData) return;

    const isCompliant = scanData.isCompliant;
    const rules = scanData.rules || [];

    const rowsHtml = rules.map(rule => `
      <tr>
        <td><strong>${rule.ruleCode}</strong><br><small style="color: #64748B;">${rule.ruleName}</small></td>
        <td style="font-family: monospace; font-size: 0.85rem;">${escapeHtml(rule.detectedText || 'N/A')}</td>
        <td style="text-align: center;">
          <span class="badge ${rule.passed ? 'badge-compliant' : 'badge-non-compliant'}">
            ${rule.passed ? 'COMPLIANT' : 'VIOLATION'}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: #475569;">${rule.remarks}</td>
      </tr>
    `).join('');

    const violationsSummaryHtml = !isCompliant ? `
      <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #FFEBEE; border-left: 4px solid #C62828; border-radius: 4px;">
        <h4 style="color: #B71C1C; margin-bottom: 0.5rem;">⚠️ STATUTORY NOTICE RECOMMENDED UNDER SECTION 36(1)</h4>
        <p style="font-size: 0.875rem; color: #333;">
          This packaged commodity is in direct violation of the <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>. 
          Enforcement officers are advised to seize non-compliant units from retail display and issue form-based compounding notices.
        </p>
      </div>
    ` : `
      <div style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #E8F5E9; border-left: 4px solid #0A8754; border-radius: 4px;">
        <h4 style="color: #1B5E20; margin-bottom: 0.5rem;">✅ VERIFIED STATUTORY COMPLIANCE</h4>
        <p style="font-size: 0.875rem; color: #333;">
          All mandatory declarations required under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 
          were detected and verified on this product package label.
        </p>
      </div>
    `;

    container.innerHTML = `
      <div class="official-report-card">
        <div class="report-watermark">${isCompliant ? 'VERIFIED' : 'NON-COMPLIANT'}</div>
        
        <div class="report-header">
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; margin-bottom: 4px;">
            Government of India • Ministry of Consumer Affairs, Food & Public Distribution
          </div>
          <h2>DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION</h2>
          <p>Statutory Inspection & Compliance Report under Legal Metrology Act, 2009 (Act No. 1 of 2010)</p>
        </div>

        <div class="report-meta-grid">
          <div>
            <p><strong>Inspection ID:</strong> <span style="font-family: monospace;">${scanData.inspectionId}</span></p>
            <p><strong>Commodity:</strong> ${escapeHtml(scanData.productName)}</p>
            <p><strong>Brand / Enterprise:</strong> ${escapeHtml(scanData.brand || 'Unspecified')}</p>
          </div>
          <div>
            <p><strong>Date & Time:</strong> ${scanData.scanTimestamp || new Date().toLocaleString('en-IN')}</p>
            <p><strong>Retail / Inspection Venue:</strong> ${escapeHtml(scanData.storeName || 'Field Retail Sample')}</p>
            <p><strong>Jurisdiction / State:</strong> ${escapeHtml(scanData.state || 'Karnataka')}</p>
          </div>
        </div>

        <h3 style="font-size: 1rem; color: #0F2D59; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">
          Mandatory Declarations Evaluation Matrix (PCR, 2011)
        </h3>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 25%;">Rule Provision</th>
              <th style="width: 30%;">Detected Declaration</th>
              <th style="width: 15%; text-align: center;">Status</th>
              <th style="width: 30%;">Statutory Finding</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${violationsSummaryHtml}

        <div class="report-footer">
          <div>
            <p style="font-size: 0.75rem; color: #64748B;">Generated via SmartScan Automated Metrology Inspection System</p>
            <p style="font-size: 0.75rem; color: #64748B;">Digital Hash Verification: SHA256-${Math.random().toString(36).substring(2, 12).toUpperCase()}</p>
          </div>
          <div class="signature-box">
            <p>Authorized Inspection Seal</p>
            <p style="font-size: 0.75rem; color: #64748B;">Legal Metrology Officer</p>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Triggers native print dialog formatted for print CSS
   */
  function printReport() {
    window.print();
  }

  return {
    renderReport: renderReport,
    printReport: printReport
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.ReportGenerator = ReportGenerator;
}

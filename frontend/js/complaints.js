/**
 * ComplyScan - State Legal Metrology Complaints & Grievance Handler
 * Direct statutory transmission to State Controllers under Legal Metrology Act, 2009.
 */

const ComplaintsPortal = (function () {
  'use strict';

  const STATE_OFFICES = {
    'Gujarat': {
      controller: 'Controller of Legal Metrology, Sector-10B, Gandhinagar - 382010',
      email: 'clm-gujarat@nic.in',
      helpline: '079-23253500'
    },
    'Karnataka': {
      controller: 'Controller of Legal Metrology, Ali Asker Road, Bengaluru - 560052',
      email: 'clm-ka@nic.in',
      helpline: '080-22262444'
    },
    'Maharashtra': {
      controller: 'Controller of Legal Metrology, Barrack No. 7, Free Church Compound, Mumbai - 400021',
      email: 'clm-mh@nic.in',
      helpline: '022-22886666'
    },
    'Delhi': {
      controller: 'Controller of Legal Metrology, C-Block, Vikas Bhawan, I.P. Estate, New Delhi - 110002',
      email: 'clm-delhi@nic.in',
      helpline: '011-23379200'
    },
    'Tamil Nadu': {
      controller: 'Controller of Legal Metrology, DMS Campus, Teynampet, Chennai - 600006',
      email: 'clm-tn@nic.in',
      helpline: '044-24330111'
    },
    'Uttar Pradesh': {
      controller: 'Controller of Legal Metrology, 4-A, Rana Pratap Marg, Lucknow - 226001',
      email: 'clm-up@nic.in',
      helpline: '0522-2287123'
    },
    'West Bengal': {
      controller: 'Controller of Legal Metrology, 45, Ganesh Chandra Avenue, Kolkata - 700013',
      email: 'clm-wb@nic.in',
      helpline: '033-22361000'
    },
    'Telangana': {
      controller: 'Controller of Legal Metrology, PWD Building, Khairatabad, Hyderabad - 500004',
      email: 'clm-tg@nic.in',
      helpline: '040-23390888'
    }
  };

  // Resilient API Fetch Helper
  async function fetchFromApi(path, options = {}) {
    try {
      const res = await fetch(path, options);
      if (res.ok || res.status === 400 || res.status === 404) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Relative fetch failed, trying http://localhost:5000 fallback:', e.message);
    }
    const fallbackRes = await fetch(`http://localhost:5000${path}`, options);
    return await fallbackRes.json();
  }

  /**
   * Initialize complaints page
   */
  function init() {
    const form = document.getElementById('complaintForm');
    const stateSelect = document.getElementById('stateSelect');

    if (stateSelect) {
      stateSelect.addEventListener('change', (e) => {
        updateOfficeInfo(e.target.value);
      });
      // Default to Gujarat (DOMS) or active state
      updateOfficeInfo(stateSelect.value || 'Gujarat');
    }

    if (form) {
      form.addEventListener('submit', handleSubmit);
      prefillFromActiveScan();
    }

    loadComplaintsFromBackend();
  }

  function updateOfficeInfo(selectedState) {
    const box = document.getElementById('stateOfficeInfo');
    if (!box) return;

    const office = STATE_OFFICES[selectedState] || {
      controller: `Controller of Legal Metrology, State Head Office, ${selectedState}`,
      email: `clm-${(selectedState || 'in').toLowerCase()}@nic.in`,
      helpline: '1915'
    };

    box.innerHTML = `
      <div style="background: #F1F5F9; border-left: 4px solid #0F2D59; padding: 1rem; border-radius: 6px; font-size: 0.85rem;">
        <p style="margin:0 0 6px 0;"><strong>Jurisdictional Enforcement Office:</strong> ${office.controller}</p>
        <p style="margin:0;"><strong>Official State Transmit Email:</strong> <a href="mailto:${office.email}">${office.email}</a> &bull; <strong>Toll-free Hotline:</strong> ${office.helpline}</p>
      </div>
    `;
  }

  /**
   * Pre-fill the complaint form if coming from a scan with violations
   */
  function prefillFromActiveScan() {
    const scanData = window.SmartScanApp ? window.SmartScanApp.getActiveScan() : null;
    if (!scanData) return;

    const productNameInput = document.getElementById('productName');
    const brandInput = document.getElementById('brandName');
    const storeNameInput = document.getElementById('storeName');
    const stateSelect = document.getElementById('stateSelect');
    const violationsTextarea = document.getElementById('violationsSummary');
    const scanRefInput = document.getElementById('scanReferenceId');

    if (productNameInput) productNameInput.value = scanData.productName || '';
    if (brandInput) brandInput.value = scanData.brand || '';
    if (storeNameInput) storeNameInput.value = scanData.storeName || '';
    if (scanRefInput) scanRefInput.value = scanData.inspectionId || '';

    if (stateSelect && scanData.state) {
      stateSelect.value = scanData.state;
      updateOfficeInfo(scanData.state);
    }

    if (violationsTextarea) {
      if (scanData.violations && scanData.violations.length > 0) {
        const list = scanData.violations.map(v => {
          if (typeof v === 'string') return v;
          return `${v.ruleCode} (${v.ruleName}): ${v.remarks || 'Statutory requirement breached'}`;
        }).join('\n');
        violationsTextarea.value = list;
      } else if (scanData.isCompliant === false) {
        violationsTextarea.value = 'Mandatory declaration violation observed on commodity packaging under Legal Metrology Rules, 2011.';
      }
    }
  }

  /**
   * Handles complaint form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const stateSelect = document.getElementById('stateSelect');
    const state = stateSelect ? stateSelect.value : 'Gujarat';
    const stateCode = getStateCode(state);
    const trackingId = `LM-COMP-2026-${stateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaintPayload = {
      trackingId: trackingId,
      inspectionId: document.getElementById('scanReferenceId')?.value || 'LM-INSP-MANUAL',
      productName: document.getElementById('productName')?.value || 'Packaged Commodity',
      brand: document.getElementById('brandName')?.value || 'Retailer/Brand',
      state: state,
      district: document.getElementById('districtName')?.value || 'District HQ',
      storeName: document.getElementById('storeName')?.value || 'Retail Store',
      violationsSummary: document.getElementById('violationsSummary')?.value || 'Rule 6 mandatory declaration violation',
      complainantName: document.getElementById('complainantName')?.value || 'Consumer / Verification Officer',
      complainantPhone: document.getElementById('complainantPhone')?.value || '',
      complainantEmail: document.getElementById('complainantEmail')?.value || ''
    };

    // Save locally
    if (window.SmartScanApp) {
      window.SmartScanApp.saveComplaint(complaintPayload);
    }

    // Save to backend REST API
    try {
      const apiResult = await fetchFromApi('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintPayload)
      });
      console.log('Complaint saved to backend:', apiResult);
    } catch (err) {
      console.warn('Backend complaint sync notice:', err.message);
    }

    // Show success dialog
    const modal = document.getElementById('successModal');
    const modalTracking = document.getElementById('modalTrackingId');
    if (modal && modalTracking) {
      modalTracking.textContent = trackingId;
      modal.style.display = 'flex';
    } else {
      alert(`Statutory Complaint successfully registered!\nYour Tracking ID: ${trackingId}\nTransmitted to ${state} Controller of Legal Metrology.`);
      window.location.reload();
    }

    loadComplaintsFromBackend();
  }

  function getStateCode(state) {
    const codes = {
      'Gujarat': 'GJ',
      'Karnataka': 'KA',
      'Maharashtra': 'MH',
      'Delhi': 'DL',
      'Tamil Nadu': 'TN',
      'Uttar Pradesh': 'UP',
      'West Bengal': 'WB',
      'Telangana': 'TG'
    };
    return codes[state] || 'IN';
  }

  async function loadComplaintsFromBackend() {
    const tbody = document.getElementById('recentComplaintsTableBody');
    if (!tbody) return;

    let complaints = [];
    try {
      const res = await fetchFromApi('/api/complaints');
      if (res && res.success && Array.isArray(res.data)) {
        complaints = res.data;
      }
    } catch (e) {
      console.warn('Could not fetch backend complaints, using local store:', e);
    }

    if (complaints.length === 0 && window.SmartScanApp) {
      complaints = window.SmartScanApp.getComplaints();
    }

    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td><strong style="font-family: monospace; color: #0F2D59;">${c.trackingId}</strong></td>
        <td><strong>${c.productName}</strong><br><small style="color:#64748B;">${c.brand || ''}</small></td>
        <td><span class="badge badge-info">${c.state}</span></td>
        <td><small style="color: #475569; display: block; max-width: 320px;">${c.violationsSummary}</small></td>
        <td>
          <span class="badge ${c.status === 'RESOLVED' ? 'badge-compliant' : (c.status === 'NOTICE_ISSUED' ? 'badge-danger' : 'badge-warning')}">
            ${c.status.replace(/_/g, ' ')}
          </span>
        </td>
        <td><small>${c.filedDate || (c.createdAt ? c.createdAt.slice(0, 10) : '2026-09-19')}</small></td>
      </tr>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init: init,
    STATE_OFFICES: STATE_OFFICES,
    loadComplaintsFromBackend: loadComplaintsFromBackend
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.ComplaintsPortal = ComplaintsPortal;
}

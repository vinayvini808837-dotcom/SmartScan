/**
 * SmartScan - State Legal Metrology Complaints & Grievance Handler
 */

const ComplaintsPortal = (function () {
  'use strict';

  const STATE_OFFICES = {
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
    'Gujarat': {
      controller: 'Controller of Legal Metrology, Sector-10B, Gandhinagar - 382010',
      email: 'clm-gujarat@nic.in',
      helpline: '079-23253500'
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

  /**
   * Initialize complaints page
   */
  function init() {
    const form = document.getElementById('complaintForm');
    const stateSelect = document.getElementById('stateSelect');
    const officeInfoBox = document.getElementById('stateOfficeInfo');

    if (stateSelect) {
      stateSelect.addEventListener('change', (e) => {
        updateOfficeInfo(e.target.value);
      });
    }

    if (form) {
      form.addEventListener('submit', handleSubmit);
      prefillFromActiveScan();
    }

    renderRecentComplaintsTable();
  }

  function updateOfficeInfo(selectedState) {
    const box = document.getElementById('stateOfficeInfo');
    if (!box) return;

    const office = STATE_OFFICES[selectedState];
    if (office) {
      box.innerHTML = `
        <div style="background: #F1F5F9; border-left: 4px solid #0F2D59; padding: 1rem; border-radius: 6px; font-size: 0.85rem;">
          <p><strong>Jurisdictional Office:</strong> ${office.controller}</p>
          <p><strong>Official State Email:</strong> <a href="mailto:${office.email}">${office.email}</a> | <strong>Toll-free Hotline:</strong> ${office.helpline}</p>
        </div>
      `;
    } else {
      box.innerHTML = '';
    }
  }

  /**
   * Pre-fill the complaint form if coming from a non-compliant scan
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

    if (violationsTextarea && scanData.violations) {
      const list = scanData.violations.map(v => `${v.ruleCode} (${v.ruleName}): ${v.remarks}`).join('\n');
      violationsTextarea.value = list || 'Mandatory declaration violation observed on product packaging.';
    }
  }

  /**
   * Handles complaint form submission
   */
  function handleSubmit(e) {
    e.preventDefault();

    const stateSelect = document.getElementById('stateSelect');
    const state = stateSelect ? stateSelect.value : 'Karnataka';
    const stateCode = getStateCode(state);
    const trackingId = `LM-COMP-2026-${stateCode}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComplaint = {
      trackingId: trackingId,
      inspectionId: document.getElementById('scanReferenceId')?.value || 'LM-INSP-MANUAL',
      productName: document.getElementById('productName')?.value || 'Packaged Commodity',
      brand: document.getElementById('brandName')?.value || 'Retailer/Brand',
      state: state,
      district: document.getElementById('districtName')?.value || 'District HQ',
      storeName: document.getElementById('storeName')?.value || 'Retail Store',
      violationsSummary: document.getElementById('violationsSummary')?.value || 'Rule 6 violation',
      officerAssigned: `Enforcement Officer, Division ${stateCode}`,
      status: 'UNDER_INVESTIGATION',
      filedDate: new Date().toISOString().slice(0, 10)
    };

    window.SmartScanApp.saveComplaint(newComplaint);

    // Show success dialog
    const modal = document.getElementById('successModal');
    const modalTracking = document.getElementById('modalTrackingId');
    if (modal && modalTracking) {
      modalTracking.textContent = trackingId;
      modal.style.display = 'flex';
    } else {
      alert(`Complaint successfully registered!\nYour Tracking ID: ${trackingId}\nTransmitted to ${state} Legal Metrology Enforcement Division.`);
      window.location.reload();
    }
  }

  function getStateCode(state) {
    const codes = {
      'Karnataka': 'KA',
      'Maharashtra': 'MH',
      'Delhi': 'DL',
      'Tamil Nadu': 'TN',
      'Uttar Pradesh': 'UP',
      'Gujarat': 'GJ',
      'West Bengal': 'WB',
      'Telangana': 'TG'
    };
    return codes[state] || 'IN';
  }

  function renderRecentComplaintsTable() {
    const tbody = document.getElementById('recentComplaintsTableBody');
    if (!tbody || !window.SmartScanApp) return;

    const complaints = window.SmartScanApp.getComplaints();
    tbody.innerHTML = complaints.map(c => `
      <tr>
        <td><strong style="font-family: monospace; color: #0F2D59;">${c.trackingId}</strong></td>
        <td>${c.productName}</td>
        <td>${c.state}</td>
        <td><small style="color: #64748B;">${c.violationsSummary}</small></td>
        <td>
          <span class="badge ${c.status === 'RESOLVED' ? 'badge-compliant' : 'badge-warning'}">
            ${c.status.replace('_', ' ')}
          </span>
        </td>
        <td>${c.filedDate}</td>
      </tr>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init: init,
    STATE_OFFICES: STATE_OFFICES
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.ComplaintsPortal = ComplaintsPortal;
}

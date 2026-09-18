/**
 * SmartScan - Application State & Repository Manager
 */

const SmartScanApp = (function () {
  'use strict';

  const STORAGE_KEY_INSPECTIONS = 'smartscan_inspections';
  const STORAGE_KEY_COMPLAINTS = 'smartscan_complaints';
  const STORAGE_KEY_CURRENT_SCAN = 'smartscan_active_scan';

  // Seed data for initial hackathon demo presentation
  const INITIAL_INSPECTIONS = [
    {
      id: 'LM-INSP-842109',
      productName: 'Britannia NutriChoice Oats Biscuit',
      category: 'Biscuits & Bakery',
      brand: 'Britannia Industries Ltd',
      date: '2026-09-17 14:22',
      isCompliant: true,
      complianceScore: 100,
      violationsCount: 0,
      violations: [],
      image: 'sample_biscuit.svg',
      storeName: 'Reliance Smart Superstore, Indiranagar',
      state: 'Karnataka',
      mrp: '₹35.00 (incl. of all taxes)',
      netQty: '150 g (₹0.23 / g)',
      mfgDate: '07/2026'
    },
    {
      id: 'LM-INSP-791044',
      productName: 'Everest Shahi Garam Masala Pouch',
      category: 'Spices & Condiments',
      brand: 'Everest Food Products Pvt Ltd',
      date: '2026-09-16 11:05',
      isCompliant: false,
      complianceScore: 71,
      violationsCount: 2,
      violations: [
        {
          ruleCode: 'Rule 6(1)(f)',
          ruleName: 'Consumer Care Cell Details',
          remarks: 'VIOLATION: Helpline number and consumer grievance email absent on package.'
        },
        {
          ruleCode: 'Rule 6(1)(e)',
          ruleName: 'Unit Sale Price Declaration',
          remarks: 'VIOLATION: Unit sale price (₹/g) not declared alongside MRP.'
        }
      ],
      image: 'sample_masala.svg',
      storeName: 'Apna Kirana Store, Dadar West',
      state: 'Maharashtra',
      mrp: '₹78.00',
      netQty: '100 g',
      mfgDate: '08/2026'
    },
    {
      id: 'LM-INSP-620419',
      productName: 'Swiss Delice Truffles Dark Chocolate',
      category: 'Confectionery (Imported)',
      brand: 'Delice Confectionery AG',
      date: '2026-09-15 17:40',
      isCompliant: false,
      complianceScore: 57,
      violationsCount: 3,
      violations: [
        {
          ruleCode: 'Rule 6(1)(g)',
          ruleName: 'Country of Origin Declaration',
          remarks: 'VIOLATION: Country of origin missing on imported commodity.'
        },
        {
          ruleCode: 'Rule 6(1)(a)',
          ruleName: 'Importer Name and Address',
          remarks: 'VIOLATION: Indian importer details and FSSAI/PIN code not declared.'
        },
        {
          ruleCode: 'Rule 6(1)(e)',
          ruleName: 'Maximum Retail Price in INR',
          remarks: 'VIOLATION: Price printed in Euros (€) without mandatory INR sticker.'
        }
      ],
      image: 'sample_chocolate.svg',
      storeName: 'Nature’s Basket, Bandra',
      state: 'Maharashtra',
      mrp: '€ 4.50 (Non-compliant)',
      netQty: '200 g',
      mfgDate: '06/2026'
    },
    {
      id: 'LM-INSP-550118',
      productName: 'Tata Sampann Unpolished Toor Dal',
      category: 'Pulses & Grains',
      brand: 'Tata Consumer Products Ltd',
      date: '2026-09-14 09:15',
      isCompliant: true,
      complianceScore: 100,
      violationsCount: 0,
      violations: [],
      image: 'sample_dal.svg',
      storeName: 'DMart Hypermarket, Whitefield',
      state: 'Karnataka',
      mrp: '₹165.00 (incl. of all taxes)',
      netQty: '1 kg (₹0.165 / g)',
      mfgDate: '08/2026'
    }
  ];

  const INITIAL_COMPLAINTS = [
    {
      trackingId: 'LM-COMP-2026-MH-9411',
      inspectionId: 'LM-INSP-791044',
      productName: 'Everest Shahi Garam Masala Pouch',
      brand: 'Everest Food Products Pvt Ltd',
      state: 'Maharashtra',
      district: 'Mumbai Suburban',
      storeName: 'Apna Kirana Store, Dadar West',
      violationsSummary: 'Rule 6(1)(f) Consumer Care Missing, Rule 6(1)(e) Unit Price absent',
      officerAssigned: 'Inspector R. K. Shinde (Divisional LM Office, Mumbai)',
      status: 'UNDER_INVESTIGATION',
      filedDate: '2026-09-16'
    },
    {
      trackingId: 'LM-COMP-2026-KA-4891',
      inspectionId: 'LM-INSP-620419',
      productName: 'Swiss Delice Truffles Dark Chocolate',
      brand: 'Delice Confectionery AG (Importer unknown)',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      storeName: 'Gourmet World, Koramangala',
      violationsSummary: 'Rule 6(1)(g) Country of Origin missing, Non-INR pricing',
      officerAssigned: 'Controller S. M. Patel, Legal Metrology Bengaluru',
      status: 'NOTICE_ISSUED',
      filedDate: '2026-09-15'
    }
  ];

  // Initialize storage if empty
  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY_INSPECTIONS)) {
      localStorage.setItem(STORAGE_KEY_INSPECTIONS, JSON.stringify(INITIAL_INSPECTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEY_COMPLAINTS)) {
      localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
    }
  }

  // Inspections Repository
  function getInspections() {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_INSPECTIONS)) || [];
    } catch (e) {
      return INITIAL_INSPECTIONS;
    }
  }

  function saveInspection(inspection) {
    const list = getInspections();
    list.unshift(inspection);
    localStorage.setItem(STORAGE_KEY_INSPECTIONS, JSON.stringify(list));
    return inspection;
  }

  // Complaints Repository
  function getComplaints() {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPLAINTS)) || [];
    } catch (e) {
      return INITIAL_COMPLAINTS;
    }
  }

  function saveComplaint(complaint) {
    const list = getComplaints();
    list.unshift(complaint);
    localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(list));
    return complaint;
  }

  // Active Scan Session Storage
  function setActiveScan(scanData) {
    sessionStorage.setItem(STORAGE_KEY_CURRENT_SCAN, JSON.stringify(scanData));
  }

  function getActiveScan() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY_CURRENT_SCAN);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Impact Counters calculation
  function getImpactStats() {
    const inspections = getInspections();
    const complaints = getComplaints();

    const totalScans = 48290 + inspections.length;
    const violationsFound = 14120 + inspections.filter(i => !i.isCompliant).length;
    const complaintsLodged = 9840 + complaints.length;
    const resolvedComplaints = Math.round(complaintsLodged * 0.906);

    return {
      totalScans: totalScans.toLocaleString('en-IN'),
      violationsFound: violationsFound.toLocaleString('en-IN'),
      complaintsLodged: complaintsLodged.toLocaleString('en-IN'),
      resolvedComplaints: resolvedComplaints.toLocaleString('en-IN'),
      resolutionRate: '90.6%'
    };
  }

  // Toast notifications
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'ℹ️';
    if (type === 'success') {
      icon = '✅';
      toast.style.backgroundColor = '#0A8754';
    } else if (type === 'error') {
      icon = '⚠️';
      toast.style.backgroundColor = '#C62828';
    }

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Highlight active nav item
  function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Run on DOM loaded
  document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    setActiveNavLink();
  });

  return {
    getInspections: getInspections,
    saveInspection: saveInspection,
    getComplaints: getComplaints,
    saveComplaint: saveComplaint,
    setActiveScan: setActiveScan,
    getActiveScan: getActiveScan,
    getImpactStats: getImpactStats,
    showToast: showToast
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.SmartScanApp = SmartScanApp;
}

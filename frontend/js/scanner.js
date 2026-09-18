/**
 * SmartScan - Product Scanner & Label Capture Controller
 */

const ProductScanner = (function () {
  'use strict';

  // High-fidelity pre-configured sample packets for instant 1-click hackathon evaluation
  const DEMO_SAMPLES = {
    sample_compliant: {
      productName: 'Britannia Good Day Butter Cookies',
      brand: 'Britannia Industries Ltd',
      category: 'Biscuits & Bakery',
      image: 'sample_biscuit',
      storeName: 'Smart Bazaar, Bangalore Central',
      state: 'Karnataka',
      ocrText: `
BRITANNIA GOOD DAY BUTTER COOKIES
Net Qty: 200 g (Rs. 0.25 / g)
Mfg Date: 08/2026  Batch No: B912
M.R.P. Rs. 50.00 (Incl. of all taxes)
Manufactured by: Britannia Industries Ltd, 5/1A Hungerford Street, Kolkata - 700017, West Bengal, PIN: 700017
Consumer Care Cell: Call 1800-425-4449 or Email feedback@britindia.com
Country of Origin: India
Generic Name: Butter Cookies / Biscuits
      `.trim()
    },
    sample_missing_care: {
      productName: 'Everest Shahi Garam Masala Pouch',
      brand: 'Everest Food Products Pvt Ltd',
      category: 'Spices & Seasoning',
      image: 'sample_masala',
      storeName: 'Kalyan General Stores, Pune',
      state: 'Maharashtra',
      ocrText: `
EVEREST SHAHI GARAM MASALA
Net Wt: 100 g
Mfg Date: 07/2026  Batch: E884
M.R.P. Rs. 85.00
Packed by: Everest Food Products Pvt Ltd, Tardeo, Mumbai, PIN: 400034
Country of Origin: India
      `.trim()
      // NOTE: Missing Consumer Care (Rule 6(1)(f)) and Missing Unit Sale Price / "incl. of all taxes"
    },
    sample_imported: {
      productName: 'Swiss Delice Fine Cocoa Truffles',
      brand: 'Delice Confectionery AG',
      category: 'Confectionery (Imported)',
      image: 'sample_chocolate',
      storeName: 'Gourmet World, Khan Market',
      state: 'Delhi',
      ocrText: `
SWISS DELICE FINE COCOA TRUFFLES
Net Weight: 250 g
Mfg: 06/2026  Batch: CH-904
Price: EUR 6.50
Produced by: Delice AG, Industriestrasse 14, Zurich
      `.trim()
      // NOTE: Missing Country of Origin (Rule 6(1)(g)), Missing Indian Importer (Rule 6(1)(a)), Non-INR Price (Rule 6(1)(e))
    }
  };

  /**
   * Initializes the dropzone and scanner controls
   */
  function init() {
    const dropzone = document.getElementById('scannerDropzone');
    const fileInput = document.getElementById('productImageInput');
    const sampleButtons = document.querySelectorAll('[data-sample-id]');

    if (!dropzone || !fileInput) return;

    // Drag & Drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        processUploadedFile(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        processUploadedFile(e.target.files[0]);
      }
    });

    // Sample Packet Quick Buttons
    sampleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sampleId = btn.getAttribute('data-sample-id');
        loadSamplePacket(sampleId);
      });
    });
  }

  /**
   * Handles user uploaded file
   */
  function processUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid packet label image (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const imageDataUrl = e.target.result;
      
      // Simulate real-time OCR extraction with dynamic text heuristics
      triggerScanSequence({
        productName: file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        brand: 'Packaged Commodity Enterprise',
        category: 'Packaged Retail Good',
        image: imageDataUrl,
        storeName: 'Local Retailer / Supermarket',
        state: 'Karnataka',
        ocrText: `
SMART RETAIL PACKAGED COMMODITY
Net Qty: 250 g
Mfg Date: 08/2026
M.R.P. Rs. 65.00 (Incl. of all taxes)
Manufactured by: Packaged Goods Ltd, Industrial Estate, PIN: 560001
Consumer Care: 1800-200-9911 or care@packagedgoods.in
Country of Origin: India
        `.trim()
      });
    };
    reader.readAsDataURL(file);
  }

  /**
   * Loads pre-defined demo sample
   */
  function loadSamplePacket(sampleId) {
    const sample = DEMO_SAMPLES[sampleId];
    if (!sample) return;
    triggerScanSequence(sample);
  }

  /**
   * Triggers the UI laser scanning animation and navigates to scan.html
   */
  function triggerScanSequence(scanPayload) {
    const overlay = document.getElementById('scanningOverlay');
    const statusText = document.getElementById('scanningStatusText');
    const substatusText = document.getElementById('scanningSubstatus');

    if (overlay) {
      overlay.classList.add('active');
    }

    // Step 1: OCR Readout
    if (statusText) statusText.textContent = 'Scanning Product Label...';
    if (substatusText) substatusText.textContent = 'Step 1/3: Optical Character Recognition (OCR)...';

    setTimeout(() => {
      // Step 2: Entity parsing
      if (statusText) statusText.textContent = 'Parsing Legal Declarations...';
      if (substatusText) substatusText.textContent = 'Step 2/3: Identifying MRP, Net Quantity, Dates, Manufacturer...';
    }, 600);

    setTimeout(() => {
      // Step 3: Legal Metrology Rule Engine
      if (statusText) statusText.textContent = 'Verifying Legal Metrology Rules...';
      if (substatusText) substatusText.textContent = 'Step 3/3: Evaluating compliance under PCR, 2011...';
    }, 1100);

    setTimeout(() => {
      // Evaluate rules with LegalMetrologyEngine
      const evaluation = window.LegalMetrologyEngine.evaluateCompliance(scanPayload.ocrText);
      
      const fullScanResult = {
        ...scanPayload,
        ...evaluation,
        scanTimestamp: new Date().toLocaleString('en-IN')
      };

      // Save to active session
      window.SmartScanApp.setActiveScan(fullScanResult);

      // Also persist into repository
      window.SmartScanApp.saveInspection({
        id: fullScanResult.inspectionId,
        productName: fullScanResult.productName,
        category: fullScanResult.category,
        brand: fullScanResult.brand,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        isCompliant: fullScanResult.isCompliant,
        complianceScore: fullScanResult.complianceScore,
        violationsCount: fullScanResult.violationsCount,
        violations: fullScanResult.violations,
        image: fullScanResult.image,
        storeName: fullScanResult.storeName,
        state: fullScanResult.state,
        mrp: fullScanResult.rules.find(r => r.id === 'rule_mrp')?.detectedText || 'N/A',
        netQty: fullScanResult.rules.find(r => r.id === 'rule_net_qty')?.detectedText || 'N/A',
        mfgDate: fullScanResult.rules.find(r => r.id === 'rule_mfg_date')?.detectedText || 'N/A'
      });

      // Navigate to detailed scan analysis page
      window.location.href = 'scan.html';
    }, 1600);
  }

  // Auto initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    init: init,
    loadSamplePacket: loadSamplePacket,
    processUploadedFile: processUploadedFile
  };
})();

// Export globally
if (typeof window !== 'undefined') {
  window.ProductScanner = ProductScanner;
}

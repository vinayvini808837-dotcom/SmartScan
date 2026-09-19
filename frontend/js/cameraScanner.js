/**
 * SmartScan - Live Camera Barcode Scanner & Viewfinder Controller
 * Streams device camera, detects barcodes (EAN-13, UPC, Code 128),
 * plays audio feedback, and queries the Express REST API.
 */

const CameraScanner = (function () {
  'use strict';

  let videoStream = null;
  let isScanning = false;
  let barcodeDetector = null;
  let scanIntervalId = null;
  const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

  // Audio Beep using Web Audio API (Zero external assets needed)
  function playBeep(freq = 880, duration = 0.12) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  }

  // Check if native BarcodeDetector API is supported
  async function initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        console.log('Supported Barcode Formats:', formats);
        barcodeDetector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
      } catch (err) {
        console.warn('BarcodeDetector initialization issue:', err);
      }
    }
  }

  // Start Camera Stream
  async function startCamera(videoElementId = 'scannerVideo') {
    const video = document.getElementById(videoElementId);
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const startBtn = document.getElementById('btnStartCamera');
    const stopBtn = document.getElementById('btnStopCamera');
    const cameraStatus = document.getElementById('cameraStatusBadge');

    if (!video) return;

    try {
      if (cameraStatus) cameraStatus.textContent = 'Requesting Camera Access...';

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = videoStream;
      await video.play();

      if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
      video.style.display = 'block';
      if (startBtn) startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'inline-flex';
      if (cameraStatus) {
        cameraStatus.textContent = '● Camera Active - Align Barcode';
        cameraStatus.className = 'status-badge status-active';
      }

      isScanning = true;
      startBarcodeDetectionLoop(video);
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMsg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access or use the manual barcode tester below.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera device found on this system. You can use the instant barcode test rack below!';
      }
      if (cameraStatus) {
        cameraStatus.textContent = errorMsg;
        cameraStatus.className = 'status-badge status-warning';
      }
      alert(errorMsg);
    }
  }

  // Stop Camera Stream
  function stopCamera(videoElementId = 'scannerVideo') {
    if (scanIntervalId) {
      clearInterval(scanIntervalId);
      scanIntervalId = null;
    }

    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }

    const video = document.getElementById(videoElementId);
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const startBtn = document.getElementById('btnStartCamera');
    const stopBtn = document.getElementById('btnStopCamera');
    const cameraStatus = document.getElementById('cameraStatusBadge');

    if (video) {
      video.pause();
      video.srcObject = null;
      video.style.display = 'none';
    }

    if (cameraPlaceholder) cameraPlaceholder.style.display = 'flex';
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
    if (cameraStatus) {
      cameraStatus.textContent = 'Camera Off';
      cameraStatus.className = 'status-badge';
    }

    isScanning = false;
  }

  // Loop that inspects video frames for barcodes
  function startBarcodeDetectionLoop(video) {
    if (scanIntervalId) clearInterval(scanIntervalId);

    scanIntervalId = setInterval(async () => {
      if (!isScanning || !video || video.readyState !== 4) return;

      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            const detectedCode = barcodes[0].rawValue;
            console.log('Detected Barcode:', detectedCode);
            handleBarcodeFound(detectedCode);
          }
        } catch (e) {
          // Frame decode error - ignore and continue scanning
        }
      }
    }, 250);
  }

  // Called when a barcode is scanned or clicked from quick rack
  async function handleBarcodeFound(barcode) {
    if (!barcode) return;
    playBeep(980, 0.15);

    // Show temporary detection pulse
    const reticle = document.querySelector('.viewfinder-reticle');
    if (reticle) {
      reticle.classList.add('detected');
      setTimeout(() => reticle.classList.remove('detected'), 800);
    }

    // Lookup product in REST API
    try {
      const response = await fetch(`${API_BASE}/api/products/barcode/${encodeURIComponent(barcode)}`);
      const result = await response.json();

      if (result.success && result.data) {
        displayScannedProduct(result.data);
      } else {
        showBarcodeNotFound(barcode);
      }
    } catch (err) {
      console.error('API lookup error:', err);
      // Fallback offline product
      showBarcodeNotFound(barcode);
    }
  }

  // Render product detail card & Add to Cart button
  function displayScannedProduct(product) {
    const resultContainer = document.getElementById('scannedProductResult');
    if (!resultContainer) return;

    const complianceBadge = product.isCompliant
      ? `<span class="badge badge-success">✓ PCR 2011 Compliant (${product.complianceScore || 100}%)</span>`
      : `<span class="badge badge-danger">⚠ Non-Compliant (${product.violationsCount || 1} Violations)</span>`;

    resultContainer.innerHTML = `
      <div class="product-card-scanned">
        <div class="product-card-header">
          <div>
            <span class="barcode-pill">Barcode: <strong>${product.barcode}</strong></span>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-brand">${product.brand} &bull; <span class="product-cat">${product.category}</span></p>
          </div>
          <div>${complianceBadge}</div>
        </div>

        <div class="product-details-grid">
          <div class="detail-item">
            <span class="detail-label">MRP (Max Retail Price)</span>
            <span class="detail-val price-val">₹${product.mrp.toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Net Quantity</span>
            <span class="detail-val">${product.netQuantity}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Mfg Date / Batch</span>
            <span class="detail-val">${product.mfgDate || '08/2026'} (Batch: ${product.batchNumber || 'B1'})</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Country of Origin</span>
            <span class="detail-val">${product.countryOfOrigin || 'India'}</span>
          </div>
        </div>

        ${!product.isCompliant && product.violations && product.violations.length > 0 ? `
          <div class="violations-alert">
            <strong>Statutory Violations Detected:</strong>
            <ul>
              ${product.violations.map(v => `<li>${v}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="product-actions-bar">
          <button class="btn btn-primary" onclick="SmartScanCart.addToCart('${product.barcode}', 1)">
            🛒 Add to Cart (₹${product.mrp.toFixed(2)})
          </button>
          <button class="btn btn-outline" onclick="CameraScanner.viewFullReport('${product.barcode}')">
            📋 Full Metrology Audit
          </button>
          <button class="btn btn-secondary" onclick="SmartScanCart.openDrawer()">
            View Cart
          </button>
        </div>
      </div>
    `;

    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showBarcodeNotFound(barcode) {
    const resultContainer = document.getElementById('scannedProductResult');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="product-card-scanned not-found">
        <div style="font-size: 1.8rem; margin-bottom: 8px;">🔍 Barcode Unregistered</div>
        <p>No packaged product in the National Database matches barcode <strong>${barcode}</strong>.</p>
        <p style="font-size: 0.85rem; color: #64748B;">You can register this commodity or inspect its label via the Image-To-Text OCR tab.</p>
        <div style="margin-top: 14px;">
          <button class="btn btn-sm btn-outline" onclick="CameraScanner.switchTab('tab-ocr')">
            Switch to Image-To-Text OCR →
          </button>
        </div>
      </div>
    `;
    resultContainer.style.display = 'block';
  }

  function viewFullReport(barcode) {
    window.location.href = `scan.html?barcode=${encodeURIComponent(barcode)}`;
  }

  // Tab switcher for Scanner modes
  function switchTab(tabId) {
    const tabs = document.querySelectorAll('.scanner-tab-btn');
    const panels = document.querySelectorAll('.scanner-tab-panel');

    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    const activeTab = document.querySelector(`[data-target="${tabId}"]`);
    const activePanel = document.getElementById(tabId);

    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    // If leaving camera tab, stop camera to release device
    if (tabId !== 'tab-camera' && isScanning) {
      stopCamera();
    }
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    initBarcodeDetector();

    // Setup tab clicks
    document.querySelectorAll('.scanner-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        switchTab(target);
      });
    });

    // Camera Start/Stop buttons
    const startBtn = document.getElementById('btnStartCamera');
    const stopBtn = document.getElementById('btnStopCamera');
    if (startBtn) startBtn.addEventListener('click', () => startCamera());
    if (stopBtn) stopBtn.addEventListener('click', () => stopCamera());

    // Manual Barcode Input Search
    const manualBarcodeBtn = document.getElementById('btnLookupBarcode');
    const manualBarcodeInput = document.getElementById('manualBarcodeInput');
    if (manualBarcodeBtn && manualBarcodeInput) {
      manualBarcodeBtn.addEventListener('click', () => {
        const code = manualBarcodeInput.value.trim();
        if (code) handleBarcodeFound(code);
      });
      manualBarcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const code = manualBarcodeInput.value.trim();
          if (code) handleBarcodeFound(code);
        }
      });
    }

    // Quick Barcode Test Rack Chips
    document.querySelectorAll('[data-test-barcode]').forEach(chip => {
      chip.addEventListener('click', () => {
        const barcode = chip.getAttribute('data-test-barcode');
        if (manualBarcodeInput) manualBarcodeInput.value = barcode;
        handleBarcodeFound(barcode);
      });
    });
  });

  return {
    startCamera,
    stopCamera,
    handleBarcodeFound,
    viewFullReport,
    switchTab
  };
})();

window.CameraScanner = CameraScanner;

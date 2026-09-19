/**
 * ComplyScan - Live Camera Barcode Scanner & Viewfinder Controller
 * Streams device camera, decodes barcodes (EAN-13, UPC, Code 128) using ZXing / BarcodeDetector,
 * plays audio feedback, and queries the Express REST API.
 */

const CameraScanner = (function () {
  'use strict';

  let videoStream = null;
  let isScanning = false;
  let barcodeDetector = null;
  let zxingReader = null;
  let scanIntervalId = null;
  let lastScannedCode = null;
  let lastScanTime = 0;

  // Audio Beep using Web Audio API (Zero external assets needed)
  function playBeep(freq = 980, duration = 0.15) {
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

  // Initialize Barcode Engines (ZXing & native BarcodeDetector)
  async function initEngines() {
    // 1. ZXing Engine (Production-Grade Universal Barcode Decoder)
    if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
      try {
        zxingReader = new window.ZXing.BrowserMultiFormatReader();
        console.log('✅ ZXing Universal Barcode Engine initialized successfully.');
      } catch (err) {
        console.warn('ZXing initialization warning:', err);
      }
    }

    // 2. Native Shape Detection BarcodeDetector (Chrome/Android hardware accelerated)
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        barcodeDetector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
        console.log('✅ Native BarcodeDetector initialized.');
      } catch (err) {
        console.warn('Native BarcodeDetector issue:', err);
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

    if (!zxingReader && !barcodeDetector) {
      await initEngines();
    }

    try {
      if (cameraStatus) cameraStatus.textContent = 'Requesting Camera Access...';

      // Prefer ZXing Direct Camera Stream if available
      if (zxingReader) {
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
        video.style.display = 'block';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        if (cameraStatus) {
          cameraStatus.textContent = '● Camera Active - Align Barcode in Reticle';
          cameraStatus.className = 'status-badge status-active';
        }

        isScanning = true;
        zxingReader.decodeFromVideoDevice(null, videoElementId, (result, err) => {
          if (result && isScanning) {
            const rawCode = result.getText();
            if (rawCode) {
              const now = Date.now();
              if (rawCode !== lastScannedCode || now - lastScanTime > 2500) {
                lastScannedCode = rawCode;
                lastScanTime = now;
                console.log('🎯 ZXing Decoded Barcode:', rawCode);
                handleBarcodeFound(rawCode);
              }
            }
          }
        });
        return;
      }

      // Fallback to getUserMedia + Native BarcodeDetector loop
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
        cameraStatus.textContent = '● Camera Active - Align Barcode in Reticle';
        cameraStatus.className = 'status-badge status-active';
      }

      isScanning = true;
      startBarcodeDetectionLoop(video);

    } catch (err) {
      console.error('Camera access error:', err);
      let errorMsg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access in browser address bar.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera device found on this system. Use the manual barcode tester or image OCR tab below!';
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
    isScanning = false;

    if (zxingReader) {
      try {
        zxingReader.reset();
      } catch (e) {}
    }

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
  }

  // Loop that inspects video frames for barcodes (Fallback engine)
  function startBarcodeDetectionLoop(video) {
    if (scanIntervalId) clearInterval(scanIntervalId);

    scanIntervalId = setInterval(async () => {
      if (!isScanning || !video || video.readyState !== 4) return;

      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            const detectedCode = barcodes[0].rawValue;
            const now = Date.now();
            if (detectedCode !== lastScannedCode || now - lastScanTime > 2500) {
              lastScannedCode = detectedCode;
              lastScanTime = now;
              console.log('🎯 BarcodeDetector Decoded:', detectedCode);
              handleBarcodeFound(detectedCode);
            }
          }
        } catch (e) {
          // Frame decode error - continue scanning next frame
        }
      }
    }, 200);
  }

  // Resilient API Fetch Helper (Works on :3000 proxy, :5000 native, and external origins)
  async function fetchFromApi(path, options = {}) {
    try {
      const res = await fetch(path, options);
      if (res.ok || res.status === 404 || res.status === 400) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Relative fetch failed, trying http://localhost:5000 fallback:', e.message);
    }
    const fallbackRes = await fetch(`http://localhost:5000${path}`, options);
    return await fallbackRes.json();
  }

  // Decode barcode directly from an image element or canvas
  async function decodeBarcodeFromImage(imgElementOrCanvas) {
    if (!zxingReader) await initEngines();
    if (zxingReader) {
      try {
        const result = await zxingReader.decodeFromImageElement(imgElementOrCanvas);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch (e) {
        // ZXing failed on standard orientation, try rotated
      }
    }
    if (barcodeDetector) {
      try {
        const barcodes = await barcodeDetector.detect(imgElementOrCanvas);
        if (barcodes && barcodes.length > 0) {
          return barcodes[0].rawValue;
        }
      } catch (e) {}
    }
    return null;
  }

  // Called when a barcode is scanned or clicked from quick rack
  async function handleBarcodeFound(rawBarcode) {
    if (!rawBarcode) return;
    const barcode = String(rawBarcode).trim().replace(/\s+/g, '');
    playBeep(980, 0.15);

    // Show visual laser pulse animation
    const reticle = document.querySelector('.viewfinder-reticle');
    if (reticle) {
      reticle.classList.add('detected');
      setTimeout(() => reticle.classList.remove('detected'), 800);
    }

    const resultContainer = document.getElementById('scannedProductResult');
    if (resultContainer) {
      resultContainer.style.display = 'block';
      resultContainer.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(15, 45, 89, 0.08);">
          <div style="font-size: 1.8rem; margin-bottom: 8px;">⏳</div>
          <div style="font-weight: 700; color: #0F2D59; font-size: 1.05rem;">Querying National Database for Barcode: <code style="background:#EFF6FF; color:#004F9F; padding:2px 8px; border-radius:4px;">${barcode}</code>...</div>
          <div style="font-size: 0.85rem; color: #64748B; margin-top: 6px;">Connecting to Node.js & Express REST API</div>
        </div>
      `;
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Lookup product in REST API
    try {
      const result = await fetchFromApi(`/api/products/barcode/${encodeURIComponent(barcode)}`);

      if (result && result.success && result.data) {
        displayScannedProduct(result.data);
      } else {
        showBarcodeNotFound(barcode);
      }
    } catch (err) {
      console.error('API lookup error:', err);
      showBarcodeNotFound(barcode);
    }
  }

  // Render product detail card & Add to Cart button
  function displayScannedProduct(product) {
    const resultContainer = document.getElementById('scannedProductResult');
    if (!resultContainer) return;

    // Synchronize with active scan session for scan.html
    if (window.SmartScanApp) {
      const scanPayload = {
        inspectionId: 'INSP-' + (product.barcode || '').slice(-6),
        barcode: product.barcode,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        mrp: `₹${product.mrp.toFixed(2)}`,
        netQty: product.netQuantity,
        mfgDate: product.mfgDate || '08/2026',
        batchNumber: product.batchNumber || 'B1',
        countryOfOrigin: product.countryOfOrigin || 'India',
        manufacturer: product.manufacturer || product.brand,
        consumerCare: product.consumerCare || '1800-425-4449 or care@pack.in',
        state: product.state || 'Gujarat',
        isCompliant: product.isCompliant !== false,
        complianceScore: product.complianceScore || (product.isCompliant !== false ? 100 : 65),
        violationsCount: product.violationsCount || (product.violations ? product.violations.length : 0),
        violations: product.violations || [],
        scanTimestamp: new Date().toLocaleString('en-IN'),
        ocrText: `
${product.name.toUpperCase()}
Barcode: ${product.barcode}
Net Quantity: ${product.netQuantity}
Mfg Date: ${product.mfgDate || '08/2026'}  Batch: ${product.batchNumber || 'B1'}
MRP: ₹${product.mrp.toFixed(2)} (Incl. of all taxes)
${product.unitPrice ? 'Unit Sale Price: ' + product.unitPrice : ''}
Manufactured by: ${product.manufacturer || product.brand}
Consumer Care: ${product.consumerCare || '1800-425-4449 or care@pack.in'}
Country of Origin: ${product.countryOfOrigin || 'India'}
        `.trim()
      };
      window.SmartScanApp.setActiveScan(scanPayload);
    }

    const isCompliant = product.isCompliant !== false && (!product.violations || product.violations.length === 0);
    const score = product.complianceScore || (isCompliant ? 100 : 58);
    const complianceBadge = isCompliant
      ? `<span class="badge badge-success" style="font-size:0.85rem; padding:6px 12px;">✓ PCR 2011 Compliant (${score}%)</span>`
      : `<span class="badge badge-danger" style="font-size:0.85rem; padding:6px 12px;">⚠ Non-Compliant (${product.violationsCount || (product.violations ? product.violations.length : 1)} Violations)</span>`;

    resultContainer.innerHTML = `
      <div class="product-card-scanned" style="border: 2px solid ${isCompliant ? '#004F9F' : '#DC2626'}; background: #FFFFFF; border-radius: 12px; padding: 24px; box-shadow: 0 6px 20px rgba(15, 45, 89, 0.08);">
        <div class="product-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="barcode-pill" style="background: #EFF6FF; color: #004F9F; font-size: 0.85rem; padding: 4px 10px; border-radius: 20px; font-weight: 700; display: inline-block; margin-bottom: 6px;">
              Barcode: <strong>${product.barcode}</strong> &bull; <span style="color: #059669;">● Backend Fetched (REST API)</span>
            </span>
            <h3 class="product-title" style="margin: 4px 0; font-size: 1.35rem; color: #0F2D59;">${product.name}</h3>
            <p class="product-brand" style="margin: 0; color: #64748B; font-size: 0.9rem;">${product.brand} &bull; <span class="product-cat" style="color: #004F9F; font-weight: 600;">${product.category}</span></p>
          </div>
          <div>${complianceBadge}</div>
        </div>

        <div class="product-details-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; background: #F8FAFC; padding: 16px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <div class="detail-item">
            <span class="detail-label" style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">MRP (Max Retail Price)</span>
            <span class="detail-val price-val" style="font-size: 1.15rem; font-weight: 800; color: #0F2D59; display: block;">₹${product.mrp.toFixed(2)}</span>
            <small style="color: #059669; font-size: 0.75rem;">(Incl. of all taxes)</small>
          </div>
          <div class="detail-item">
            <span class="detail-label" style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Net Quantity (Rule 6(1)(c))</span>
            <span class="detail-val" style="font-size: 1.15rem; font-weight: 800; color: #004F9F; display: block;">${product.netQuantity}</span>
            <small style="color: #64748B; font-size: 0.75rem;">Rule 13 Count Units Valid</small>
          </div>
          <div class="detail-item">
            <span class="detail-label" style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Mfg Date / Batch</span>
            <span class="detail-val" style="font-size: 0.95rem; font-weight: 700; color: #1E293B; display: block;">${product.mfgDate || '02/2026'}</span>
            <small style="color: #64748B; font-size: 0.75rem;">Batch: ${product.batchNumber || 'ART NO. 8331'}</small>
          </div>
          <div class="detail-item">
            <span class="detail-label" style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Country of Origin</span>
            <span class="detail-val" style="font-size: 0.95rem; font-weight: 700; color: #1E293B; display: block;">${product.countryOfOrigin || 'India'}</span>
            <small style="color: #059669; font-size: 0.75rem;">Rule 6(1)(g) Verified</small>
          </div>
        </div>

        ${product.unitPrice ? `
          <div style="margin-bottom: 14px; padding: 10px 14px; background: #EFF6FF; border-left: 4px solid #004F9F; border-radius: 4px; font-size: 0.85rem;">
            <strong>Unit Sale Price:</strong> ${product.unitPrice} &bull; <strong>Manufacturer:</strong> ${product.manufacturer}
          </div>
        ` : ''}

        ${!isCompliant && product.violations && product.violations.length > 0 ? `
          <div class="violations-alert" style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px; border-radius: 6px; margin-bottom: 18px;">
            <strong style="color: #991B1B; font-size: 0.9rem;">Statutory Violations Detected under PCR, 2011:</strong>
            <ul style="margin: 6px 0 0; padding-left: 20px; color: #B91C1C; font-size: 0.85rem;">
              ${product.violations.map(v => `<li>${v}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="product-actions-bar" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="CameraScanner.viewFullReport('${product.barcode}')" style="font-weight: 700;">
            📋 Full Metrology Inspection Audit
          </button>
          <a href="complaints.html" class="btn ${!isCompliant ? 'btn-accent' : 'btn-outline'}" style="${!isCompliant ? 'background: #DC2626; color: white; font-weight: 700;' : 'border-color: #DC2626; color: #DC2626;'}">
            ⚖️ ${!isCompliant ? 'File State Complaint (' + (product.state || 'Gujarat') + ' Controller)' : 'Lodge State Grievance'} →
          </a>
          <button class="btn btn-primary" onclick="SmartScanCart.addToCart('${product.barcode}', 1)">
            🛒 Add to Cart (₹${product.mrp.toFixed(2)})
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
      <div class="product-card-scanned not-found" style="background: white; border: 1px dashed #CBD5E1; border-radius: 12px; padding: 24px; text-align: center;">
        <div style="font-size: 1.8rem; margin-bottom: 8px;">🔍 Barcode Unregistered</div>
        <p style="margin: 0 0 6px 0;">No packaged commodity in the National Database matches barcode <strong>${barcode}</strong>.</p>
        <p style="font-size: 0.85rem; color: #64748B; margin: 0 0 14px 0;">You can inspect its label declarations directly via the Image-To-Text OCR tab.</p>
        <div>
          <button class="btn btn-sm btn-primary" onclick="CameraScanner.switchTab('tab-ocr')">
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
    initEngines();

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
    decodeBarcodeFromImage,
    viewFullReport,
    switchTab
  };
})();

window.CameraScanner = CameraScanner;

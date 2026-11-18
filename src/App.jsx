import React, { useState, useEffect, useMemo } from 'react';
import {
  INITIAL_PRINTERS,
  INITIAL_FILAMENTS,
  INITIAL_ELECTRICITY_CONFIG,
  CHILE_ELECTRICITY_PRESETS,
  INITIAL_PRICING_CONFIG
} from './data/presets';
import { formatCLP, calculatePrintQuote } from './utils/formatCLP';
import {
  CalculatorIcon,
  DiscIcon,
  PrinterIcon,
  ZapIcon,
  HistoryIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  SaveIcon,
  EditIcon
} from './components/Icons';

const STORAGE_KEYS = {
  FILAMENTS: 'printcost_cl_filaments_v1',
  PRINTERS: 'printcost_cl_printers_v1',
  ELECTRICITY: 'printcost_cl_electricity_v1',
  PRICING: 'printcost_cl_pricing_v1',
  HISTORY: 'printcost_cl_quotes_history_v1',
  SELECTED_FILAMENT: 'printcost_cl_selected_filament_v1',
  SELECTED_PRINTER: 'printcost_cl_selected_printer_v1'
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function mergePresetPrinters(savedList) {
  if (!Array.isArray(savedList) || savedList.length === 0) return INITIAL_PRINTERS;
  const existingIds = new Set(savedList.map((p) => p.id));
  const missingPresets = INITIAL_PRINTERS.filter((p) => !existingIds.has(p.id));
  return [...missingPresets, ...savedList];
}

export default function App() {
  const isElectron = Boolean(window.electronAPI?.isDesktopApp);
  const [activeTab, setActiveTab] = useState('calculator');
  const [diskLoaded, setDiskLoaded] = useState(!isElectron);
  const [statusBanner, setStatusBanner] = useState('');

  // Catálogos persistentes
  const [filaments, setFilaments] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FILAMENTS, INITIAL_FILAMENTS)
  );
  const [printers, setPrinters] = useState(() =>
    mergePresetPrinters(loadFromStorage(STORAGE_KEYS.PRINTERS, INITIAL_PRINTERS))
  );
  const [electricityConfig, setElectricityConfig] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ELECTRICITY, INITIAL_ELECTRICITY_CONFIG)
  );
  const [pricingConfig, setPricingConfig] = useState(() =>
    loadFromStorage(STORAGE_KEYS.PRICING, INITIAL_PRICING_CONFIG)
  );
  const [quotesHistory, setQuotesHistory] = useState(() =>
    loadFromStorage(STORAGE_KEYS.HISTORY, [])
  );

  // Selecciones activas en la calculadora
  const [selectedFilamentId, setSelectedFilamentId] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_FILAMENT, INITIAL_FILAMENTS[0].id)
  );
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
    const stored = loadFromStorage(STORAGE_KEYS.SELECTED_PRINTER, 'bambu-x2d');
    return stored === 'bambu-a1' ? 'bambu-x2d' : stored;
  });

  // Parámetros del trabajo actual
  const [jobName, setJobName] = useState('Soporte Articulado / Pieza 3D');
  const [clientName, setClientName] = useState('');
  const [gramsUsed, setGramsUsed] = useState(85);
  const [hours, setHours] = useState(3);
  const [minutes, setMinutes] = useState(30);
  const [quantity, setQuantity] = useState(1);

  // Estados de UI (modales y notificaciones)
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [savedAlert, setSavedAlert] = useState(false);
  const [showFilamentModal, setShowFilamentModal] = useState(false);
  const [editingFilament, setEditingFilament] = useState(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);

  // Formulario de Nuevo/Editar Filamento
  const [filamentForm, setFilamentForm] = useState({
    brand: '',
    material: 'PLA+',
    colorName: '',
    colorHex: '#3b82f6',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 17990
  });

  // Formulario de Nueva/Editar Impresora
  const [printerForm, setPrinterForm] = useState({
    brand: '',
    model: '',
    watts: 130,
    type: 'FDM',
    notes: ''
  });

  const showTempMessage = (msg) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 3200);
  };

  // Cargar base de datos nativa en disco al iniciar la App de Escritorio (Linux / Mac / Windows)
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.loadStorage().then((res) => {
      if (res?.data) {
        const d = res.data;
        if (Array.isArray(d.filaments) && d.filaments.length > 0) setFilaments(d.filaments);
        if (Array.isArray(d.printers) && d.printers.length > 0) {
          setPrinters(mergePresetPrinters(d.printers));
        }
        if (d.electricityConfig) setElectricityConfig(d.electricityConfig);
        if (d.pricingConfig) setPricingConfig(d.pricingConfig);
        if (Array.isArray(d.quotesHistory)) setQuotesHistory(d.quotesHistory);
        if (d.selectedFilamentId) setSelectedFilamentId(d.selectedFilamentId);
        if (d.selectedPrinterId) {
          setSelectedPrinterId(d.selectedPrinterId === 'bambu-a1' ? 'bambu-x2d' : d.selectedPrinterId);
        }
      }
      setDiskLoaded(true);
    });
  }, [isElectron]);

  // Guardar automáticamente en LocalStorage + Base de Datos Nativa en Disco (Electron)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FILAMENTS, JSON.stringify(filaments));
    localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(printers));
    localStorage.setItem(STORAGE_KEYS.ELECTRICITY, JSON.stringify(electricityConfig));
    localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(pricingConfig));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(quotesHistory));
    localStorage.setItem(STORAGE_KEYS.SELECTED_FILAMENT, JSON.stringify(selectedFilamentId));
    localStorage.setItem(STORAGE_KEYS.SELECTED_PRINTER, JSON.stringify(selectedPrinterId));

    if (isElectron && diskLoaded) {
      window.electronAPI.saveStorage({
        filaments,
        printers,
        electricityConfig,
        pricingConfig,
        quotesHistory,
        selectedFilamentId,
        selectedPrinterId,
        updatedAt: new Date().toISOString()
      });
    }
  }, [
    filaments,
    printers,
    electricityConfig,
    pricingConfig,
    quotesHistory,
    selectedFilamentId,
    selectedPrinterId,
    isElectron,
    diskLoaded
  ]);

  const activeFilament = useMemo(
    () => filaments.find((f) => f.id === selectedFilamentId) || filaments[0],
    [filaments, selectedFilamentId]
  );

  const activePrinter = useMemo(
    () => printers.find((p) => p.id === selectedPrinterId) || printers[0],
    [printers, selectedPrinterId]
  );

  // Resultado del cálculo en tiempo real
  const quote = useMemo(() => {
    return calculatePrintQuote({
      filament: activeFilament,
      printer: activePrinter,
      electricityConfig,
      pricingConfig,
      gramsUsed,
      hours,
      minutes,
      quantity
    });
  }, [
    activeFilament,
    activePrinter,
    electricityConfig,
    pricingConfig,
    gramsUsed,
    hours,
    minutes,
    quantity
  ]);

  // Exportar e Importar respaldos (.json) en App de Escritorio o Navegador
  const handleExportBackup = async () => {
    const payload = {
      filaments,
      printers,
      electricityConfig,
      pricingConfig,
      quotesHistory,
      selectedFilamentId,
      selectedPrinterId,
      exportedAt: new Date().toISOString()
    };

    if (isElectron) {
      const res = await window.electronAPI.exportBackup(payload);
      if (!res?.canceled) {
        showTempMessage('Respaldo guardado en tu equipo.');
      }
    } else {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Respaldo-PrintCost-CL-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showTempMessage('Archivo de respaldo descargado.');
    }
  };

  const handleImportBackup = async () => {
    if (isElectron) {
      const res = await window.electronAPI.importBackup();
      if (!res?.canceled && res?.data) {
        const d = res.data;
        if (Array.isArray(d.filaments) && d.filaments.length > 0) setFilaments(d.filaments);
        if (Array.isArray(d.printers) && d.printers.length > 0) setPrinters(d.printers);
        if (d.electricityConfig) setElectricityConfig(d.electricityConfig);
        if (d.pricingConfig) setPricingConfig(d.pricingConfig);
        if (Array.isArray(d.quotesHistory)) setQuotesHistory(d.quotesHistory);
        showTempMessage('Configuraciones restauradas correctamente.');
      }
    }
  };

  const handlePrintOrExportPDF = async () => {
    if (isElectron) {
      const res = await window.electronAPI.exportQuotePDF(jobName);
      if (!res?.canceled) {
        showTempMessage('Cotización guardada en PDF.');
      }
    } else {
      window.print();
    }
  };

  // Handlers de Filamentos
  const openNewFilamentModal = () => {
    setEditingFilament(null);
    setFilamentForm({
      brand: '',
      material: 'PLA+',
      colorName: '',
      colorHex: '#2563eb',
      spoolWeightGrams: 1000,
      spoolPriceCLP: 16990
    });
    setShowFilamentModal(true);
  };

  const openEditFilamentModal = (fil) => {
    setEditingFilament(fil);
    setFilamentForm({
      brand: fil.brand,
      material: fil.material,
      colorName: fil.colorName,
      colorHex: fil.colorHex || '#2563eb',
      spoolWeightGrams: fil.spoolWeightGrams,
      spoolPriceCLP: fil.spoolPriceCLP
    });
    setShowFilamentModal(true);
  };

  const handleSaveFilament = (e) => {
    e.preventDefault();
    if (!filamentForm.brand.trim() || !filamentForm.colorName.trim()) return;

    const payload = {
      id: editingFilament ? editingFilament.id : `fil-${Date.now()}`,
      brand: filamentForm.brand.trim(),
      material: filamentForm.material.trim() || 'PLA',
      colorName: filamentForm.colorName.trim(),
      colorHex: filamentForm.colorHex || '#3b82f6',
      spoolWeightGrams: Math.max(50, Number(filamentForm.spoolWeightGrams) || 1000),
      spoolPriceCLP: Math.max(0, Number(filamentForm.spoolPriceCLP) || 0)
    };

    if (editingFilament) {
      setFilaments((prev) => prev.map((f) => (f.id === editingFilament.id ? payload : f)));
    } else {
      setFilaments((prev) => [payload, ...prev]);
      setSelectedFilamentId(payload.id);
    }
    setShowFilamentModal(false);
  };

  const handleDeleteFilament = (id) => {
    if (filaments.length <= 1) {
      alert('Debes mantener al menos un filamento en tu catálogo.');
      return;
    }
    const next = filaments.filter((f) => f.id !== id);
    setFilaments(next);
    if (selectedFilamentId === id) {
      setSelectedFilamentId(next[0].id);
    }
  };

  // Handlers de Impresoras
  const openNewPrinterModal = () => {
    setEditingPrinter(null);
    setPrinterForm({
      brand: '',
      model: '',
      watts: 130,
      type: 'FDM',
      notes: ''
    });
    setShowPrinterModal(true);
  };

  const openEditPrinterModal = (prn) => {
    setEditingPrinter(prn);
    setPrinterForm({
      brand: prn.brand,
      model: prn.model,
      watts: prn.watts,
      type: prn.type || 'FDM',
      notes: prn.notes || ''
    });
    setShowPrinterModal(true);
  };

  const handleSavePrinter = (e) => {
    e.preventDefault();
    if (!printerForm.brand.trim() || !printerForm.model.trim()) return;

    const payload = {
      id: editingPrinter ? editingPrinter.id : `prn-${Date.now()}`,
      brand: printerForm.brand.trim(),
      model: printerForm.model.trim(),
      watts: Math.max(10, Number(printerForm.watts) || 120),
      type: printerForm.type.trim() || 'FDM',
      notes: printerForm.notes.trim()
    };

    if (editingPrinter) {
      setPrinters((prev) => prev.map((p) => (p.id === editingPrinter.id ? payload : p)));
    } else {
      setPrinters((prev) => [payload, ...prev]);
      setSelectedPrinterId(payload.id);
    }
    setShowPrinterModal(false);
  };

  const handleDeletePrinter = (id) => {
    if (printers.length <= 1) {
      alert('Debes mantener al menos una impresora 3D registrada.');
      return;
    }
    const next = printers.filter((p) => p.id !== id);
    setPrinters(next);
    if (selectedPrinterId === id) {
      setSelectedPrinterId(next[0].id);
    }
  };

  // Generar texto de WhatsApp
  const buildWhatsAppSummary = (customQuoteRecord = null) => {
    if (customQuoteRecord) {
      const lines = [
        `🌙 *SUEÑOS 3D — COTIZACIÓN IMPRESIÓN 3D*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📦 *Pieza:* ${customQuoteRecord.jobName}`,
        customQuoteRecord.clientName ? `👤 *Cliente:* ${customQuoteRecord.clientName}` : null,
        `🔢 *Cantidad:* ${customQuoteRecord.quantity} ${customQuoteRecord.quantity > 1 ? 'unidades' : 'unidad'}`,
        `🧵 *Material:* ${customQuoteRecord.filamentSummary} (${customQuoteRecord.gramsUsed}g c/u)`,
        `⚙️ *Máquina:* ${customQuoteRecord.printerSummary}`,
        `⏱️ *Tiempo de impresión:* ${customQuoteRecord.hours}h ${customQuoteRecord.minutes}m c/u`,
        `━━━━━━━━━━━━━━━━━━━━`,
        customQuoteRecord.quantity > 1
          ? `💵 *Valor Unitario:* ${formatCLP(customQuoteRecord.finalUnitCLP)}`
          : null,
        `💰 *TOTAL A PAGAR:* *${formatCLP(customQuoteRecord.totalFinalCLP)}* ${
          customQuoteRecord.includeIVA ? '(IVA 19% incluido)' : '(Valor Neto)'
        }`
      ].filter(Boolean);
      return lines.join('\n');
    }

    const lines = [
      `🌙 *SUEÑOS 3D — COTIZACIÓN IMPRESIÓN 3D*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *Proyecto:* ${jobName || 'Pieza Impresa en 3D'}`,
      clientName ? `👤 *Cliente:* ${clientName}` : null,
      `🔢 *Cantidad:* ${quote.quantity} ${quote.quantity > 1 ? 'unidades' : 'unidad'}`,
      `🧵 *Filamento:* ${activeFilament?.brand} ${activeFilament?.material} — ${activeFilament?.colorName} (${gramsUsed}g c/u)`,
      `⚙️ *Impresora 3D:* ${activePrinter?.brand} ${activePrinter?.model}`,
      `⏱️ *Tiempo estimado:* ${hours}h ${minutes}m por unidad`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📊 *Desglose de Costos (Total):*`,
      `• Material (${quote.totalGrams}g): ${formatCLP(quote.totalMaterialCLP)}`,
      `• Energía / Hora Luz (${quote.totalHoursBatch.toFixed(1)}h a ${formatCLP(quote.hourlyLightCostCLP, true)}/h): ${formatCLP(quote.totalElectricityCLP)}`,
      pricingConfig.mode === 'complete' && pricingConfig.failureRatePercent > 0
        ? `• Respaldo fallos (${pricingConfig.failureRatePercent}%): ${formatCLP(quote.totalFailureBufferCLP)}`
        : null,
      pricingConfig.mode === 'complete' && pricingConfig.profitMarginPercent > 0
        ? `• Margen comercial (${pricingConfig.profitMarginPercent}%): ${formatCLP(quote.totalProfitCLP)}`
        : null,
      pricingConfig.mode === 'complete' && pricingConfig.includeIVA
        ? `• IVA (19%): ${formatCLP(quote.totalIvaCLP)}`
        : null,
      `━━━━━━━━━━━━━━━━━━━━`,
      quote.quantity > 1 ? `💵 *Precio por unidad:* ${formatCLP(quote.finalUnitCLP)}` : null,
      `💰 *PRECIO FINAL:* *${formatCLP(quote.totalFinalCLP)} CLP* ${
        pricingConfig.mode === 'complete' && pricingConfig.includeIVA ? '(IVA Incluido)' : ''
      }`
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopyWhatsApp = (customRecord = null) => {
    const text = buildWhatsAppSummary(customRecord);
    navigator.clipboard.writeText(text);
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2600);
  };

  const handleSaveQuoteToHistory = () => {
    const newRecord = {
      id: `quo-${Date.now()}`,
      createdAt: new Date().toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      jobName: jobName.trim() || 'Impresión 3D sin título',
      clientName: clientName.trim(),
      filamentId: activeFilament?.id,
      filamentSummary: `${activeFilament?.brand} ${activeFilament?.material} (${activeFilament?.colorName})`,
      filamentColorHex: activeFilament?.colorHex || '#3b82f6',
      printerId: activePrinter?.id,
      printerSummary: `${activePrinter?.brand} ${activePrinter?.model}`,
      printerWatts: activePrinter?.watts,
      gramsUsed: Number(gramsUsed) || 0,
      hours: Number(hours) || 0,
      minutes: Number(minutes) || 0,
      quantity: quote.quantity,
      mode: pricingConfig.mode,
      includeIVA: pricingConfig.mode === 'complete' && pricingConfig.includeIVA,
      hourlyLightCostCLP: quote.hourlyLightCostCLP,
      materialCostCLP: quote.totalMaterialCLP,
      electricityCostCLP: quote.totalElectricityCLP,
      finalUnitCLP: quote.finalUnitCLP,
      totalFinalCLP: quote.totalFinalCLP
    };

    setQuotesHistory((prev) => [newRecord, ...prev]);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  const handleLoadQuoteFromHistory = (record) => {
    setJobName(record.jobName);
    setClientName(record.clientName || '');
    setGramsUsed(record.gramsUsed);
    setHours(record.hours);
    setMinutes(record.minutes);
    setQuantity(record.quantity || 1);
    if (record.filamentId && filaments.some((f) => f.id === record.filamentId)) {
      setSelectedFilamentId(record.filamentId);
    }
    if (record.printerId && printers.some((p) => p.id === record.printerId)) {
      setSelectedPrinterId(record.printerId);
    }
    setActiveTab('calculator');
  };

  const handleDeleteQuoteHistory = (id) => {
    setQuotesHistory((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="app-shell">
      {/* BARRA SUPERIOR */}
      <header className="topbar no-print">
        <div className="topbar-inner">
          <div className="brand-block">
            <img
              src="./logo-suenos-3d.png"
              alt="Logo Sueños 3D"
              className="brand-logo-img"
            />
            <div>
              <h1 className="brand-title">
                Sueños 3D <span className="cl-badge">🇨🇱 CLP</span>
                {isElectron && <span className="cl-badge">App Escritorio</span>}
              </h1>
              <p className="brand-subtitle">
                Calculadora de Precios y Cotizaciones de Impresión 3D en Pesos Chilenos
              </p>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Secciones principales">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              <CalculatorIcon size={18} />
              <span>Calculadora</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'filaments' ? 'active' : ''}`}
              onClick={() => setActiveTab('filaments')}
            >
              <DiscIcon size={18} />
              <span>Filamentos ({filaments.length})</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'printers' ? 'active' : ''}`}
              onClick={() => setActiveTab('printers')}
            >
              <PrinterIcon size={18} />
              <span>Impresoras y Luz ({printers.length})</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <HistoryIcon size={18} />
              <span>Historial ({quotesHistory.length})</span>
            </button>
          </nav>

          <div className="backup-toolbar">
            <button
              type="button"
              className="btn-secondary btn-sm"
              title="Exportar respaldo de filamentos, máquinas y cotizaciones"
              onClick={handleExportBackup}
            >
              <SaveIcon size={15} /> Respaldar
            </button>
            {isElectron && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                title="Importar archivo de respaldo .json"
                onClick={handleImportBackup}
              >
                Importar
              </button>
            )}
          </div>
        </div>
        {statusBanner && <div className="status-toast">{statusBanner}</div>}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-container">
        {activeTab === 'calculator' && (
          <div className="calculator-grid">
            {/* COLUMNA IZQUIERDA: ENTRADAS Y CONFIGURACIÓN */}
            <div className="inputs-column no-print">
              {/* 1. DATOS DE LA PIEZA */}
              <section className="card">
                <div className="card-header">
                  <div>
                    <span className="step-pill">Paso 1</span>
                    <h2>Datos de la Impresión 3D</h2>
                  </div>
                  <span className="card-hint">Datos entregados por tu laminador (Bambu Studio, Orca, Cura)</span>
                </div>

                <div className="form-grid-2">
                  <div className="field">
                    <label htmlFor="jobName">Nombre de la pieza o proyecto</label>
                    <input
                      id="jobName"
                      type="text"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder="Ej: Litofanía, Engranaje, Figura..."
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="clientName">Cliente (opcional)</label>
                    <input
                      id="clientName"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej: Juan Pérez / Empresa"
                    />
                  </div>
                </div>

                <div className="form-grid-4">
                  <div className="field highlight-field">
                    <label htmlFor="gramsUsed">Peso Filamento (g)</label>
                    <div className="input-with-unit">
                      <input
                        id="gramsUsed"
                        type="number"
                        min="0"
                        step="1"
                        value={gramsUsed}
                        onChange={(e) => setGramsUsed(e.target.value)}
                      />
                      <span className="unit-tag">gramos</span>
                    </div>
                  </div>

                  <div className="field highlight-field">
                    <label htmlFor="hours">Tiempo (Horas)</label>
                    <div className="input-with-unit">
                      <input
                        id="hours"
                        type="number"
                        min="0"
                        step="1"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                      />
                      <span className="unit-tag">hrs</span>
                    </div>
                  </div>

                  <div className="field highlight-field">
                    <label htmlFor="minutes">Tiempo (Minutos)</label>
                    <div className="input-with-unit">
                      <input
                        id="minutes"
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                      />
                      <span className="unit-tag">min</span>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="quantity">Cantidad piezas</label>
                    <div className="input-with-unit">
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <span className="unit-tag">unid.</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. FILAMENTO (MARCA, COLOR Y PRECIO EN CLP) */}
              <section className="card">
                <div className="card-header">
                  <div>
                    <span className="step-pill">Paso 2</span>
                    <h2>Filamento (Marca, Color y Precio CLP)</h2>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={openNewFilamentModal}>
                    <PlusIcon size={15} /> Nuevo Filamento
                  </button>
                </div>

                <div className="selector-row">
                  <div className="field flex-1">
                    <label htmlFor="filamentSelect">Seleccionar filamento guardado</label>
                    <select
                      id="filamentSelect"
                      value={selectedFilamentId}
                      onChange={(e) => setSelectedFilamentId(e.target.value)}
                    >
                      {filaments.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.brand} • {f.material} — {f.colorName} ({formatCLP(f.spoolPriceCLP)} / {f.spoolWeightGrams}g)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeFilament && (
                  <div className="selected-summary-banner">
                    <div className="swatch-group">
                      <span
                        className="color-swatch-lg"
                        style={{ backgroundColor: activeFilament.colorHex }}
                        title={activeFilament.colorName}
                      />
                      <div>
                        <div className="summary-title">
                          {activeFilament.brand} <span className="badge-pill">{activeFilament.material}</span>
                        </div>
                        <div className="summary-sub">
                          Color: <strong>{activeFilament.colorName}</strong> • Rollo de {activeFilament.spoolWeightGrams}g
                        </div>
                      </div>
                    </div>

                    <div className="summary-metrics">
                      <div className="metric-box">
                        <span className="metric-label">Precio Rollo</span>
                        <span className="metric-value">{formatCLP(activeFilament.spoolPriceCLP)}</span>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Costo por Gramo</span>
                        <span className="metric-value accent">{formatCLP(quote.costPerGramCLP, true)} / g</span>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Editar este filamento"
                        onClick={() => openEditFilamentModal(activeFilament)}
                      >
                        <EditIcon size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. IMPRESORA 3D + VALOR HORA LUZ AUTOMÁTICO */}
              <section className="card">
                <div className="card-header">
                  <div>
                    <span className="step-pill">Paso 3</span>
                    <h2>Máquina de Impresión 3D y Valor Hora Luz</h2>
                  </div>
                  <button type="button" className="btn-secondary btn-sm" onClick={openNewPrinterModal}>
                    <PlusIcon size={15} /> Nueva Impresora
                  </button>
                </div>

                <div className="form-grid-2">
                  <div className="field">
                    <label htmlFor="printerSelect">Marca y Modelo de Impresora 3D</label>
                    <select
                      id="printerSelect"
                      value={selectedPrinterId}
                      onChange={(e) => setSelectedPrinterId(e.target.value)}
                    >
                      {printers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.brand} — {p.model} ({p.watts}W promedio)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="electricityPreset">Tarifa Eléctrica en Chile ($/kWh)</label>
                    <select
                      id="electricityPreset"
                      value={electricityConfig.providerPreset || 'custom'}
                      onChange={(e) => {
                        const presetId = e.target.value;
                        const found = CHILE_ELECTRICITY_PRESETS.find((item) => item.id === presetId);
                        setElectricityConfig((prev) => ({
                          ...prev,
                          providerPreset: presetId,
                          kwhPriceCLP: found && found.kwhCLP ? found.kwhCLP : prev.kwhPriceCLP
                        }));
                      }}
                    >
                      {CHILE_ELECTRICITY_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} {preset.kwhCLP ? `(~$${preset.kwhCLP} CLP/kWh)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="electricity-live-box">
                  <div className="electricity-left">
                    <div className="zap-badge">
                      <ZapIcon size={18} />
                    </div>
                    <div>
                      <div className="summary-title">
                        {activePrinter?.brand} {activePrinter?.model}{' '}
                        <span className="badge-pill">{activePrinter?.watts} Watts</span>
                      </div>
                      <div className="summary-sub">
                        Fórmula automática: <code>({activePrinter?.watts}W ÷ 1000) × {formatCLP(electricityConfig.kwhPriceCLP)}/kWh</code>
                      </div>
                    </div>
                  </div>

                  <div className="electricity-controls">
                    <div className="field-inline">
                      <label htmlFor="kwhInput">Valor kWh (CLP):</label>
                      <input
                        id="kwhInput"
                        type="number"
                        min="0"
                        step="5"
                        value={electricityConfig.kwhPriceCLP}
                        onChange={(e) =>
                          setElectricityConfig((prev) => ({
                            ...prev,
                            providerPreset: 'custom',
                            kwhPriceCLP: e.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="metric-box highlight-gold">
                      <span className="metric-label">Valor Hora Luz Automático</span>
                      <span className="metric-value">
                        {formatCLP(quote.hourlyLightCostCLP, true)} / hora
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. MODO DE COBRO: BÁSICO VS COMERCIAL (MARGEN, FALLOS, IVA) */}
              <section className="card">
                <div className="card-header">
                  <div>
                    <span className="step-pill">Paso 4</span>
                    <h2>Modalidad de Cobro y Ganancia</h2>
                  </div>

                  <div className="mode-Segmented">
                    <button
                      type="button"
                      className={`seg-btn ${pricingConfig.mode === 'basic' ? 'active' : ''}`}
                      onClick={() => setPricingConfig((prev) => ({ ...prev, mode: 'basic' }))}
                    >
                      Solo Material + Luz (Básico)
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${pricingConfig.mode === 'complete' ? 'active' : ''}`}
                      onClick={() => setPricingConfig((prev) => ({ ...prev, mode: 'complete' }))}
                    >
                      Con Margen, Fallos e IVA
                    </button>
                  </div>
                </div>

                {pricingConfig.mode === 'basic' ? (
                  <div className="basic-mode-notice">
                    <strong>Modo Costo Directo activado:</strong> Se está cobrando únicamente el costo exacto de los gramos de filamento utilizados más las horas de electricidad de la impresora <strong>{activePrinter?.brand} {activePrinter?.model}</strong>. Cambia a <em>"Con Margen, Fallos e IVA"</em> arriba si deseas agregar utilidad comercial.
                  </div>
                ) : (
                  <div className="pricing-options-grid">
                    <div className="field">
                      <label htmlFor="profitMargin">
                        Margen de Ganancia (%)
                        <span className="quick-pills">
                          {[50, 100, 150, 200].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              className={`mini-pill ${Number(pricingConfig.profitMarginPercent) === pct ? 'active' : ''}`}
                              onClick={() =>
                                setPricingConfig((prev) => ({ ...prev, profitMarginPercent: pct }))
                              }
                            >
                              +{pct}%
                            </button>
                          ))}
                        </span>
                      </label>
                      <div className="input-with-unit">
                        <input
                          id="profitMargin"
                          type="number"
                          min="0"
                          step="5"
                          value={pricingConfig.profitMarginPercent}
                          onChange={(e) =>
                            setPricingConfig((prev) => ({
                              ...prev,
                              profitMarginPercent: e.target.value
                            }))
                          }
                        />
                        <span className="unit-tag">%</span>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="failureRate">Tasa de Fallos / Merma (%)</label>
                      <div className="input-with-unit">
                        <input
                          id="failureRate"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={pricingConfig.failureRatePercent}
                          onChange={(e) =>
                            setPricingConfig((prev) => ({
                              ...prev,
                              failureRatePercent: e.target.value
                            }))
                          }
                        />
                        <span className="unit-tag">%</span>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="roundingStep">Redondear precio final (CLP)</label>
                      <select
                        id="roundingStep"
                        value={pricingConfig.roundToNearestCLP}
                        onChange={(e) =>
                          setPricingConfig((prev) => ({
                            ...prev,
                            roundToNearestCLP: Number(e.target.value)
                          }))
                        }
                      >
                        <option value={1}>Exacto (Sin redondeo)</option>
                        <option value={10}>A los $10 CLP superiores</option>
                        <option value={100}>A los $100 CLP superiores</option>
                        <option value={500}>A los $500 CLP superiores</option>
                      </select>
                    </div>

                    <div className="field checkbox-field">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={pricingConfig.includeIVA}
                          onChange={(e) =>
                            setPricingConfig((prev) => ({
                              ...prev,
                              includeIVA: e.target.checked
                            }))
                          }
                        />
                        <span>Agregar IVA (19% Chile)</span>
                      </label>
                      <span className="field-help">
                        Suma 19% al valor neto para boleta o factura.
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* COLUMNA DERECHA: RESUMEN DE COBRO Y COTIZACIÓN */}
            <aside className="quote-sidebar">
              <div className="quote-card">
                <div className="quote-brand-banner">
                  <img
                    src="./logo-suenos-3d.png"
                    alt="Sueños 3D"
                    className="quote-logo-img"
                  />
                  <div>
                    <div className="quote-brand-name">SUEÑOS 3D</div>
                    <div className="quote-brand-sub">
                      Cotización de Impresión 3D • {new Date().toLocaleDateString('es-CL')}
                    </div>
                  </div>
                </div>

                <div className="quote-top-badge">
                  <span>PRECIO SUGERIDO A COBRAR (CLP)</span>
                  <span className="mode-indicator">
                    {pricingConfig.mode === 'basic' ? 'Costo Directo' : 'Comercial'}
                  </span>
                </div>

                <div className="quote-Hero-Price">
                  <div className="price-main">{formatCLP(quote.totalFinalCLP)}</div>
                  <div className="price-sub">
                    {quote.quantity > 1
                      ? `${quote.quantity} unidades × ${formatCLP(quote.finalUnitCLP)} c/u`
                      : 'Precio por 1 unidad'}
                    {pricingConfig.mode === 'complete' && pricingConfig.includeIVA
                      ? ' • IVA 19% Incluido'
                      : ' • Valor Neto'}
                  </div>
                </div>

                {/* RESUMEN TÉCNICO DE LA PIEZA */}
                <div className="quote-meta-chips">
                  <div className="meta-chip">
                    <span className="meta-label">Pieza</span>
                    <strong>{jobName || 'Sin nombre'}</strong>
                  </div>
                  {clientName && (
                    <div className="meta-chip">
                      <span className="meta-label">Cliente</span>
                      <strong>{clientName}</strong>
                    </div>
                  )}
                  <div className="meta-chip">
                    <span className="meta-label">Filamento</span>
                    <strong className="chip-with-dot">
                      <span
                        className="dot"
                        style={{ backgroundColor: activeFilament?.colorHex }}
                      />
                      {activeFilament?.brand} {activeFilament?.material} ({activeFilament?.colorName})
                    </strong>
                  </div>
                  <div className="meta-chip">
                    <span className="meta-label">Impresora 3D</span>
                    <strong>
                      {activePrinter?.brand} {activePrinter?.model} ({activePrinter?.watts}W)
                    </strong>
                  </div>
                  <div className="meta-chip">
                    <span className="meta-label">Peso / Tiempo Total</span>
                    <strong>
                      {quote.totalGrams}g • {hours}h {minutes}m {quote.quantity > 1 ? `c/u (${quote.totalHoursBatch.toFixed(1)}h total)` : ''}
                    </strong>
                  </div>
                </div>

                {/* TABLA DE DESGLOSE EN PESOS CHILENOS */}
                <div className="breakdown-list">
                  <div className="breakdown-row">
                    <div>
                      <span className="b-title">Costo de Filamento</span>
                      <span className="b-sub">
                        {quote.totalGrams}g × {formatCLP(quote.costPerGramCLP, true)}/g
                      </span>
                    </div>
                    <span className="b-amount">{formatCLP(quote.totalMaterialCLP)}</span>
                  </div>

                  <div className="breakdown-row">
                    <div>
                      <span className="b-title">Costo Hora Luz (Electricidad)</span>
                      <span className="b-sub">
                        {quote.totalHoursBatch.toFixed(2)} hrs × {formatCLP(quote.hourlyLightCostCLP, true)}/h
                      </span>
                    </div>
                    <span className="b-amount">{formatCLP(quote.totalElectricityCLP)}</span>
                  </div>

                  <div className="breakdown-row subtotal-row">
                    <span>Costo Base Directo (Material + Luz)</span>
                    <strong>{formatCLP(quote.totalBaseDirectCostCLP)}</strong>
                  </div>

                  {pricingConfig.mode === 'complete' && (
                    <>
                      <div className="breakdown-row">
                        <div>
                          <span className="b-title">Margen de Fallos ({pricingConfig.failureRatePercent}%)</span>
                          <span className="b-sub">Respaldo ante cortes o despegues</span>
                        </div>
                        <span className="b-amount">{formatCLP(quote.totalFailureBufferCLP)}</span>
                      </div>

                      <div className="breakdown-row">
                        <div>
                          <span className="b-title">Ganancia / Utilidad ({pricingConfig.profitMarginPercent}%)</span>
                          <span className="b-sub">Retorno neto para tu taller</span>
                        </div>
                        <span className="b-amount profit-text">
                          +{formatCLP(quote.totalProfitCLP)}
                        </span>
                      </div>

                      {pricingConfig.includeIVA && (
                        <div className="breakdown-row">
                          <div>
                            <span className="b-title">IVA Chile (19%)</span>
                            <span className="b-sub">Impuesto al Valor Agregado</span>
                          </div>
                          <span className="b-amount">{formatCLP(quote.totalIvaCLP)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="breakdown-row total-row">
                    <span>TOTAL A COBRAR</span>
                    <span className="total-figure">{formatCLP(quote.totalFinalCLP)}</span>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="quote-actions no-print">
                  <button
                    type="button"
                    className="btn-primary btn-full"
                    onClick={handleSaveQuoteToHistory}
                  >
                    {savedAlert ? <CheckIcon size={18} /> : <SaveIcon size={18} />}
                    <span>
                      {savedAlert ? '¡Guardada en el Historial!' : 'Guardar Cotización en Historial'}
                    </span>
                  </button>

                  <div className="action-row-2">
                    <button
                      type="button"
                      className="btn-whatsapp"
                      onClick={() => handleCopyWhatsApp(null)}
                    >
                      {copiedAlert ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
                      <span>{copiedAlert ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handlePrintOrExportPDF}
                    >
                      <PrinterIcon size={18} />
                      <span>{isElectron ? 'Guardar PDF' : 'Imprimir / PDF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* PESTAÑA 2: CATÁLOGO DE FILAMENTOS GUARDADOS */}
        {activeTab === 'filaments' && (
          <section className="catalog-section">
            <div className="catalog-header">
              <div>
                <h2>Mis Filamentos Guardados</h2>
                <p>
                  Guarda tus rollos por marca, tipo de material, color y precio en pesos chilenos. Se guardan automáticamente en la App.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={openNewFilamentModal}>
                <PlusIcon size={18} /> Agregar Filamento
              </button>
            </div>

            <div className="cards-grid">
              {filaments.map((fil) => {
                const costPerG = fil.spoolPriceCLP / (fil.spoolWeightGrams || 1000);
                const isSelected = fil.id === selectedFilamentId;
                return (
                  <div
                    key={fil.id}
                    className={`item-card ${isSelected ? 'selected-card' : ''}`}
                  >
                    <div className="item-card-top">
                      <div className="swatch-group">
                        <span
                          className="color-swatch-lg"
                          style={{ backgroundColor: fil.colorHex }}
                        />
                        <div>
                          <span className="badge-pill">{fil.material}</span>
                          <h3>{fil.brand}</h3>
                          <p className="item-color-name">{fil.colorName}</p>
                        </div>
                      </div>
                      {isSelected && <span className="active-tag">En uso</span>}
                    </div>

                    <div className="item-stats">
                      <div>
                        <span className="stat-label">Precio Rollo ({fil.spoolWeightGrams}g)</span>
                        <strong className="stat-val">{formatCLP(fil.spoolPriceCLP)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">Valor por Gramo</span>
                        <strong className="stat-val accent">{formatCLP(costPerG, true)}/g</strong>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedFilamentId(fil.id);
                          setActiveTab('calculator');
                        }}
                      >
                        Usar en Calculadora
                      </button>
                      <div className="icon-btns">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Editar"
                          onClick={() => openEditFilamentModal(fil)}
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Eliminar"
                          onClick={() => handleDeleteFilament(fil.id)}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PESTAÑA 3: IMPRESORAS 3D Y VALOR HORA LUZ */}
        {activeTab === 'printers' && (
          <section className="catalog-section">
            <div className="catalog-header">
              <div>
                <h2>Mis Impresoras 3D y Configuración de Hora Luz</h2>
                <p>
                  El valor hora luz se calcula automáticamente multiplicando los kilowatts de consumo de cada máquina por el precio del kWh en Chile.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={openNewPrinterModal}>
                <PlusIcon size={18} /> Agregar Impresora 3D
              </button>
            </div>

            {/* PANEL DE TARIFA ELÉCTRICA */}
            <div className="card electricity-config-card">
              <div className="card-header">
                <div>
                  <span className="step-pill">Tarifa Eléctrica Chile</span>
                  <h3>Configuración del Valor Hora Luz</h3>
                </div>
              </div>
              <div className="form-grid-3">
                <div className="field">
                  <label>Distribuidora / Zona Referencial</label>
                  <select
                    value={electricityConfig.providerPreset || 'custom'}
                    onChange={(e) => {
                      const presetId = e.target.value;
                      const found = CHILE_ELECTRICITY_PRESETS.find((item) => item.id === presetId);
                      setElectricityConfig((prev) => ({
                        ...prev,
                        providerPreset: presetId,
                        kwhPriceCLP: found && found.kwhCLP ? found.kwhCLP : prev.kwhPriceCLP
                      }));
                    }}
                  >
                    {CHILE_ELECTRICITY_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} {preset.kwhCLP ? `($${preset.kwhCLP}/kWh)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Valor del kWh en Pesos Chilenos ($ CLP)</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      min="1"
                      value={electricityConfig.kwhPriceCLP}
                      onChange={(e) =>
                        setElectricityConfig((prev) => ({
                          ...prev,
                          providerPreset: 'custom',
                          kwhPriceCLP: e.target.value
                        }))
                      }
                    />
                    <span className="unit-tag">CLP / kWh</span>
                  </div>
                </div>

                <div className="field">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={electricityConfig.useManualHourlyRate}
                      onChange={(e) =>
                        setElectricityConfig((prev) => ({
                          ...prev,
                          useManualHourlyRate: e.target.checked
                        }))
                      }
                    />
                    <span>Fijar Valor Hora Luz manual fijo</span>
                  </label>
                  {electricityConfig.useManualHourlyRate ? (
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        value={electricityConfig.manualHourlyRateCLP}
                        onChange={(e) =>
                          setElectricityConfig((prev) => ({
                            ...prev,
                            manualHourlyRateCLP: e.target.value
                          }))
                        }
                      />
                      <span className="unit-tag">CLP / hora</span>
                    </div>
                  ) : (
                    <span className="field-help">
                      Cálculo automático activado según los Watts de cada máquina.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="cards-grid">
              {printers.map((prn) => {
                const hourlyCLP = (prn.watts / 1000) * (Number(electricityConfig.kwhPriceCLP) || 0);
                const isSelected = prn.id === selectedPrinterId;
                return (
                  <div
                    key={prn.id}
                    className={`item-card ${isSelected ? 'selected-card' : ''}`}
                  >
                    <div className="item-card-top">
                      <div>
                        <span className="badge-pill">{prn.type || 'FDM'}</span>
                        <h3>{prn.brand}</h3>
                        <p className="item-color-name">{prn.model}</p>
                      </div>
                      {isSelected && <span className="active-tag">Seleccionada</span>}
                    </div>

                    {prn.notes && <p className="printer-notes">{prn.notes}</p>}

                    <div className="item-stats">
                      <div>
                        <span className="stat-label">Consumo Medio</span>
                        <strong className="stat-val">{prn.watts} W</strong>
                      </div>
                      <div>
                        <span className="stat-label">Valor Hora Luz</span>
                        <strong className="stat-val accent">
                          {formatCLP(hourlyCLP, true)} / hora
                        </strong>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedPrinterId(prn.id);
                          setActiveTab('calculator');
                        }}
                      >
                        Elegir Máquina
                      </button>
                      <div className="icon-btns">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Editar"
                          onClick={() => openEditPrinterModal(prn)}
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Eliminar"
                          onClick={() => handleDeletePrinter(prn.id)}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PESTAÑA 4: HISTORIAL DE COTIZACIONES */}
        {activeTab === 'history' && (
          <section className="catalog-section">
            <div className="catalog-header">
              <div>
                <h2>Historial de Cotizaciones Guardadas</h2>
                <p>
                  Revisa tus trabajos cotizados anteriormente, vuelve a cargarlos en la calculadora o copia su resumen para WhatsApp.
                </p>
              </div>
              {quotesHistory.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (confirm('¿Seguro que deseas borrar todo el historial de cotizaciones?')) {
                      setQuotesHistory([]);
                    }
                  }}
                >
                  <TrashIcon size={16} /> Limpiar Historial
                </button>
              )}
            </div>

            {quotesHistory.length === 0 ? (
              <div className="empty-state card">
                <HistoryIcon size={36} />
                <h3>Aún no tienes cotizaciones guardadas</h3>
                <p>
                  Realiza un cálculo en la pestaña Calculadora y presiona "Guardar Cotización en Historial" para almacenarla aquí.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveTab('calculator')}
                >
                  Ir a la Calculadora
                </button>
              </div>
            ) : (
              <div className="history-list">
                {quotesHistory.map((item) => (
                  <div key={item.id} className="history-card">
                    <div className="history-main">
                      <div className="history-title-row">
                        <span
                          className="dot"
                          style={{ backgroundColor: item.filamentColorHex || '#3b82f6' }}
                        />
                        <h3>{item.jobName}</h3>
                        {item.clientName && (
                          <span className="client-pill">Cliente: {item.clientName}</span>
                        )}
                        <span className="date-pill">{item.createdAt}</span>
                      </div>

                      <div className="history-details">
                        <span>
                          <strong>Filamento:</strong> {item.filamentSummary}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Máquina:</strong> {item.printerSummary}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Peso/Tiempo:</strong> {item.gramsUsed}g / {item.hours}h {item.minutes}m
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Cantidad:</strong> {item.quantity} unid.
                        </span>
                      </div>
                    </div>

                    <div className="history-right">
                      <div className="history-price">
                        <span className="stat-label">Total Cobrado</span>
                        <strong>{formatCLP(item.totalFinalCLP)}</strong>
                      </div>

                      <div className="history-actions">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => handleLoadQuoteFromHistory(item)}
                        >
                          Cargar en Calculadora
                        </button>
                        <button
                          type="button"
                          className="btn-whatsapp btn-sm"
                          onClick={() => handleCopyWhatsApp(item)}
                        >
                          <CopyIcon size={15} /> WhatsApp
                        </button>
                        <button
                          type="button"
                          className="btn-icon danger"
                          title="Eliminar cotización"
                          onClick={() => handleDeleteQuoteHistory(item.id)}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL AGREGAR / EDITAR FILAMENTO */}
      {showFilamentModal && (
        <div className="modal-backdrop" onClick={() => setShowFilamentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingFilament ? 'Editar Filamento' : 'Guardar Nuevo Filamento'}</h3>
            <form onSubmit={handleSaveFilament} className="modal-form">
              <div className="form-grid-2">
                <div className="field">
                  <label>Marca del Filamento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: eSUN, Bambu Lab, Creality, Sunlu"
                    value={filamentForm.brand}
                    onChange={(e) => setFilamentForm({ ...filamentForm, brand: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Tipo de Material *</label>
                  <select
                    value={filamentForm.material}
                    onChange={(e) => setFilamentForm({ ...filamentForm, material: e.target.value })}
                  >
                    <option value="PLA">PLA</option>
                    <option value="PLA+">PLA+ / PLA Pro</option>
                    <option value="Hyper PLA">Hyper PLA / Alta Velocidad</option>
                    <option value="PLA Silk">PLA Silk (Seda)</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="ASA">ASA</option>
                    <option value="TPU">TPU Flexible</option>
                    <option value="Nylon / CF">Nylon / Fibra de Carbono</option>
                    <option value="Resina UV">Resina UV</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Nombre del Color *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Negro Mate, Rojo Fuego, Blanco..."
                    value={filamentForm.colorName}
                    onChange={(e) =>
                      setFilamentForm({ ...filamentForm, colorName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Color Visual</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      value={filamentForm.colorHex}
                      onChange={(e) =>
                        setFilamentForm({ ...filamentForm, colorHex: e.target.value })
                      }
                    />
                    <span>{filamentForm.colorHex}</span>
                  </div>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Precio del Rollo en Pesos Chilenos (CLP) *</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={filamentForm.spoolPriceCLP}
                    onChange={(e) =>
                      setFilamentForm({ ...filamentForm, spoolPriceCLP: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Peso del Rollo (gramos) *</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    required
                    value={filamentForm.spoolWeightGrams}
                    onChange={(e) =>
                      setFilamentForm({ ...filamentForm, spoolWeightGrams: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowFilamentModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Filamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR IMPRESORA 3D */}
      {showPrinterModal && (
        <div className="modal-backdrop" onClick={() => setShowPrinterModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPrinter ? 'Editar Impresora 3D' : 'Registrar Nueva Impresora 3D'}</h3>
            <form onSubmit={handleSavePrinter} className="modal-form">
              <div className="form-grid-2">
                <div className="field">
                  <label>Marca de la Impresora *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Bambu Lab, Creality, Prusa, Anycubic"
                    value={printerForm.brand}
                    onChange={(e) => setPrinterForm({ ...printerForm, brand: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: A1, Ender 3 V3 KE, K1 Max..."
                    value={printerForm.model}
                    onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field">
                  <label>Consumo Promedio Imprimiendo (Watts) *</label>
                  <input
                    type="number"
                    min="10"
                    max="2500"
                    required
                    value={printerForm.watts}
                    onChange={(e) => setPrinterForm({ ...printerForm, watts: e.target.value })}
                  />
                  <span className="field-help">
                    Una impresora FDM típica consume entre 90W y 180W promedio durante la impresión.
                  </span>
                </div>
                <div className="field">
                  <label>Tipo de Máquina</label>
                  <input
                    type="text"
                    placeholder="Ej: FDM CoreXY, Bedslinger, Resina SLA"
                    value={printerForm.type}
                    onChange={(e) => setPrinterForm({ ...printerForm, type: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label>Notas adicionales (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Boquilla 0.4mm endurecida, cama PEI"
                  value={printerForm.notes}
                  onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPrinterModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Impresora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

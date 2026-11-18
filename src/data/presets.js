export const INITIAL_PRINTERS = [
  {
    id: 'bambu-x2d',
    brand: 'Bambu Lab',
    model: 'X2D (Dual Nozzle • PLA / PETG)',
    watts: 250,
    maxWatts: 1600,
    type: 'CoreXY Doble Cabezal (220V Chile)',
    notes: 'Oficial Bambu Lab 220V: ~250W promedio en PLA/PETG • Pico máx 1600W • Standby ~8W'
  },
  {
    id: 'bambu-x2d-chamber',
    brand: 'Bambu Lab',
    model: 'X2D (Modo ABS / ASA / PC • Cámara Activa)',
    watts: 420,
    maxWatts: 1600,
    type: 'CoreXY Doble Cabezal + Calefactor Cámara',
    notes: 'Oficial Bambu Lab 220V: ~330W a 550W (prom. 420W) con cámara calefactada activa • Pico 1600W'
  },
  {
    id: 'bambu-h2d',
    brand: 'Bambu Lab',
    model: 'H2D',
    watts: 200,
    maxWatts: 1800,
    type: 'CoreXY Dual Nozzle (220V Chile)',
    notes: 'Consumo medio ~197W PLA / ~395W PC • Pico 1800W (220V)'
  },
  {
    id: 'bambu-x1c',
    brand: 'Bambu Lab',
    model: 'X1 Carbon (X1C)',
    watts: 165,
    maxWatts: 1000,
    type: 'CoreXY Industrial',
    notes: 'Incluye consumo de electrónica, LiDAR y cámara'
  },
  {
    id: 'bambu-p1s',
    brand: 'Bambu Lab',
    model: 'P1S / P1P',
    watts: 150,
    maxWatts: 1000,
    type: 'CoreXY Cerrada',
    notes: 'Consumo medio ~120W PLA / ~200W ABS'
  },
  {
    id: 'bambu-a1',
    brand: 'Bambu Lab',
    model: 'A1',
    watts: 130,
    maxWatts: 350,
    type: 'FDM Bedslinger',
    notes: 'Consumo promedio PLA ~95-130W'
  },
  {
    id: 'bambu-a1-mini',
    brand: 'Bambu Lab',
    model: 'A1 Mini',
    watts: 90,
    maxWatts: 150,
    type: 'FDM Compacta',
    notes: 'Muy bajo consumo energético'
  },
  {
    id: 'creality-ender3-v3',
    brand: 'Creality',
    model: 'Ender 3 V3 SE / KE',
    watts: 120,
    maxWatts: 350,
    type: 'FDM Bedslinger',
    notes: 'Consumo promedio estándar en PLA/PETG'
  },
  {
    id: 'creality-k1-max',
    brand: 'Creality',
    model: 'K1 / K1 Max',
    watts: 180,
    maxWatts: 1000,
    type: 'CoreXY Alta Velocidad',
    notes: 'Cama grande de calentamiento rápido'
  },
  {
    id: 'prusa-mk4',
    brand: 'Prusa Research',
    model: 'Original Prusa MK4 / MK3S+',
    watts: 110,
    maxWatts: 240,
    type: 'FDM Bedslinger',
    notes: 'Fuente eficiente de 240W'
  },
  {
    id: 'anycubic-kobra-3',
    brand: 'Anycubic',
    model: 'Kobra 3 / Kobra 2 Pro',
    watts: 140,
    maxWatts: 400,
    type: 'FDM Alta Velocidad',
    notes: 'Consumo medio en impresión multicolor/rápida'
  },
  {
    id: 'elegoo-neptune-4',
    brand: 'Elegoo',
    model: 'Neptune 4 / 4 Pro',
    watts: 135,
    maxWatts: 310,
    type: 'FDM Klipper',
    notes: 'Cama segmentada inteligente'
  }
];

export const INITIAL_FILAMENTS = [
  {
    id: 'esun-pla-plus-black',
    brand: 'eSUN',
    material: 'PLA+',
    colorName: 'Negro Profundo',
    colorHex: '#1e293b',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 16990
  },
  {
    id: 'bambu-pla-basic-white',
    brand: 'Bambu Lab',
    material: 'PLA Basic',
    colorName: 'Blanco Jade',
    colorHex: '#f8fafc',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 19990
  },
  {
    id: 'creality-hyper-pla-grey',
    brand: 'Creality',
    material: 'Hyper PLA',
    colorName: 'Gris Espacial',
    colorHex: '#64748b',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 17990
  },
  {
    id: 'sunlu-petg-blue',
    brand: 'SUNLU',
    material: 'PETG',
    colorName: 'Azul Eléctrico',
    colorHex: '#2563eb',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 15990
  },
  {
    id: 'polymaker-polylite-red',
    brand: 'Polymaker',
    material: 'PLA Pro',
    colorName: 'Rojo Carmesí',
    colorHex: '#dc2626',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 22990
  },
  {
    id: 'grilon3-silk-gold',
    brand: 'Grilon3',
    material: 'PLA Silk',
    colorName: 'Dorado Seda',
    colorHex: '#eab308',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 21500
  }
];

export const INITIAL_ELECTRICITY_CONFIG = {
  kwhPriceCLP: 235, // Tarifa promedio residencial en Chile (Enel/CGE aprox $220-$260 CLP/kWh con cargos)
  useManualHourlyRate: false,
  manualHourlyRateCLP: 45,
  providerPreset: 'enel-rm'
};

export const CHILE_ELECTRICITY_PRESETS = [
  { id: 'enel-rm', name: 'Enel Distribución (RM Promedio)', kwhCLP: 235 },
  { id: 'cge-centro-sur', name: 'CGE (Regiones Centro / Sur)', kwhCLP: 255 },
  { id: 'chilquinta-valpo', name: 'Chilquinta (Valparaíso)', kwhCLP: 245 },
  { id: 'saesa-sur', name: 'Saesa / Frontel (Zona Sur)', kwhCLP: 265 },
  { id: 'custom', name: 'Personalizado (según tu boleta)', kwhCLP: null }
];

export const INITIAL_PRICING_CONFIG = {
  mode: 'complete', // 'basic' (Solo material + luz) o 'complete' (con margen, fallos e IVA)
  failureRatePercent: 10,
  profitMarginPercent: 100, // 100% sobre el costo (x2) o configurable
  includeIVA: false, // 19% IVA Chile
  roundToNearestCLP: 100 // Redondeo amigable en pesos chilenos ($100, $500, $10, o 1 sin redondeo)
};

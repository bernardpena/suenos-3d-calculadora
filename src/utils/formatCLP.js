const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

const clpDecimalFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function formatCLP(value, allowDecimals = false) {
  const num = Number(value) || 0;
  if (allowDecimals && num > 0 && num < 100 && !Number.isInteger(num)) {
    return clpDecimalFormatter.format(num);
  }
  return clpFormatter.format(Math.round(num));
}

export function roundCLP(amount, step = 1) {
  const num = Number(amount) || 0;
  if (!step || step <= 1) return Math.round(num);
  return Math.ceil(num / step) * step;
}

export function calculatePrintQuote({
  filament,
  printer,
  electricityConfig,
  pricingConfig,
  gramsUsed,
  hours,
  minutes,
  quantity = 1
}) {
  const safeGrams = Math.max(0, Number(gramsUsed) || 0);
  const safeHours = Math.max(0, Number(hours) || 0);
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const safeQty = Math.max(1, parseInt(quantity, 10) || 1);

  const totalTimeHours = safeHours + safeMinutes / 60;

  // 1. Costo de filamento por gramo y para la pieza
  const spoolWeight = Math.max(1, Number(filament?.spoolWeightGrams) || 1000);
  const spoolPrice = Math.max(0, Number(filament?.spoolPriceCLP) || 0);
  const costPerGramCLP = spoolPrice / spoolWeight;
  const materialCostUnitCLP = costPerGramCLP * safeGrams;

  // 2. Valor Hora Luz automático según Watts de la máquina y tarifa kWh en Chile (o valor manual)
  const watts = Math.max(0, Number(printer?.watts) || 0);
  const kwhPrice = Math.max(0, Number(electricityConfig?.kwhPriceCLP) || 0);
  const autoHourlyLightCLP = (watts / 1000) * kwhPrice;
  const hourlyLightCostCLP = electricityConfig?.useManualHourlyRate
    ? Math.max(0, Number(electricityConfig?.manualHourlyRateCLP) || 0)
    : autoHourlyLightCLP;

  const electricityCostUnitCLP = hourlyLightCostCLP * totalTimeHours;

  // 3. Costo Base Directo (Material + Luz) por unidad
  const baseDirectCostUnitCLP = materialCostUnitCLP + electricityCostUnitCLP;

  // 4. Modo Básico vs Modo Completo (Tasa de fallos + Margen de ganancia + IVA 19%)
  const isBasicMode = pricingConfig?.mode === 'basic';

  const failureRatePct = isBasicMode ? 0 : Math.max(0, Number(pricingConfig?.failureRatePercent) || 0);
  const failureBufferUnitCLP = baseDirectCostUnitCLP * (failureRatePct / 100);
  const productionCostUnitCLP = baseDirectCostUnitCLP + failureBufferUnitCLP;

  const profitMarginPct = isBasicMode ? 0 : Math.max(0, Number(pricingConfig?.profitMarginPercent) || 0);
  const profitUnitCLP = productionCostUnitCLP * (profitMarginPct / 100);

  const netPriceUnitCLP = productionCostUnitCLP + profitUnitCLP;

  const includeIVA = !isBasicMode && Boolean(pricingConfig?.includeIVA);
  const ivaUnitCLP = includeIVA ? netPriceUnitCLP * 0.19 : 0;

  const rawFinalUnitCLP = netPriceUnitCLP + ivaUnitCLP;
  const roundStep = Number(pricingConfig?.roundToNearestCLP) || 1;
  const finalUnitCLP = roundCLP(rawFinalUnitCLP, roundStep);

  // Totales por cantidad de piezas
  const totalMaterialCLP = materialCostUnitCLP * safeQty;
  const totalElectricityCLP = electricityCostUnitCLP * safeQty;
  const totalBaseDirectCostCLP = baseDirectCostUnitCLP * safeQty;
  const totalFailureBufferCLP = failureBufferUnitCLP * safeQty;
  const totalProductionCostCLP = productionCostUnitCLP * safeQty;
  const totalProfitCLP = profitUnitCLP * safeQty;
  const totalNetPriceCLP = netPriceUnitCLP * safeQty;
  const totalIvaCLP = ivaUnitCLP * safeQty;
  const totalFinalCLP = finalUnitCLP * safeQty;

  return {
    totalTimeHours,
    costPerGramCLP,
    hourlyLightCostCLP,
    autoHourlyLightCLP,
    // Por unidad
    materialCostUnitCLP,
    electricityCostUnitCLP,
    baseDirectCostUnitCLP,
    failureBufferUnitCLP,
    productionCostUnitCLP,
    profitUnitCLP,
    netPriceUnitCLP,
    ivaUnitCLP,
    rawFinalUnitCLP,
    finalUnitCLP,
    // Totales por lote (cantidad)
    quantity: safeQty,
    totalGrams: safeGrams * safeQty,
    totalHoursBatch: totalTimeHours * safeQty,
    totalMaterialCLP,
    totalElectricityCLP,
    totalBaseDirectCostCLP,
    totalFailureBufferCLP,
    totalProductionCostCLP,
    totalProfitCLP,
    totalNetPriceCLP,
    totalIvaCLP,
    totalFinalCLP
  };
}


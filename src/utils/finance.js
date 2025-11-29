/**
 * Convierte tasa efectiva anual a tasa mensual
 * Usa año comercial de 360 días (meses de 30 días)
 */
exports.monthlyRateFromAnnual = (annualRate) => {
  return Math.pow(1 + annualRate, 30/360) - 1;
};

/**
 * Convierte tasa nominal anual a tasa efectiva anual
 * @param {number} nominalRate - Tasa nominal anual (ej: 0.12 para 12%)
 * @param {string} capitalizacion - 'mensual', 'trimestral', 'semestral', 'anual'
 * @returns {number} Tasa efectiva anual
 */
exports.nominalToEffective = (nominalRate, capitalizacion) => {
  const periodos = {
    'mensual': 12,
    'trimestral': 4,
    'semestral': 2,
    'anual': 1
  };
  const n = periodos[capitalizacion] || 12;
  return Math.pow(1 + nominalRate / n, n) - 1;
};

/**
 * Plan de pagos método francés vencido ordinario (meses de 30 días)
 * @param {number} amount - Monto del préstamo
 * @param {number} months - Plazo total en meses
 * @param {number} annualRate - Tasa anual (ya debe ser efectiva)
 * @param {object} options - Opciones adicionales
 * @param {string} options.tipoGracia - 'ninguno', 'total', 'parcial'
 * @param {number} options.mesesGracia - Número de meses de gracia
 * @returns {object} { cuota, schedule }
 */
exports.frenchSchedule = (amount, months, annualRate, options = {}) => {
  const { tipoGracia = 'ninguno', mesesGracia = 0 } = options;
  const r = exports.monthlyRateFromAnnual(annualRate);
  
  let balance = amount;
  let schedule = [];
  
  // Meses de gracia
  for (let i = 1; i <= mesesGracia; i++) {
    const interest = balance * r;
    
    if (tipoGracia === 'total') {
      // Gracia total: no paga nada, interés se capitaliza
      balance += interest;
      schedule.push({
        installment_number: i,
        amortization: 0,
        interest: 0,
        total: 0,
        balance: Number(balance.toFixed(2)),
        tipo: 'gracia_total'
      });
    } else if (tipoGracia === 'parcial') {
      // Gracia parcial: paga solo intereses
      schedule.push({
        installment_number: i,
        amortization: 0,
        interest: Number(interest.toFixed(2)),
        total: Number(interest.toFixed(2)),
        balance: Number(balance.toFixed(2)),
        tipo: 'gracia_parcial'
      });
    }
  }
  
  // Meses restantes con amortización normal (método francés)
  const mesesRestantes = months - mesesGracia;
  
  if (mesesRestantes <= 0) {
    return { cuota: 0, schedule };
  }
  
  // Guardar el saldo inicial para ajuste final
  const saldoInicialAmortizacion = balance;
  
  // Calcular cuota fija para los meses restantes sobre el saldo actual
  const cuota = balance * (r * Math.pow(1 + r, mesesRestantes)) / (Math.pow(1 + r, mesesRestantes) - 1);
  
  for (let i = mesesGracia + 1; i <= months; i++) {
    const interest = balance * r;
    let amort = cuota - interest;
    
    // En la última cuota, ajustar para que el saldo quede exactamente en 0
    if (i === months) {
      amort = balance; // La última amortización es todo el saldo restante
    }
    
    balance = Math.max(0, balance - amort);
    
    // Calcular el total de esta cuota
    const totalCuota = (i === months) ? amort + interest : cuota;
    
    schedule.push({
      installment_number: i,
      amortization: Number(amort.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      total: Number(totalCuota.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      tipo: 'normal'
    });
  }
  
  return { cuota: Number(cuota.toFixed(2)), schedule };
};

/**
 * Calcula el Valor Actual Neto (VAN)
 * @param {number} initialInvestment - Inversión inicial (monto del préstamo, positivo)
 * @param {number[]} cashflows - Flujos de caja futuros (cuotas)
 * @param {number} discountMonthly - Tasa de descuento mensual
 * @returns {number} VAN
 */
exports.calculateVAN = (initialInvestment, cashflows, discountMonthly) => {
  let van = -initialInvestment; // Flujo inicial negativo
  for(let i=0; i<cashflows.length; i++){
    van += cashflows[i] / Math.pow(1 + discountMonthly, i + 1);
  }
  return van;
};

/**
 * Calcula la Tasa Interna de Retorno (TIR) mensual
 * @param {number} initialInvestment - Inversión inicial (monto del préstamo, positivo)
 * @param {number[]} cashflows - Flujos de caja futuros (cuotas)
 * @returns {number} TIR mensual
 */
exports.calculateTIR = (initialInvestment, cashflows) => {
  // NPV = -Inversión + Σ(Flujo_i / (1+r)^i)
  const npv = (r) => {
    let sum = -initialInvestment;
    for(let i = 0; i < cashflows.length; i++){
      sum += cashflows[i] / Math.pow(1 + r, i + 1);
    }
    return sum;
  };
  
  // Método de bisección para encontrar la TIR
  let low = 0, high = 1, mid;
  
  // Buscar TIR entre 0% y 100% mensual
  for(let i = 0; i < 100; i++){
    mid = (low + high) / 2;
    if(npv(mid) > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return mid;
};

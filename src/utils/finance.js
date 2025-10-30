exports.monthlyRateFromAnnual = (annualRate) => {
  return Math.pow(1 + annualRate, 1/12) - 1;
};

exports.frenchSchedule = (amount, months, annualRate) => {
  const r = exports.monthlyRateFromAnnual(annualRate);
  const cuota = amount * (r * Math.pow(1+r, months)) / (Math.pow(1+r, months) - 1);
  let balance = amount;
  let schedule = [];
  for(let i=1;i<=months;i++){
    const interest = balance * r;
    const amort = cuota - interest;
    balance = Math.max(0, balance - amort);
    schedule.push({
      installment_number: i,
      amortization: Number(amort.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      total: Number(cuota.toFixed(2)),
      balance: Number(balance.toFixed(2))
    });
  }
  return { cuota: Number(cuota.toFixed(2)), schedule };
};

exports.calculateVAN = (cashflows, discountMonthly) => {
  let van = 0;
  for(let i=0;i<cashflows.length;i++){
    van += cashflows[i] / Math.pow(1+discountMonthly, i+1);
  }
  return van;
};

exports.calculateTIR = (cashflows) => {
  let low = -0.99, high = 10, mid;
  const npv = (r) => cashflows.reduce((acc, f, i) => acc + f / Math.pow(1 + r, i+1), 0);
  for(let i=0;i<200;i++){
    mid = (low + high) / 2;
    if(npv(mid) > 0) low = mid; else high = mid;
  }
  return mid;
};

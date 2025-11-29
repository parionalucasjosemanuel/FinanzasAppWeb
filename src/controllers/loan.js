const { Loan, Payment, Client, Property } = require('../models');
const finance = require('../utils/finance');

exports.create = async (req, res) => {
  try {
    const { 
      clientId, propertyId, creditConfigId, amount, term_months, annual_rate, 
      start_date, bono_techo, bono_monto, tipo_tasa, capitalizacion, 
      periodo_gracia, meses_gracia, moneda, tasa_descuento 
    } = req.body;
    
    // Calcular monto real del préstamo (restando bono si aplica)
    let montoReal = Number(amount);
    const bonoAplicado = bono_techo && bono_monto ? Number(bono_monto) : 0;
    montoReal = montoReal - bonoAplicado;
    
    // Convertir tasa de porcentaje a decimal (11% -> 0.11)
    let tasaDecimal = Number(annual_rate) / 100;
    
    // Convertir tasa si es nominal a efectiva
    let tasaEfectiva = tasaDecimal;
    if (tipo_tasa === 'nominal' && capitalizacion) {
      tasaEfectiva = finance.nominalToEffective(tasaDecimal, capitalizacion);
    }
    
    // Tasa de descuento (COK) - convertir de porcentaje a decimal
    const tasaDescuentoDecimal = tasa_descuento ? Number(tasa_descuento) / 100 : 0.20;
    
    // Crear el préstamo con todos los campos
    const loan = await Loan.create({ 
      clientId, propertyId, creditConfigId, 
      amount: montoReal, 
      term_months, 
      annual_rate: tasaEfectiva, 
      start_date, 
      bono_techo: bono_techo || false,
      bono_monto: bonoAplicado,
      tipo_tasa: tipo_tasa || 'efectiva',
      capitalizacion: capitalizacion || 'mensual',
      periodo_gracia: periodo_gracia || 'ninguno',
      meses_gracia: meses_gracia || 0,
      moneda: moneda || 'PEN',
      tasa_descuento: tasaDescuentoDecimal
    });
    
    // Generar cronograma con gracia
    const { cuota, schedule } = finance.frenchSchedule(
      montoReal, 
      Number(term_months), 
      tasaEfectiva,
      {
        tipoGracia: periodo_gracia || 'ninguno',
        mesesGracia: Number(meses_gracia) || 0
      }
    );
    
    // Función para sumar meses correctamente (mantiene el mismo día o el último del mes)
    function addMonths(date, months) {
      const result = new Date(date);
      const dayOfMonth = result.getDate();
      result.setMonth(result.getMonth() + months);
      // Si el día cambió (ej: 31 enero + 1 mes = 3 marzo), ajustar al último día del mes anterior
      if (result.getDate() !== dayOfMonth) {
        result.setDate(0); // Ir al último día del mes anterior
      }
      return result;
    }
    
    // Guardar cada cuota en la base de datos
    const startDateObj = new Date(start_date || new Date());
    for(const s of schedule){
      const due = addMonths(startDateObj, s.installment_number);
      await Payment.create({
        loanId: loan.id,
        installment_number: s.installment_number,
        amortization: s.amortization,
        interest: s.interest,
        total: s.total,
        balance: s.balance,
        due_date: due.toISOString().split('T')[0]
      });
    }
    
    res.json({ loan, cuota, schedule, tasaEfectivaAnual: tasaEfectiva, bonoAplicado });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Listar todos los créditos con información del cliente y propiedad
exports.list = async (req, res) => {
  try {
    const loans = await Loan.findAll({
      include: [
        { model: Client, attributes: ['id', 'full_name', 'dni'] },
        { model: Property, attributes: ['id', 'project_name', 'address'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(loans);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Obtener un crédito específico con su información completa
exports.getOne = async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Client, attributes: ['id', 'full_name', 'dni', 'email', 'phone'] },
        { model: Property, attributes: ['id', 'project_name', 'address', 'price', 'currency'] }
      ]
    });
    if (!loan) return res.status(404).json({ message: 'Crédito no encontrado' });
    res.json(loan);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.payments = async (req, res) => {
  try {
    const loanId = req.params.id;
    const payments = await Payment.findAll({ where: { loanId }, order: [['installment_number', 'ASC']] });
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Eliminar un crédito y sus pagos asociados
exports.delete = async (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = await Loan.findByPk(loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Crédito no encontrado' });
    }
    
    // Eliminar primero los pagos asociados
    await Payment.destroy({ where: { loanId } });
    
    // Luego eliminar el crédito
    await loan.destroy();
    
    res.json({ message: 'Crédito eliminado correctamente', id: loanId });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

// Actualizar un crédito (regenera el cronograma)
exports.update = async (req, res) => {
  try {
    const loanId = req.params.id;
    const loan = await Loan.findByPk(loanId);
    
    if (!loan) {
      return res.status(404).json({ message: 'Crédito no encontrado' });
    }
    
    const { 
      clientId, propertyId, amount, term_months, annual_rate, 
      start_date, bono_techo, bono_monto, tipo_tasa, capitalizacion, 
      periodo_gracia, meses_gracia, moneda, tasa_descuento 
    } = req.body;
    
    // Calcular monto real del préstamo
    let montoReal = Number(amount);
    const bonoAplicado = bono_techo && bono_monto ? Number(bono_monto) : 0;
    montoReal = montoReal - bonoAplicado;
    
    // Convertir tasa de porcentaje a decimal
    let tasaDecimal = Number(annual_rate) / 100;
    let tasaEfectiva = tasaDecimal;
    if (tipo_tasa === 'nominal' && capitalizacion) {
      tasaEfectiva = finance.nominalToEffective(tasaDecimal, capitalizacion);
    }
    
    const tasaDescuentoDecimal = tasa_descuento ? Number(tasa_descuento) / 100 : 0.20;
    
    // Actualizar el préstamo
    await loan.update({ 
      clientId, propertyId,
      amount: montoReal, 
      term_months, 
      annual_rate: tasaEfectiva, 
      start_date, 
      bono_techo: bono_techo || false,
      bono_monto: bonoAplicado,
      tipo_tasa: tipo_tasa || 'efectiva',
      capitalizacion: capitalizacion || 'mensual',
      periodo_gracia: periodo_gracia || 'ninguno',
      meses_gracia: meses_gracia || 0,
      moneda: moneda || 'PEN',
      tasa_descuento: tasaDescuentoDecimal
    });
    
    // Eliminar pagos anteriores
    await Payment.destroy({ where: { loanId } });
    
    // Regenerar cronograma
    const { cuota, schedule } = finance.frenchSchedule(
      montoReal, 
      Number(term_months), 
      tasaEfectiva,
      {
        tipoGracia: periodo_gracia || 'ninguno',
        mesesGracia: Number(meses_gracia) || 0
      }
    );
    
    // Función para sumar meses correctamente
    function addMonths(date, months) {
      const result = new Date(date);
      const dayOfMonth = result.getDate();
      result.setMonth(result.getMonth() + months);
      if (result.getDate() !== dayOfMonth) {
        result.setDate(0);
      }
      return result;
    }
    
    // Guardar nuevos pagos
    const startDateObj = new Date(start_date || new Date());
    for(const s of schedule){
      const due = addMonths(startDateObj, s.installment_number);
      await Payment.create({
        loanId: loan.id,
        installment_number: s.installment_number,
        amortization: s.amortization,
        interest: s.interest,
        total: s.total,
        balance: s.balance,
        due_date: due.toISOString().split('T')[0]
      });
    }
    
    res.json({ loan, cuota, schedule, message: 'Crédito actualizado correctamente' });
  } catch (err) { 
    res.status(500).json({ message: err.message }); 
  }
};

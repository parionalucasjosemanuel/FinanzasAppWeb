const { Loan, Payment } = require('../models');
const finance = require('../utils/finance');

exports.create = async (req, res) => {
  try {
    const { clientId, propertyId, creditConfigId, amount, term_months, annual_rate, start_date, bono_techo } = req.body;
    const loan = await Loan.create({ clientId, propertyId, creditConfigId, amount, term_months, annual_rate, start_date, bono_techo: bono_techo || false });
    const { cuota, schedule } = finance.frenchSchedule(Number(amount), Number(term_months), Number(annual_rate));
    for(const s of schedule){
      const due = new Date(start_date || new Date());
      due.setMonth(due.getMonth() + s.installment_number);
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
    res.json({ loan, cuota });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.payments = async (req, res) => {
  try {
    const loanId = req.params.id;
    const payments = await Payment.findAll({ where: { loanId }});
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

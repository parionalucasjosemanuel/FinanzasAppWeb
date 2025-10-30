module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Loan', {
    amount: DataTypes.DECIMAL(12,2),
    term_months: DataTypes.INTEGER,
    annual_rate: DataTypes.DECIMAL(6,4),
    start_date: DataTypes.DATEONLY,
    bono_techo: { type: DataTypes.BOOLEAN, defaultValue: false }
  });
};

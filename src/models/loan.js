module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Loan', {
    amount: DataTypes.DECIMAL(12,2),
    term_months: DataTypes.INTEGER,
    annual_rate: DataTypes.DECIMAL(6,4),
    start_date: DataTypes.DATEONLY,
    bono_techo: { type: DataTypes.BOOLEAN, defaultValue: false },
    bono_monto: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
    tipo_tasa: DataTypes.STRING,
    capitalizacion: DataTypes.STRING,
    periodo_gracia: DataTypes.STRING,
    meses_gracia: { type: DataTypes.INTEGER, defaultValue: 0 },
    moneda: DataTypes.STRING,
    tasa_descuento: { type: DataTypes.DECIMAL(6,4), defaultValue: 0.20 }
  });
};

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CreditConfig', {
    moneda: DataTypes.STRING,
    tipo_tasa: DataTypes.STRING,
    capitalizacion: DataTypes.STRING,
    periodo_gracia: DataTypes.STRING,
    meses_gracia: { type: DataTypes.INTEGER, defaultValue: 0 }
  });
};

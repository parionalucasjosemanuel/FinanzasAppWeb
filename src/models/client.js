module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Client', {
    full_name: DataTypes.STRING,
    dni: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    income: DataTypes.DECIMAL(12,2),
    marital_status: DataTypes.STRING
  });
};

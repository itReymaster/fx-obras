import { Sequelize } from "sequelize";
import { env } from "../../config/env.js";

let sequelizeInstance: Sequelize | null = null;

export const getSequelize = () => {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  sequelizeInstance = new Sequelize(env.sqlServerDatabase, env.sqlServerUsername, env.sqlServerPassword, {
    host: env.sqlServerHost,
    port: env.sqlServerPort,
    dialect: "mssql",
    logging: env.nodeEnv === "development" ? console.log : false,
    dialectOptions: {
      options: {
        encrypt: env.sqlServerEncrypt,
        trustServerCertificate: env.sqlServerTrustServerCertificate,
        enableArithAbort: true,
      },
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });

  return sequelizeInstance;
};

export const closeSequelize = async () => {
  if (!sequelizeInstance) {
    return;
  }

  await sequelizeInstance.close();
  sequelizeInstance = null;
};

import "dotenv/config";
import { QueryTypes } from "sequelize";
import { closeSequelize, getSequelize } from "../shared/database/sequelize.js";
import { env } from "../config/env.js";
async function main() {
    console.log(`[smoke] SQL_DIALECT=${env.sqlDialect} schema=${env.sqlServerSchema}`);
    console.log(`[smoke] target ${env.sqlServerHost}/${env.sqlServerDatabase}`);
    const sequelize = getSequelize();
    await sequelize.authenticate();
    const opp = await sequelize.query(`SELECT COUNT(1) AS total FROM ${env.sqlServerSchema}.ConstructionOpportunity WHERE isDeleted = 0`, { type: QueryTypes.SELECT });
    const photos = await sequelize.query(`SELECT COUNT(1) AS total FROM ${env.sqlServerSchema}.ConstructionOpportunityPhoto`, { type: QueryTypes.SELECT });
    console.log("[smoke] opportunities_active=", opp[0]?.total);
    console.log("[smoke] photos=", photos[0]?.total);
    console.log("[smoke] OK");
}
main()
    .catch((error) => {
    console.error("[smoke] FAIL", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await closeSequelize();
});

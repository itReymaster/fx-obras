/**
 * SQL Server 2008 R2 DATETIME nao aceita offset (ex.: -03:00).
 * Converte Date/string para 'yyyy-mm-dd HH:mm:ss.mmm' em UTC.
 */
export const toSqlDate = (value) => {
    if (value == null)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return date.toISOString().slice(0, 23).replace("T", " ");
};
export const sanitizeSqlReplacements = (replacements) => {
    if (!replacements)
        return replacements;
    const out = {};
    for (const [key, value] of Object.entries(replacements)) {
        out[key] = value instanceof Date ? toSqlDate(value) : value;
    }
    return out;
};

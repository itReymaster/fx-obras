import { AppError } from "../errors/app-error.js";
const decodeToken = (token) => {
    try {
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        return decoded.split(":").map((part) => part.trim()).filter(Boolean);
    }
    catch {
        return [];
    }
};
const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader)
        return null;
    const [scheme, token] = authorizationHeader.trim().split(/\s+/);
    if (!scheme || !token)
        return null;
    if (scheme.toLowerCase() !== "bearer")
        return null;
    return token;
};
export const requireAuthenticatedUser = (req, res, next) => {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
        throw new AppError("Token de autenticação ausente.", 401);
    }
    const parts = decodeToken(token);
    const username = parts[0];
    if (!username) {
        throw new AppError("Token de autenticação inválido.", 401);
    }
    res.locals.authenticatedUser = username;
    next();
};

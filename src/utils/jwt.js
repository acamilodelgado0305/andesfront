// src/utils/jwt.js
// JWT payloads are base64url-encoded (uses "-"/"_" instead of "+"/"/" and has
// no padding). Plain atob() only understands standard base64, so it throws on
// any token whose payload bytes happen to produce a "-" or "_" — which is
// effectively random per-token. That made session restore succeed or fail
// unpredictably depending on token content instead of on actual expiry.
export const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null;
  }
};

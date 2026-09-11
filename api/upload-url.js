import { issueSignedToken, presignUrl } from "@vercel/blob";

function sanitizeFileName(name) {
  return String(name || "archivo")
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g, "_")
    .slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "Vercel Blob no está configurado correctamente."
      });
    }

    const {
      name,
      type
    } = req.body || {};

    if (!name) {
      return res.status(400).json({
        error: "Falta el nombre del archivo."
      });
    }

    const safeName = sanitizeFileName(name);

    const pathname =
      `sources/${Date.now()}-${safeName}`;

    // ======================================================
    // CREAR TOKEN FIRMADO PARA SUBIR UN ÚNICO ARCHIVO
    // ======================================================

    const token = await issueSignedToken({
      pathname,
      operations: ["put"]
    });

    // ======================================================
    // CREAR URL TEMPORAL DE SUBIDA
    // ======================================================

    const {
      presignedUrl
    } = await presignUrl(token, {
      pathname,
      operation: "put",
      validUntil:
        Date.now() + 15 * 60 * 1000
    });

    return res.status(200).json({
      uploadUrl: presignedUrl,
      pathname,
      name: safeName,
      type: type || "application/octet-stream"
    });

  } catch (error) {
    console.error(
      "Upload URL error:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo generar la URL de subida.",
      details:
        error?.message || String(error)
    });
  }
}

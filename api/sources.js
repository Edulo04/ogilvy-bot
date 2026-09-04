import { put, list, del } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    // Verificar que Vercel Blob esté conectado
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "Vercel Blob no está configurado correctamente."
      });
    }

    // ==========================================
    // GET → Listar fuentes
    // ==========================================
    if (req.method === "GET") {
      const result = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        prefix: "sources/"
      });

      const sources = result.blobs.map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }));

      return res.status(200).json({
        sources
      });
    }

    // ==========================================
    // POST → Crear una fuente de texto
    // ==========================================
    if (req.method === "POST") {
      const { name, content, type } = req.body || {};

      if (!name || !content) {
        return res.status(400).json({
          error: "Faltan datos. Se necesita name y content."
        });
      }

      const safeName = String(name)
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g, "_")
        .slice(0, 100);

      const sourceType = type || "txt";

      const blob = await put(
        `sources/${Date.now()}-${safeName}`,
        content,
        {
          access: "private",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
          contentType: "text/plain; charset=utf-8"
        }
      );

      return res.status(201).json({
        message: "Fuente guardada correctamente.",
        source: {
          url: blob.url,
          pathname: blob.pathname,
          name: safeName,
          type: sourceType,
          size: blob.size,
          uploadedAt: blob.uploadedAt
        }
      });
    }

    // ==========================================
    // DELETE → Eliminar una fuente
    // ==========================================
    if (req.method === "DELETE") {
      const { pathname } = req.body || {};

      if (!pathname) {
        return res.status(400).json({
          error: "Falta el pathname de la fuente."
        });
      }

      if (!pathname.startsWith("sources/")) {
        return res.status(400).json({
          error: "Fuente no válida."
        });
      }

      await del(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      return res.status(200).json({
        message: "Fuente eliminada correctamente."
      });
    }

    // Método no permitido
    return res.status(405).json({
      error: "Método no permitido."
    });

  } catch (error) {
    console.error("Sources API error:", error);

    return res.status(500).json({
      error: "No se pudo procesar la fuente.",
      details: error.message
    });
  }
}

import { put, list, del, get } from "@vercel/blob";

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "Vercel Blob no está configurado correctamente."
      });
    }

    // =========================
    // OBTENER FUENTES
    // =========================
    if (req.method === "GET") {
      const result = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        prefix: "sources/"
      });

      const sources = [];

      for (const blob of result.blobs) {
        try {
          const fileResult = await get(blob.pathname, {
            access: "private",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            useCache: false
          });

          let content = "";

          if (fileResult && fileResult.statusCode === 200) {
            const chunks = [];

            for await (const chunk of fileResult.stream) {
              chunks.push(Buffer.from(chunk));
            }

            content = Buffer.concat(chunks).toString("utf-8");
          }

          // Recuperar el nombre original desde el pathname
          let name = blob.pathname.replace(/^sources\/\d+-/, "");

          // Convertir los "_" usados para nombres inválidos nuevamente
          name = name.replace(/_/g, " ");

          sources.push({
            url: blob.url,
            pathname: blob.pathname,
            name,
            content,
            size: blob.size,
            uploadedAt: blob.uploadedAt
          });

        } catch (error) {
          console.error(
            "Error leyendo fuente:",
            blob.pathname,
            error
          );

          sources.push({
            url: blob.url,
            pathname: blob.pathname,
            name: blob.pathname.replace(/^sources\/\d+-/, ""),
            content: "",
            size: blob.size,
            uploadedAt: blob.uploadedAt
          });
        }
      }

      return res.status(200).json({
        sources
      });
    }

    // =========================
    // SUBIR FUENTE
    // =========================
    if (req.method === "POST") {
      const { name, content, type } = req.body || {};

      if (!name || !content) {
        return res.status(400).json({
          error: "Faltan datos. Se necesita name y content."
        });
      }

      const safeName = String(name)
        .replace(
          /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g,
          "_"
        )
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

    // =========================
    // ELIMINAR FUENTE
    // =========================
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

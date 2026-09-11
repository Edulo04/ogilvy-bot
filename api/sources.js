import { put, list, del, get } from "@vercel/blob";

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isBinaryFile(type) {
  return (
    type === "application/pdf" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type.startsWith("image/")
  );
}

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "Vercel Blob no está configurado correctamente."
      });
    }

    // ==========================================
    // GET - OBTENER TODAS LAS FUENTES
    // ==========================================
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
            const buffer = await streamToBuffer(fileResult.stream);

            const contentType =
              fileResult.headers?.get?.("content-type") ||
              blob.contentType ||
              "application/octet-stream";

            if (
              contentType.startsWith("image/")
            ) {
              content =
                `data:${contentType};base64,${buffer.toString("base64")}`;
            } else if (
              contentType === "text/plain" ||
              contentType.startsWith("text/")
            ) {
              content = buffer.toString("utf-8");
            } else {
              // PDF y DOCX se mantienen como archivo binario.
              content = "";
            }
          }

          let name = blob.pathname.replace(/^sources\/\d+-/, "");

          sources.push({
            url: blob.url,
            pathname: blob.pathname,
            name,
            content,
            type:
              blob.contentType ||
              "application/octet-stream",
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
            type:
              blob.contentType ||
              "application/octet-stream",
            size: blob.size,
            uploadedAt: blob.uploadedAt
          });
        }
      }

      return res.status(200).json({
        sources
      });
    }

    // ==========================================
    // POST - GUARDAR UNA NUEVA FUENTE
    // ==========================================
    if (req.method === "POST") {
      const {
        name,
        content,
        type
      } = req.body || {};

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

      const sourceType =
        type || "text/plain";

      let blobContent = content;

      // ==========================================
      // ARCHIVOS BINARIOS
      // PDF / DOCX / IMÁGENES
      // ==========================================
      if (isBinaryFile(sourceType)) {
        if (
          typeof content === "string" &&
          content.includes(";base64,")
        ) {
          const base64Data =
            content.split(";base64,")[1];

          blobContent = Buffer.from(
            base64Data,
            "base64"
          );
        } else {
          return res.status(400).json({
            error:
              "El archivo binario no tiene un formato válido."
          });
        }
      }

      const blob = await put(
        `sources/${Date.now()}-${safeName}`,
        blobContent,
        {
          access: "private",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
          contentType: sourceType
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
    // DELETE - ELIMINAR UNA FUENTE
    // ==========================================
    if (req.method === "DELETE") {
      const {
        pathname
      } = req.body || {};

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
    console.error(
      "Sources API error:",
      error
    );

    return res.status(500).json({
      error: "No se pudo procesar la fuente.",
      details:
        error?.message || String(error)
    });
  }
}

import { put, list, del, get } from "@vercel/blob";

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isTextFile(type) {
  const value = String(type || "").toLowerCase();

  return (
    value === "txt" ||
    value === "text/plain" ||
    value.startsWith("text/") ||
    value === "url"
  );
}

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error:
          "Vercel Blob no está configurado correctamente."
      });
    }

    // ======================================================
    // GET
    // CARGAR LISTA DE FUENTES
    // ======================================================

    if (req.method === "GET") {
      const result = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        prefix: "sources/"
      });

      const sources = [];

      for (const blob of result.blobs) {
        try {
          let content = "";

          const contentType =
            blob.contentType ||
            "application/octet-stream";

          // ------------------------------------------------
          // SOLO LEEMOS EL CONTENIDO DE ARCHIVOS DE TEXTO
          // ------------------------------------------------
          //
          // PDF, DOCX e imágenes NO se convierten a Base64
          // aquí porque pueden ser archivos grandes.
          //
          // api/chat.js los leerá directamente desde Blob
          // utilizando su pathname.
          // ------------------------------------------------

          if (isTextFile(contentType)) {
            const fileResult = await get(
              blob.pathname,
              {
                access: "private",
                token:
                  process.env.BLOB_READ_WRITE_TOKEN,
                useCache: false
              }
            );

            if (
              fileResult &&
              fileResult.statusCode === 200
            ) {
              const buffer =
                await streamToBuffer(
                  fileResult.stream
                );

              content =
                buffer.toString("utf-8");
            }
          }

          const name =
            blob.pathname.replace(
              /^sources\/\d+-/,
              ""
            );

          sources.push({
            url: blob.url,
            pathname: blob.pathname,
            name,
            content,
            type: contentType,
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
            name:
              blob.pathname.replace(
                /^sources\/\d+-/,
                ""
              ),
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

    // ======================================================
    // POST
    // GUARDAR TXT O URL
    // ======================================================

    if (req.method === "POST") {
      const {
        name,
        content,
        type
      } = req.body || {};

      if (!name || !content) {
        return res.status(400).json({
          error:
            "Faltan datos. Se necesita name y content."
        });
      }

      const safeName = String(name)
        .replace(
          /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g,
          "_"
        )
        .slice(0, 100);

      let sourceType =
        type || "text/plain";

      // Para TXT utilizamos un MIME válido.
      if (sourceType === "txt") {
        sourceType = "text/plain";
      }

      const blob = await put(
        `sources/${Date.now()}-${safeName}`,
        content,
        {
          access: "private",
          token:
            process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
          contentType: sourceType
        }
      );

      return res.status(201).json({
        message:
          "Fuente guardada correctamente.",
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

    // ======================================================
    // DELETE
    // ELIMINAR FUENTE
    // ======================================================

    if (req.method === "DELETE") {
      const {
        pathname
      } = req.body || {};

      if (!pathname) {
        return res.status(400).json({
          error:
            "Falta el pathname de la fuente."
        });
      }

      if (!pathname.startsWith("sources/")) {
        return res.status(400).json({
          error:
            "Fuente no válida."
        });
      }

      await del(
        pathname,
        {
          token:
            process.env.BLOB_READ_WRITE_TOKEN
        }
      );

      return res.status(200).json({
        message:
          "Fuente eliminada correctamente."
      });
    }

    return res.status(405).json({
      error:
        "Método no permitido."
    });

  } catch (error) {
    console.error(
      "Sources API error:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo procesar la fuente.",
      details:
        error?.message ||
        String(error)
    });
  }
}

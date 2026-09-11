import { put, list, del, get } from "@vercel/blob";

export default async function handler(req, res) {
  try {

    // ======================================================
    // VERIFICAR VERCEL BLOB
    // ======================================================

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: "Vercel Blob no está configurado correctamente."
      });
    }


    // ======================================================
    // OBTENER FUENTES
    // ======================================================

    if (req.method === "GET") {

      const result = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
        prefix: "sources/"
      });


      const sources = [];


      for (const blob of result.blobs) {

        try {

          const fileResult = await get(
            blob.pathname,
            {
              access: "private",
              token: process.env.BLOB_READ_WRITE_TOKEN,
              useCache: false
            }
          );


          let content = "";
          let contentType = blob.contentType || "text/plain";


          if (fileResult) {

            contentType =
              fileResult.blob?.contentType ||
              blob.contentType ||
              "text/plain";


            const chunks = [];


            for await (const chunk of fileResult.stream) {
              chunks.push(Buffer.from(chunk));
            }


            const buffer = Buffer.concat(chunks);


            // ==================================================
            // IMÁGENES
            // ==================================================

            if (contentType.startsWith("image/")) {

              content =
                `data:${contentType};base64,${buffer.toString("base64")}`;

            }

            // ==================================================
            // ARCHIVOS DE TEXTO
            // ==================================================

            else {

              content = buffer.toString("utf-8");

            }

          }


          // ==================================================
          // RECUPERAR NOMBRE
          // ==================================================

          let name = blob.pathname.replace(
            /^sources\/\d+-/,
            ""
          );


          // Los espacios fueron reemplazados por "_"
          name = name.replace(/_/g, " ");


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


          let name = blob.pathname.replace(
            /^sources\/\d+-/,
            ""
          );


          name = name.replace(/_/g, " ");


          sources.push({

            url: blob.url,

            pathname: blob.pathname,

            name,

            content: "",

            type: blob.contentType || "text/plain",

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
    // SUBIR FUENTE
    // ======================================================

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


      // ==================================================
      // LIMPIAR NOMBRE
      // ==================================================

      const safeName = String(name)
        .replace(
          /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g,
          "_"
        )
        .slice(0, 100);


      const sourceType =
        type || "text/plain";


      // ==================================================
      // DETERMINAR CONTENT TYPE
      // ==================================================

      let contentType = "text/plain; charset=utf-8";


      if (
        String(sourceType)
          .toLowerCase()
          .startsWith("image/")
      ) {

        contentType = sourceType;

      }


      // ==================================================
      // IMAGEN
      // ==================================================

      if (
        String(sourceType)
          .toLowerCase()
          .startsWith("image/")
      ) {

        try {

          // ------------------------------------------------
          // El navegador envía:
          // data:image/png;base64,AAAA...
          // ------------------------------------------------

          const base64Data = String(content).includes(",")
            ? String(content).split(",")[1]
            : String(content);


          const imageBuffer =
            Buffer.from(base64Data, "base64");


          const blob = await put(
            `sources/${Date.now()}-${safeName}`,
            imageBuffer,
            {
              access: "private",
              token: process.env.BLOB_READ_WRITE_TOKEN,
              addRandomSuffix: false,
              contentType
            }
          );


          return res.status(201).json({

            message:
              "Imagen guardada correctamente.",

            source: {

              url: blob.url,

              pathname: blob.pathname,

              name: safeName,

              type: sourceType,

              size: blob.size,

              uploadedAt: blob.uploadedAt

            }

          });


        } catch (error) {

          console.error(
            "Error guardando imagen:",
            error
          );


          return res.status(500).json({

            error:
              "No se pudo guardar la imagen.",

            details:
              error.message

          });

        }

      }


      // ==================================================
      // TXT / OTRAS FUENTES DE TEXTO
      // ==================================================

      const blob = await put(
        `sources/${Date.now()}-${safeName}`,
        content,
        {
          access: "private",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
          contentType
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
    // ELIMINAR FUENTE
    // ======================================================

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


      await del(
        pathname,
        {
          token: process.env.BLOB_READ_WRITE_TOKEN
        }
      );


      return res.status(200).json({

        message:
          "Fuente eliminada correctamente."

      });

    }


    // ======================================================
    // MÉTODO NO PERMITIDO
    // ======================================================

    return res.status(405).json({
      error: "Método no permitido."
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
        error.message

    });

  }
}

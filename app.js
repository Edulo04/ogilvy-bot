const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#question");

const storageKey = "ogilvy-bot-history-v3";

let sources = [];


/* =========================================================
   UTILIDADES
   ========================================================= */

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}


function formatDate(date) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString("es-PY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return "";
  }
}


/* =========================================================
   CHAT
   ========================================================= */

function addMessage(text, role, reference = "") {
  const row = document.createElement("article");

  row.className = `message ${role}`;

  const avatar = document.createElement("div");

  avatar.className = "avatar";

  avatar.textContent =
    role === "assistant"
      ? "O"
      : "Tú";

  const bubble = document.createElement("div");

  bubble.className = "bubble";

  const paragraph = document.createElement("p");

  paragraph.textContent = text;

  bubble.append(paragraph);

  if (reference) {
    const source = document.createElement("span");

    source.className = "reference";

    source.textContent = `Referencia: ${reference}`;

    bubble.append(source);
  }

  row.append(avatar, bubble);

  messages.append(row);

  messages.scrollTop = messages.scrollHeight;
}


function addLoadingMessage() {
  const row = document.createElement("article");

  row.className = "message assistant";

  row.dataset.loading = "true";

  row.innerHTML = `
    <div class="avatar">O</div>
    <div class="bubble">
      <p>Estoy buscando información en las fuentes...</p>
    </div>
  `;

  messages.append(row);

  messages.scrollTop = messages.scrollHeight;

  return row;
}


/* =========================================================
   HISTORIAL
   ========================================================= */

function saveHistory() {
  localStorage.setItem(
    storageKey,
    messages.innerHTML
  );
}


function restoreHistory() {
  const history = localStorage.getItem(storageKey);

  if (history) {
    messages.innerHTML = history;
    return;
  }

  addMessage(
    "¡Hola! Soy Ogilvy Bot. Ahora puedo utilizar fuentes de conocimiento cargadas por el administrador para ayudarte a estudiar Marketing.",
    "assistant",
    "Fuentes de conocimiento"
  );

  saveHistory();
}


/* =========================================================
   FUENTES DE CONOCIMIENTO
   ========================================================= */

async function loadSources() {
  try {
    const response = await fetch("/api/sources");

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "No se pudieron cargar las fuentes."
      );
    }

    sources = Array.isArray(result.sources)
      ? result.sources
      : [];

    renderSources();

  } catch (error) {
    console.error("Error cargando fuentes:", error);

    sources = [];

    renderSources();
  }
}


function renderSources() {
  const sourceList =
    document.querySelector("#source-list");

  const managerList =
    document.querySelector("#manager-source-list");

  const sourceCount =
    document.querySelector("#source-count");

  const managerCount =
    document.querySelector("#manager-source-count");


  if (sourceCount) {
    sourceCount.textContent = sources.length;
  }

  if (managerCount) {
    managerCount.textContent = sources.length;
  }


  /* -----------------------------------------
     LISTA PEQUEÑA DEL SIDEBAR
     ----------------------------------------- */

  if (sourceList) {

    if (!sources.length) {

      sourceList.innerHTML = `
        <div class="source-empty">
          <span class="source-empty-icon">📚</span>

          <p>
            Todavía no hay fuentes cargadas.
          </p>

          <small>
            Agrega material de estudio para mejorar las respuestas.
          </small>
        </div>
      `;

    } else {

      sourceList.innerHTML = sources
        .slice(0, 4)
        .map(source => {

          const name =
            source.name ||
            source.pathname?.split("/").pop() ||
            "Fuente";

          return `
            <div class="manager-source-item">

              <div class="manager-source-info">

                <span class="manager-source-name">
                  📄 ${escapeHTML(name)}
                </span>

                <span class="manager-source-meta">
                  Fuente activa
                </span>

              </div>

            </div>
          `;

        })
        .join("");
    }
  }


  /* -----------------------------------------
     LISTA DEL ADMINISTRADOR
     ----------------------------------------- */

  if (managerList) {

    if (!sources.length) {

      managerList.innerHTML = `
        <div class="source-empty">

          <span class="source-empty-icon">
            📚
          </span>

          <p>
            No hay fuentes cargadas.
          </p>

          <small>
            Las fuentes que agregues aparecerán aquí.
          </small>

        </div>
      `;

      return;
    }


    managerList.innerHTML = sources
      .map(source => {

        const name =
          source.name ||
          source.pathname?.split("/").pop() ||
          "Fuente";

        return `
          <div class="manager-source-item">

            <div class="manager-source-info">

              <span class="manager-source-name">
                📄 ${escapeHTML(name)}
              </span>

              <span class="manager-source-meta">
                ${formatFileSize(source.size)}
                ${source.uploadedAt
                  ? ` · ${formatDate(source.uploadedAt)}`
                  : ""}
              </span>

            </div>

            <button
              type="button"
              class="delete-source-button"
              data-delete-source="${escapeHTML(source.pathname)}"
            >
              Eliminar
            </button>

          </div>
        `;

      })
      .join("");


    managerList
      .querySelectorAll("[data-delete-source]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => deleteSource(
            button.dataset.deleteSource
          )
        );

      });
  }
}


/* =========================================================
   ELIMINAR FUENTE
   ========================================================= */

async function deleteSource(pathname) {

  const confirmed =
    window.confirm(
      "¿Seguro que querés eliminar esta fuente?"
    );

  if (!confirmed) return;


  try {

    const response = await fetch(
      "/api/sources",
      {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          pathname
        })
      }
    );


    const result =
      await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "No se pudo eliminar la fuente."
      );

    }


    await loadSources();

    showSourceStatus(
      "Fuente eliminada correctamente."
    );


  } catch (error) {

    console.error(error);

    showSourceStatus(
      error.message,
      true
    );

  }
}


/* =========================================================
   SUBIR TXT
   ========================================================= */

async function uploadTextFile(file) {

  if (!file) {

    showSourceStatus(
      "Seleccioná un archivo.",
      true
    );

    return;
  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  /*
   * Por ahora procesamos TXT directamente.
   *
   * PDF y DOCX los agregaremos en el siguiente paso
   * utilizando procesamiento en el servidor.
   */

  if (extension !== "txt") {

    showSourceStatus(
      "Por ahora la carga automática está preparada para TXT. PDF y DOCX se habilitarán en el siguiente paso.",
      true
    );

    return;
  }


  try {

    showSourceStatus(
      "Leyendo el documento..."
    );


    const content =
      await file.text();


    if (!content.trim()) {

      throw new Error(
        "El archivo está vacío."
      );

    }


    const response =
      await fetch(
        "/api/sources",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            name: file.name,

            content,

            type: "txt"

          })
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "No se pudo guardar la fuente."
      );

    }


    await loadSources();


    showSourceStatus(
      "Fuente agregada correctamente."
    );


    const fileInput =
      document.querySelector("#source-file");


    if (fileInput) {
      fileInput.value = "";
    }


  } catch (error) {

    console.error(error);

    showSourceStatus(
      error.message,
      true
    );

  }
}


/* =========================================================
   ESTADO DE FUENTES
   ========================================================= */

function showSourceStatus(
  message,
  isError = false
) {

  const status =
    document.querySelector("#source-status");


  if (!status) return;


  status.textContent = message;

  status.classList.remove(
    "hidden"
  );


  if (isError) {

    status.style.color = "#9a3838";

    status.style.background =
      "#fff1f1";

  } else {

    status.style.color = "#174a7b";

    status.style.background =
      "#eaf4fc";

  }
}


/* =========================================================
   VENTANA DE FUENTES
   ========================================================= */

const sourcesModal =
  document.querySelector(
    "#sources-modal"
  );


function openSourcesModal() {

  if (!sourcesModal) return;

  sourcesModal.classList.remove(
    "hidden"
  );

  sourcesModal.setAttribute(
    "aria-hidden",
    "false"
  );

  loadSources();
}


function closeSourcesModal() {

  if (!sourcesModal) return;

  sourcesModal.classList.add(
    "hidden"
  );

  sourcesModal.setAttribute(
    "aria-hidden",
    "true"
  );
}


const manageSourcesButton =
  document.querySelector(
    "#manage-sources"
  );


if (manageSourcesButton) {

  manageSourcesButton.addEventListener(
    "click",
    openSourcesModal
  );

}


const closeSourcesButton =
  document.querySelector(
    "#close-sources"
  );


if (closeSourcesButton) {

  closeSourcesButton.addEventListener(
    "click",
    closeSourcesModal
  );

}


const modalOverlay =
  document.querySelector(
    "#modal-overlay"
  );


if (modalOverlay) {

  modalOverlay.addEventListener(
    "click",
    closeSourcesModal
  );

}


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      sourcesModal &&
      !sourcesModal.classList.contains(
        "hidden"
      )
    ) {

      closeSourcesModal();

    }

  }
);


/* =========================================================
   BOTONES DE TIPO DE FUENTE
   ========================================================= */

document
  .querySelectorAll(
    "[data-source-type]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const type =
          button.dataset.sourceType;


        const fileForm =
          document.querySelector(
            "#file-source-form"
          );


        const urlForm =
          document.querySelector(
            "#url-source-form"
          );


        if (fileForm) {
          fileForm.classList.add(
            "hidden"
          );
        }


        if (urlForm) {
          urlForm.classList.add(
            "hidden"
          );
        }


        if (type === "file" && fileForm) {

          fileForm.classList.remove(
            "hidden"
          );

        }


        if (type === "url" && urlForm) {

          urlForm.classList.remove(
            "hidden"
          );

        }

      }
    );

  });


/* =========================================================
   BOTÓN SUBIR FUENTE
   ========================================================= */

const uploadButton =
  document.querySelector(
    "#upload-source"
  );


if (uploadButton) {

  uploadButton.addEventListener(
    "click",
    async () => {

      const fileInput =
        document.querySelector(
          "#source-file"
        );


      const file =
        fileInput?.files?.[0];


      await uploadTextFile(file);

    }
  );

}


/* =========================================================
   URL
   ========================================================= */

const addUrlButton =
  document.querySelector(
    "#add-url-source"
  );


if (addUrlButton) {

  addUrlButton.addEventListener(
    "click",
    async () => {

      showSourceStatus(
        "La incorporación de páginas web se habilitará en el siguiente paso."
      );

    }
  );

}


/* =========================================================
   CHAT → FUENTES
   ========================================================= */

function buildKnowledgeFromSources() {

  if (!sources.length) {

    return "No hay fuentes de conocimiento cargadas todavía.";

  }


  return sources
    .map(source => {

      const name =
        source.name ||
        source.pathname ||
        "Fuente";


      return `
FUENTE:
${name}

CONTENIDO:
${source.content || ""}

--------------------------------
      `;

    })
    .join("\n");

}


/*
 * Las fuentes guardadas actualmente son archivos almacenados
 * en Blob. En el siguiente paso agregaremos un endpoint para
 * recuperar el contenido de cada fuente de forma segura.
 */

async function askAI(question) {

  await loadSources();


  const knowledge =
    buildKnowledgeFromSources();


  const response =
    await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          question,
          knowledge
        })
      }
    );


  const result =
    await response.json();


  if (!response.ok) {

    throw new Error(
      result.error ||
      "No se pudo conectar con la IA."
    );

  }


  return result;
}


/* =========================================================
   HACER PREGUNTA
   ========================================================= */

async function ask(question) {

  const cleanQuestion =
    question.trim();


  if (!cleanQuestion) return;


  addMessage(
    cleanQuestion,
    "user"
  );


  const loading =
    addLoadingMessage();


  try {

    const result =
      await askAI(cleanQuestion);


    loading.remove();


    addMessage(
      result.answer,
      "assistant",
      result.reference ||
      "Ogilvy Bot"
    );


  } catch (error) {

    loading.remove();


    addMessage(
      "No pude consultar las fuentes en este momento. Verificá que existan fuentes de conocimiento cargadas y que el servidor esté funcionando.",
      "assistant",
      "Sistema de fuentes"
    );


    console.error(error);

  }


  saveHistory();

}


/* =========================================================
   FORMULARIO DEL CHAT
   ========================================================= */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const question =
      input.value;


    input.value = "";


    await ask(question);


    input.focus();

  }
);


/* =========================================================
   PREGUNTAS SUGERIDAS
   ========================================================= */

document
  .querySelectorAll(
    "[data-question]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        ask(
          button.dataset.question
        );

      }
    );

  });


/* =========================================================
   NUEVA CONVERSACIÓN
   ========================================================= */

const clearChat =
  document.querySelector(
    "#clear-chat"
  );


if (clearChat) {

  clearChat.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        storageKey
      );

      messages.innerHTML = "";

      restoreHistory();

    }
  );

}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

restoreHistory();

loadSources();

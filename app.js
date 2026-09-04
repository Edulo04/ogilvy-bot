const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#question");

const storageKey = "ogilvy-bot-history-v2";

let sources = [];

// ======================================================
// ELEMENTOS DE FUENTES
// ======================================================

const manageSourcesButton = document.querySelector("#manage-sources");
const sourcesModal = document.querySelector("#sources-modal");
const closeSourcesButton = document.querySelector("#close-sources");
const modalOverlay = document.querySelector("#modal-overlay");

const sourceCount = document.querySelector("#source-count");
const sourceList = document.querySelector("#source-list");

const managerSourceCount = document.querySelector("#manager-source-count");
const managerSourceList = document.querySelector("#manager-source-list");

const sourceOptions = document.querySelectorAll(".source-option");

const fileSourceForm = document.querySelector("#file-source-form");
const urlSourceForm = document.querySelector("#url-source-form");

const sourceFile = document.querySelector("#source-file");
const sourceUrl = document.querySelector("#source-url");

const uploadSourceButton = document.querySelector("#upload-source");
const addUrlSourceButton = document.querySelector("#add-url-source");

const sourceStatus = document.querySelector("#source-status");


// ======================================================
// UTILIDADES
// ======================================================

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ");
}


// ======================================================
// CHAT
// ======================================================

function addMessage(text, role, reference = "") {
  const row = document.createElement("article");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "O" : "Tú";

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
      <p>Estoy preparando una respuesta...</p>
    </div>
  `;

  messages.append(row);
  messages.scrollTop = messages.scrollHeight;

  return row;
}


// ======================================================
// HISTORIAL
// ======================================================

function saveHistory() {
  localStorage.setItem(storageKey, messages.innerHTML);
}


function restoreHistory() {
  const history = localStorage.getItem(storageKey);

  if (history) {
    messages.innerHTML = history;
    return;
  }

  addMessage(
    "¡Hola! Soy Ogilvy Bot. Puedo ayudarte a comprender Marketing utilizando el material de estudio cargado como fuente de conocimiento.",
    "assistant",
    "Ogilvy Bot"
  );

  saveHistory();
}


// ======================================================
// API DE GEMINI
// ======================================================

async function askAI(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question,
      knowledge: buildKnowledge()
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "No se pudo conectar con la IA."
    );
  }

  return result;
}


// ======================================================
// CONOCIMIENTO
// ======================================================

function buildKnowledge() {
  if (!sources.length) {
    return "No hay fuentes de conocimiento cargadas todavía.";
  }

  return sources
    .map((source) => {
      return [
        `Fuente: ${source.name || "Sin nombre"}`,
        `Tipo: ${source.type || "documento"}`,
        source.content || ""
      ].join("\n");
    })
    .join("\n\n------------------------------\n\n");
}


// ======================================================
// HACER PREGUNTA
// ======================================================

async function ask(question) {
  const cleanQuestion = question.trim();

  if (!cleanQuestion) {
    return;
  }

  addMessage(cleanQuestion, "user");

  const loading = addLoadingMessage();

  try {
    const result = await askAI(cleanQuestion);

    loading.remove();

    addMessage(
      result.answer,
      "assistant",
      result.reference || "Fuentes de conocimiento"
    );

  } catch (error) {
    loading.remove();

    addMessage(
      "No pude generar la respuesta en este momento. Verifica que la conexión con Gemini esté funcionando.",
      "assistant",
      "Ogilvy Bot"
    );

    console.error(error);
  }

  saveHistory();
}


// ======================================================
// CARGAR FUENTES DESDE VERCEL
// ======================================================

async function loadSources() {
  try {
    const response = await fetch("/api/sources");

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "No se pudieron cargar las fuentes."
      );
    }

    sources = result.sources || [];

    renderSources();

  } catch (error) {
    console.error("Error cargando fuentes:", error);

    sources = [];

    renderSources();
  }
}


// ======================================================
// MOSTRAR FUENTES
// ======================================================

function renderSources() {
  sourceCount.textContent = sources.length;
  managerSourceCount.textContent = sources.length;

  // ----------------------------------------------------
  // SIDEBAR
  // ----------------------------------------------------

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
      .map((source) => {

        return `
          <div class="unit-item">
            <span class="unit-number">
              ${getSourceIcon(source.type)}
            </span>

            <div>
              <strong>
                ${escapeHtml(source.name || "Fuente")}
              </strong>

              <small>
                ${escapeHtml(source.type || "Documento")}
              </small>
            </div>
          </div>
        `;

      })
      .join("");
  }


  // ----------------------------------------------------
  // ADMINISTRADOR
  // ----------------------------------------------------

  if (!sources.length) {

    managerSourceList.innerHTML = `
      <div class="source-empty">
        <span class="source-empty-icon">📚</span>

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


  managerSourceList.innerHTML = sources
    .map((source) => {

      return `
        <div class="manager-source-item">

          <div class="manager-source-info">

            <span class="manager-source-name">
              ${escapeHtml(source.name || "Fuente")}
            </span>

            <span class="manager-source-meta">
              ${escapeHtml(source.type || "Documento")}
              ·
              ${formatDate(source.uploadedAt)}
            </span>

          </div>

          <button
            type="button"
            class="delete-source-button"
            data-pathname="${escapeAttribute(source.pathname)}"
          >
            Eliminar
          </button>

        </div>
      `;

    })
    .join("");


  document
    .querySelectorAll(".delete-source-button")
    .forEach((button) => {

      button.addEventListener("click", () => {
        deleteSource(button.dataset.pathname);
      });

    });
}


// ======================================================
// ICONO DE FUENTE
// ======================================================

function getSourceIcon(type) {

  const value = String(type || "").toLowerCase();

  if (value === "pdf") {
    return "PDF";
  }

  if (value === "docx") {
    return "DOC";
  }

  if (value === "url") {
    return "WEB";
  }

  return "TXT";
}


// ======================================================
// FECHA
// ======================================================

function formatDate(value) {

  if (!value) {
    return "Fecha desconocida";
  }

  try {

    return new Date(value).toLocaleDateString(
      "es-PY",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );

  } catch {
    return "Fecha desconocida";
  }
}


// ======================================================
// SEGURIDAD HTML
// ======================================================

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


// ======================================================
// ABRIR MODAL
// ======================================================

function openSourcesModal() {

  sourcesModal.classList.remove("hidden");

  sourcesModal.setAttribute(
    "aria-hidden",
    "false"
  );

  loadSources();
}


// ======================================================
// CERRAR MODAL
// ======================================================

function closeSourcesModal() {

  sourcesModal.classList.add("hidden");

  sourcesModal.setAttribute(
    "aria-hidden",
    "true"
  );
}


// ======================================================
// SELECCIÓN DOCUMENTO / URL
// ======================================================

function selectSourceType(type) {

  if (type === "file") {

    fileSourceForm.classList.remove("hidden");
    urlSourceForm.classList.add("hidden");

  }

  if (type === "url") {

    urlSourceForm.classList.remove("hidden");
    fileSourceForm.classList.add("hidden");

  }
}


// ======================================================
// MOSTRAR ESTADO
// ======================================================

function showStatus(message) {

  sourceStatus.textContent = message;
  sourceStatus.classList.remove("hidden");

}


function hideStatus() {

  sourceStatus.textContent = "";
  sourceStatus.classList.add("hidden");

}


// ======================================================
// SUBIR ARCHIVO
// ======================================================

async function uploadSource() {

  const file = sourceFile.files[0];

  if (!file) {

    showStatus(
      "Selecciona primero un archivo."
    );

    return;
  }


  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();


  // Por ahora solo TXT
  if (extension !== "txt") {

    showStatus(
      "Por ahora esta versión permite cargar archivos TXT. PDF y DOCX los habilitaremos en el siguiente paso."
    );

    return;
  }


  try {

    uploadSourceButton.disabled = true;

    showStatus(
      "Leyendo el archivo..."
    );


    const content = await file.text();


    if (!content.trim()) {

      showStatus(
        "El archivo está vacío."
      );

      return;
    }


    showStatus(
      "Guardando la fuente..."
    );


    const response = await fetch(
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


    const result = await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "No se pudo guardar la fuente."
      );
    }


    showStatus(
      "Fuente guardada correctamente."
    );


    sourceFile.value = "";

    await loadSources();


    setTimeout(() => {
      hideStatus();
    }, 1500);


  } catch (error) {

    console.error(error);

    showStatus(
      error.message ||
      "No se pudo subir la fuente."
    );

  } finally {

    uploadSourceButton.disabled = false;

  }
}


// ======================================================
// AGREGAR URL
// ======================================================

async function addUrlSource() {

  const url = sourceUrl.value.trim();

  if (!url) {

    showStatus(
      "Escribe una URL."
    );

    return;
  }


  try {

    addUrlSourceButton.disabled = true;

    showStatus(
      "Guardando la página..."
    );


    const response = await fetch(
      "/api/sources",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name: url,
          content: `Fuente web: ${url}`,
          type: "url"
        })
      }
    );


    const result = await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "No se pudo guardar la URL."
      );
    }


    sourceUrl.value = "";

    showStatus(
      "URL guardada correctamente."
    );


    await loadSources();


    setTimeout(() => {
      hideStatus();
    }, 1500);


  } catch (error) {

    console.error(error);

    showStatus(
      error.message ||
      "No se pudo agregar la página."
    );

  } finally {

    addUrlSourceButton.disabled = false;

  }
}


// ======================================================
// ELIMINAR FUENTE
// ======================================================

async function deleteSource(pathname) {

  const confirmed = confirm(
    "¿Seguro que quieres eliminar esta fuente?"
  );

  if (!confirmed) {
    return;
  }


  try {

    showStatus(
      "Eliminando fuente..."
    );


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


    const result = await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "No se pudo eliminar la fuente."
      );
    }


    showStatus(
      "Fuente eliminada correctamente."
    );


    await loadSources();


    setTimeout(() => {
      hideStatus();
    }, 1500);


  } catch (error) {

    console.error(error);

    showStatus(
      error.message ||
      "No se pudo eliminar la fuente."
    );

  }
}


// ======================================================
// EVENTOS DEL ADMINISTRADOR
// ======================================================

if (manageSourcesButton) {

  manageSourcesButton.addEventListener(
    "click",
    openSourcesModal
  );

}


if (closeSourcesButton) {

  closeSourcesButton.addEventListener(
    "click",
    closeSourcesModal
  );

}


if (modalOverlay) {

  modalOverlay.addEventListener(
    "click",
    closeSourcesModal
  );

}


sourceOptions.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      selectSourceType(
        button.dataset.sourceType
      );

    }
  );

});


if (uploadSourceButton) {

  uploadSourceButton.addEventListener(
    "click",
    uploadSource
  );

}


if (addUrlSourceButton) {

  addUrlSourceButton.addEventListener(
    "click",
    addUrlSource
  );

}


// ======================================================
// TECLA ESC PARA CERRAR
// ======================================================

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      !sourcesModal.classList.contains("hidden")
    ) {

      closeSourcesModal();

    }

  }
);


// ======================================================
// CHAT
// ======================================================

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const question = input.value;

    input.value = "";

    await ask(question);

    input.focus();

  }
);


document
  .querySelectorAll("[data-question]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        ask(button.dataset.question);

      }
    );

  });


document
  .querySelector("#clear-chat")
  .addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        storageKey
      );

      messages.innerHTML = "";

      restoreHistory();

    }
  );


// ======================================================
// INICIO
// ======================================================

restoreHistory();

loadSources();

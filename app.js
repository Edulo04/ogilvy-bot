const knowledge = [
  { unit: "Unidad VI", topics: ["orientacion produccion", "produccion disponibilidad precio bajo"], answer: "La orientación a la producción sostiene que los consumidores prefieren productos ampliamente disponibles y de bajo precio. Por eso, la empresa prioriza eficiencia, disponibilidad y costos.", label: "Orientación a la producción" },
  { unit: "Unidad VI", topics: ["orientacion producto calidad rendimiento caracteristicas innovadoras"], answer: "La orientación al producto parte de que los consumidores prefieren productos con mayor calidad, rendimiento o características innovadoras. Su foco principal está en mejorar la oferta.", label: "Orientación al producto" },
  { unit: "Unidad VI", topics: ["orientacion ventas vender venta promocion"], answer: "La orientación a las ventas plantea que consumidores y empresas no comprarán lo suficiente si la organización no realiza esfuerzos intensos de venta y promoción.", label: "Orientación a las ventas" },
  { unit: "Unidad VI", topics: ["marketing mercado cliente comprador necesidad vendedor ventas diferencia"], answer: "La orientación al mercado es una filosofía centrada en el cliente: busca los productos adecuados para los clientes, en vez de buscar clientes para los productos. La venta se centra en las necesidades del vendedor; el marketing, en las del comprador.", label: "Marketing orientado al mercado" },
  { unit: "Unidad VI", topics: ["reactivo proactivo necesidades expresadas latentes innovacion"], answer: "El marketing reactivo atiende y satisface necesidades expresadas por los consumidores. El marketing proactivo busca innovar al centrarse en sus necesidades latentes, es decir, las que aún no expresan claramente.", label: "Marketing reactivo y proactivo" },
  { unit: "Unidad VII", topics: ["rendimiento medir medicion cuota mercado perdida clientes satisfaccion calidad indicadores"], answer: "El rendimiento del marketing se evalúa con resultados financieros y no financieros. Las unidades mencionan: cuota de mercado, tasa de pérdida de clientes, satisfacción de clientes, calidad del producto y efectos legales, éticos, sociales y ambientales.", label: "Rendimiento del marketing" },
  { unit: "Unidad VII", topics: ["responsabilidad financiera rentabilidad inversion marca base clientes"], answer: "La responsabilidad financiera exige que marketing justifique sus inversiones en términos de rentabilidad, además de demostrar cómo fortalece la marca y aumenta la base de clientes.", label: "Responsabilidad financiera" },
  { unit: "Unidad VII", topics: ["marketing social responsable responsabilidad social etica ambiental legal sociedad"], answer: "El marketing socialmente responsable busca satisfacer al consumidor y, a la vez, objetivos deseables para la sociedad. Considera las consecuencias éticas, ambientales, legales y sociales de las actividades de marketing.", label: "Marketing socialmente responsable" },
  { unit: "Unidad VII", topics: ["marketing relacional relaciones clientes empleados socios comunidad financiera red marketing"], answer: "El marketing relacional desarrolla relaciones profundas y duraderas con actores que afectan el éxito de la empresa: clientes, empleados, socios de marketing y comunidad financiera. El resultado es una red de marketing que genera relaciones rentables para las partes.", label: "Marketing relacional" },
  { unit: "Unidad VII", topics: ["marketing integrado actividades programas valor comunicaciones productos servicios canales"], answer: "El marketing integrado diseña actividades y programas que crean, comunican y entregan valor al cliente. Su idea es que el conjunto coordinado de productos, comunicaciones y canales produce más valor que acciones aisladas.", label: "Marketing integrado" },
  { unit: "Unidad VII", topics: ["marketing interno empleados contratar capacitar motivar servicio"], answer: "El marketing interno consiste en contratar, capacitar y motivar a las personas adecuadas para que atiendan bien a los clientes. No tiene sentido prometer un servicio excelente si el personal no está preparado para brindarlo.", label: "Marketing interno" },
  { unit: "Unidad VII", topics: ["marketing holistico holistico cuatro componentes relaciones integrado interno responsable"], answer: "El marketing holístico reconoce que todo importa y que las actividades de marketing son interdependientes. Sus cuatro componentes principales son: marketing de relaciones, marketing integrado, marketing interno y marketing socialmente responsable.", label: "Marketing holístico" },
  { unit: "Unidad VII", topics: ["dayketing warketing neuromarketing inbound marketing atraccion tendencias"], answer: "Las tendencias presentadas incluyen dayketing (aprovechar acontecimientos diarios), warketing (actuar con iniciativa en un entorno competitivo), neuromarketing (aplicar avances de neurociencia al marketing) e inbound marketing o marketing de atracción (coordinar marketing social, SEO y contenidos).", label: "Tendencias actuales" }
];

const messages = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#question");
const storageKey = "ogilvy-bot-history-v2";

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ\s]/g, " ");
}

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

function bestAnswer(question) {
  const words = new Set(normalize(question).split(/\s+/).filter(word => word.length > 2));
  let best = null;
  let score = 0;
  knowledge.forEach(item => {
    const itemWords = normalize(item.topics.join(" ")).split(/\s+/);
    const matches = itemWords.filter(word => words.has(word)).length;
    if (matches > score) { score = matches; best = item; }
  });
  if (!best || score === 0) return { answer: "No encontré una respuesta directa en las Unidades VI y VII. Prueba mencionar un concepto, por ejemplo: orientación al mercado, marketing holístico, rendimiento, marketing relacional o inbound marketing.", label: "Material disponible" };
  return best;
}

function getKnowledge() {
  return knowledge.map(item => `${item.unit}\nTema: ${item.label}\n${item.answer}`).join("\n\n---\n\n");
}

function saveHistory() { localStorage.setItem(storageKey, messages.innerHTML); }
function restoreHistory() {
  const history = localStorage.getItem(storageKey);
  if (history) { messages.innerHTML = history; return; }
  addMessage("¡Hola! Soy Ogilvy Bot. Puedo ayudarte a comprender Marketing con las Unidades VI y VII como base de estudio.", "assistant", "Unidades VI y VII");
  saveHistory();
}

async function askAI(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, knowledge: getKnowledge() })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo conectar con la IA.");
  return result;
}

function addLoadingMessage() {
  const row = document.createElement("article");
  row.className = "message assistant";
  row.dataset.loading = "true";
  row.innerHTML = '<div class="avatar">O</div><div class="bubble"><p>Estoy preparando una respuesta...</p></div>';
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

async function ask(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addMessage(cleanQuestion, "user");
  const loading = addLoadingMessage();
  try {
    const result = await askAI(cleanQuestion);
    loading.remove();
    addMessage(result.answer, "assistant", result.reference || "Ogilvy Bot");
  } catch (error) {
    loading.remove();
    const fallback = bestAnswer(cleanQuestion);
    addMessage(fallback.answer, "assistant", `${fallback.unit || "Unidades VI y VII"}: ${fallback.label}`);
    console.error(error);
  }
  saveHistory();
}

form.addEventListener("submit", async event => { event.preventDefault(); const question = input.value; input.value = ""; await ask(question); input.focus(); });
document.querySelectorAll("[data-question]").forEach(button => button.addEventListener("click", () => ask(button.dataset.question)));
document.querySelector("#clear-chat").addEventListener("click", () => { localStorage.removeItem(storageKey); messages.innerHTML = ""; restoreHistory(); });
restoreHistory();

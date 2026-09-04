# Ogilvy Bot

Chatbot web de estudio de Marketing para las Unidades VI y VII. Es un sitio estático: no utiliza rutas de la computadora, servidor, API ni instalaciones externas.

## Uso

1. Abre `index.html` en un navegador.
2. Escribe una pregunta sobre las orientaciones de marketing, rendimiento, marketing holístico o tendencias.
3. La respuesta muestra la unidad y el concepto del que procede.

No necesita instalar dependencias ni usar una clave de API. El historial se guarda únicamente en el navegador del usuario y se puede borrar desde **Nueva conversación**.

## Publicación y modos de respuesta

El chatbot funciona en GitHub Pages con las respuestas basadas en las Unidades VI y VII. Si el servidor de Gemini no está disponible, utiliza automáticamente esa base de estudio local.

Para habilitar Gemini y Google Search, se debe desplegar en Vercel.

1. Sube el repositorio a GitHub sin ningún archivo `.env`.
2. En [Vercel](https://vercel.com), selecciona **Add New → Project** e importa el repositorio `ogilvy-bot`.
3. En **Environment Variables**, agrega `GEMINI_API_KEY` con una clave nueva creada en Google AI Studio.
4. Presiona **Deploy**. Vercel proporcionará el enlace público del chatbot con respuestas generadas por IA.

El archivo `.env.example` solo indica el nombre de la variable necesaria; no contiene una clave real.

## Contenido incorporado

- Unidad VI: orientaciones a la producción, producto, ventas y mercado; marketing reactivo y proactivo.
- Unidad VII: rendimiento, responsabilidad financiera, marketing socialmente responsable, relacional, integrado, interno y holístico; dayketing, warketing, neuromarketing e inbound marketing.

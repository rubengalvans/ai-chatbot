import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();

const messages = Array.isArray(body?.messages) ? body.messages : [];
const lastMessage = messages.length ? messages[messages.length - 1] : null;

function extractText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return [
      extractText(value.text),
      extractText(value.content),
      extractText(value.parts),
      extractText(value.input),
      extractText(value.message),
    ]
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

const userMessage =
  extractText(lastMessage) ||
  extractText(body?.message) ||
  extractText(body?.input);

    const response = await fetch(
      "https://maiadrea69.app.n8n.cloud/webhook/33481d2c-d70d-49bb-91d7-aa1e7579d439",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: "1597868333",
        }),
      }
    );

    const data = await response.json();

    const reply =
      data.reply ||
      data.response ||
      data.output ||
      "Sin respuesta desde n8n";

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute({ writer }) {
          writer.write({
            type: "text-start",
            id: "maia-response",
          });

          writer.write({
            type: "text-delta",
            id: "maia-response",
            delta: reply,
          });

          writer.write({
            type: "text-end",
            id: "maia-response",
          });
        },
      }),
    });
  } catch (error) {
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute({ writer }) {
          writer.write({
            type: "text-start",
            id: "maia-error",
          });

          writer.write({
            type: "text-delta",
            id: "maia-error",
            delta: `Error interno: ${
              error instanceof Error ? error.message : "desconocido"
            }`,
          });

          writer.write({
            type: "text-end",
            id: "maia-error",
          });
        },
      }),
    });
  }
}

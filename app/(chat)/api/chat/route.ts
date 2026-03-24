import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages = body?.messages || [];

    const lastUserMessage = [...messages].reverse().find(
      (m: any) => m?.role === "user"
    );

    let userMessage = "";

    if (typeof lastUserMessage?.content === "string") {
      userMessage = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage?.parts)) {
      userMessage = lastUserMessage.parts
        .map((part: any) => part?.text || "")
        .join(" ");
    } else if (Array.isArray(lastUserMessage?.content)) {
      userMessage = lastUserMessage.content
        .map((part: any) => part?.text || "")
        .join(" ");
    } else if (typeof body?.input === "string") {
      userMessage = body.input;
    } else if (typeof body?.message === "string") {
      userMessage = body.message;
    }

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

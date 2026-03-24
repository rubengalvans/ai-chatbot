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
    } else if (Array.isArray(lastUserMessage?.content)) {
      userMessage = lastUserMessage.content
        .map((part: any) => part?.text || "")
        .join(" ");
    } else if (Array.isArray(lastUserMessage?.parts)) {
      userMessage = lastUserMessage.parts
        .map((part: any) => part?.text || "")
        .join(" ");
    } else if (typeof body?.input === "string") {
      userMessage = body.input;
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

    if (!response.ok) {
      const text = await response.text();

      return Response.json({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error webhook n8n: ${response.status} ${text}`,
      });
    }

    const data = await response.json();

    return Response.json({
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        data.reply ||
        data.response ||
        data.output ||
        "Sin respuesta desde n8n",
    });
  } catch (error) {
    return Response.json({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Error interno: ${
        error instanceof Error ? error.message : "desconocido"
      }`,
    });
  }
}

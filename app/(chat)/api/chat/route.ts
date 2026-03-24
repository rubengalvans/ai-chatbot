export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages = body?.messages || [];
    const last = messages[messages.length - 1];
    const userMessage =
      typeof last?.content === "string"
        ? last.content
        : Array.isArray(last?.content)
          ? last.content.map((p: any) => p?.text || "").join(" ")
          : "";

    const sessionId =
      body?.id ||
      body?.chatId ||
      body?.session_id ||
      "web-chat";

    const response = await fetch(
      "https://maiadrea69.app.n8n.cloud/webhook/33481d2c-d70d-49bb-91d7-aa1e7579d439",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return Response.json(
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error webhook n8n: ${response.status} ${text}`,
        },
        { status: 200 }
      );
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
      content: `Error interno: ${error instanceof Error ? error.message : "desconocido"}`,
    });
  }
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, selectedVisibilityType } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    await checkIpRateLimit(ipAddress(request));

    // ====== CREAR O CARGAR CHAT ======

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });

      titlePromise = generateTitleFromUserMessage({ message });
    }

    // ====== GUARDAR MENSAJE USER ======

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    // ====== EXTRAER TEXTO ======

    const userText =
      message?.parts?.map((p: any) => p?.text || "").join(" ") || "";

    // ====== LLAMAR N8N ======

    const webhookResponse = await fetch(
      "https://maiadrea69.app.n8n.cloud/webhook/33481d2c-d70d-49bb-91d7-aa1e7579d439",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          session_id: id,
        }),
      }
    );

    const data = await webhookResponse.json();

    const reply =
      data.reply ||
      data.response ||
      data.output ||
      "Sin respuesta desde agente";

    // ====== STREAM RESPONSE ======

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const assistantMessageId = generateUUID();

        writer.write({
          type: "text-start",
          id: assistantMessageId,
        });

        writer.write({
          type: "text-delta",
          id: assistantMessageId,
          delta: reply,
        });

        writer.write({
          type: "text-end",
          id: assistantMessageId,
        });

        // guardar respuesta

        await saveMessages({
          messages: [
            {
              id: assistantMessageId,
              role: "assistant",
              parts: [{ type: "text", text: reply }],
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            },
          ],
        });

        if (titlePromise) {
          const title = await titlePromise;
          writer.write({
            type: "data-chat-title",
            data: title,
          });
          await updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("chat error", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

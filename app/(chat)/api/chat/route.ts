import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

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
  message?.parts
    ?.filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join(" ") || "";
    
    // ====== LLAMAR N8N ======
const webhookUrl = process.env.WEBHOOK_URL;

if (!webhookUrl) {
  throw new Error("WEBHOOK_URL no está configurado");
}

const sessionId = process.env.SESSION_ID;

if (!sessionId) {
  throw new Error("SESSION_ID no está configurado");
}

const webhookResponse = await fetch(
  webhookUrl,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: userText,
      session_id: sessionId,
    }),
  }
);    
if (!webhookResponse.ok) {
  throw new Error("Error en webhook n8n");
}   
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

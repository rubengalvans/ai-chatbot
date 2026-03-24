"use client";

import { useState } from "react";
import { useChat } from "ai/react";

export default function Page() {

  const [agentMode, setAgentMode] = useState<"artek" | "lilith">("artek");

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: { agentMode }
  });

  return (
    <div className="flex flex-col h-full p-6">

      {/* selector */}
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <button onClick={()=>setAgentMode("artek")}>
          ⚡ Acción (Artek)
        </button>

        <button onClick={()=>setAgentMode("lilith")}>
          🔥 Profundidad (Lilith)
        </button>
      </div>

      {/* mensajes */}
      <div style={{ flex:1 }}>
        {messages.map(m => (
          <div key={m.id}>
            <b>{m.role}</b>: {m.content}
          </div>
        ))}
      </div>

      {/* input */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Escribe..."
        />
      </form>

    </div>
  );
}

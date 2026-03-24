import { useChat } from "ai/react";

export default function Page() {

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat"
  });

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-auto">
        {messages.map(m => (
          <div key={m.id}>
            {m.role === "user" ? "Tú: " : "IA: "}
            {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>

    </div>
  );
}

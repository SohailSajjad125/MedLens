import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { chatApi } from "../api/endpoints";
import { ChatIcon } from "../components/Icons";

export default function ChatAssistant() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const loadSessions = () => chatApi.sessions().then(({ data }) => setSessions(data));

  useEffect(() => {
    loadSessions();
  }, []);

  const openSession = (s) => {
    setActiveId(s.id);
    setMessages(s.messages || []);
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setMessages((m) => [...m, { role: "user", content: question }]);
    const q = question;
    setQuestion("");
    try {
      const { data } = await chatApi.ask({ session_id: activeId, question: q });
      setActiveId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      loadSessions();
    } finally {
      setAsking(false);
    }
  };

  return (
    <DashboardLayout breadcrumb="AI Assistant" title="Ask about your health">
      <div className="grid grid-2-1">
        <div className="neo-card chat-panel">
          <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 10, alignItems: "center" }}>
            <ChatIcon />
            <strong>{activeId ? "Conversation" : "New conversation"}</strong>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p style={{ fontSize: "0.85rem" }}>
                Ask any general medical question, or open a report and ask about it directly from the report page.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {asking && <div className="chat-bubble assistant">Thinking…</div>}
          </div>
          <div className="chat-input-row">
            <input
              placeholder="Ask a medical question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
            />
            <button className="btn btn-primary" onClick={ask} disabled={asking}>
              Ask
            </button>
          </div>
        </div>

        <div>
          <div className="section-title">
            <h3>History</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="neo-card clickable"
              style={{ padding: 16 }}
              onClick={() => {
                setActiveId(null);
                setMessages([]);
              }}
            >
              + Start new conversation
            </div>
            {sessions.map((s) => (
              <div key={s.id} className="neo-card clickable" style={{ padding: 16 }} onClick={() => openSession(s)}>
                {s.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

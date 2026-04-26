import "../assets/styles/AI.css";

import { MessageSquare, Send } from "lucide-react";
import React, { useState } from "react";

const PilotAssistant = ({ icao }) => {
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [loading, setLoading] = useState(false);

	const handleAsk = async () => {
		if (!question.trim()) return;
		setLoading(true);
		setAnswer("");
		try {
			const API_BASE_URL =
				import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
			const res = await fetch(`${API_BASE_URL}/api/ai`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ icao, question }),
			});
			const data = await res.json();
			if (data.answer) setAnswer(data.answer);
			else setAnswer("⚠️ 發生錯誤: " + data.error);
		} catch (err) {
			setAnswer(err);
		}
		setLoading(false);
	};

	return (
		<div
			className="panel-card"
			style={{ marginTop: "20px", borderLeft: "4px solid #a855f7" }}
		>
			<h3 className="section-title" style={{ color: "#a855f7" }}>
				<MessageSquare size={20} /> AI 簽派員 (Intelligence)
			</h3>
			<div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
				<input
					type="text"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAsk()}
					placeholder={`向 AI 查詢 ${icao} 航圖資訊 (例: 跑道有多長？)`}
					style={{
						flex: 1,
						padding: "10px",
						borderRadius: "6px",
						border: "1px solid #334155",
						background: "#0f172a",
						color: "#f8fafc",
						outline: "none",
					}}
				/>
				<button
					onClick={handleAsk}
					disabled={loading}
					style={{
						padding: "10px 20px",
						borderRadius: "6px",
						background: "#a855f7",
						color: "#fff",
						border: "none",
						cursor: loading ? "not-allowed" : "pointer",
					}}
				>
					{loading ? "查詢中..." : <Send size={18} />}
				</button>
			</div>
			{answer && (
				<div
					style={{
						background: "rgba(168,85,247,0.1)",
						padding: "15px",
						borderRadius: "8px",
						lineHeight: "1.6",
						color: "#e2e8f0",
						whiteSpace: "pre-wrap",
					}}
				>
					<strong>AI 簽派員回覆：</strong>
					<br />
					{answer}
				</div>
			)}
		</div>
	);
};

export default PilotAssistant;

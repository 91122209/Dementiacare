const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();

/* ====================== CORS（保證通版） ====================== */
/* 對所有請求一律附上 CORS 標頭。預檢 OPTIONS 直接 204。 */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ====================== 其他中介層 ====================== */
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname)); // 可同站提供前端檔案

/* ====================== 台北時間每日重置 ====================== */
const tz = "Asia/Taipei";
function todayInTzYYYYMMDD() {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

/* ====================== 每日次數限制（記憶體） ====================== */
let dailyCount = 0;
let lastResetDate = todayInTzYYYYMMDD();
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 55);

/* ====================== 健檢端點 ====================== */
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    date_tpe: todayInTzYYYYMMDD(),
    dailyCount,
    DAILY_LIMIT,
    model: process.env.MODEL || "gemini-1.5-pro-latest",
  });
});

/* ====================== 主要聊天端點 ====================== */
app.post("/api/chat", async (req, res) => {
  // 每日自動重置（台北時間）
  const today = todayInTzYYYYMMDD();
  if (today !== lastResetDate) {
    lastResetDate = today;
    dailyCount = 0;
  }

  // 檢查金鑰
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "伺服器未設定 GEMINI_API_KEY。" });
  }

  // 全站每日限制
  if (dailyCount >= DAILY_LIMIT) {
    return res.status(429).json({ reply: "⚠️ 今日回答次數已達上限（台北時間 00:00 重置），請明天再試。" });
  }

  // 取問題
  let question = (req.body?.question || "").trim();
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }
  const MAX_Q_LEN = Number(process.env.MAX_QUESTION_LEN || 600);
  if (question.length > MAX_Q_LEN) question = question.slice(0, MAX_Q_LEN);

  // 計數 +1（若要成功才+1，可移到成功回傳前）
  dailyCount++;

  const MODEL = process.env.MODEL || "gemini-1.5-pro-latest";
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL)}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{
      role: "user",
      parts: [{ text: `請用清楚的繁體中文、條列式給出可行建議。\n問題：${question}` }]
    }],
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1024 }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000
    });

    const fullReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 無法提供回答";
    const cleanReply = fullReply.replace(/(以下|回答如下)[：:]\s*/g, "").trim();

    return res.json({ reply: cleanReply });
  } catch (error) {
    const detail = error.response?.data || error.message || "unknown error";
    console.error("Gemini API 錯誤：", detail);

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "AI 回應逾時，請稍後再試。", detail });
    }
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return res.status(500).json({ error: "金鑰無效或權限不足，請檢查 GEMINI_API_KEY。", detail });
    }
    if (status === 429) {
      return res.status(429).json({ error: "模型限流或配額不足，請稍後再試。", detail });
    }
    return res.status(500).json({ error: "伺服器錯誤，請稍後再試。", detail });
  }
});

/* ====================== 其餘路由交給前端 ====================== */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const keyTail = (process.env.GEMINI_API_KEY || "").slice(-4);
  console.log(`✅ 伺服器啟動：http://localhost:${PORT} ｜ KEY(...${keyTail})`);
});


const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();

/* ============== CORS（允許 GitHub Pages 與 Render，自訂可用環境變數） ============== */
const DEFAULT_ALLOW_ORIGINS = [
  "https://9112209.github.io",
  "https://dementia-r1e8.onrender.com",
];
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || DEFAULT_ALLOW_ORIGINS.join(","))
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // 同源 / 無 Origin（curl、健康檢查等）一律放行
    if (!origin || ALLOW_ORIGINS.includes("*") || ALLOW_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error("CORS not allowed"), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// 明確允許預檢
app.options("/api/chat", cors());

/* ================== 其他中介層 ================== */
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

/* ================== 台北時間每日重置 ================== */
const tz = "Asia/Taipei";
function todayInTzYYYYMMDD() {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

/* ================== 每日次數限制（記憶體） ================== */
let dailyCount = 0;
let lastResetDate = todayInTzYYYYMMDD();
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 55);

/* ================== 健檢端點 ================== */
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    date_tpe: todayInTzYYYYMMDD(),
    dailyCount,
    DAILY_LIMIT,
    model: process.env.MODEL || "gemini-1.5-pro-latest",
    allowOrigins: ALLOW_ORIGINS,
  });
});

/* ================== 主要聊天端點 ================== */
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
  // 可選：限制字數避免超長
  const MAX_Q_LEN = Number(process.env.MAX_QUESTION_LEN || 600);
  if (question.length > MAX_Q_LEN) question = question.slice(0, MAX_Q_LEN);

  // 計數 +1（若你想成功才+1，就改到成功回傳前）
  dailyCount++;

  const MODEL = process.env.MODEL || "gemini-1.5-pro-latest";
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(MODEL)}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{
      role: "user",
      parts: [{
        // 可加上系統指令的風格要求
        text: `請用清楚的繁體中文、條列式給出可行建議。\n問題：${question}`
      }]
    }],
    // generationConfig 可視需要調整
    generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 1024 },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const fullReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 無法提供回答";
    const cleanReply = fullReply
      .replace(/(以下|回答如下)[：:]\s*/g, "")
      .trim();

    return res.json({ reply: cleanReply });
  } catch (error) {
    // 讓前端也能看到細節，方便排查
    const detail = error.response?.data || error.message || "unknown error";
    console.error("Gemini API 錯誤：", detail);

    // 分類常見錯誤給出較友善訊息
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

/* ================== 其他路由交給前端（單頁應用） ================== */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // 印出金鑰最後 4 碼方便你確認有讀到（安全起見只印局部）
  const keyTail = (process.env.GEMINI_API_KEY || "").slice(-4);
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}  ｜ KEY(...${keyTail}) ｜ 允許來源：${ALLOW_ORIGINS.join(", ")}`);
});

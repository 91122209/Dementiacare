// server.js
const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();

/* ====================== CORS（保證通版） ====================== */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // 我們沒有用 cookie，先用寬鬆 CORS，之後要收緊再改白名單即可
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
    model: process.env.MODEL || "gemini-2.5-flash",
  });
});

/* ====================== 呼叫 Gemini 的小工具 ====================== */
async function callGemini(model, apiKey, text, timeoutMs = 60000) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
  };

  const resp = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: timeoutMs,
  });

  // 嘗試把文字拿出來
  const txt =
    resp.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    resp.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";
  return (txt || "AI 無法提供回答").replace(/(以下|回答如下)[：:]\s*/g, "").trim();
}

/* ====================== 主要聊天端點 ====================== */
app.all("/api/chat", async (req, res) => {
  try {
    // 每日自動重置（台北時間）
    const today = todayInTzYYYYMMDD();
    if (today !== lastResetDate) {
      lastResetDate = today;
      dailyCount = 0;
    }

    // 檢查金鑰
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "伺服器未設定 GEMINI_API_KEY。" });
    }

    // 取問題：支援 POST body.question / GET ?question
    let question =
      (req.method === "GET"
        ? req.query?.question
        : req.body?.question) || "";
    question = String(question).trim();
    if (!question) {
      return res.status(400).json({ error: "請提供問題" });
    }

    // 全站每日限制
    if (dailyCount >= DAILY_LIMIT) {
      return res.status(429).json({
        reply:
          "⚠️ 今日回答次數已達上限（台北時間 00:00 重置），請明天再試。",
      });
    }

    // 長度保護
    const MAX_Q_LEN = Number(process.env.MAX_QUESTION_LEN || 600);
    if (question.length > MAX_Q_LEN) {
      question = question.slice(0, MAX_Q_LEN);
    }

    // 計數 +1（如果你想成功才+1，把這行移到成功回傳前）
    dailyCount++;

    // 模型：預設用 flash，較不易被權限/配額擋
    const userModel =
      process.env.MODEL || "gemini-2.5-flash";
    const fallbackModel = "gemini-2.5-flash";

    // 組提示
    const prompt = `請用清楚的繁體中文，條列式提供可行建議與注意事項。\n問題：${question}`;

    try {
      const text = await callGemini(userModel, GEMINI_API_KEY, prompt);
      return res.json({ reply: text, model: userModel });
    } catch (e) {
      // 若是權限/配額/未啟用等問題，自動降級一次（當 userModel 不是 flash 才降級）
      const status = e?.response?.status;
      const code = e?.response?.data?.error?.status || "";
      const shouldFallback =
        userModel !== fallbackModel &&
        [403, 404, 429].includes(status);

      if (shouldFallback) {
        try {
          const text = await callGemini(
            fallbackModel,
            GEMINI_API_KEY,
            prompt
          );
          return res.json({ reply: text, model: fallbackModel });
        } catch (e2) {
          // 再失敗就回詳細錯誤
          const apiErr =
            e2?.response?.data?.error || e2?.response?.data || {};
          console.error("Gemini API 錯誤（fallback）:", apiErr || e2);
          return res
            .status(apiErr.code || e2?.response?.status || 500)
            .json({
              error:
                apiErr.message ||
                e2?.message ||
                "伺服器錯誤，請稍後再試。",
              detail: apiErr,
            });
        }
      }

      // 不符合降級條件，直接回錯
      const apiErr =
        e?.response?.data?.error || e?.response?.data || {};
      console.error("Gemini API 錯誤：", apiErr || e);
      return res
        .status(apiErr.code || e?.response?.status || 500)
        .json({
          error:
            apiErr.message || e?.message || "伺服器錯誤，請稍後再試。",
          detail: apiErr,
        });
    }
  } catch (error) {
    console.error("未捕捉錯誤：", error);
    return res.status(500).json({
      error: "伺服器錯誤，請稍後再試。",
      detail: error?.message || String(error),
    });
  }
});

/* ====================== 其餘路由交給前端 ====================== */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const keyTail = (process.env.GEMINI_API_KEY || "").slice(-4);
  console.log(
    `✅ 伺服器啟動：http://localhost:${PORT} ｜ KEY(...${keyTail})`
  );
});



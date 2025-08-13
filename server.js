const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== 每日次數限制區塊 =====
let dailyCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_LIMIT = 55;
// ===========================

app.post("/api/chat", async (req, res) => {
  const today = new Date().toDateString();

  // 每天自動重設
  if (today !== lastResetDate) {
    lastResetDate = today;
    dailyCount = 0;
  }

  // 若超過每日上限，直接拒絕回答
  if (dailyCount >= DAILY_LIMIT) {
    return res.status(429).json({ reply: "⚠️ 今日回答次數已達上限，請明天再試。" });
  }

  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    // 累加次數
    dailyCount++;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        contents: [{
          parts: [{
            text: `請用繁體中文回答：「${question}」`
          }],
          role: "user"
        }]
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    const fullReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 無法提供回答";
    const cleanReply = fullReply
      .replace(/請用繁體中文回答：「.*?」/g, '')
      .replace(/回答如下[:：]?\s*/g, '')
      .trim();

    res.json({ reply: cleanReply });
  } catch (error) {
    console.error("Gemini API 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});





const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 支援靜態 HTML

// POST 路由：接收問題並呼叫 Gemini API
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [{ text: question }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        params: {
          key: process.env.GEMINI_API_KEY // 請放你的 API 金鑰在 .env 或 Render 環境變數中
        }
      }
    );

    const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) {
      res.json({ reply });
    } else {
      res.status(500).json({ error: "AI 無回覆" });
    }
  } catch (error) {
    console.error("Gemini 錯誤：", error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 支援前端頁面重新整理 fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});

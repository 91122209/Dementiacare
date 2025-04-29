const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Gemini 問答路由
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY,
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

    // 取得原始回答內容
    const fullReply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 無法提供回答";

    // 清理掉 prompt 指令與冗語
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

// 提供前端頁面
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});

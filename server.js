const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 靜態頁面支援（HTML）

// API 路由
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek-ai/deepseek-chat",
        messages: [
          { role: "system", content: "你是一位親切且專業的失智症照護助手。" },
          { role: "user", content: question }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://dementia-r1e8.onrender.com", // 換成你 Render 的網址
          "X-Title": "DementiaCareGPT"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenRouter 錯誤：", error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 前端支援頁面重新整理 fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 伺服器啟動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器已啟動：http://localhost:${PORT}`);
});

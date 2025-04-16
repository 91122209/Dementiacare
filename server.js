const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 靜態頁面支援（HTML）

app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "AI 沒有提供回覆";
    res.json({ reply });
  } catch (error) {
    console.error("Gemini 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 支援 HTML 頁面重整
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器已啟動：http://localhost:${PORT}`);
});

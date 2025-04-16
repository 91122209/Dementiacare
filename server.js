const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 提供靜態頁面（如 AIcare.html）

// GPT 聊天 API
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
const response = await axios.post(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    model: "deepseek-ai/deepseek-chat", // ✅ 正確 model ID
    messages: [
      { role: "system", content: "你是一位親切且專業的失智症照護助手。" },
      { role: "user", content: question }
    ]
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://dementia-r1e8.onrender.com",
      "X-Title": "DementiaCareGPT"
    }
  }
);
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://dementia-r1e8.onrender.com", // ✅ 改為你的 Render 網站
          "X-Title": "DementiaCareGPT"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenRouter 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "AI 無法提供回覆，請稍後再試。" });
  }
});

// 為了讓 /AIcare.html 也能在刷新時正常顯示
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器已啟動：http://localhost:${PORT}`);
});

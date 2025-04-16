const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

// 1️⃣ 提供所有靜態檔案（HTML、CSS、JS、圖片）
app.use(express.static(path.join(__dirname)));

// 2️⃣ 初始化 OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 3️⃣ ChatGPT 接收 POST 請求
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "你是一位親切且專業的失智症照護助手。" },
        { role: "user", content: question }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("OpenAI 錯誤：", error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 4️⃣ 預設回傳首頁 index.html（處理刷新頁面或 404）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 5️⃣ 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器已啟動在 http://localhost:${PORT}`);
});

const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const path = require("path");

const app = express();

// 不需要 dotenv，因為 Render 已經自動讀取環境變數
// require("dotenv").config(); ← 這一行可以刪除

// 讀取環境變數
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // 靜態檔案提供

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

// 設定 fallback 頁面（支援路由刷新）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器已啟動在 http://localhost:${PORT}`);
});

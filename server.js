const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const path = require("path");

require("dotenv").config(); // 如果你用 Render 的 Environment，這行可以保留或刪除都行

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 提供靜態檔案（HTML, JS, 圖片等）
app.use(express.static(__dirname));

// ✅ 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ 回覆 AI 提問
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


// ✅ 頁面路由
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html")); // 首頁
});

app.get("/AIcare.html", (req, res) => {
  res.sendFile(path.join(__dirname, "AIcare.html")); // AI問答頁
});

app.get("/dementiacare.html", (req, res) => {
  res.sendFile(path.join(__dirname, "dementiacare.html")); // 聯絡我們
});

app.get("/downloadcare.html", (req, res) => {
  res.sendFile(path.join(__dirname, "downloadcare.html")); // 聯絡我們
});

app.get("/familycare.html", (req, res) => {
  res.sendFile(path.join(__dirname, "familycare.html")); // 聯絡我們
});

app.get("/email.html", (req, res) => {
  res.sendFile(path.join(__dirname, "email.html")); // 聯絡我們
});

// ✅ 可選 fallback：找不到的頁面導回首頁（不一定要加）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器啟動於 http://localhost:${PORT}`);
});

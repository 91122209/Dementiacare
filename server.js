const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const path = require("path");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 提供「目前資料夾」內的所有靜態檔案（含 .html, .jpg, .js 等）
app.use(express.static(__dirname));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// ✅ fallback route（當使用者訪問 /AIcare.html 或其他路徑直接刷新也不會錯）
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器已啟動在 http://localhost:${PORT}`);
});

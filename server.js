const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();

// ✅ 加入 CORS 設定
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/SCIR-HI/MiniMed-Chat",
      {
        inputs: question
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    const reply = response.data?.[0]?.generated_text || "AI 無法提供回答";
    res.json({ reply });
  } catch (error) {
    console.error("Hugging Face 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
  }
});

// 提供靜態頁面
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});

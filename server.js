const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
const response = await axios.post(
  "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
  {
    inputs: `請用繁體中文回答以下問題：${question}`
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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});

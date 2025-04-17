const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Chat API
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/Qwen/Qwen1.5-0.5B-Chat",
      {
        inputs: `<|user|>\n${question}\n<|assistant|>`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data?.[0]?.generated_text?.split("<|assistant|>")[1]?.trim();
    if (reply) {
      res.json({ reply });
    } else {
      res.status(500).json({ error: "AI 無法回覆" });
    }
  } catch (error) {
    console.error("HuggingFace 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 支援刷新用路由
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

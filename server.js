const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 提供 HTML 與圖片等靜態檔案

// POST 路由：處理問題並傳送至 Hugging Face 模型
app.post("/api/chat", async (req, res) => {
  const question = req.body.question;
  if (!question) {
    return res.status(400).json({ error: "請提供問題" });
  }

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/Qwen/Qwen1.5-0.5B-Chat",
      {
        inputs: [
          { role: "user", content: question }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data?.generated_text || response.data?.[0]?.generated_text;
    if (reply) {
      res.json({ reply });
    } else {
      res.status(500).json({ error: "AI 沒有回覆內容" });
    }
  } catch (error) {
    console.error("Hugging Face 錯誤：", error.response?.data || error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 支援前端 HTML 重新整理
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動：http://localhost:${PORT}`);
});

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
  if (!question) return res.status(400).json({ error: "請提供問題" });

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [{ text: question }],
            role: "user"
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.candidates[0]?.content?.parts[0]?.text || "AI 沒有給出回答";
    res.json({ reply });
  } catch (error) {
    console.error("Gemini 錯誤：", error.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器已啟動：http://localhost:${PORT}`);
});

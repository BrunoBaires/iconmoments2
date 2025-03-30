// server.js
import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.use(express.static("public"));
app.use(express.json());

app.post("/generate", upload.single("image"), async (req, res) => {
  try {
    const style = req.body.style;
    const imagePath = req.file.path;

    // 1. Usamos GPT para crear un prompt estilizado
    const gptResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Sos un generador de prompts visuales. Recibís un estilo y devolvés una descripción estilizada para aplicar a una imagen usando IA artística.",
        },
        {
          role: "user",
          content: `Estilo: ${style}`,
        },
      ],
    });

    const prompt = gptResponse.data.choices[0].message.content;

    // 2. Usamos Replicate con instruct-pix2pix
    const form = new FormData();
    form.append("version", "7e75803c1c7c4e62f40d38f9cf61a0bd4bcfc1e88e5601e0c74c2c1ab4e8b1d4");
    form.append("input", JSON.stringify({ prompt }));
    form.append("image", fs.createReadStream(imagePath));

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await response.json();

    // 3. Devolvemos el link para que el frontend lo muestre
    if (data.urls && data.urls.get) {
      res.json({ status: "processing", url: data.urls.get });
    } else {
      res.status(500).json({ error: "No se pudo procesar la imagen." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Fallo en el servidor." });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});

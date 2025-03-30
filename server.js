// Versión corregida del backend: usa images.generate()

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const OpenAI = require("openai");
require('dotenv').config();

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    const style = req.body.style || "artistic";
    const prompt = `A ${style} style artistic drawing of a portrait`;

    const response = await openai.images.generate({
      prompt,
      n: 1,
      size: "512x512",
      response_format: "b64_json"
    });

    const image_b64 = response.data[0].b64_json;
    const imgBuffer = Buffer.from(image_b64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(imgBuffer);
  } catch (error) {
    console.error("Error en el backend:", error);
    res.status(500).send('Error al procesar la imagen');
  }
});

app.listen(3000, () => console.log("Servidor corriendo en puerto 3000"));

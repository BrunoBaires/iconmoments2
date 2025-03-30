// Nueva versión del backend: acepta JPG, PNG comunes y genera una imagen estilo dibujo

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
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype; // e.g., image/jpeg

    // Generar una imagen nueva a partir de una descripción
    const style = req.body.style || "artistic";
    const prompt = `Turn this image into a ${style}-style artistic drawing.`;

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

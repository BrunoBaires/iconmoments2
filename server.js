const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { Configuration, OpenAIApi } = require("openai");

require('dotenv').config();
const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.createImageEdit({
      image: base64Image,
      prompt: `Draw this image in ${req.body.style} style`,
      n: 1,
      size: "512x512",
      response_format: "b64_json",
    });

    const image_b64 = response.data.data[0].b64_json;
    const imgBuffer = Buffer.from(image_b64, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.send(imgBuffer);
  } catch (error) {
    console.error("Error en el backend:", error.message);
    res.status(500).send('Error al procesar la imagen');
  }
});

app.listen(3000, () => console.log("Servidor corriendo en puerto 3000"));

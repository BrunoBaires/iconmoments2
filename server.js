import express from "express";
import multer from "multer";
import fs from "fs";
import Replicate from "replicate";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const replicateApiToken = fs.readFileSync('/etc/secrets/REPLICATE_API_TOKEN', 'utf8').trim();
const replicate = new Replicate({ auth: replicateApiToken });

app.post("/process", upload.single("image"), async (req, res) => {
  const imagePath = req.file.path;
  const style = req.body.style;

  try {
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Quiero que me des un prompt detallado para un modelo de imagen AI (como SDXL o ControlNet), que transforme una fotografía real en una ilustración con el estilo gráfico de la tapa de The New Yorker del 27 de noviembre de 2023, dibujada por Chris Ware. Describí el estilo de ilustración, colores, nivel de detalle, técnica y enfoque.`,
        },
      ],
    });

    const prompt = gptResponse.choices[0].message.content.trim();

    const prediction = await replicate.run(
      "fofr/controlnet-sdxl:be1cfc032d9e9ed289a914b07b5c865ceac3b6e67b3e3f42e0235120c38c485b",
      {
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
          prompt: prompt,
          structure: "canny",
          scale: 9,
          num_inference_steps: 30,
        },
      }
    );

    // Si es un array de frames, usamos el último resultado
    const finalImage = Array.isArray(prediction) ? prediction[prediction.length - 1] : prediction;

    fs.unlinkSync(imagePath); // Borra la imagen temporal

    res.json({ image: finalImage });

  } catch (error) {
    console.error("Error en el backend:", error);
    fs.existsSync(imagePath) && fs.unlinkSync(imagePath); // Cleanup por si falla
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
});

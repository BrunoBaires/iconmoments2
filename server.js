// server.js actualizado para usar Replicate (SDXL ControlNet) y OpenAI solo para el prompt
import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

app.post("/convert", upload.single("image"), async (req, res) => {
  try {
    const style = req.body.style;
    const imagePath = req.file.path;

    // Lee la imagen
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

    // Genera el prompt estilizado con GPT
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Sos un experto en arte y estilos visuales. Tu tarea es convertir descripciones de estilos en prompts detallados para un modelo de ilustración. El estilo debe ser: " + style,
          },
          {
            role: "user",
            content:
              "Generá un prompt para aplicar este estilo a una foto de una persona, manteniendo fidelidad a sus rasgos pero transformándola en una ilustración. Incluí elementos técnicos como paleta de colores, trazo, iluminación, encuadre y composición.",
          },
        ],
      }),
    });

    const gptData = await gptResponse.json();
    const finalPrompt = gptData.choices[0].message.content;

    // Llama al modelo SDXL + ControlNet (Replicate)
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: "f6b740016d3b4aa1fb2f706c5c025e9d3b2093e7e094ab5c7f4864ccedb1440b", // sdxl-controlnet canny
        input: {
          image: base64Image,
          prompt: finalPrompt,
          a_prompt: "",
          n_prompt: "ugly, disfigured, low quality",
          num_inference_steps: 30,
          width: 1024,
          height: 1024,
          apply_canny: true,
        },
      }),
    });

    const replicateData = await replicateResponse.json();

    if (replicateData?.urls?.get) {
      // Poll the prediction endpoint until status is "succeeded"
      const statusUrl = replicateData.urls.get;
      let finalImage = null;
      for (let i = 0; i < 20; i++) {
        const statusResponse = await fetch(statusUrl, {
          headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
        });
        const statusData = await statusResponse.json();
        if (statusData.status === "succeeded") {
          finalImage = statusData.output[0];
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      fs.unlinkSync(imagePath);
      return res.json({ image: finalImage });
    } else {
      throw new Error("No se pudo generar la imagen");
    }
  } catch (error) {
    console.error("Error en el backend:", error);
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});

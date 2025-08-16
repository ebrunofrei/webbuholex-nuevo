// api/consulta.js
import { OpenAIApi, Configuration } from "openai";
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.post('/consulta', async (req, res) => {
  const { prompt } = req.body;
  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "system", content: "Eres un abogado especialista en derecho peruano. Responde en lenguaje profesional y técnico, citando normas o doctrina si corresponde." }, { role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.1,
  });
  res.json({ respuesta: completion.data.choices[0].message.content.trim() });
});

//server/services/aiService.js

const { Configuration, OpenAIApi } = require("openai");
const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(config);

async function suggestImprovements(kpi) {
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a KPI improvement assistant." },
      { role: "user", content: `Suggest improvements for KPI: ${kpi.title}, ${kpi.description}` }
    ]
  });
  return response.data.choices[0].message.content;
}

module.exports = { suggestImprovements };

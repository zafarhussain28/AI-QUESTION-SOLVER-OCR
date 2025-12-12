export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response("Send POST with JSON containing 'question'.", {
        status: 400,
        headers,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Invalid JSON body.", {
        status: 400,
        headers,
      });
    }

    const question = body.question;

    if (!question || typeof question !== "string") {
      return new Response("Missing 'question' field.", {
        status: 400,
        headers,
      });
    }

    try {
      const solved = await runLlamaSolver(question, env);

      return new Response(solved, {
        status: 200,
        headers,
      });
    } catch (e) {
      return new Response("Solver error: " + e.message, {
        status: 500,
        headers,
      });
    }
  },
};

async function runLlamaSolver(question, env) {
  const model = "@cf/meta/llama-3.1-70b-instruct";

  const prompt = `
  You are a math teacher. Solve the equation clearly and simply.

  QUESTION:
  $${question}$$

  IDEA:
  (1–2 clear sentences only.)

  STEPS:
  Step 1:
  $$ <math step> $$

  Step 2:
  $$ <math step> $$

  Step 3:
  $$ <math step> $$

  ANSWER:
  Final Answer:
  $$ <final answer> $$`;

  const input = {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.1,
  };

  const result = await env.AI.run(model, input);

  if (result?.response) {
    return result.response.trim();
  }

  try {
    const text = result.messages[0].content[0].text;
    return text.trim();
  } catch (e) {
    return "Unexpected AI format:\n" + JSON.stringify(result, null, 2);
  }
}

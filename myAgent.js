async function askGPT(prompt, OPENAI_KEY) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a cute, snarky, alpha assistant. Give straight answers with flair." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await res.json();

    // Check if API returned valid choices
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.error) {
      throw new Error(data.error.message);
    } else {
      throw new Error("Unexpected API response structure");
    }

  } catch (err) {
    return `Error fetching response: ${err.message}`;
  }
}
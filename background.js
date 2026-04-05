// background.js – handles prompt enhancement via Groq API (free, Llama 3)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ENHANCE_PROMPT") {
    enhancePrompt(request.userInput, request.apiKey)
      .then(enhanced => sendResponse({ success: true, enhanced }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }
});

async function enhancePrompt(userInput, apiKey) {
  if (!apiKey) throw new Error("NO_API_KEY");

  const systemPrompt = `You are an expert prompt engineer. Your job is to transform a simple user request into a rich, structured, chain-of-thought prompt that will get the best possible response from an LLM.

The enhanced prompt you generate should:
1. Define a clear ROLE for the AI to adopt
2. State the GOAL with full context
3. Break the task into REASONING STEPS using chain-of-thought logic
4. Include CONSTRAINTS & edge cases the AI should consider
5. Specify the exact OUTPUT FORMAT expected
6. Add QUALITY CRITERIA the output should meet

Keep the enhanced prompt in second-person ("You are...", "Think step by step...").
Return ONLY the enhanced prompt text — no explanations, no preamble, no markdown wrapper.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",   // Best free Llama 3 model on Groq
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Transform this simple request into a powerful chain-of-thought prompt:\n\n"${userInput}"`
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

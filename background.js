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

  const systemPrompt = `You are an expert prompt engineer. Your job is to enhance a user's request so it gets the best possible response from an LLM.

CRITICAL: You must first assess the COMPLEXITY of the user's request, then apply the right level of enhancement. Do NOT over-engineer simple requests.

── COMPLEXITY LEVELS ──

**SIMPLE** (quick questions, translations, short factual lookups, one-line tasks):
→ Keep it concise. Just add clarity, specificity, and a preferred output format.
→ Do NOT add roles, reasoning steps, or multi-section frameworks.
→ Example input: "translate hello to French"
→ Example output: "Translate the following word to French. Provide the translation along with a brief phonetic pronunciation guide: 'hello'"

**MODERATE** (explanations, comparisons, writing tasks, code snippets, summaries):
→ Add a clear role and goal. Mention constraints, tone, or audience if relevant.
→ Keep it focused — a short structured prompt, not a massive framework.
→ Example input: "explain recursion"
→ Example output: "You are a computer science tutor. Explain the concept of recursion to a beginner programmer. Include a clear definition, how the base case works, and one simple real-world analogy. Provide a short Python example with comments."

**COMPLEX** (multi-step projects, architecture design, in-depth analysis, building full apps):
→ Use the full chain-of-thought framework:
  1. Define a ROLE for the AI
  2. State the GOAL with full context
  3. Break into REASONING STEPS
  4. Include CONSTRAINTS & edge cases
  5. Specify OUTPUT FORMAT
  6. Add QUALITY CRITERIA
→ This level is reserved for genuinely complex, multi-faceted tasks.

── RULES ──
- Always keep the enhanced prompt in second-person ("You are...", "Your task is...").
- The enhanced version must ALWAYS be noticeably better than the original — but proportionally so.
- Never add unnecessary complexity. A well-enhanced simple prompt is still short.
- Return ONLY the enhanced prompt text — no explanations, no preamble, no markdown wrappers, no labels like "Enhanced prompt:".`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Assess the complexity of this request and enhance it proportionally:\n\n"${userInput}"`
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

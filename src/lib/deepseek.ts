const DEEPSEEK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function optimizeSEO(title: string, description: string): Promise<{ title: string; description: string }> {
  const apiKey = import.meta.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

  const prompt = `Optimize the following product title and description for SEO. Keep the original meaning and key features, add relevant keywords naturally. Return ONLY a JSON object with "title" and "description" fields, no additional text.

Current title: ${title}
Current description: ${description}

Requirements:
- Title: max 60 characters, keyword-rich
- Description: max 160 characters, compelling and keyword-optimized
- Maintain the product's core features and appeal
- No introductory phrases or explanations`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tngtech/deepseek-r1t2-chimera:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const optimized = JSON.parse(jsonMatch[0]);
      return {
        title: optimized.title || title,
        description: optimized.description || description
      };
    }

    // Fallback if no JSON found
    return { title, description };
  } catch (error) {
    console.error('SEO optimization failed:', error);
    return { title, description };
  }
}

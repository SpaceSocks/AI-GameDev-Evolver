interface OpenAiRequest {
    prompt: string;
    apiKey: string;
    baseUrl?: string;
    modelName: string;
}

interface LlmResponse {
    content: string;
    inputChars: number;
    outputChars: number;
}

export const callOpenAI = async ({ prompt, apiKey, baseUrl, modelName }: OpenAiRequest): Promise<LlmResponse> => {
    const effectiveBaseUrl = baseUrl || 'https://api.openai.com/v1';
    const url = `${effectiveBaseUrl.replace(/\/$/, '')}/chat/completions`;

    if (!apiKey && !baseUrl?.includes('localhost') && !baseUrl?.includes('127.0.0.1')) {
        throw new Error("OpenAI API key is required for cloud services. If using a local model, please provide a Base URL.");
    }

    // This is a signature of the improvement prompt. We only want to request JSON for this.
    const isImprovementPrompt = prompt.includes("Your multi-step process for this iteration is:");

    const body: { [key: string]: any } = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
    };

    // Proactive Fix: Only add `response_format` if it's an improvement prompt AND we're using the official API.
    // Local models (indicated by a baseUrl) often don't support this parameter.
    if (isImprovementPrompt && !baseUrl) {
        body.response_format = { type: 'json_object' };
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                 throw new Error(`OpenAI API Error (${response.status}): ${errorData.error?.message || errorText}`);
            } catch (e) {
                 throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
            }
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error("Received an empty response from OpenAI-compatible API.");
        }

        return {
            content,
            inputChars: prompt.length,
            outputChars: content.length,
        };
    } catch (error) {
        console.error("Error calling OpenAI-compatible API:", error);
        if (error instanceof Error) {
            throw new Error(error.message); // Re-throw with original message
        }
        throw new Error("An unknown error occurred with the OpenAI-compatible API.");
    }
};
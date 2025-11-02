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

    // Detect improvement prompts (more flexible detection)
    const isImprovementPrompt = prompt.includes("Output JSON:") || prompt.includes('"thought"') || prompt.includes("Improve this HTML game");

    const body: { [key: string]: any } = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
    };

    // Add max tokens for improvement prompts - but be careful with reasoning models
    if (isImprovementPrompt) {
        // Check if it's a reasoning model (gpt-5-nano, o1, etc.)
        const isReasoningModel = modelName.includes('nano') || modelName.includes('o1') || modelName.includes('reasoning');
        
        if (modelName.includes('gpt-5') || modelName.includes('o1')) {
            // For reasoning models, don't set token limits - they allocate internally
            // If we set max_completion_tokens, it might all go to reasoning with none for output
            if (!isReasoningModel) {
                body.max_completion_tokens = 16000; // Only for non-reasoning gpt-5 models
            }
        } else {
            body.max_tokens = 8000; // For older models
            // Only add response_format for older models that support it
            if (!baseUrl) {
                body.response_format = { type: 'json_object' };
            }
        }
    }
    
    try {
        console.log("API Request:", {
            url,
            modelName,
            isImprovementPrompt,
            bodyKeys: Object.keys(body),
            hasMaxTokens: !!body.max_tokens,
            hasMaxCompletionTokens: !!body.max_completion_tokens,
            hasResponseFormat: !!body.response_format,
            promptLength: prompt.length
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            },
            body: JSON.stringify(body),
        });
        
        console.log("API Response status:", response.status);

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
        console.log("API Response structure:", {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            hasMessage: !!data.choices?.[0]?.message,
            hasContent: !!data.choices?.[0]?.message?.content,
            finishReason: data.choices?.[0]?.finish_reason,
            usage: data.usage
        });
        
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            const errorDetails = {
                finishReason: data.choices?.[0]?.finish_reason,
                usage: data.usage,
                model: modelName,
                hasBody: !!body.max_completion_tokens || !!body.max_tokens
            };
            console.error("Empty content error details:", errorDetails);
            throw new Error(`Received an empty response from OpenAI-compatible API. Finish reason: ${data.choices?.[0]?.finish_reason || 'unknown'}. Usage: ${JSON.stringify(data.usage)}`);
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
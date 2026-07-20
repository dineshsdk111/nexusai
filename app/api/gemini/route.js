export async function POST(request) {
  try {
    const body = await request.json();
    const { apiKey, model, chatHistory, mode, customPrompt, fileContext, enableSearch, provider } = body;

    if (!apiKey) {
      return Response.json({ error: 'API key is required' }, { status: 400 });
    }

    // Dynamic import to avoid bundling server-only code on client
    const { queryGemini } = await import('../../../src/utils/gemini');

    const result = await queryGemini({
      provider: provider || 'gemini',
      apiKey,
      model: model || 'gemini-3.1-flash-lite',
      chatHistory: chatHistory || [],
      mode: mode || 'general',
      customPrompt: customPrompt || '',
      fileContext: fileContext || '',
      enableSearch: enableSearch || false,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Gemini API Route Error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}

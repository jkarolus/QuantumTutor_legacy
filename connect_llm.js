async function getLLMResponse(question,solution) {
  console.log('Get LLM Response called')
    try {

      let llmPromt = `Based on the information given, give the struggling student a hint that helps him answer the following question, without giving away the answer. Be more specific and formulate your tip as if you were talking to a novice. Be as concise as possible and give a hint in not more than 7 words. The format of the output should be:- Hint - Your response`;
      llmPromt = llmPromt + 'Question:- ' + question
      llmPromt = llmPromt + 'Students solution:- ' + solution
  
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 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'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'You are a passionate and patient quantum-physics teacher checking coding exercise answers of students. ' },
                { role: 'user', content: llmPromt }
              ],
              max_tokens: 150
            })
          });
          if (!response.ok) {
            throw new Error('Error communicating with the LLM with response:- ',response.status);
          }
          const result = await response.json();
          console.log('Got result :- ',result.choices[0].message.content)
          return result.choices[0].message.content;

    } catch (error) {
      console.error("Error communicating with LLM:", error);
    }
  }
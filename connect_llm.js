async function getLLMResponse(question,solution) {
  console.log('Get LLM Response called')
    try {

      let llmPromt = `You are a passionate and patient quantum-physics teacher checking coding exercise answers of students. Based on the information given, give the struggling student a hint that helps him answer the following question, without giving away the answer. Be more specific and formulate your tip as if you were talking to a novice. Be as concise as possible and give a hint in not more than 7 words.`;
      llmPromt = llmPromt + 'Question:- ' + question
      llmPromt = llmPromt + 'Students solution:- ' + solution
  
          const response = await fetch('https://gpuserver.eit.rptu.de/v1/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ncow93eu0h23rfhn0sfukwn3rpn2w0x8rwehzf0s4'
            },
            body: JSON.stringify({
              model: 'arbitrary',
              prompt: llmPromt,
              max_tokens: 150
            })
          });
          if (!response.ok) {
            throw new Error('Error communicating with the LLM with response:- ',response.status);
          }
          const result = await response.json();
          console.log('Got result :- ',result.choices[0].text.trim())
          return result.choices[0].text.trim();

    } catch (error) {
      console.error("Error communicating with LLM:", error);
    }
  }
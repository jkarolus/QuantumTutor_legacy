async function getLLMResponse() {
  console.log('Get LLM Response called')
    try {

      let llmPromt = `Hello!! Can you write a greeting in not more than 3 words.`;
  
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
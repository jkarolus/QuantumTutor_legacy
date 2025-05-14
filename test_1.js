console.log('In test1 js')
// Set up a listener on the entire page
const outerintervalId = setInterval(() => {
document.addEventListener("submit", function (e) {
    const form = e.target;
    
    //Get question
    const ques = document.querySelector(".CoderciseDescription__container")
    const content = [];
    ques.querySelectorAll("p").forEach(p => content.push(p.textContent.trim()));
    const code = ques.querySelectorAll("code")
    if (code.length > 0){
      code.forEach(code => content.push(code.textContent.trim()));
    }
    const mcontainer = ques.querySelectorAll("img");
    if (mcontainer.length > 0) {
      mcontainer.forEach(mjx => content.push(mjx.textContent.trim()));
    }
    const images = ques.querySelectorAll("img");
    if (images.length > 0) {
      images.forEach(img => content.push(`Image: ${img.src}`));
    }

    const fullContent = content.join("\n");
    console.log("Extracted content:\n", fullContent);

    //LLM Response
    let llmMessage = ""; 

    const clickedBtn = document.querySelectorAll("button.CoderciseEditor__submit-button")
    if (clickedBtn) {
      console.log("Submit clicked!");
      // Traverse to the code block container
      if (form.querySelector(".CoderciseEditor__container")) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
    
        //Get the code
        const cmLines = form.querySelectorAll(".cm-line");
        const cmLineTexts = Array.from(cmLines).map(line => line.textContent.trim());
        console.log("Form data:", data);
        console.log(".cm-line texts:", cmLineTexts);

        //Plugin custom error
        const accordions = document.querySelectorAll(".Accordion.Accordion__expanded");
        const parentAccordion = form.closest(".Accordion");
        const index = Array.from(accordions).indexOf(parentAccordion);
        console.log("Accordion index:", index);
        let text = accordions[index].querySelector(".Accordion__title h2").textContent;
         
        //LLM Response
        const customMessage = "Custom error message from LLM:- ";
        async function handleLLMResponse() {
          console.log('handle response called')
          const result = await getLLMResponse();
          if (result) {
            console.log('Result from LLM: ',result)
            llmMessage = result.text;
            return result
          }
        }
        (async () => {
          const llmReply = await handleLLMResponse();
          console.log("🌟 Final Reply:", llmReply);
        
          
          const intervalId = setInterval(() => {
              const errorEl = accordions[index].querySelector(".CoderciseEditor > div > div"); 
              
            //#topic-codercise-container > div > div.Accordion.Accordion__expanded > div > div > div > div > div.CoderciseEditor > div > div
              if (errorEl) {
                console.log("Found error element:", errorEl);
            
                // Override the message
                errorEl.textContent = customMessage+llmReply;
            
                // Optional: styling
                errorEl.style.color = "#d00";
                errorEl.style.fontWeight = "bold";
            
                // Stop the interval
                clearInterval(intervalId);
              } else {
                console.log("Still waiting for popup to appear...");
              }

          }, 500);
          })();
    }

  }
  else{
    console.log('exercise 404')
  }

  })
  clearInterval(outerintervalId);
}, 500); 


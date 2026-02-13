console.log('In test Prolific js_01')
loadExtensionState()


console.log("Extracted type:", g_label); 

function createStartTestButton() {
  if(studyState == 'main')
  {
    const panel = document.createElement("div");
    panel.className = "floating-panel";

    const btn = document.createElement("button");
    btn.textContent = "Start Test";

    btn.addEventListener("mouseover", () => {
    btn.style.backgroundColor = "#0056b3";
    });
    btn.addEventListener("mouseout", () => {
    btn.style.backgroundColor = "#007bff";
    });
    btn.addEventListener("click", () => {
      timestamp = Date.now()
      saveStartingToServer(u_id,timestamp,g_label)
      closeQuestion()
      startMainStudy()
      panel.remove();
    });
    panel.appendChild(btn);

    // Append to body
    document.body.appendChild(panel);
  }
}
//if(studyState == 'start') createStartTestButton();
//createFloatingChoiceBox();


//------------------------
const outerintervalId = setInterval(() => {
document.addEventListener("submit", function (e) {
    const form = e.target;
    const curTime = Date.now()
    console.log('Global lable and user id  :-',g_label,u_id)
    let correctAnswer = false;

    const accordions = document.querySelectorAll(".Accordion.Accordion__expanded");
    const parentAccordion = form.closest(".Accordion");
    const index = Array.from(accordions).indexOf(parentAccordion);

    //Get question
    const ques = accordions[index].querySelector(".CoderciseDescription__container")
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
    
    //Get the code


        //Get error box 
    let exerciseLabel = accordions[index].querySelector(".Accordion__title h2").textContent;
    let q_id = exerciseLabel.split(' ')[1] 
  
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const cmLines = form.querySelectorAll(".cm-line");
    const cmLineTexts = Array.from(cmLines).map(line => line.textContent.trim());
    console.log("Form data:", data);
    console.log(".cm-line texts:", cmLineTexts);

    console.log('Value od label:- ',g_label)
    if(exerciseLabel.includes('PreTest') || exerciseLabel.includes('PostTest') || g_label == 'mkjn')
    {
      q_id = 'I.1.5'
      const intervalId = setInterval(() => {
      const errorEl = accordions[index].querySelector(".CoderciseEditor > div > div"); 
      //const button = accordions[index].querySelector(".CoderciseEditor__button-group__expanded button");
      if (errorEl && errorEl.textContent != 'Correct!') {
        saveToServer(fullContent,cmLineTexts,errorEl.textContent,u_id,q_id,g_label,curTime,correctAnswer,code_len)
        clearInterval(intervalId);
      } 
      else if(errorEl && errorEl.textContent == 'Correct!')
      {
        console.log('Solution acceped!!');
        correctAnswer = true;
        stopQuestionTimer('Question correctly submitted')
        if (q_id in questionStatus){
                questionStatus[q_id]=true
          }
        saveToServer(fullContent,cmLineTexts,'Solution acceped!!',u_id,q_id,g_label,curTime,correctAnswer,code_len)
        startMainStudy()
        clearInterval(intervalId);
      }
      else {
        console.log("Still waiting for popup to appear...");
      }

    }, 500);

    }
    else if(g_label == 'bhgv'){

    //const clickedBtn = document.querySelectorAll("button.CoderciseEditor__submit-button")
    //if (clickedBtn) {
      console.log("Submit clicked!");
      // Traverse to the code block container
      if (form.querySelector(".CoderciseEditor__container")) {

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        /*
        let errorMsg = ''
        const intervalId = setInterval(() => {
            console.log('found error element')
            const errorEl = accordions[index].querySelector(".CoderciseEditor > div > div");
            if(errorEl) { 
              errorMsg = errorEl.textContent
              if(errorMsg.includes('Error:')){
                errorEl.textContent=''
              }
            }
          }, 500);*/
        //LLM Response
        async function handleLLMResponse() {
          console.log('handle response called')
          let errorMsg = ''
          const result = await getLLMResponse(fullContent,cmLineTexts,errorMsg);
          if (result) {
            console.log('Result from LLM: ',result)
            llmMessage = result.text;
            return result
          }
        }
        let llmReply = '';
        (async () => {
          llmReply = await handleLLMResponse();
          console.log("🌟 Final Reply:", llmReply);
          
          const intervalId = setInterval(() => {
              const errorEl = accordions[index].querySelector(".CoderciseEditor > div > div"); 
              
              if(errorEl) { 
              errorMsg = errorEl.textContent
              if(errorMsg.includes('Error:')){
                errorEl.textContent=''
              }
            }
              //const button = accordions[index].querySelector(".CoderciseEditor__button-group__expanded button");
              if (errorEl && errorEl.textContent != 'Correct!') {
                console.log('Error text :- ',errorEl.textContent)
                errorEl.textContent = llmReply;

                errorEl.style.color = "#d00";
                errorEl.style.fontWeight = "bold";
                saveToServer(fullContent,cmLineTexts,llmReply,u_id,q_id,g_label,curTime,correctAnswer,code_len)
                clearInterval(intervalId);
              } 
              else if( errorEl && errorEl.textContent == 'Correct!')
              {
                console.log('Solution acceped!!');
                correctAnswer = true;
                        stopQuestionTimer('Question correctly submitted')
                if (q_id in questionStatus){
                        questionStatus[q_id]=true
                  }
                saveToServer(fullContent,cmLineTexts,'Solution acceped!!',u_id,q_id,g_label,curTime,correctAnswer,code_len)
                chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
                  console.log("SSavung state with questionStatus:- ",questionStatus);
                });
                clearInterval(intervalId);
              }
              else {
                console.log("Still waiting for popup to appear...");
              }

          }, 500);
          
          })();
        
    //}
  }

  }
  else if(g_label == 'cfdx'){
    //const clickedBtn = document.querySelectorAll("button.CoderciseEditor__submit-button")
    //if (clickedBtn) {
      console.log("Submit clicked!");
      if (form.querySelector(".CoderciseEditor__container")) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
      
        function getRandomExplanation(id) {
          const explanations = savedData[id];

          if (Array.isArray(explanations) && explanations.length > 0) {
            const randomIndex = Math.floor(Math.random() * explanations.length);
            return explanations[randomIndex];
          }

          return "No explanation available for this item.";
        }
      
        
        const intervalId = setInterval(() => {
            let errorMsg = ''
            const errorEl = accordions[index].querySelector(".CoderciseEditor > div > div"); 
            errorMsg = errorEl.textContent
            if(errorMsg.includes('Error:')){
              errorEl.textContent=''
            }
            const message = getRandomExplanation(q_id);
            //const button = accordions[index].querySelector(".CoderciseEditor__button-group__expanded button");
            if (errorEl && errorEl.textContent != 'Correct!') {
              console.log("Found error element:", errorEl);
              errorEl.textContent = message;
              errorEl.style.color = "#d00";
              errorEl.style.fontWeight = "bold";
              saveToServer(fullContent,cmLineTexts,message,u_id,q_id,g_label,curTime,correctAnswer,code_len)
              clearInterval(intervalId);
            } 
            else if( errorEl && errorEl.textContent == 'Correct!')
              {
                console.log('Solution acceped!!');
                correctAnswer = true;
                        stopQuestionTimer('Question correctly submitted')
                if (q_id in questionStatus){
                        questionStatus[q_id]=true
                  }
                saveToServer(fullContent,cmLineTexts,'Solution acceped!!',u_id,q_id,g_label,curTime,correctAnswer,code_len)
                chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
                  console.log("SSavung state with questionStatus:- ",questionStatus);
                });
                clearInterval(intervalId);
              }
            else {
              console.log("Still waiting for popup to appear...");
            }

        }, 500);
    //}
  }

  }
  else{
    console.log('Options not defined in condition')
  }

  })
  clearInterval(outerintervalId);
}, 500); 


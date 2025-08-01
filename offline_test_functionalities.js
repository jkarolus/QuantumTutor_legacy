
let alertShown = false;
const accordionStatus = [true, true, true, true, true]; 
let studyState = 'start';
let questionStatus = {'I.1.1':false, 'I.1.2':false, 'I.1.3':false, 'I.1.4':false, 'I.1.5':false}; 
let accordianHeadings = ['I.1.1','I.1.2','I.1.3','I.1.4','I.1.5']


function loadExtensionState() {
  console.log('In load extension')
  chrome.storage.local.get(["currentState","questionStatus","g_label"], (result) => {
    if(result.g_label) g_label = g_label
    if(result.questionStatus) questionStatus=questionStatus
    if(result.currentState) studyState=currentState
    if(result.currentState == 'start') createStartTestButton()
    if (result.currentState == 'pre') {
      startPreTest('I.1.5')
    }
    else if(result.currentState == 'main') {
      startMainStudy()
    }
    else if(result.currentState == 'pre') {
      startPostStudy()
    }
  });
}

function autoHideCompareButton() {
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  
  accordions.forEach((accordion) => {
    accordion.addEventListener("click", function (e) {
      const titleElement = accordion.querySelector(".Accordion__title h2");
      if (!titleElement) return;
      setTimeout(() => {
      if (accordion.classList.contains("Accordion__expanded")) {
        console.log('In expanded acc')
        const qid = titleElement.textContent.split(" ")[1];
        console.log('Currently opened:- ',qid)
        closeOtherAccordians(qid);
        monitorExpandedAccordions();
        
        // Check if question already solved or timed out
        if (questionStatus[qid] === true) {
          alert("Question already solved or timer ran out!");
          const header = accordion.querySelector(".Accordion__title");
          if (header) header.click(); 
          accordion.style.visibility = "hidden";
          return;
        }

        setTimeout(() => {
          const compareButton = accordion.querySelector(
            ".CoderciseEditor__show-solutions-button"
          );
          if (compareButton) {
            console.log("Compare button found, hiding it.");
            compareButton.style.display = "none"; 
          } else {
            console.log("Compare button not found yet.");
          }
        }, 500); 
    }
    }, 300);//---
    });
  });
}

function closeOtherAccordians(currentlyOpen){
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(curr_accordion => {
    const title = curr_accordion.querySelector(".Accordion__title h2") 
    if (!title) return;
    const titleElement = curr_accordion.querySelector(".Accordion__title h2").textContent.split(' ')[1] 
    if(accordianHeadings.includes(titleElement)){
      const curr_header = curr_accordion.querySelector(".Accordion__title");
      if (titleElement != currentlyOpen) {
        if (curr_accordion.classList.contains("Accordion__expanded")) {
          curr_header.click(); 
        }
      }
    }
  })
}
function startPreTest(allowedTitle) {
  studyState = 'pre';
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
  console.log("State saved.");
});
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    const titleText = titleElement.textContent.split(' ')[1];

    if (titleText !== allowedTitle) {
      accordion.style.visibility = "hidden";
    }
  });
  console.log('accordians hidden, starting auto hide')
  autoHideCompareButton();
}

function startMainStudy(){
  studyState = 'main'
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
  console.log('State saved 1st')
});
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    const titleText = titleElement.textContent.split(' ')[1];
    if (titleText == 'I.1.5') {
      accordion.style.visibility = "hidden";
    }
    else{
      accordion.style.visibility = "visible";
    }
  });
  autoHideCompareButton();
}

function checkQuestionStatus(){
  let temp = true
  for (const qid in questionStatus) {
    if(questionStatus[qid] == false){
      temp = false
    }
  } 
  if(temp){
    startPostStudy()
  }
}

function closeQuestion(){
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;
    const header = accordion.querySelector(".Accordion__title");
    if (accordion.classList.contains("Accordion__expanded")) {
      if (header) {
        header.click(); 
      }
    }
  });



}
function startPostStudy(){
  studyState = 'post'
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
  console.log('State saved 1st')
});
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    const titleText = titleElement.textContent.split(' ')[1];

    if (titleText !== 'I.1.5') {
      accordion.style.visibility = "hidden";
    }
    else{
      accordion.style.visibility = "visible";
    }
  });
  autoHideCompareButton();
}

function getAllowedExpandedCount() {
  const container = document.getElementById("topic-theory-container");
  const toggleButton = container?.querySelector('button[aria-expanded]');

  if (toggleButton) {
    const hideButton = toggleButton.getAttribute("aria-expanded") === "true";
    return hideButton ? 2 : 1; 
  }
  return 1; 
}

function monitorExpandedAccordions() {
  const observer = new MutationObserver(() => {
    const expanded = document.querySelectorAll(".CoderciseList .Accordion.Accordion__expanded");
    const allowed = getAllowedExpandedCount();
    if (expanded){
      console.log('Starting timer')
      startQuestionTimer(expanded[0]); 
    } else {
      stopQuestionTimer('Question Closed'); 
    }
  });

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}


let currentAccordion = null;
let currentTimer = null;
let currentTimerElement = null;
let currentQuestionId = null;
let timerStartTime = null;
let timeLeft = 0;
let isPaused = false;

function startQuestionTimer(accordionElement) {
  stopQuestionTimer('Question Closed'); 

  const title = accordionElement.querySelector(".Accordion__title");
  const header = accordionElement.querySelector(".Accordion__title h2");
  const questionId = header?.textContent?.split(" ")[1] || "unknown";

 
  const timerDisplay = document.createElement("div");
  timerDisplay.style.marginTop = "10px";
  timerDisplay.style.padding = "6px 12px";
  timerDisplay.style.backgroundColor = "#f0f0f0";
  timerDisplay.style.border = "1px solid #ccc";
  timerDisplay.style.borderRadius = "5px";
  timerDisplay.style.fontWeight = "bold";
  timerDisplay.style.display = "flex";
  timerDisplay.style.justifyContent = "space-between";
  timerDisplay.style.alignItems = "center";
  timerDisplay.style.gap = "10px";

  const timeEl = document.createElement("span");
  if(questionId =='I.1.5'){
    timeEl.textContent = "07:30";
  }
  else{
    timeEl.textContent = "05:00";
  }
  timerDisplay.appendChild(timeEl);

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "Finish";
  stopBtn.style.padding = "4px 8px";
  stopBtn.style.backgroundColor = "#dc3545";
  stopBtn.style.color = "white";
  stopBtn.style.border = "none";
  stopBtn.style.borderRadius = "4px";
  stopBtn.style.cursor = "pointer";
  stopBtn.addEventListener("click", () => {
    stopQuestionTimer('Finish button clicked');
    closeQuestion()
    if(studyState== 'pre'){
      startMainStudy()
    }
  });
  timerDisplay.appendChild(stopBtn);


  accordionElement.appendChild(timerDisplay);
  currentTimerElement = timerDisplay;
  currentQuestionId = questionId;
  timerStartTime = Date.now();

  let timeLeft = 5.0 * 60; // seconds
  if(questionId =='I.1.5'){
    timeLeft = 7.5 * 60; // seconds
  }

  currentTimer = setInterval(() => {
    timeLeft--;
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    timeEl.textContent = `${mins}:${secs}`;
    if (timeLeft <= 0) {
      stopQuestionTimer('Timer Ran out'); 
      closeQuestion()
      if(questionId =='I.1.5'){
        startMainStudy()
      }
      if (questionId in questionStatus){
        questionStatus[questionId]=true
        chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus }, () => {
          console.log('State saved 1st')
        });
        checkQuestionStatus()
      }
    }
  }, 1000);
}
function stopQuestionTimer(log) {
  if (currentTimer) {
    clearInterval(currentTimer);
    currentTimer = null;

    const timeSpent = (Date.now() - timerStartTime)/60000;
    if (currentQuestionId) {
      saveTimeSpentToServer(currentQuestionId, timeSpent,log);
    }

    if (currentTimerElement && currentTimerElement.parentNode) {
      currentTimerElement.remove();
    }

  // Reset state
  currentAccordion = null;
  currentTimer = null;
  currentTimerElement = null;
  currentQuestionId = null;
  timerStartTime = null;
  timeLeft = 0;
  isPaused = false;
  }

}


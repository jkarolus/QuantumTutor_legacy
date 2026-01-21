
let alertShown = false;
const accordionStatus = [true, true, true, true, true]; 
let studyState = 'start';
let questionStatus = {'I.1.1':false, 'I.1.2':false, 'I.1.3':false, 'I.1.4':false, 'I.1.5':false}; 
let accordianHeadings = ['I.1.1','I.1.2','I.1.3','I.1.4','I.1.5']
let timer_status = 'not_started'
let g_label = '';
let u_id = '';
let code_len = [];
let current_timing = [];
let questionTimings = {'I.1.1':0.0, 'I.1.2':0.0, 'I.1.3':0.0, 'I.1.4':0.0, 'I.1.5':0.0};

function extractUrlParamsAndStore() {
  const params = new URLSearchParams(window.location.search);
  u_id = params.get("user");
  g_label = params.get("type");

  if (u_id && g_label) {
    chrome.storage.local.set({ u_id, g_label }, () => {
      console.log("Stored user and type:", u_id, g_label);
    });
  }
}
extractUrlParamsAndStore()

//override 
function checkLoginStatus(accordion){
  console.log('Checking login status')
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  const header = accordion.querySelector(".Accordion__title");
  if (header) {
    header.click(); 
    const logarr = document.querySelectorAll(".CoderciseList .Accordion .CoderciseEditorOverlay")
    console.log('Checking login status: array',logarr)
    if(logarr.length > 0){
      chrome.storage.local.clear(() => {
        console.log("✅ All local storage data cleared!");
        });
      alert('Please Sign up/Login before proceeding to the test')
    }
    else{
      header.click();
    }
}
}

console.log("Extracted type:", g_label); 

function loadExtensionState() {
  console.log('In load extension')
  chrome.storage.local.get(["currentState","questionStatus","g_label","questionTimings"], (result) => {
    if(g_label)
      { 
        g_label = result.g_label
        console.log('Retrieved g_label',g_label)
      }
    if(result.questionStatus) { 
      questionStatus=result.questionStatus
      console.log('Retrieved questionStatus',questionStatus)
    }
    if(result.currentState){ 
        studyState=result.currentState
        console.log('Retrieved studyState',studyState)
      }
    if(result.questionTimings){ 
      questionTimings=result.questionTimings
      console.log('Retrieved questionTimings',questionTimings)
    }
    if(studyState == 'start') {
      createStartTestButton()}
    if (studyState == 'pre') {
      startPreTest('PreTest')
    }
    else if(studyState == 'main') {
      startMainStudy()
    }
    else if(studyState== 'post') {
      startPostStudy()
    }
  });
}

  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach((accordion) => {
    accordion.addEventListener("click", function (e) {
      setInterval(() => {
      if (accordion.classList.contains("Accordion__expanded")) {
        const cmLines = accordion.querySelectorAll(".cm-line");
        const cmLineTexts = Array.from(cmLines).map(line => line.textContent.trim()).join(" ");
        code_len.push(cmLineTexts.length)
        const summary = accordion.querySelector("#topic-codercise-container summary")
        if (summary) {
          summary.classList.add("highlight-summary");
        }
      }
    }, 1000);//---
    });
  });



function autoHideCompareButton() {
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  
  accordions.forEach((accordion) => {
    accordion.addEventListener("click", function (e) {
      const titleElement = accordion.querySelector(".Accordion__title h2");
      if (!titleElement) return;
      checkQuestionStatus()
      setTimeout(() => {
      if (accordion.classList.contains("Accordion__expanded")) {
        console.log('In expanded acc')
        const qid = titleElement.textContent.split(" ")[1];
        console.log('Currently opened:- ',qid)
        closeOtherAccordians(qid);
        monitorExpandedAccordions(accordion);
        
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
    else {
      console.log("Accordion collapsed!!");
      stopQuestionTimer("Question Closed");
    }
    }, 100);//---
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
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus ,questionTimings: questionTimings }, () => {
  console.log("Saving state with questionStatus:- ",questionStatus);
});
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    //const titleText = titleElement.textContent.split(' ')[1];
    let titleText = titleElement.textContent
    if(titleText.includes('I.1.5')){
      titleElement.textContent = 'PreTest'
      titleText= 'PreTest'
      checkLoginStatus(accordion)
    }
    if (titleText !== allowedTitle) {
      accordion.style.visibility = "hidden";
    }
  });
  console.log('accordians hidden, starting auto hide')
  autoHideCompareButton();
}

function startMainStudy(){
  studyState = 'main'
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus ,questionTimings: questionTimings }, () => {
  console.log("SSavung state with questionStatus:- ",questionStatus);});
  chrome.storage.local.get(["currentState", "questionStatus"], (result) => {
    //console.log("Read back:", result);
    });

  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    const titleText = titleElement.textContent;
    if (titleText.includes('PreTest') || titleText.includes('PostTest') ) {
      accordion.style.visibility = "hidden";
    }
    else{
      accordion.style.visibility = "visible";
    }
  });
  console.log('State:-', studyState)
  autoHideCompareButton();
}

function checkQuestionStatus(){
  let temp = true
  chrome.storage.local.get(["currentState", "questionStatus"], (result) => {
    //console.log("Read back:", result);
    if(result.questionStatus) { 
      questionStatus=result.questionStatus
      currentState = result.currentState
    
    for (const qid in questionStatus) {
      if(qid == 'I.1.5' && currentState == 'pre') continue
      else if(questionStatus[qid] == false){
        temp = false
      }
    } 
    if(temp){
      questionStatus['I.1.5']=false
      chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus,questionTimings: questionTimings  }, () => {
      console.log('Starting post test',questionStatus)
    });
      startPostStudy()
    }
    }
  });

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
  chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus ,questionTimings: questionTimings }, () => {
  console.log("SSavung state with questionStatus:- ",questionStatus);
});
  const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  accordions.forEach(accordion => {
    const titleElement = accordion.querySelector(".Accordion__title h2");
    if (!titleElement) return;

    const titleText = titleElement.textContent;

    if (titleText.includes('PreTest') || titleText.includes('PostTest')) {
      accordion.style.visibility = "visible";
      titleElement.textContent = 'PostTest'
    }
    else{
      accordion.style.visibility = "hidden";
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
/*
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
*/
function monitorExpandedAccordions(accordion) {
  console.log('In new func')
  //const accordions = document.querySelectorAll(".CoderciseList .Accordion");
  setTimeout(() => {
    const isExpanded = accordion.classList.contains("Accordion__expanded");

    if (isExpanded) {
      console.log("Starting timer for:", accordion);
      if(timer_status != 'running') startQuestionTimer(accordion);
    } else {
      console.log("Accordion collapsed");
      stopQuestionTimer("Question Closed");
    }
  }, 100); 

}


let currentAccordion = null;
let currentTimer = null;
let currentTimerElement = null;
let currentQuestionId = null;
let timerStartTime = null;
let timeLeft = 0;
let isPaused = false;

function startQuestionTimer(accordionElement) {
  //stopQuestionTimer('Question Closed'); 

  let questionId;
  const title = accordionElement.querySelector(".Accordion__title");
  const header = accordionElement.querySelector(".Accordion__title h2");
  if(header){
    headertext = header.textContent
    console.log('header:- ',headertext)
    if(headertext.includes('PreTest') || headertext.includes('PostTest')){
      questionId = 'I.1.5'
    }
    else {questionId = headertext.split(" ")[1] || "unknown";}
    console.log('qid:- ',questionId)
 }
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

/* old logic
  const timeEl = document.createElement("span");
  if(questionId =='I.1.5'){
    timeEl.textContent = "07:30";
  }
  else{
    timeEl.textContent = "05:00";
  }
  timerDisplay.appendChild(timeEl);
*/
  // change to reset timer --finish
  const timeEl = document.createElement("span");

  if (
    questionTimings[questionId] &&
    questionTimings[questionId].status === "stopped" &&
    questionTimings[questionId].timeLeft > 0
  ) {
    timeLeft = questionTimings[questionId].timeLeft;
  } else {
    if (questionId === "I.1.5") {
      timeLeft = 7.5 * 60; 
    } else {
      timeLeft = 5 * 60;   
    }
  }
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  timeEl.textContent = `${mins}:${secs}`;

  timerDisplay.appendChild(timeEl);
  // change to reset timer --end

  const stopBtn = document.createElement("button");
  stopBtn.textContent = "Finish";
  stopBtn.style.padding = "4px 8px";
  stopBtn.style.backgroundColor = "#dc3545";
  stopBtn.style.color = "white";
  stopBtn.style.border = "none";
  stopBtn.style.borderRadius = "4px";
  stopBtn.style.cursor = "pointer";
  stopBtn.addEventListener("click", () => {
    if(questionId=='I.1.5' && studyState== 'post'){
      alert('Test completed.\n\n Please proceed to the Qualtrics survey page!!')
      questionStatus[questionId]=true
      console.log('Test completed ',questionStatus)
      chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus,questionTimings: questionTimings  }, () => {
      console.log('State saved after test finished',questionStatus)
      closeQuestion()
    });
      stopQuestionTimer('Test completed');
    }
    else{
    questionStatus[questionId]=true
    chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus,questionTimings: questionTimings  }, () => {
      console.log('State saved after finish button clicked',questionStatus)
    });
    stopQuestionTimer('Finish button clicked');
    closeQuestion()
    checkQuestionStatus()
    if(studyState== 'pre'){
      startMainStudy()
    }
      }
  });
  timerDisplay.appendChild(stopBtn);
  timer_status = 'running'

  accordionElement.appendChild(timerDisplay);
  currentTimerElement = timerDisplay;
  currentQuestionId = questionId;
  timerStartTime = Date.now();

  /* old logic
  timeLeft = 5.0 * 60; // seconds
  if(questionId =='I.1.5'){
    timeLeft = 7.5 * 60; // seconds
  }*/
  // Resume timer if question was stopped previously (accordion collapse)
  if (questionTimings[questionId] && questionTimings[questionId].status === "stopped") {
    timeLeft = questionTimings[questionId].timeLeft || 5 * 60;
    console.log(`Resuming timer for ${questionId} from ${timeLeft} seconds`);
  } else {
    // Otherwise start fresh
    timeLeft = (questionId === 'I.1.5') ? 7.5 * 60 : 5 * 60;
    console.log(`Starting new timer for ${questionId}`);
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
        chrome.storage.local.set({ currentState: studyState, questionStatus: questionStatus ,questionTimings: questionTimings }, () => {
          console.log('State saved 1st')
        });
        checkQuestionStatus()
      }
    }
  }, 1000);
}

function stopQuestionTimer(log) {
  if (currentTimer) {
    timer_status = 'stopped'
    clearInterval(currentTimer);
    //currentTimer = null;

     questionTimings[currentQuestionId] = {
      timeLeft: timeLeft, 
      status: (log === 'Finish button clicked' || log === 'Timer Ran out') ? 'completed' : 'stopped',
      stoppedAt: new Date().toISOString()
    };
    //questionTimings[currentQuestionId] = currentTimer
    chrome.storage.local.set({ currentState: studyState ,questionTimings: questionTimings }, () => {
      console.log("Saving state with questionTimings:- ",questionTimings);
   });
    const timeSpent = (Date.now() - timerStartTime)/60000;
    if (currentQuestionId) {
      saveTimeSpentToServer(currentQuestionId, u_id,g_label,timeSpent,log);
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


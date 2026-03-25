(() => {
  const state = {
    alertShown: false,
    studyState: 'main',
    questionStatus: { ...DEFAULT_QUESTION_STATUS },
    questionTimings: { ...DEFAULT_QUESTION_TIMINGS },
    g_label: '',
    g_therory: APP_CONFIG.theoryModes.legacy,
    u_id: '',
    codeLengths: [],
    timerStatus: 'not_started',
    currentTimer: null,
    currentTimerElement: null,
    currentQuestionId: null,
    timerStartTime: null,
    timeLeft: 0,
    theoryObserver: null,
    startButtonRendered: false,
    accordionListenersBound: false,
    submitListenerBound: false,
  };

  async function initialize() {
    console.log('QuantumTutor main initialized');
    await syncQueryParams();
    await loadStoredState();
    expandSupplementaryDetails();
    hideDisabledAccordions();
    bindAccordionListeners();
    bindSubmitListener();
    renderStartButton();
  }

  async function syncQueryParams() {
    const params = parseQueryParams();
    state.u_id = params.u_id;
    state.g_label = params.g_label;
    state.g_therory = params.g_therory;

    const payload = { g_therory: state.g_therory };
    if (state.u_id) {
      payload.u_id = state.u_id;
    }
    if (state.g_label) {
      payload.g_label = state.g_label;
    }

    await storageSet(payload);
    console.log('Stored query params:', payload);
  }

  async function loadStoredState() {
    const stored = await storageGet(APP_CONFIG.storageKeys);

    if (stored.u_id) {
      state.u_id = stored.u_id;
    }
    if (stored.g_label) {
      state.g_label = stored.g_label;
    }
    if (stored.g_therory) {
      state.g_therory = stored.g_therory;
    }
    if (stored.questionStatus) {
      state.questionStatus = stored.questionStatus;
    }
    if (stored.questionTimings) {
      state.questionTimings = stored.questionTimings;
    }
    if (stored.currentState) {
      state.studyState = stored.currentState;
    }

    if (state.theoryObserver) {
      state.theoryObserver.disconnect();
    }
    state.theoryObserver = applyTheoryLayout(state.g_therory);
    expandSupplementaryDetails();
  }

  function hideDisabledAccordions() {
    getAccordions().forEach((accordion) => {
      const titleElement = accordion.querySelector(APP_CONFIG.selectors.accordionTitleHeading);
      if (titleElement && titleElement.textContent.includes('I.1.5')) {
        accordion.style.display = 'none';
      }
    });
  }

  function bindAccordionListeners() {
    if (state.accordionListenersBound) {
      return;
    }

    getAccordions().forEach((accordion) => {
      accordion.addEventListener('click', () => {
        window.setTimeout(() => {
          expandSupplementaryDetails();

          if (!accordion.classList.contains('Accordion__expanded')) {
            stopQuestionTimer('Question Closed');
            return;
          }

          const codeLength = collectCodeLines(accordion).join(' ').length;
          state.codeLengths.push(codeLength);

          const summary = accordion.querySelector(APP_CONFIG.selectors.summary);
          if (summary) {
            summary.classList.add('highlight-summary');
          }

          const questionId = getAccordionQuestionId(accordion);
          if (!questionId) {
            return;
          }

          closeOtherAccordions(questionId);
          handleExpandedAccordion(accordion, questionId);
        }, 100);
      });
    });

    state.accordionListenersBound = true;
  }

  async function handleExpandedAccordion(accordion, questionId) {
    await refreshQuestionStatus();

    if (state.questionStatus[questionId] === true) {
      alert('Question already solved or timer ran out!');
      const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
      if (header) {
        header.click();
      }
      accordion.style.visibility = 'hidden';
      return;
    }

    logCoderciseExtendToServer(
      Date.now(),
      questionId,
      state.u_id,
      state.g_label,
      state.g_therory,
      'CODERCISE_EXTENDED',
    );

    window.setTimeout(() => {
      const compareButton = accordion.querySelector(APP_CONFIG.selectors.compareButton);
      if (compareButton) {
        compareButton.style.display = 'none';
      }
    }, 500);

    if (state.timerStatus !== 'running') {
      startQuestionTimer(accordion, questionId);
    }
  }

  function closeOtherAccordions(currentlyOpen) {
    getAccordions().forEach((accordion) => {
      const questionId = getAccordionQuestionId(accordion);
      if (!questionId || !APP_CONFIG.questionIds.includes(questionId) || questionId === currentlyOpen) {
        return;
      }

      if (accordion.classList.contains('Accordion__expanded')) {
        const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
        if (header) {
          header.click();
        }
      }
    });
  }

  async function persistStudyState() {
    await storageSet({
      currentState: state.studyState,
      questionStatus: state.questionStatus,
      questionTimings: state.questionTimings,
    });
  }

  async function refreshQuestionStatus() {
    const stored = await storageGet(['currentState', 'questionStatus']);
    if (stored.questionStatus) {
      state.questionStatus = stored.questionStatus;
    }
    if (stored.currentState) {
      state.studyState = stored.currentState;
    }
  }

  function renderStartButton() {
    if (state.studyState !== 'main' || state.startButtonRendered) {
      return;
    }

    const existingPanel = document.querySelector(APP_CONFIG.selectors.startPanel);
    if (existingPanel) {
      state.startButtonRendered = true;
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'floating-panel';

    const button = document.createElement('button');
    button.textContent = 'Start Test';
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#0056b3';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#007bff';
    });
    button.addEventListener('click', async () => {
      const timestamp = Date.now();
      await saveStartingToServer(state.u_id, timestamp, state.g_label, state.g_therory);
      closeQuestion();
      await startMainStudy();
      panel.remove();
      state.startButtonRendered = false;
    });

    panel.appendChild(button);
    document.body.appendChild(panel);
    state.startButtonRendered = true;
  }

  async function startMainStudy() {
    state.studyState = 'main';
    await persistStudyState();
  }



  async function checkLoginStatus(accordion) {
    const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
    if (!header) {
      return;
    }

    header.click();
    const overlays = document.querySelectorAll(APP_CONFIG.selectors.overlay);
    if (overlays.length > 0) {
      await storageClear();
      alert('Please Sign up/Login before proceeding to the test');
      return;
    }

    header.click();
  }

  function closeQuestion() {
    getAccordions().forEach((accordion) => {
      const titleElement = accordion.querySelector(APP_CONFIG.selectors.accordionTitleHeading);
      const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
      if (titleElement && header && accordion.classList.contains('Accordion__expanded')) {
        header.click();
      }
    });
  }

  function startQuestionTimer(accordion, questionId) {
    const timerDisplay = document.createElement('div');
    timerDisplay.style.marginTop = '10px';
    timerDisplay.style.padding = '6px 12px';
    timerDisplay.style.backgroundColor = '#f0f0f0';
    timerDisplay.style.border = '1px solid #ccc';
    timerDisplay.style.borderRadius = '5px';
    timerDisplay.style.fontWeight = 'bold';
    timerDisplay.style.display = 'flex';
    timerDisplay.style.justifyContent = 'space-between';
    timerDisplay.style.alignItems = 'center';
    timerDisplay.style.gap = '10px';

    state.timeLeft = getInitialTimeLeft(questionId);

    const timeElement = document.createElement('span');
    updateTimerText(timeElement, state.timeLeft);
    timerDisplay.appendChild(timeElement);

    const finishButton = document.createElement('button');
    finishButton.textContent = 'Finish';
    finishButton.style.padding = '4px 8px';
    finishButton.style.backgroundColor = '#dc3545';
    finishButton.style.color = 'white';
    finishButton.style.border = 'none';
    finishButton.style.borderRadius = '4px';
    finishButton.style.cursor = 'pointer';
    finishButton.addEventListener('click', async () => {
      state.questionStatus[questionId] = true;
      await persistStudyState();
      stopQuestionTimer('Finish button clicked');
      closeQuestion();
      await refreshQuestionStatus();
      await completeTest();
    });
    timerDisplay.appendChild(finishButton);

    accordion.appendChild(timerDisplay);
    state.currentTimerElement = timerDisplay;
    state.currentQuestionId = questionId;
    state.timerStartTime = Date.now();
    state.timerStatus = 'running';

    state.currentTimer = window.setInterval(async () => {
      state.timeLeft -= 1;
      updateTimerText(timeElement, state.timeLeft);

      if (state.timeLeft > 0) {
        return;
      }

      stopQuestionTimer('Timer Ran out');
      closeQuestion();
      if (questionId in state.questionStatus) {
        state.questionStatus[questionId] = true;
        await persistStudyState();
        await refreshQuestionStatus();
      }
    }, 1000);
  }

  function getInitialTimeLeft(questionId) {
    const storedTiming = state.questionTimings[questionId];
    if (
      storedTiming &&
      typeof storedTiming === 'object' &&
      storedTiming.status === 'stopped' &&
      storedTiming.timeLeft > 0
    ) {
      return storedTiming.timeLeft;
    }

    return APP_CONFIG.questionTime[questionId] || 5 * 60;
  }

  function updateTimerText(element, totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    element.textContent = `${mins}:${secs}`;
  }

  async function completeTest() {
    await refreshQuestionStatus();
    const allCompleted = Object.values(state.questionStatus).every((value) => value === true);
    if (!allCompleted) {
      return;
    }

    alert('Test completed.\n\n Please proceed to the Qualtrics survey page!!');
    await persistStudyState();
    closeQuestion();
    stopQuestionTimer('Test completed');
  }

  function stopQuestionTimer(log) {
    if (!state.currentTimer) {
      return;
    }

    state.timerStatus = 'stopped';
    window.clearInterval(state.currentTimer);

    if (state.currentQuestionId) {
      state.questionTimings[state.currentQuestionId] = {
        timeLeft: state.timeLeft,
        status: log === 'Finish button clicked' || log === 'Timer Ran out' ? 'completed' : 'stopped',
        stoppedAt: new Date().toISOString(),
      };

      storageSet({
        currentState: state.studyState,
        questionTimings: state.questionTimings,
      });

      if (state.timerStartTime) {
        const timeSpent = (Date.now() - state.timerStartTime) / 1000;
        const timestamp = Date.now();
        logToServer(timestamp, state.currentQuestionId, state.u_id, state.g_label, state.g_therory, timeSpent, log);
      }
    }

    if (state.currentTimerElement?.parentNode) {
      state.currentTimerElement.remove();
    }

    state.currentTimer = null;
    state.currentTimerElement = null;
    state.currentQuestionId = null;
    state.timerStartTime = null;
    state.timeLeft = 0;
  }

  function bindSubmitListener() {
    if (state.submitListenerBound) {
      return;
    }

    document.addEventListener('submit', handleSubmit);
    state.submitListenerBound = true;
  }

  async function handleSubmit(event) {
    const form = event.target;
    const parentAccordion = form.closest('.Accordion');
    if (!parentAccordion) {
      return;
    }

    const questionContainer = parentAccordion.querySelector(APP_CONFIG.selectors.questionContainer);
    if (!questionContainer) {
      return;
    }

    const exerciseLabel = parentAccordion.querySelector(APP_CONFIG.selectors.accordionTitleHeading)?.textContent || '';
    const submission = {
      form,
      accordion: parentAccordion,
      curTime: Date.now(),
      correctAnswer: false,
      exerciseLabel,
      q_id: exerciseLabel.split(' ')[1] || '',
      fullContent: collectQuestionContent(questionContainer),
      cmLineTexts: collectCodeLines(form),
    };

    console.log('Global label and user id:', state.g_label, state.u_id);

    if (
      submission.exerciseLabel.includes('PreTest') ||
      submission.exerciseLabel.includes('PostTest') ||
      state.g_label === APP_CONFIG.modes.vanilla
    ) {
      submission.q_id = 'I.1.5';
      handleVanillaSubmission(submission);
      return;
    }

    if (state.g_label === APP_CONFIG.modes.llm) {
      await handleLlmSubmission(submission);
      return;
    }

    console.log('Options not defined in condition');
  }

  function handleVanillaSubmission(submission) {
    const intervalId = pollForEditorMessage(submission.accordion, async (errorElement) => {
      if (errorElement.textContent !== 'Correct!') {
        await saveToServer(
          submission.fullContent,
          submission.cmLineTexts,
          errorElement.textContent,
          state.u_id,
          submission.q_id,
          state.g_label,
          state.g_therory,
          submission.curTime,
          submission.correctAnswer,
          state.codeLengths,
        );
        window.clearInterval(intervalId);
        return;
      }

      submission.correctAnswer = true;
      stopQuestionTimer('Question correctly submitted');
      if (submission.q_id in state.questionStatus) {
        state.questionStatus[submission.q_id] = true;
      }
      await saveToServer(
        submission.fullContent,
        submission.cmLineTexts,
        'Solution acceped!!',
        state.u_id,
        submission.q_id,
        state.g_label,
        state.g_therory,
        submission.curTime,
        submission.correctAnswer,
        state.codeLengths,
      );
      await startMainStudy();
      window.clearInterval(intervalId);
    });
  }

  async function handleLlmSubmission(submission) {
    if (!submission.form.querySelector(APP_CONFIG.selectors.editorContainer)) {
      return;
    }

    const llmReply = await getLLMResponse(submission.fullContent, submission.cmLineTexts);
    if (!llmReply) {
      return;
    }

    const intervalId = pollForEditorMessage(submission.accordion, async (errorElement) => {
      if (errorElement.textContent.includes('Error:')) {
        errorElement.textContent = '';
      }

      if (errorElement.textContent !== 'Correct!') {
        errorElement.textContent = llmReply;
        errorElement.style.color = '#d00';
        errorElement.style.fontWeight = 'bold';
        await saveToServer(
          submission.fullContent,
          submission.cmLineTexts,
          llmReply,
          state.u_id,
          submission.q_id,
          state.g_label,
          state.g_therory,
          submission.curTime,
          submission.correctAnswer,
          state.codeLengths,
        );
        window.clearInterval(intervalId);
        return;
      }

      submission.correctAnswer = true;
      stopQuestionTimer('Question correctly submitted');
      if (submission.q_id in state.questionStatus) {
        state.questionStatus[submission.q_id] = true;
      }
      await saveToServer(
        submission.fullContent,
        submission.cmLineTexts,
        'Solution acceped!!',
        state.u_id,
        submission.q_id,
        state.g_label,
        state.g_therory,
        submission.curTime,
        submission.correctAnswer,
        state.codeLengths,
      );
      await storageSet({
        currentState: state.studyState,
        questionStatus: state.questionStatus,
      });
      window.clearInterval(intervalId);
    });
  }

  window.QuantumTutorApp = {
    startMainStudy,
    closeQuestion,
    stopQuestionTimer,
  };

  initialize();
})();

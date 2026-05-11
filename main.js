(() => {
  const state = {
    alertShown: false,
    studyState: 'not_started',
    questionStatus: { ...DEFAULT_QUESTION_STATUS },
    questionTimings: { ...DEFAULT_QUESTION_TIMINGS },
    g_label: '',
    g_therory: APP_CONFIG.theoryModes.legacy,
    debug: false,
    u_id: '',
    codeLengths: [],
    codeCollectionInterval: null,
    currentCodeCollectionAccordion: null,
    timerStatus: 'not_started',
    currentTimer: null,
    currentTimerElement: null,
    currentQuestionId: null,
    timerStartTime: null,
    timeLeft: 0,
    studyStartTimestamp: null,
    theoryObserver: null,
    startButtonRendered: false,
    accordionListenersBound: false,
    submitListenerBound: false,
    allowProgrammaticAccordionToggle: false,
    activeAccordionObserver: null,
  };

  async function initialize() {
    console.log('QuantumTutor main initialized');
    await syncQueryParams();
    await loadStoredState();
    expandSupplementaryDetails();
    hideDisabledAccordions();
    bindAccordionListeners();
    bindSubmitListener();
    syncQuestionSequence();
    renderStartButton();
  }

  async function syncQueryParams() {
    const params = parseQueryParams();
    state.u_id = params.u_id;
    state.g_label = params.g_label;
    state.g_therory = params.g_therory;
    state.debug = params.debug;

    const payload = { g_therory: state.g_therory, debug: state.debug };
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
    if (typeof stored.debug === 'boolean') {
      state.debug = stored.debug;
    }
    if (stored.questionStatus) {
      state.questionStatus = stored.questionStatus;
    }
    if (stored.questionTimings) {
      state.questionTimings = stored.questionTimings;
    }
    if (stored.studyStartTimestamp) {
      state.studyStartTimestamp = stored.studyStartTimestamp;
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
      const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
      if (header) {
        const blockProtectedAccordionToggle = (event) => {
          const questionId = getAccordionQuestionId(accordion);
          const activeQuestionId = getNextPendingQuestionId();
          const isProtectedActiveQuestion =
            state.studyState === 'main' &&
            questionId &&
            questionId === activeQuestionId &&
            accordion.classList.contains('Accordion__expanded') &&
            state.questionStatus[questionId] !== true;

          if (!state.allowProgrammaticAccordionToggle && isProtectedActiveQuestion) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
          }
        };

        header.addEventListener('pointerdown', blockProtectedAccordionToggle, true);
        header.addEventListener('mousedown', blockProtectedAccordionToggle, true);
        header.addEventListener('click', blockProtectedAccordionToggle, true);
        header.addEventListener(
          'keydown',
          (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              blockProtectedAccordionToggle(event);
            }
          },
          true,
        );
      }

      accordion.addEventListener('click', () => {
        const wasExpanded = accordion.classList.contains('Accordion__expanded');

        window.setTimeout(async () => {
          expandSupplementaryDetails();

          const questionId = getAccordionQuestionId(accordion);
          const activeQuestionId = getNextPendingQuestionId();
          if (!questionId || questionId !== activeQuestionId) {
            syncQuestionSequence();
            return;
          }

          if (wasExpanded && state.timerStatus === 'running' && state.currentQuestionId === questionId) {
            return;
          }

          if (!accordion.classList.contains('Accordion__expanded')) {
            forceAccordionOpen(accordion);
            return;
          }

          await handleExpandedAccordion(accordion, questionId);
        }, 100);
      });
    });

    state.accordionListenersBound = true;
  }

  async function handleExpandedAccordion(accordion, questionId) {
    await refreshQuestionStatus();

    if (state.questionStatus[questionId] === true) {
      syncQuestionSequence();
      return;
    }

    state.codeLengths = [];

    const codeLength = collectCodeLines(accordion).join(' ').length;
    state.codeLengths.push(codeLength);

    const summary = accordion.querySelector(APP_CONFIG.selectors.summary);
    if (summary) {
      summary.classList.add('highlight-summary');
    }

    window.setTimeout(() => {
      const compareButton = accordion.querySelector(APP_CONFIG.selectors.compareButton);
      if (compareButton) {
        compareButton.style.display = 'none';
      }
    }, 500);

    if (state.timerStatus !== 'running') {
      startQuestionTimer(accordion, questionId);
    }

    startCodeLengthCollection(accordion);

    observeOpenRelatedTheoryButton(accordion, questionId);

    const stopObservingPaste = observePasteEvents(accordion, questionId, state.u_id, state.g_label, state.g_therory, state.timerStartTime);
    // const stopObservingWindowFocus = observeWindowFocusEvents(questionId, state.u_id, state.g_label, state.g_therory, state.timerStartTime);
  }

  function observeOpenRelatedTheoryButton(accordion, questionId) {
    const attachListenerToButton = (button) => {
      const buttonText = button.textContent?.trim().toLowerCase();
      if (!buttonText || !buttonText.includes('open related theory')) {
        return;
      }

      if (button.dataset.quantumTutorObserved === 'true') {
        return;
      }

      button.dataset.quantumTutorObserved = 'true';
      button.addEventListener('click', () => {
        const timeSpent = (Date.now() - state.timerStartTime) / 1000;
        const timestamp = Date.now();
        logOpenRelatedTheoryToServer(
          timestamp,
          questionId,
          state.u_id,
          state.g_label,
          state.g_therory,
          timeSpent
        );
      });
    };

    // First, check for any existing buttons that are already in the DOM
    const existingButtons = accordion.querySelectorAll('button');
    existingButtons.forEach(attachListenerToButton);

    // Then set up observer to catch any future buttons
    const observer = new MutationObserver(() => {
      const buttons = accordion.querySelectorAll('button');
      buttons.forEach(attachListenerToButton);
    });

    observer.observe(accordion, {
      childList: true,
      subtree: true,
    });
  }

  function startCodeLengthCollection(accordion) {
    stopCodeLengthCollection();

    state.currentCodeCollectionAccordion = accordion;
    state.codeCollectionInterval = window.setInterval(() => {
      const codeLength = collectCodeLines(accordion).join(' ').length;
      state.codeLengths.push(codeLength);
    }, 1000);
  }

  function stopCodeLengthCollection() {
    if (state.codeCollectionInterval) {
      window.clearInterval(state.codeCollectionInterval);
      state.codeCollectionInterval = null;
      state.currentCodeCollectionAccordion = null;
    }
  }

  function getNextPendingQuestionId() {
    return APP_CONFIG.questionIds.find((questionId) => state.questionStatus[questionId] !== true) || null;
  }

  function getAccordionByQuestionId(questionId) {
    return getAccordions().find((accordion) => getAccordionQuestionId(accordion) === questionId) || null;
  }

  function updateAccordionAffordance(accordion, shouldHide) {
    const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
    const accordionButton = accordion.querySelector(APP_CONFIG.selectors.accordionButton);
    if (!header && !accordionButton) {
      return;
    }

    const expandedIcon = accordion.querySelector(APP_CONFIG.selectors.accordionExpandedIcon);
    if (expandedIcon) {
      expandedIcon.style.display = shouldHide ? 'none' : '';
      expandedIcon.style.visibility = shouldHide ? 'hidden' : '';
      expandedIcon.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    }

    accordion.querySelectorAll(`${APP_CONFIG.selectors.accordionTitle} button`).forEach((element) => {
      element.style.display = shouldHide ? 'none' : '';
      element.style.visibility = shouldHide ? 'hidden' : '';
      element.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    });

    if (header) {
      header.style.cursor = shouldHide ? 'default' : '';
    }

    if (accordionButton) {
      accordionButton.style.cursor = shouldHide ? 'default' : '';
    }
  }

  function forceAccordionOpen(accordion) {
    const header = accordion.querySelector(APP_CONFIG.selectors.accordionTitle);
    if (header && !accordion.classList.contains('Accordion__expanded')) {
      state.allowProgrammaticAccordionToggle = true;
      header.click();
      state.allowProgrammaticAccordionToggle = false;
    }
  }

  function startActiveAccordionLock(accordion, questionId) {
    if (state.activeAccordionObserver) {
      state.activeAccordionObserver.disconnect();
      state.activeAccordionObserver = null;
    }

    state.activeAccordionObserver = new MutationObserver(() => {
      const activeQuestionId = getNextPendingQuestionId();
      const shouldRemainOpen =
        state.studyState === 'main' &&
        activeQuestionId === questionId &&
        state.questionStatus[questionId] !== true;

      if (shouldRemainOpen && !accordion.classList.contains('Accordion__expanded')) {
        window.setTimeout(() => {
          forceAccordionOpen(accordion);
        }, 0);
      }
    });

    state.activeAccordionObserver.observe(accordion, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function syncQuestionSequence() {
    const activeQuestionId = state.studyState === 'main' ? getNextPendingQuestionId() : null;

    getAccordions().forEach((accordion) => {
      const questionId = getAccordionQuestionId(accordion);
      if (!questionId || !APP_CONFIG.questionIds.includes(questionId)) {
        return;
      }

      const shouldShow = questionId === activeQuestionId;
      updateAccordionAffordance(accordion, shouldShow);
      accordion.style.display = shouldShow ? '' : 'none';
      accordion.style.visibility = shouldShow ? 'visible' : 'hidden';
    });

    if (!activeQuestionId) {
      return;
    }

    const activeAccordion = getAccordionByQuestionId(activeQuestionId);
    if (!activeAccordion) {
      return;
    }

    startActiveAccordionLock(activeAccordion, activeQuestionId);

    window.setTimeout(() => {
      expandSupplementaryDetails();

      if (!activeAccordion.classList.contains('Accordion__expanded')) {
        forceAccordionOpen(activeAccordion);
        return;
      }

      handleExpandedAccordion(activeAccordion, activeQuestionId);
    }, 100);
  }

  async function persistStudyState() {
    await storageSet({
      currentState: state.studyState,
      questionStatus: state.questionStatus,
      questionTimings: state.questionTimings,
      studyStartTimestamp: state.studyStartTimestamp,
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
    if (state.studyState !== 'not_started' || state.startButtonRendered) {
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
      state.studyStartTimestamp = timestamp;
      await saveStartingToServer(state.u_id, timestamp, state.g_label, state.g_therory);
      await storageSet({ studyStartTimestamp: state.studyStartTimestamp });
      await startMainStudy();
      panel.remove();
      state.startButtonRendered = false;
    });

    panel.appendChild(button);

    const overlay = document.createElement('div');
    overlay.className = 'start-overlay';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.body.classList.add('study-not-started');
    state.startButtonRendered = true;
  }

  async function startMainStudy() {
    state.studyState = 'main';
    const overlay = document.querySelector('.start-overlay');
    if (overlay) {
      overlay.remove();
    }
    document.body.classList.remove('study-not-started');
    await persistStudyState();
    syncQuestionSequence();
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
        state.allowProgrammaticAccordionToggle = true;
        header.click();
        state.allowProgrammaticAccordionToggle = false;
      }
    });
  }

  function startQuestionTimer(accordion, questionId) {
    const timerDisplay = document.createElement('div');
    timerDisplay.style.marginTop = '10px';
    timerDisplay.style.padding = '12px 20px';
    timerDisplay.style.display = 'flex';
    timerDisplay.style.justifyContent = 'space-between';
    timerDisplay.style.alignItems = 'center';
    timerDisplay.style.gap = '15px';

    state.timeLeft = getInitialTimeLeft(questionId);

    const timeElement = document.createElement('span');
    timeElement.style.padding = '12px 20px';
    timeElement.style.backgroundColor = '#fff3cd';
    timeElement.style.border = '2px solid #ff9800';
    timeElement.style.borderRadius = '8px';
    timeElement.style.fontWeight = 'bold';
    timeElement.style.fontSize = '18px';
    timeElement.style.color = '#333';
    timeElement.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.3)';
    updateTimerText(timeElement, state.timeLeft);
    timerDisplay.appendChild(timeElement);

    const finishButton = document.createElement('button');
    finishButton.textContent = questionId === 'I.1.4' ? 'Finish' : 'Next Question';
    finishButton.style.padding = '8px 16px';
    finishButton.style.fontSize = '14px';
    finishButton.style.backgroundColor = '#dc3545';
    finishButton.style.color = 'white';
    finishButton.style.border = 'none';
    finishButton.style.borderRadius = '4px';
    finishButton.style.cursor = 'pointer';
    finishButton.addEventListener('click', async () => {
      await advanceQuestionSequence(questionId, 'Finish button clicked');
    });
    timerDisplay.appendChild(finishButton);

    accordion.appendChild(timerDisplay);
    state.currentTimerElement = timerDisplay;
    state.currentQuestionId = questionId;
    state.timerStartTime = Date.now();
    state.timerStatus = 'running';
    logQuestionStartedToServer(
      state.timerStartTime,
      questionId,
      state.u_id,
      state.g_label,
      state.g_therory,
    );

    state.currentTimer = window.setInterval(async () => {
      state.timeLeft -= 1;
      updateTimerText(timeElement, state.timeLeft);

      if (state.timeLeft > 0) {
        return;
      }

      await advanceQuestionSequence(questionId, 'Timer Ran out');
    }, 1000);
  }

  function getInitialTimeLeft(questionId) {
    if (state.debug) {
      return APP_CONFIG.debugQuestionTime;
    }

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

    if (state.activeAccordionObserver) {
      state.activeAccordionObserver.disconnect();
      state.activeAccordionObserver = null;
    }

    state.studyState = 'completed';
    await persistStudyState();
    syncQuestionSequence();

    if (state.studyStartTimestamp) {
      const timestamp = Date.now();
      const totalStudyTimeInSeconds = (timestamp - state.studyStartTimestamp) / 1000;
      logStudyCompletedToServer(
        timestamp,
        state.u_id,
        state.g_label,
        state.g_therory,
        totalStudyTimeInSeconds,
      );
    }

    alert('Test completed.\n\n Please proceed to the Qualtrics survey page!!');
    stopQuestionTimer('Test completed');
  }

  async function advanceQuestionSequence(questionId, log) {
    if (questionId in state.questionStatus) {
      state.questionStatus[questionId] = true;
    }

    await persistStudyState();
    stopQuestionTimer(log);
    syncQuestionSequence();
    await refreshQuestionStatus();

    if (getNextPendingQuestionId()) {
      syncQuestionSequence();
      return;
    }

    await completeTest();
  }

  function stopQuestionTimer(log) {
    if (!state.currentTimer) {
      return;
    }

    state.timerStatus = 'stopped';
    window.clearInterval(state.currentTimer);
    stopCodeLengthCollection();

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
        if (log === 'Finish button clicked' || log === 'Timer Ran out') {
          logQuestionFinishedToServer(
            timestamp,
            state.currentQuestionId,
            state.u_id,
            state.g_label,
            state.g_therory,
            timeSpent,
            log,
            state.codeLengths
          );
        }
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


    if (state.g_label === APP_CONFIG.modes.llm || state.g_label === APP_CONFIG.modes.llm_include_theory) {
      await handleLlmSubmission(submission, state.g_label);
      return;
    }

    else {
      await handleVanillaSubmission(submission);
      return;
    }
  

  }

  function handleVanillaSubmission(submission) {
    const calloutBlock = submission.accordion.querySelector(APP_CONFIG.selectors.calloutBlock);
    if (calloutBlock) {
      calloutBlock.style.display = 'none';
    }

    const stopWaiting = waitForEvaluationComplete(submission.accordion, async (errorElement) => {
      const calloutText = errorElement.textContent.trim();
      
      if (!calloutText) {
        return;
      }

      if (calloutBlock) {
        calloutBlock.style.display = '';
      }

      if (calloutText !== 'Correct!') {
        await saveToServer(
          submission.fullContent,
          submission.cmLineTexts,
          calloutText,
          state.u_id,
          submission.q_id,
          state.g_label,
          state.g_therory,
          submission.curTime,
          submission.correctAnswer,
          state.codeLengths,
        );
        return;
      }

      submission.correctAnswer = true;
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
    });
  }

  async function handleLlmSubmission(submission, g_label) {
    if (!submission.form.querySelector(APP_CONFIG.selectors.editorContainer)) {
      return;
    }

    const stopHidingCallout = observeAndHideCalloutBlock(submission.accordion);

    let llmReply = null;
    const llmPromise = getLLMResponse(submission.q_id, submission.fullContent, submission.cmLineTexts, g_label === APP_CONFIG.modes.llm_include_theory)
      .then(reply => {
        llmReply = reply;
        return reply;
      });

    const stopWaiting = waitForEvaluationComplete(submission.accordion, async (errorElement) => {
      const editorMessage = errorElement.textContent.trim();
      if (!editorMessage) {
        return;
      }

      submission.correctAnswer = editorMessage === 'Correct!';
      const calloutBlock = submission.accordion.querySelector(APP_CONFIG.selectors.calloutBlock);

      if (editorMessage === 'Correct!') {
        stopHidingCallout();
        if (calloutBlock) {
          calloutBlock.style.visibility = 'visible';
        }
      } else {
        try {
          const finalLlmReply = await Promise.race([
            llmPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('LLM timeout')), 10000)
            ),
          ]);

          if (finalLlmReply) {
            llmReply = finalLlmReply;
            errorElement.textContent = editorMessage;
            
            // Create or update LLM reply element
            let llmReplyElement = errorElement.nextElementSibling;
            if (!llmReplyElement || !llmReplyElement.classList.contains('llm-reply-element')) {
              llmReplyElement = document.createElement('div');
              llmReplyElement.classList.add('llm-reply-element');
              llmReplyElement.style.display = 'none';
              errorElement.parentNode.insertBefore(llmReplyElement, errorElement.nextSibling);
            }
            
            //console.log('LLM reply:', llmReply);
            
            // Handle JSON replies with CONCEPT and HINT keys
            let htmlContent = '';
            try {
              let jsonReply;
              if (typeof llmReply === 'string') {
                // Fix invalid JSON with unescaped newlines in string values
                // First, escape unescaped newlines within quoted strings
                const fixedReply = llmReply.replace(/:\s*"([^"]*)"/g, (match) => {
                  const cleaned = match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                  return cleaned;
                });
                jsonReply = JSON.parse(fixedReply);
              } else {
                jsonReply = llmReply;
              }
              
              if (jsonReply && typeof jsonReply === 'object') {
                // Convert LaTeX in CONCEPT and HINT to HTML
                if (jsonReply.CONCEPT) {
                  jsonReply.CONCEPT = jsonReply.CONCEPT;
                }
                if (jsonReply.HINT) {
                  jsonReply.HINT = jsonReply.HINT;
                }
                
                htmlContent += `
                  <div class="llm-container" style="display: flex; gap: 16px; align-items: flex-start;">
                    <div class="llm-content" style="flex: 1;">
                `;
                if (jsonReply.CONCEPT) {
                  htmlContent += `<div class="llm-concept" style="margin-bottom: 12px;">${jsonReply.CONCEPT}</div>`;
                }
                if (jsonReply.HINT) {
                  htmlContent += `<div class="llm-hint"><strong>Hint:</strong><br>${jsonReply.HINT}</div>`;
                }
                htmlContent += `
                    </div>
                  </div>
                `;
              }
            } catch (e) {
              // If not JSON, treat as plain text
              htmlContent = `<div>${llmReply}</div>`;
            }
            
            if (!htmlContent) {
              htmlContent = `<div>${llmReply}</div>`;
            }
            
            llmReplyElement.innerHTML = htmlContent;
            llmReplyElement.style.color = '#0066cc';
            llmReplyElement.style.fontWeight = 'normal';
            llmReplyElement.style.marginTop = '8px';
            llmReplyElement.style.display = 'block';
            llmReplyElement.style.padding = '12px';
            llmReplyElement.style.border = '1px solid #e0e0e0';
            llmReplyElement.style.borderRadius = '4px';
            llmReplyElement.style.backgroundColor = '#f5f5f5';
            
            stopHidingCallout();
            if (calloutBlock) {
              calloutBlock.style.visibility = 'visible';
            }
          }
        } catch (error) {
          console.error('Error waiting for LLM response:', error);
            errorElement.textContent = editorMessage;
            errorElement.style.color = '#d00';
            errorElement.style.fontWeight = 'bold';

                        // Create or update LLM reply element
            let llmReplyElement = errorElement.nextElementSibling;
            if (!llmReplyElement || !llmReplyElement.classList.contains('llm-reply-element')) {
              llmReplyElement = document.createElement('div');
              llmReplyElement.classList.add('llm-reply-element');
              llmReplyElement.style.display = 'none';
              errorElement.parentNode.insertBefore(llmReplyElement, errorElement.nextSibling);
            }
            llmReplyElement.textContent = 'QuantumTutor reply unavailable.';
            llmReplyElement.style.color = '#0066cc';
            llmReplyElement.style.fontWeight = 'normal';
            llmReplyElement.style.marginTop = '8px';
            llmReplyElement.style.display = 'block';
            llmReplyElement.style.padding = '12px';
            llmReplyElement.style.border = '1px solid #e0e0e0';
            llmReplyElement.style.borderRadius = '4px';
            llmReplyElement.style.backgroundColor = '#f5f5f5';

            stopHidingCallout();
            if (calloutBlock) {
              calloutBlock.style.visibility = 'visible';
        }
      }
    }

      // Clean up hintResponse by removing markdown code block wrapper if present
      const hintResponse = removeMarkdownCodeBlockWrapper(llmReply || editorMessage);

      await saveToServer(
        submission.fullContent,
        submission.cmLineTexts,
        hintResponse,
        state.u_id,
        submission.q_id,
        state.g_label,
        state.g_therory,
        submission.curTime,
        submission.correctAnswer,
        state.codeLengths,
        editorMessage,
        llmReply,
      );
    });
  }

  window.QuantumTutorApp = {
    startMainStudy,
    closeQuestion,
    stopQuestionTimer,
  };

  initialize();
})();

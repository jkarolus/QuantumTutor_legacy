function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(payload) {
  return new Promise((resolve) => {
    chrome.storage.local.set(payload, resolve);
  });
}

function storageClear() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

function removeMarkdownCodeBlockWrapper(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Remove markdown code block wrapper: ```json ... ``` or just ``` ... ```
  let cleaned = text.trim();
  
  // Match ``` with optional json language specifier
  const codeBlockPattern = /^```(?:json)?\s*[\n\r]+([\s\S]*?)[\n\r]*```\s*$/;
  const match = cleaned.match(codeBlockPattern);
  
  if (match && match[1]) {
    cleaned = match[1].trim();
  }
  
  return cleaned;
}

function getAccordions() {
  return Array.from(document.querySelectorAll(APP_CONFIG.selectors.accordion));
}

function parseQueryParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const theoryMode = params.get('theory') || params.get('therory') || APP_CONFIG.theoryModes.hideTheory;

  // Get u_id with fallback: "not_provided" + current date and time
  const u_id = params.get('user') || (() => {
    const now = new Date();
    const timestamp = now.toISOString(); // Format: 2026-05-07T14:30:45.123Z
    return `not_provided_${timestamp}`;
  })();

  // Get g_label with random fallback selection
  let g_label = params.get('type');
  let g_therory = theoryMode;

  if (!g_label) {
    // Randomly select between 3 combinations
    const combinations = [
      { g_label: APP_CONFIG.modes.vanilla, g_therory: APP_CONFIG.theoryModes.legacy },
      { g_label: APP_CONFIG.modes.llm, g_therory: APP_CONFIG.theoryModes.legacy },
      { g_label: APP_CONFIG.modes.llm, g_therory: APP_CONFIG.theoryModes.hideTheory },
    ];
    
    const randomIndex = Math.floor(Math.random() * combinations.length);
    const selectedCombination = combinations[randomIndex];
    
    g_label = selectedCombination.g_label;
    g_therory = selectedCombination.g_therory;
  }

  return {
    u_id,
    g_label,
    g_therory,
    debug: params.get('debug') === 'true',
  };
}

function applyTheoryLayout(theoryMode) {
  if (theoryMode !== APP_CONFIG.theoryModes.hideTheory) {
    return null;
  }

  const hideElement = (element) => {
    if (!element) {
      return;
    }

    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.width = '0';
    element.style.maxWidth = '0';
    element.style.minWidth = '0';
    element.style.margin = '0';
    element.style.padding = '0';
    element.style.border = '0';
    element.style.flex = '0 0 0';
    element.setAttribute('aria-hidden', 'true');
  };

  const hideRightSection = () => {
    const rightSection = document.querySelector(APP_CONFIG.selectors.rightTheorySection);
    if (!rightSection) {
      return false;
    }

    hideElement(rightSection);
    hideElement(rightSection.parentElement);
    return true;
  };

  const hideRelatedTheoryButtons = () => {
    let hiddenCount = 0;

    document.querySelectorAll('button').forEach((button) => {
      const label = button.textContent?.trim().toLowerCase();
      if (!label || !label.includes('open related theory')) {
        return;
      }

      hideElement(button);
      hiddenCount += 1;
    });

    return hiddenCount > 0;
  };

  hideRightSection();
  hideRelatedTheoryButtons();

  const observer = new MutationObserver(() => {
    hideRightSection();
    hideRelatedTheoryButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

function expandSupplementaryDetails() {
  document.querySelectorAll('details').forEach((detailsElement) => {
    const summary = detailsElement.querySelector('summary');
    const summaryText = summary?.textContent?.trim().toLowerCase() || '';

    if (!summaryText.startsWith('hint') && !summaryText.startsWith('example')) {
      return;
    }

    detailsElement.open = true;
    detailsElement.setAttribute('open', '');

    if (summary && !summary.dataset.quantumTutorLockedOpen) {
      summary.dataset.quantumTutorLockedOpen = 'true';
      summary.addEventListener('click', (event) => {
        event.preventDefault();
        detailsElement.open = true;
        detailsElement.setAttribute('open', '');
      });
    }

    if (!detailsElement.dataset.quantumTutorLockedOpen) {
      detailsElement.dataset.quantumTutorLockedOpen = 'true';
      detailsElement.addEventListener('toggle', () => {
        if (!detailsElement.open) {
          detailsElement.open = true;
          detailsElement.setAttribute('open', '');
        }
      });
    }
  });
}

function collectQuestionContent(questionContainer) {
  const content = [];

  questionContainer.querySelectorAll('p').forEach((paragraph) => {
    content.push(paragraph.textContent.trim());
  });

  questionContainer.querySelectorAll('code').forEach((code) => {
    content.push(code.textContent.trim());
  });

  questionContainer.querySelectorAll('img').forEach((image) => {
    content.push(`Image: ${image.src}`);
  });

  return content.join('\n');
}

function collectCodeLines(form) {
  return Array.from(form.querySelectorAll(APP_CONFIG.selectors.codeLine)).map((line) => line.textContent.trim());
}

function getAccordionQuestionId(accordion) {
  const heading = accordion.querySelector(APP_CONFIG.selectors.accordionTitleHeading);
  if (!heading) {
    return null;
  }

  return heading.textContent.split(' ')[1] || null;
}

function pollForEditorMessage(accordion, callback, intervalMs = 500) {
  return setInterval(() => {
    const messageElement = accordion.querySelector(APP_CONFIG.selectors.editorMessage);
    if (messageElement) {
      callback(messageElement);
    }
  }, intervalMs);
}

function observeEditorMessage(accordion, callback, intervalMs = 50) {
  let messageElement = accordion.querySelector(APP_CONFIG.selectors.editorMessage);
  let messageObserver = null;
  let pollingId = null;

  const runCallback = () => {
    if (!messageElement) {
      return;
    }

    callback(messageElement);
  };

  const attachObserver = () => {
    if (!messageElement || messageObserver) {
      return;
    }

    messageObserver = new MutationObserver(runCallback);
    messageObserver.observe(messageElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  };

  if (messageElement) {
    attachObserver();
  } else {
    pollingId = window.setInterval(() => {
      messageElement = accordion.querySelector(APP_CONFIG.selectors.editorMessage);
      if (!messageElement) {
        return;
      }

      window.clearInterval(pollingId);
      pollingId = null;
      attachObserver();
      runCallback();
    }, intervalMs);
  }

  return () => {
    if (pollingId) {
      window.clearInterval(pollingId);
    }
    if (messageObserver) {
      messageObserver.disconnect();
    }
  };
}

function observeAndHideCalloutBlock(accordion) {
  const calloutBlock = accordion.querySelector(APP_CONFIG.selectors.calloutBlock);
  if (calloutBlock) {
    calloutBlock.style.visibility = 'hidden';
  }
  
  const llmReplyElement = accordion.querySelector('.llm-reply-element');
  if (llmReplyElement) {
    llmReplyElement.style.display = 'none';
  }

  const observer = new MutationObserver(() => {
    const block = accordion.querySelector(APP_CONFIG.selectors.calloutBlock);
    if (block && block.style.visibility !== 'hidden') {
      block.style.visibility = 'hidden';
    }
    
    const llmReply = accordion.querySelector('.llm-reply-element');
    if (llmReply && llmReply.style.display !== 'none') {
      llmReply.style.display = 'none';
    }
  });

  observer.observe(accordion, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
  };
}

function waitForEvaluationComplete(accordion, callback, pollIntervalMs = 100) {
  let overlayCheckId = null;
  let hasSeenOverlay = false;
  let timeoutId = null;

  const checkOverlay = () => {
    const overlay = accordion.querySelector(APP_CONFIG.selectors.overlay);
    
    if (overlay) {
      hasSeenOverlay = true;
      return;
    }

    if (hasSeenOverlay) {
      window.clearInterval(overlayCheckId);
      overlayCheckId = null;
      
      timeoutId = window.setTimeout(() => {
        const messageElement = accordion.querySelector(APP_CONFIG.selectors.editorMessage);
        if (messageElement) {
          callback(messageElement);
        }
      }, 100);
    }
  };

  overlayCheckId = window.setInterval(checkOverlay, pollIntervalMs);

  return () => {
    if (overlayCheckId) {
      window.clearInterval(overlayCheckId);
    }
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: APP_CONFIG.requestHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
}

async function saveToServer(question, solution, hintResponse, uid, questionId, condition, theoryState, timestamp, correctAnswer, codeLength, editorMessage = null, llmReply = null) {
  const cleanCode = solution.map((line) => line.trim()).filter((line) => line !== '');
  const fullCode = cleanCode.join('\n');

  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: uid,
      condition: condition,
      theory_condition: theoryState,
      event: "SUBMIT_CLICK",
      q_id: questionId,
      question,
      fullCode,
      hintResponse,
      editorMessage,
      llmReply,
      correctAnswer,
      'Code length': codeLength,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function saveStartingToServer(uid, timestamp, condition, theoryState) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: uid,
      condition: condition,
      theory_condition: theoryState,
      event: "STUDY_START"
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function logQuestionStartedToServer(timestamp, questionId, userId, condition, theoryState) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      q_id: questionId,
      event: "QUESTION_STARTED",
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function logWindowFocusChangeToServer(timestamp, questionId, userId, condition, theoryState, eventType, timeSpentSeconds) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      q_id: questionId,
      event: eventType,
      time_spent_in_sec: timeSpentSeconds,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

function observeWindowFocusEvents(questionId, userId, condition, theoryState, timerStartTime) {
  const handleFocus = () => {
    const timeSpentSeconds = timerStartTime ? (Date.now() - timerStartTime) / 1000 : 0;
    logWindowFocusChangeToServer(Date.now(), questionId, userId, condition, theoryState, 'WINDOW_FOCUS', timeSpentSeconds);
  };

  const handleBlur = () => {
    const timeSpentSeconds = timerStartTime ? (Date.now() - timerStartTime) / 1000 : 0;
    logWindowFocusChangeToServer(Date.now(), questionId, userId, condition, theoryState, 'WINDOW_BLUR', timeSpentSeconds);
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);

  return () => {
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
  };
}

async function logCopyPasteUsedToServer(timestamp, questionId, userId, condition, theoryState, pastedText, timeSpentSeconds) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      q_id: questionId,
      event: "COPY_PASTE_USED",
      pasted_text: pastedText,
      time_spent_in_sec: timeSpentSeconds,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

function observePasteEvents(accordion, questionId, userId, condition, theoryState, timerStartTime) {
  const handlePaste = (event) => {
    let pastedText = '';
    
    if (event.clipboardData) {
      pastedText = event.clipboardData.getData('text/plain');
      
      if (pastedText) {
        pastedText = pastedText
          .replace(/[\x00-\x1F\x7F]/g, (char) => {
            if (char === '\t' || char === '\n' || char === '\r') {
              return char;
            }
            return '';
          })
          .trim();
      }
    }
    
    const timeSpentSeconds = timerStartTime ? (Date.now() - timerStartTime) / 1000 : 0;
    logCopyPasteUsedToServer(Date.now(), questionId, userId, condition, theoryState, pastedText, timeSpentSeconds);
  };

  const codeEditorElement = accordion.querySelector(APP_CONFIG.selectors.editorContainer);
  if (!codeEditorElement) {
    return () => {};
  }

  codeEditorElement.addEventListener('paste', handlePaste);

  return () => {
    codeEditorElement.removeEventListener('paste', handlePaste);
  };
}

async function logQuestionFinishedToServer(timestamp, questionId, userId, condition, theoryState, timeSpentSeconds, finishReason, codeLength) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      q_id: questionId,
      time_spent_in_sec: timeSpentSeconds,
      finish_reason: finishReason,
      event: "QUESTION_FINISHED",
      'Code length': codeLength,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function logStudyCompletedToServer(timestamp, userId, condition, theoryState, timeSpentSeconds) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      time_spent_in_sec: timeSpentSeconds,
      event: "STUDY_FINISHED",
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function logOpenRelatedTheoryToServer(timestamp, questionId, userId, condition, theoryState, timeSpentSeconds) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      timestamp,
      u_id: userId,
      condition: condition,
      theory_condition: theoryState,
      q_id: questionId,
      event: "OPEN_RELATED_THEORY",
      time_spent_in_sec: timeSpentSeconds
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function getLLMResponse(question_id, question, solution, include_theory) {
  const cleanCode = solution.map((line) => line.trim()).filter((line) => line !== '');
  const fullCode = cleanCode.join('\n');

  try {
    const response = await postJson(APP_CONFIG.endpoints.llm, {
      body: {
        question_id,
        question,
        fullCode,
        include_theory
      },
    });

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error communicating with server:', error);
    return null;
  }
}

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

function getAccordions() {
  return Array.from(document.querySelectorAll(APP_CONFIG.selectors.accordion));
}

function parseQueryParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const theoryMode = params.get('theory') || params.get('therory') || APP_CONFIG.theoryModes.legacy;

  return {
    u_id: params.get('user') || '',
    g_label: params.get('type') || '',
    g_therory: theoryMode,
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

async function saveToServer(question, solution, hintResponse, uid, qid, cid, timestamp, correctAnswer, codeLength) {
  const cleanCode = solution.map((line) => line.trim()).filter((line) => line !== '');
  const fullCode = cleanCode.join('\n');

  try {
    await postJson(APP_CONFIG.endpoints.save, {
      u_id: uid,
      timestamp,
      Question_ID: cid,
      question,
      fullCode,
      hintResponse,
      correctAnswer,
      'Code length': codeLength,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function saveStartingToServer(uid, timestamp, cid) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      User_ID: uid,
      timestamp,
      Question_ID: cid,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function saveTimeSpentToServer(questionId, userId, questionType, timeSpentMinutes, log) {
  try {
    await postJson(APP_CONFIG.endpoints.save, {
      question: questionId,
      'User ID': userId,
      'Question ID': questionType,
      'Time Spent': timeSpentMinutes,
      log,
    });
  } catch (error) {
    console.error('Error communicating with server:', error);
  }
}

async function getLLMResponse(question, solution) {
  const cleanCode = solution.map((line) => line.trim()).filter((line) => line !== '');
  const fullCode = cleanCode.join('\n');

  try {
    const response = await postJson(APP_CONFIG.endpoints.llm, {
      body: {
        question,
        fullCode,
      },
    });

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error communicating with server:', error);
    return null;
  }
}

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
  return {
    u_id: params.get('user') || '',
    g_label: params.get('type') || '',
    g_therory: params.get('therory') || APP_CONFIG.theoryModes.legacy,
  };
}

function applyTheoryLayout(theoryMode) {
  if (theoryMode !== APP_CONFIG.theoryModes.hideTheory) {
    return null;
  }

  const hideRightSection = () => {
    const rightSection = document.querySelector(APP_CONFIG.selectors.rightTheorySection);
    if (!rightSection) {
      return false;
    }

    rightSection.style.display = 'none';
    rightSection.style.visibility = 'hidden';
    rightSection.setAttribute('aria-hidden', 'true');
    return true;
  };

  if (hideRightSection()) {
    return null;
  }

  const observer = new MutationObserver(() => {
    if (hideRightSection()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
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

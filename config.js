const APP_CONFIG = {
  modes: {
    vanilla: 'mkjn',
    llm: 'bhgv',
    llm_include_theory: 'dkue',
  },
  theoryModes: {
    legacy: 'jrkl',
    hideTheory: 'eism',
  },
  questionIds: ['I.1.1', 'I.1.2', 'I.1.3', 'I.1.4'],
  questionTime: {
    'I.1.1': 5 * 60,
    'I.1.2': 5 * 60,
    'I.1.3': 5 * 60,
    'I.1.4': 5 * 60,
  },
  debugQuestionTime: 10,
  storageKeys: ['currentState', 'questionStatus', 'g_label', 'g_therory', 'questionTimings', 'u_id', 'studyStartTimestamp', 'debug'],
  selectors: {
    accordion: '.CoderciseList .Accordion',
    accordionButton: '[data-testid="accordion-button"]',
    accordionTitle: '.Accordion__title',
    accordionTitleHeading: '.Accordion__title h2',
    accordionExpandedIcon: '[data-testid="accordion-button"] .ExpandedIcon',
    codeLine: '.cm-line',
    compareButton: '.CoderciseEditor__show-solutions-button',
    editorContainer: '.CoderciseEditor__container',
    editorMessage: '.CoderciseEditor > div > div',
    overlay: '.CoderciseList .Accordion .CoderciseEditorOverlay',
    calloutBlock: '.CalloutBlock',
    questionContainer: '.CoderciseDescription__container',
    summary: '#topic-codercise-container summary',
    startPanel: '.floating-panel',
    rightTheorySection: '#topic-theory-container',
  },
  endpoints: {
    save: 'https://survey.dfki.de/quantumtutor',
    llm: 'https://survey.dfki.de/quantumtutorllm',
  },
  requestHeaders: {
    'Content-Type': 'application/json',
    Authorization: 'mysecret123test',
  },
};

const DEFAULT_QUESTION_STATUS = APP_CONFIG.questionIds.reduce((acc, questionId) => {
  acc[questionId] = false;
  return acc;
}, {});

const DEFAULT_QUESTION_TIMINGS = APP_CONFIG.questionIds.reduce((acc, questionId) => {
  acc[questionId] = 0.0;
  return acc;
}, {});

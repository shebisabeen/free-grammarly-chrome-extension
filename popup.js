// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

function getGeminiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

function setGeminiKey(key) {
  localStorage.setItem('gemini_api_key', key);
}

document.getElementById('fixBtn').addEventListener('click', async () => {
  const inputText = document.getElementById('inputText').value;
  const outputText = document.getElementById('outputText');
  outputText.value = 'Checking...';

  const GEMINI_API_KEY = getGeminiKey();
  if (!GEMINI_API_KEY) {
    outputText.value = 'Please set your Gemini API key in Settings.';
    return;
  }

  try {
    const prompt = `Correct the grammar of this sentence: "${inputText}". Only return the corrected sentence, nothing else.`;
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });
    const data = await response.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      outputText.value = data.candidates[0].content.parts[0].text.trim();
      addToHistory(inputText, outputText.value);
    } else if (data.error && data.error.message) {
      outputText.value = 'API Error: ' + data.error.message;
    } else {
      outputText.value = 'Unexpected API response.';
    }
  } catch (err) {
    outputText.value = 'Error: Could not check grammar.';
  }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const outputText = document.getElementById('outputText');
  outputText.select();
  document.execCommand('copy');
});

// Settings section logic
const settingsBtn = document.getElementById('settingsBtn');
const settingsSection = document.getElementById('settingsSection');
const geminiKeyInput = document.getElementById('geminiKeyInput');
const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
const geminiKeyStatus = document.getElementById('geminiKeyStatus');
const versionInfo = document.getElementById('versionInfo');

settingsBtn.addEventListener('click', () => {
  if (settingsSection.style.display === 'none') {
    settingsSection.style.display = 'block';
    geminiKeyInput.value = getGeminiKey();
    geminiKeyStatus.textContent = '';
    // Load version from manifest.json
    fetch(chrome.runtime.getURL('manifest.json'))
      .then(response => response.json())
      .then(manifest => {
        versionInfo.textContent = 'Version: ' + manifest.version;
      })
      .catch(() => {
        versionInfo.textContent = 'Version: 1.0.0';
      });
  } else {
    settingsSection.style.display = 'none';
  }
});

saveGeminiKeyBtn.addEventListener('click', () => {
  const key = geminiKeyInput.value.trim();
  if (key) {
    setGeminiKey(key);
    geminiKeyStatus.textContent = 'Gemini key saved!';
    geminiKeyStatus.style.color = 'green';
  } else {
    geminiKeyStatus.textContent = 'Please enter a Gemini API key.';
    geminiKeyStatus.style.color = 'red';
  }
});

// --- History logic ---
const HISTORY_KEY = 'grammar_history';
const MAX_HISTORY = 20;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function addToHistory(original, corrected) {
  let history = getHistory();
  history.unshift({ original, corrected, ts: Date.now() });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
  const section = document.getElementById('historySection');
  section.innerHTML = '';
  const history = getHistory();
  if (history.length === 0) {
    section.innerHTML = '<div style="color:#888;text-align:center;">No history yet.</div>';
    return;
  }
  history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '12px';
    div.style.padding = '6px 0';
    div.style.borderBottom = '1px solid #eee';
    div.innerHTML =
      `<div style='font-size:0.95em; color:#555;'><b>Original:</b> ${escapeHtml(item.original)}</div>` +
      `<div style='font-size:0.95em; color:#222; margin:4px 0 2px 0;'><b>Fixed:</b> <span id='fixedText${idx}'>${escapeHtml(item.corrected)}</span></div>` +
      `<button data-idx='${idx}' class='copyHistoryBtn' style='padding:2px 8px;font-size:0.95em;'>Copy</button>`;
    section.appendChild(div);
  });
  // Attach copy listeners
  Array.from(document.getElementsByClassName('copyHistoryBtn')).forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = btn.getAttribute('data-idx');
      const text = history[idx].corrected;
      copyToClipboard(text);
    });
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(tag) {
    const charsToReplace = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    };
    return charsToReplace[tag] || tag;
  });
}

function copyToClipboard(text) {
  // Use a temp textarea for compatibility
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

const historyBtn = document.getElementById('historyBtn');
const historySection = document.getElementById('historySection');

historyBtn.addEventListener('click', () => {
  if (historySection.style.display === 'none') {
    historySection.style.display = 'block';
    renderHistory();
  } else {
    historySection.style.display = 'none';
  }
});

const homeBtn = document.getElementById('homeBtn');
const navBtns = [homeBtn, historyBtn, settingsBtn];
const mainSection = document.getElementById('mainSection');

function showSection(section) {
  // Hide all
  mainSection.classList.remove('active');
  historySection.classList.remove('active');
  settingsSection.classList.remove('active');
  homeBtn.classList.remove('active');
  historyBtn.classList.remove('active');
  settingsBtn.classList.remove('active');
  mainSection.style.display = 'none';
  historySection.style.display = 'none';
  settingsSection.style.display = 'none';
  // Show one
  if (section === 'main') {
    mainSection.classList.add('active');
    homeBtn.classList.add('active');
    mainSection.style.display = 'block';
  } else if (section === 'history') {
    historySection.classList.add('active');
    historyBtn.classList.add('active');
    historySection.style.display = 'block';
    renderHistory();
  } else if (section === 'settings') {
    settingsSection.classList.add('active');
    settingsBtn.classList.add('active');
    settingsSection.style.display = 'block';
    geminiKeyInput.value = getGeminiKey();
    geminiKeyStatus.textContent = '';
    fetch(chrome.runtime.getURL('manifest.json'))
      .then(response => response.json())
      .then(manifest => {
        versionInfo.textContent = 'Version: ' + manifest.version;
      })
      .catch(() => {
        versionInfo.textContent = 'Version: 1.0.0';
      });
  }
}

// Nav button handlers (tab behavior, not toggle)
homeBtn.addEventListener('click', () => showSection('main'));
historyBtn.addEventListener('click', () => showSection('history'));
settingsBtn.addEventListener('click', () => showSection('settings'));

// Show main section by default
showSection('main');

function sendMessageToTab(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action });
    }
  });
}

document.getElementById('btn-rewind').addEventListener('click', () => {
  sendMessageToTab('rewind');
});

document.getElementById('btn-decrease').addEventListener('click', () => {
  sendMessageToTab('decrease');
});

document.getElementById('btn-increase').addEventListener('click', () => {
  sendMessageToTab('increase');
});

document.getElementById('btn-forward').addEventListener('click', () => {
  sendMessageToTab('forward');
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.speed) {
    document.getElementById('current-speed').innerText = message.speed;
  }
});
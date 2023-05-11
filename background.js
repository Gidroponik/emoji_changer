let emojis;

const loadEmojis = async () => {
  const response = await fetch(chrome.runtime.getURL('emoji.json'));
  emojis = await response.json();
};

loadEmojis();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEmojis') {
    sendResponse(emojis);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

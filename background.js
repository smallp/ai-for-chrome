let currentWsUrl = 'ws://localhost:6789';

// Initialize currentWsUrl on startup if URL exists
chrome.storage.local.get(['wsUrl'], (result) => {
  if (result.wsUrl) {
    currentWsUrl = result.wsUrl;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchHTML') {
    handleFetchHTML(request.url, sendResponse);
    return true;
  } else if (request.action === 'connectWs') {
    currentWsUrl = request.url;
    chrome.storage.local.set({ wsUrl: request.url });
    setupOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'connectWs',
        url: request.url
      });
    });
    sendResponse({ success: true });
  } else if (request.action === 'disconnectWs') {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'disconnectWs'
    });
    sendResponse({ success: true });
  } else if (request.action === 'getWsStatus') {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'getWsStatus'
    }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 3, url: currentWsUrl }); // WebSocket.CLOSED = 3
      } else {
        sendResponse(response);
      }
    });
    return true;
  } else if (request.action === 'executeTask') {
    handleFetchTask(request.taskId, request.url, request.wait);
  }
});

async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER'], // Closest reason for persistent background task
    justification: 'Keep WebSocket connection alive and handle tasks'
  });
}

async function handleFetchTask(taskId, targetUrl, wait) {
  console.log(`Background fetching: ${targetUrl} (ID: ${taskId})`);

  try {
    const tab = await chrome.tabs.create({ url: targetUrl, active: false });

    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).then((results) => {
            if (results && results[0]) {
              chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'sendResponseToWs',
                taskId: taskId,
                data: results[0].result
              });
            }
            chrome.tabs.remove(tab.id);
          }).catch((err) => {
            console.error('Script injection error:', err);
            chrome.tabs.remove(tab.id);
          });
        }, wait * 1000);
      }
    });
  } catch (error) {
    console.error('Fetch task error:', error);
  }
}

async function handleFetchHTML(url, sendResponse) {
  try {
    const tab = await chrome.tabs.create({ url: url, active: false });
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then((results) => {
          if (results && results[0]) {
            sendResponse({ success: true, html: results[0].result });
          } else {
            sendResponse({ success: false, error: 'Failed to get HTML' });
          }
          chrome.tabs.remove(tab.id);
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
          chrome.tabs.remove(tab.id);
        });
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

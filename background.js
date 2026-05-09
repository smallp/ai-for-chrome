let socket = null;
let currentWsUrl = 'ws://localhost:6789';

// Initialize currentWsUrl on startup if URL exists (but don't connect automatically)
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
    connectWebSocket(request.url);
    sendResponse({ success: true });
  } else if (request.action === 'disconnectWs') {
    if (socket) {
      socket.close();
    }
    sendResponse({ success: true });
  } else if (request.action === 'getWsStatus') {
    sendResponse({
      status: socket ? socket.readyState : WebSocket.CLOSED,
      url: currentWsUrl
    });
  }
});

function connectWebSocket(url) {
  if (socket) {
    socket.close();
  }

  try {
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('WebSocket Connected to:', url);
      broadcastStatus();
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      broadcastStatus();
      socket = null;
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      broadcastStatus();
      socket = null;
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(event.data)
        if (message.task === 'featchUrl' && message.data && message.data.url) {
          handleFetchTask(message.id, message.data.url);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };
  } catch (error) {
    console.error('Socket creation error:', error);
    socket = null;
  }
}

function broadcastStatus() {
  // Notify popup if it's open
  chrome.runtime.sendMessage({
    action: 'wsStatusChanged',
    status: socket ? socket.readyState : WebSocket.CLOSED
  }).catch(() => {
    // Ignore error if popup is not open
  });
}

async function handleFetchTask(taskId, targetUrl) {
  console.log(`Background fetching: ${targetUrl} (ID: ${taskId})`);

  try {
    // We use a local version of handleFetchHTML logic here since we're already in background
    const tab = await chrome.tabs.create({ url: targetUrl, active: false });

    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then((results) => {
          if (results && results[0] && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              task: 'response',
              id: taskId,
              data: results[0].result
            }));
            console.log(`Result sent for ID: ${taskId}`);
          }
          // Close the tab after fetching
          chrome.tabs.remove(tab.id);
        }).catch((err) => {
          console.error('Script injection error:', err);
          chrome.tabs.remove(tab.id);
        });
      }
    });
  } catch (error) {
    console.error('Fetch task error:', error);
  }
}

// Basic handleFetchHTML for direct popup requests (if any still exist)
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

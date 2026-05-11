let socket = null;
let currentWsUrl = '';

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen') return;

  if (request.action === 'connectWs') {
    currentWsUrl = request.url;
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
  } else if (request.action === 'sendResponseToWs') {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        task: 'response',
        id: request.taskId,
        data: request.data
      }));
      console.log(`Result sent for ID: ${request.taskId}`);
    }
  }
});

function connectWebSocket(url, isRetry = false) {
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

      // Attempt to reconnect once after 5 seconds if this wasn't already a retry
      if (!isRetry && currentWsUrl === url) {
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(() => {
          if (!socket && currentWsUrl === url) {
            connectWebSocket(url, true);
          }
        }, 5000);
      }
    };

    socket.onerror = (error) => {
      broadcastStatus();
      socket = null;
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', event.data);
        if (message.task === 'featchUrl' && message.data && message.data.url) {
          // Send to background to handle the tab creation and script injection
          chrome.runtime.sendMessage({
            action: 'executeTask',
            taskId: message.id,
            url: message.data.url,
            wait: message.data.wait || 0
          });
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };
  } catch (error) {
    socket = null;
    broadcastStatus();
  }
}

function broadcastStatus() {
  chrome.runtime.sendMessage({
    action: 'wsStatusChanged',
    status: socket ? socket.readyState : WebSocket.CLOSED,
    url: currentWsUrl
  }).catch(() => {
    // Ignore error if nothing is listening
  });
}

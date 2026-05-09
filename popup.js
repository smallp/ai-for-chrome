const wsConnectBtn = document.getElementById('wsConnectBtn');
const wsStatusDiv = document.getElementById('wsStatus');
const wsInput = document.getElementById('wsInput');
const statusDiv = document.getElementById('status');

function updateWsStatus(readyState) {
  if (readyState === WebSocket.OPEN) {
    wsStatusDiv.textContent = 'Connected';
    wsStatusDiv.className = 'status-connected';
    wsConnectBtn.textContent = 'Disconnect WebSocket';
    wsConnectBtn.style.backgroundColor = '#dc3545';
    statusDiv.textContent = 'Active and listening for tasks...';
  } else if (readyState === WebSocket.CONNECTING) {
    wsStatusDiv.textContent = 'Connecting...';
    wsStatusDiv.className = 'status-connecting';
    wsConnectBtn.textContent = 'Connect WebSocket';
    wsConnectBtn.style.backgroundColor = '#007bff';
  } else {
    wsStatusDiv.textContent = 'Disconnected';
    wsStatusDiv.className = 'status-disconnected';
    wsConnectBtn.textContent = 'Connect WebSocket';
    wsConnectBtn.style.backgroundColor = '#007bff';
  }
}

// Initial state from background
chrome.runtime.sendMessage({ action: 'getWsStatus' }, (response) => {
  if (response) {
    if (response.url) {
      wsInput.value = response.url;
    }
    updateWsStatus(response.status);
  }
});

// Listen for status changes from background
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'wsStatusChanged') {
    updateWsStatus(request.status);
  }
});

wsConnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'getWsStatus' }, (response) => {
    if (response && (response.status === WebSocket.OPEN || response.status === WebSocket.CONNECTING)) {
      chrome.runtime.sendMessage({ action: 'disconnectWs' });
    } else {
      const url = wsInput.value;
      if (!url) {
        alert('Please enter a WebSocket URL');
        return;
      }
      chrome.runtime.sendMessage({ action: 'connectWs', url: url });
    }
  });
});
// document.getElementById('test').addEventListener('click', () => {
//   chrome.runtime.sendMessage({ action: 'fetchHTML', url: 'https://www.zhihu.com/hot' }, (response) => {
//     console.log(response);
//   });
// });

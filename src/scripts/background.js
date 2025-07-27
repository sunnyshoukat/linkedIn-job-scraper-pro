let tabMonitoring = {
  isActive: false,
  capturedUrl: null,
  initialTabs: new Set(),
  timeoutId: null,
  pendingTabs: new Set(),
  urlCheckIntervals: new Map(),
};
// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  resetTabMonitoring();
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "getCurrentTab":
      handleGetCurrentTab(sendResponse);
      return true;
    case "updateBadge":
      handleUpdateBadge(request, sender, sendResponse);
      break;
    case "onLinkedIn":
      handleOnLinkedIn(sender, sendResponse);
      break;
    case "startTabMonitoring":
      startTabMonitoring();
      sendResponse({ status: "monitoring" });
      break;
    case "getMonitoredUrl":
      sendResponse({ url: tabMonitoring.capturedUrl });
      resetTabMonitoring();
      break;
    default:
      console.warn("Unknown message type:", request.type);
  }
});
function handleGetCurrentTab(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    sendResponse({ url: tabs[0]?.url });
  });
}
function handleUpdateBadge(request, sender, sendResponse) {
  chrome.action.setBadgeText({ text: request.text, tabId: sender.tab?.id });
  chrome.action.setBadgeBackgroundColor({
    color: request.color,
    tabId: sender.tab?.id,
  });
  sendResponse({ status: "badge updated" });
}
function handleOnLinkedIn(sender, sendResponse) {
  chrome.action.setBadgeText({ text: "LI", tabId: sender.tab?.id });
  chrome.action.setBadgeBackgroundColor({
    color: "#0073b1",
    tabId: sender.tab?.id,
  });
  sendResponse({ status: "LinkedIn detected" });
}
function startTabMonitoring() {
  console.log("Starting tab monitoring for apply URLs...");
  resetTabMonitoring();
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => tabMonitoring.initialTabs.add(tab.id));
    tabMonitoring.isActive = true;
    tabMonitoring.timeoutId = setTimeout(() => {
      console.log("Tab monitoring timeout");
      resetTabMonitoring();
    }, 20000);
  });
}
function resetTabMonitoring() {
  clearTimeout(tabMonitoring.timeoutId);
  tabMonitoring.urlCheckIntervals.forEach((intervalId, tabId) => {
    clearInterval(intervalId);
  });
  tabMonitoring.urlCheckIntervals.clear();
  tabMonitoring.pendingTabs.forEach((tabId) => {
    chrome.tabs.remove(tabId);
  });
  tabMonitoring.isActive = false;
  tabMonitoring.capturedUrl = null;
  tabMonitoring.initialTabs.clear();
  tabMonitoring.pendingTabs.clear();
  tabMonitoring.timeoutId = null;
}
chrome.tabs.onCreated.addListener((tab) => {
  if (!tabMonitoring.isActive) return;
  console.log("New tab detected, waiting for URL...");
  tabMonitoring.pendingTabs.add(tab.id);
  const urlCheckInterval = setInterval(() => {
    chrome.tabs.get(tab.id, (updatedTab) => {
      if (chrome.runtime.lastError || !updatedTab) {
        cleanupTabMonitoring(tab.id, urlCheckInterval);
        return;
      }
      if (
        updatedTab.url &&
        !updatedTab.url.startsWith("chrome://") &&
        updatedTab.url !== "about:blank"
      ) {
        console.log("Captured URL:", updatedTab.url);
        tabMonitoring.capturedUrl = updatedTab.url;
        cleanupTabMonitoring(tab.id, urlCheckInterval);
        chrome.tabs.remove(tab.id);
      }
    });
  }, 500);
  tabMonitoring.urlCheckIntervals.set(tab.id, urlCheckInterval);
});
function cleanupTabMonitoring(tabId, intervalId) {
  clearInterval(intervalId);
  tabMonitoring.pendingTabs.delete(tabId);
  tabMonitoring.urlCheckIntervals.delete(tabId);
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (!tab.url?.includes("linkedin.com/jobs")) {
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }
  if (
    tabMonitoring.isActive &&
    changeInfo.status === "complete" &&
    changeInfo.url
  ) {
    if (!tabMonitoring.initialTabs.has(tabId)) {
      console.log("Tab updated with URL:", changeInfo.url);
      tabMonitoring.capturedUrl = changeInfo.url;
      chrome.tabs.remove(tabId);
    }
  }
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (!tab.url?.includes("linkedin.com/jobs")) {
      chrome.action.setBadgeText({ text: "", tabId: activeInfo.tabId });
    }
  });
});

// Connection manager utility
const ConnectionManager = {
  async ensureContentScript(tabId) {
    try {
      // Try to ping the content script first
      await chrome.tabs.sendMessage(tabId, { type: "ping" });
      return true;
    } catch (error) {
      // Content script not available, try to inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        
        // Wait for content script to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try pinging again to confirm it's ready
        await chrome.tabs.sendMessage(tabId, { type: "ping" });
        return true;
      } catch (injectionError) {
        console.error("Failed to inject content script:", injectionError);
        return false;
      }
    }
  },

  async sendMessageSafely(tabId, message, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        if (error.message.includes("Could not establish connection")) {
          console.log(`Attempt ${i + 1}: Content script not available, trying to inject...`);
          
          if (i === retries - 1) {
            throw new Error("Failed to establish connection after multiple attempts");
          }
          
          const injected = await this.ensureContentScript(tabId);
          if (!injected) {
            throw new Error("Failed to inject content script");
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          throw error; // Different error, don't retry
        }
      }
    }
  }
};

// Enhanced message handler - update your existing chrome.runtime.onMessage.addListener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Add ping handler
  if (request.type === "ping") {
    sendResponse({ status: "pong" });
    return;
  }

  switch (request.type) {
    case "getCurrentTab":
      handleGetCurrentTab(sendResponse);
      return true;
    case "updateBadge":
      handleUpdateBadge(request, sender, sendResponse);
      break;
    case "onLinkedIn":
      handleOnLinkedIn(sender, sendResponse);
      break;
    case "startTabMonitoring":
      startTabMonitoring();
      sendResponse({ status: "monitoring" });
      break;
    case "getMonitoredUrl":
      sendResponse({ url: tabMonitoring.capturedUrl });
      resetTabMonitoring();
      break;
    case "checkContentScript":
      handleCheckContentScript(request, sendResponse);
      return true;
    default:
      console.warn("Unknown message type:", request.type);
  }
});

// New handler for checking content script
async function handleCheckContentScript(request, sendResponse) {
  try {
    const isAvailable = await ConnectionManager.ensureContentScript(request.tabId);
    sendResponse({ available: isAvailable });
  } catch (error) {
    sendResponse({ available: false, error: error.message });
  }
}

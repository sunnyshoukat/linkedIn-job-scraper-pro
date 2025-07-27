import React, { useState, useEffect, useCallback } from 'react';

const Popup = () => {
  // State management
  const [isActive, setIsActive] = useState(false);
  const [jobsFound, setJobsFound] = useState(0);
  const [pagesScraped, setPagesScraped] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  const [isLinkedInJobsPage, setIsLinkedInJobsPage] = useState(false);
  const [tab, setTab] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form state
  const [keywords, setKeywords] = useState("JavaScript, TypeScript, NodeJs, ReactJs, VueJs, Redux, Vuex, HTML, CSS, Express, Java, SpringBoot, GraphQL, CI/CD, Event-Driven, BullMQ, GitHub Actions, AWS, EC2, S3, SNS, SQN, Serverless, Redis, Microservices, Docker, Git, SQL/NoSQL, MySQL, MongoDB, PostgreSQL, Socket.IO, playwright, Unit Testing, Agile, FinTech");
  const [maxApplicants, setMaxApplicants] = useState(100);
  const [minApplicants, setMinApplicants] = useState(0);
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);
  const [externalApplyOnly, setExternalApplyOnly] = useState(false);
  const [englishOnly, setEnglishOnly] = useState(true);
  const [matchAnyKeyword, setMatchAnyKeyword] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [scrapingDelay, setScrapingDelay] = useState(2);
  const [maxPages, setMaxPages] = useState(10);
  const [autoScroll, setAutoScroll] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // AI Settings state
  const [enableAI, setEnableAI] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [openRouterAPIKey, setOpenRouterAPIKey] = useState('');
  const [minAtsScore, setMinAtsScore] = useState(70);
  const [includeKeywordAnalysis, setIncludeKeywordAnalysis] = useState(true);

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    keywords: false,
    ai: false,
    filters: false,
    advanced: true
  });

  // Refs for intervals
  const updateIntervalRef = React.useRef(null);

  // Connection Manager
  const PopupConnectionManager = {
    async ensureConnection(tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "ping" });
        return true;
      } catch (error) {
        console.log("Content script not responding, requesting injection...");
        try {
          const response = await chrome.runtime.sendMessage({
            type: "checkContentScript",
            tabId: tabId,
          });
          return response.available;
        } catch (bgError) {
          console.error("Background script communication failed:", bgError);
          return false;
        }
      }
    },

    async sendMessageWithRetry(tabId, message, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const connected = await this.ensureConnection(tabId);
          if (!connected) {
            throw new Error("Failed to establish connection to content script");
          }
          return await chrome.tabs.sendMessage(tabId, message);
        } catch (error) {
          console.log(`Attempt ${attempt} failed:`, error.message);
          if (attempt === maxRetries) {
            throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }
    },
  };

  // Utility functions
  const showMessage = useCallback((text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 5000);
  }, []);

  const getSettings = useCallback(() => {
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    return {
      keywords: keywordList,
      maxApplicants,
      minApplicants,
      easyApplyOnly,
      externalApplyOnly,
      englishOnly,
      matchAnyKeyword,
      caseSensitive,
      scrapingDelay,
      maxPages,
      autoScroll,
      skipDuplicates,
      useATS: enableAI,
      resumeText,
      openRouterAPIKey: openRouterAPIKey || sessionStorage.getItem("openRouterApiKey"),
      minATSScore: minAtsScore,
      includeKeywordAnalysis,
    };
  }, [keywords, maxApplicants, minApplicants, easyApplyOnly, externalApplyOnly, englishOnly, matchAnyKeyword, caseSensitive, scrapingDelay, maxPages, autoScroll, skipDuplicates, enableAI, resumeText, openRouterAPIKey, minAtsScore, includeKeywordAnalysis]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    const settings = getSettings();
    localStorage.setItem("jobScraperSettings", JSON.stringify(settings));
  }, [getSettings]);

  // Load settings from localStorage
  const loadSettings = useCallback(() => {
    const saved = localStorage.getItem("jobScraperSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setKeywords(settings.keywords?.join(", ") || keywords);
      setMaxApplicants(settings.maxApplicants || 100);
      setMinApplicants(settings.minApplicants || 0);
      setEasyApplyOnly(settings.easyApplyOnly || false);
      setExternalApplyOnly(settings.externalApplyOnly || false);
      setEnglishOnly(settings.englishOnly !== false);
      setMatchAnyKeyword(settings.matchAnyKeyword !== false);
      setCaseSensitive(settings.caseSensitive || false);
      setScrapingDelay(settings.scrapingDelay || 2);
      setMaxPages(settings.maxPages || 10);
      setAutoScroll(settings.autoScroll !== false);
      setSkipDuplicates(settings.skipDuplicates !== false);
    }
    loadAISettings();
  }, [keywords]);

  // Load AI settings
  const loadAISettings = () => {
    const saved = localStorage.getItem("aiSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      setResumeText(settings.resumeText || "");
      setMinAtsScore(settings.minAtsScore || 70);
      setIncludeKeywordAnalysis(settings.includeKeywordAnalysis !== false);
      setEnableAI(settings.enableAI || false);
    }
    
    const apiKey = sessionStorage.getItem("openRouterApiKey");
    if (apiKey) {
      setOpenRouterAPIKey(apiKey);
    }
  };

  // Check current tab
  const checkCurrentTab = useCallback(async () => {
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setTab(currentTab);
      const isLinkedIn = currentTab.url && currentTab.url.includes("linkedin.com/jobs");
      setIsLinkedInJobsPage(isLinkedIn);

      if (!isLinkedIn) {
        setCurrentStatus("Wrong Page");
      } else {
        setCurrentStatus("Checking connection...");
        const connected = await PopupConnectionManager.ensureConnection(currentTab.id);
        
        if (connected) {
          setCurrentStatus("Ready");
          checkScrapingStatus(currentTab.id);
          loadSavedJobCount(currentTab.id);
        } else {
          setCurrentStatus("Connection Failed");
          showMessage("Please refresh the LinkedIn page and try again", "error");
        }
      }
    } catch (error) {
      console.error("Error checking current tab:", error);
      setCurrentStatus("Error");
      showMessage("Error checking current tab", "error");
    }
  }, [showMessage]);

  // Check scraping status
  const checkScrapingStatus = async (tabId) => {
    try {
      showMessage("Checking scraping status...", "info");
      const response = await PopupConnectionManager.sendMessageWithRetry(tabId, {
        type: "getStatus",
      });
      
      setIsActive(response.isActive);
      setJobsFound(response.jobsFound);
      
      if (response.isActive) {
        startPeriodicUpdate();
      }
    } catch (error) {
      console.error("Failed to check scraping status:", error);
      showMessage("Content script not available. Please refresh the page.", "error");
      setIsActive(false);
      setJobsFound(0);
    }
  };

  // Load saved job count
  const loadSavedJobCount = async (tabId) => {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => JSON.parse(localStorage.getItem("linkedinJobs") || "[]").length,
      });
      if (result[0]?.result) {
        setJobsFound(result[0].result);
      }
    } catch (error) {
      console.log("Could not load saved jobs count");
    }
  };

  // Start periodic update
  const startPeriodicUpdate = () => {
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);

    updateIntervalRef.current = setInterval(async () => {
      try {
        const response = await PopupConnectionManager.sendMessageWithRetry(tab.id, {
          type: "getStatus",
        });

        setIsActive(response.isActive);
        setJobsFound(response.jobsFound);

        if (!response.isActive && updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          showMessage("Scraping completed automatically", "success");
        }
      } catch (error) {
        console.log("Periodic update failed:", error.message);
        
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        
        showMessage("Connection lost. Please refresh the page.", "error");
        setIsActive(false);
      }
    }, 3000);
  };

  // Event handlers
  const handleStartScraping = async () => {
    if (!isLinkedInJobsPage) {
      showMessage("Please navigate to LinkedIn Jobs page first!", "error");
      return;
    }

    const settings = getSettings();
    if (!settings.keywords.length) {
      showMessage("Please enter at least one keyword to match jobs against!", "error");
      return;
    }

    try {
      const connected = await PopupConnectionManager.ensureConnection(tab.id);
      if (!connected) {
        throw new Error("Cannot connect to LinkedIn page. Please refresh the page and try again.");
      }

      const response = await PopupConnectionManager.sendMessageWithRetry(tab.id, {
        type: "startScraping",
        settings: settings,
      });

      if (response?.status === "started") {
        setIsActive(true);
        setJobsFound(0);
        startPeriodicUpdate();
        saveSettings();
        showMessage("Scraping started successfully!", "success");
      } else {
        throw new Error("Invalid response from content script");
      }
    } catch (error) {
      console.error("Error starting scraper:", error);
      showMessage(`Error: ${error.message}`, "error");
    }
  };

  const handleStopScraping = async () => {
    try {
      const response = await PopupConnectionManager.sendMessageWithRetry(tab.id, {
        type: "stopScraping",
      });

      if (response?.status === "stopped") {
        setIsActive(false);
        clearInterval(updateIntervalRef.current);
        showMessage("Scraping stopped", "success");
      }
    } catch (error) {
      console.error("Error stopping scraper:", error);
      showMessage("Error stopping scraper", "error");
    }
  };

  const handleDownload = async (format) => {
    if (!isLinkedInJobsPage) {
      showMessage("Please navigate to LinkedIn Jobs page first!", "error");
      return;
    }

    try {
      const connected = await PopupConnectionManager.ensureConnection(tab.id);
      if (!connected) {
        throw new Error("Cannot connect to LinkedIn page. Please refresh the page and try again.");
      }

      const statusResponse = await PopupConnectionManager.sendMessageWithRetry(tab.id, {
        type: "getStatus",
      });

      if (!statusResponse.jobsFound) {
        showMessage("No jobs found to download", "error");
        return;
      }

      const response = await PopupConnectionManager.sendMessageWithRetry(tab.id, {
        type: "downloadJobs",
        format: format,
      });

      if (response?.status === "downloaded") {
        showMessage(`Downloaded ${statusResponse.jobsFound} jobs as ${format}`, "success");
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      showMessage(`Download failed: ${error.message}`, "error");
    }
  };

  const handleClearData = async () => {
    try {
      const tabs = await chrome.tabs.query({ url: "*://*.linkedin.com/jobs*" });

      const clearPromises = tabs.map((tab) =>
        chrome.tabs
          .sendMessage(tab.id, { type: "clearData" })
          .catch((error) => {
            console.log(`Tab ${tab.id} not responding to clearData`, error);
            return { status: "error", message: "Tab not responding" };
          })
      );

      // Clear all stored data
      localStorage.removeItem("jobScraperSettings");
      localStorage.removeItem("linkedinJobs");
      localStorage.removeItem("resumeText");
      localStorage.removeItem("aiSettings");
      sessionStorage.removeItem("openRouterApiKey");

      const results = await Promise.all(clearPromises);
      const successCount = results.filter((r) => r?.status === "success").length;

      setIsActive(false);
      setJobsFound(0);

      // Reset AI form
      setResumeText("");
      setOpenRouterAPIKey("");
      setEnableAI(false);

      showMessage(`Cleared data from ${successCount} tabs`, "success");
    } catch (error) {
      console.error("Error clearing data:", error);
      showMessage("Error clearing data", "error");
    }
  };

  const saveAISettings = async () => {
    const settings = {
      resumeText,
      openRouterAPIKey,
      minAtsScore,
      includeKeywordAnalysis,
      useATS: enableAI,
    };

    localStorage.setItem("aiSettings", JSON.stringify(settings));

    if (settings.openRouterAPIKey) {
      sessionStorage.setItem("openRouterApiKey", settings.openRouterAPIKey);
    }

    showMessage("AI settings saved successfully!", "success");
  };

  const testAIConnection = async () => {
    if (!openRouterAPIKey) {
      showMessage("Please enter your OpenRouter API key", "error");
      return;
    }

    if (!resumeText) {
      showMessage("Please enter your resume text", "error");
      return;
    }

    try {
      const testJobDescription = "We are looking for a Software Engineer with experience in JavaScript and React.";

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterAPIKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "LinkedIn Job Scraper Pro",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528:free",
          messages: [
            {
              role: "system",
              content: "You are an ATS (Applicant Tracking System) analyzer. Analyze the resume against the job description and provide a score from 0-100 and brief feedback.",
            },
            {
              role: "user",
              content: `Resume: ${resumeText}\n\nJob Description: ${testJobDescription}\n\nProvide ATS score (0-100) and brief analysis.`,
            },
          ],
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
      }

      showMessage("✅ AI connection successful! API key is working.", "success");
    } catch (error) {
      console.error("AI connection test failed:", error);
      showMessage(`AI connection failed: ${error.message}`, "error");
    }
  };

  // Toggle collapsible sections
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Generate keyword tags
  const keywordTags = keywords
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  // Handle checkbox logic for Easy Apply / External Apply
  const handleEasyApplyChange = (checked) => {
    setEasyApplyOnly(checked);
    if (checked) setExternalApplyOnly(false);
  };

  const handleExternalApplyChange = (checked) => {
    setExternalApplyOnly(checked);
    if (checked) setEasyApplyOnly(false);
  };

  // Initialize component
  useEffect(() => {
    loadSettings();
    checkCurrentTab();

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [loadSettings, checkCurrentTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 font-sans">
      <style jsx>{`
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #ef4444;
          transition: background-color 0.3s;
        }
        .status-dot.active {
          background-color: #10b981;
        }
        .keyword-tag {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 8px;
          margin: 2px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .info-message {
          background: #dbeafe;
          color: #1e40af;
          padding: 8px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border-left: 4px solid #3b82f6;
        }
        .success-message {
          background: #dcfce7;
          color: #166534;
          padding: 8px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border-left: 4px solid #10b981;
        }
        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 8px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border-left: 4px solid #ef4444;
        }
        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin: 12px 0;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          width: 0%;
          transition: width 0.3s ease;
        }
      `}</style>

      <div className="max-w-md mx-auto bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">🔍 LinkedIn Job Scraper Pro</h2>
            <div className="text-sm opacity-90">v2.1 - Enhanced Filtering</div>
          </div>
        </div>

        {/* Status Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`status-dot ${isActive ? 'active' : ''}`}></div>
              <span className="font-medium">{isActive ? 'Scraping Active' : 'Inactive'}</span>
            </div>
            <div className="text-sm">
              Status: <strong>{currentStatus}</strong>
            </div>
          </div>

          {isActive && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }}></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{jobsFound}</div>
              <div className="text-sm text-gray-600">Jobs Found</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{pagesScraped}</div>
              <div className="text-sm text-gray-600">Pages Scraped</div>
            </div>
          </div>
        </div>

        {/* Keywords Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('keywords')}
            className="w-full p-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Keywords & Matching</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.keywords ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {!collapsedSections.keywords && (
            <div className="p-4 pt-0">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Enter your keywords (comma-separated):
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="JavaScript, React, Node.js, Python, AWS, Docker, etc."
                />
              </div>
              
              <div className="mb-4">
                {keywordTags.map((keyword, index) => (
                  <span key={index} className="keyword-tag">{keyword}</span>
                ))}
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>Match any keyword</span>
                  <input
                    type="checkbox"
                    checked={matchAnyKeyword}
                    onChange={(e) => setMatchAnyKeyword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Case sensitive matching</span>
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* AI ATS Score Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('ai')}
            className="w-full p-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span>🤖</span>
              <span>AI ATS Score Filter</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.ai ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {!collapsedSections.ai && (
            <div className="p-4 pt-0">
              <label className="flex items-center justify-between mb-4">
                <span>Enable AI ATS Scoring</span>
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
              
              {enableAI && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">📄 Resume Text:</label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Paste your resume text here..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">🔑 OpenRouter API Key:</label>
                    <input
                      type="password"
                      value={openRouterAPIKey}
                      onChange={(e) => setOpenRouterAPIKey(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your OpenRouter API key"
                    />
                    <small className="text-gray-600 text-xs">
                      Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">openrouter.ai</a>
                    </small>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <span>Minimum ATS Score:</span>
                      <input
                        type="number"
                        value={minAtsScore}
                        onChange={(e) => setMinAtsScore(parseInt(e.target.value) || 70)}
                        min="0"
                        max="100"
                        className="w-16 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span>%</span>
                    </label>
                  </div>
                  
                  <label className="flex items-center justify-between">
                    <span>Include keyword analysis</span>
                    <input
                      type="checkbox"
                      checked={includeKeywordAnalysis}
                      onChange={(e) => setIncludeKeywordAnalysis(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={saveAISettings}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      💾 Save AI Settings
                    </button>
                    <button
                      onClick={testAIConnection}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      🧪 Test Connection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('filters')}
            className="w-full p-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span>🔧</span>
              <span>Filters & Preferences</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.filters ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {!collapsedSections.filters && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">Max applicants:</span>
                  <input
                    type="number"
                    value={maxApplicants}
                    onChange={(e) => setMaxApplicants(parseInt(e.target.value) || 100)}
                    min="1"
                    max="1000"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Min applicants:</span>
                  <input
                    type="number"
                    value={minApplicants}
                    onChange={(e) => setMinApplicants(parseInt(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={easyApplyOnly}
                    onChange={(e) => handleEasyApplyChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>Easy Apply only</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={externalApplyOnly}
                    onChange={(e) => handleExternalApplyChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>External Apply only</span>
                </label>
              </div>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={englishOnly}
                  onChange={(e) => setEnglishOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>English descriptions only</span>
              </label>
            </div>
          )}
        </div>

        {/* Advanced Settings Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('advanced')}
            className="w-full p-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span>⚙️</span>
              <span>Advanced Settings</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.advanced ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {!collapsedSections.advanced && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Scraping delay (seconds)</span>
                  <input
                    type="number"
                    value={scrapingDelay}
                    onChange={(e) => setScrapingDelay(parseInt(e.target.value) || 2)}
                    min="1"
                    max="10"
                    className="w-16 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Max pages to scrape</span>
                  <input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                    min="1"
                    max="50"
                    className="w-16 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>Auto-scroll to load jobs</span>
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Skip duplicate jobs</span>
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="p-6">
          <div className="space-y-3">
            <button
              onClick={handleStartScraping}
              disabled={isActive || !isLinkedInJobsPage}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                isActive || !isLinkedInJobsPage
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              🚀 Start Smart Scraping
            </button>
            
            <button
              onClick={handleStopScraping}
              disabled={!isActive}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                !isActive
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              ⏹️ Stop Scraping
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => handleDownload('csv')}
              disabled={jobsFound === 0}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-white transition-all ${
                jobsFound === 0
                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              📥 CSV
            </button>
            <button
              onClick={() => handleDownload('excel')}
              disabled={jobsFound === 0}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-white transition-all ${
                jobsFound === 0
                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
              }`}
            >
              📊 Excel
            </button>
            <button
              onClick={handleClearData}
              className="flex-1 py-2 px-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* LinkedIn Warning */}
        {!isLinkedInJobsPage && (
          <div className="mx-6 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800">
              <span>⚠️</span>
              <span>Please navigate to LinkedIn Jobs page first</span>
            </div>
          </div>
        )}

        {/* Message Container */}
        {message.text && (
          <div className="mx-6 mb-6">
            <div className={`${message.type}-message`}>
              {message.text}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
          <p>
            Smart filtering • Keyword matching • Auto-detection<br />
            Easy Apply + External links • Multi-language support<br />
            <a href="#" className="text-blue-600 hover:underline">Need help?</a> • Made with ❤️
          </p>
        </div>
      </div>
    </div>
  );
};

export default Popup;
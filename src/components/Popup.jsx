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
    location: false,
    advanced: true
  });

  // Add these after existing skill states
  const [primarySkills, setPrimarySkills] = useState("JavaScript, React, Node.js, TypeScript, HTML, CSS, Express.js, frontend, backend");
  const [secondarySkills, setSecondarySkills] = useState("Laravel, PHP, AWS, Docker, MongoDB, sql, mysql, PostgreSQL, CI/CD, Event-Driven, BullMQ, GitHub Actions, EC2, Git, SQL/NoSQL, FinTech, Unit Testing, Agile, Socket.IO, Microservices, Redis, Serverless, SpringBoot");
  const [tertiarySkills, setTertiarySkills] = useState("GraphQL");
  const [skillWeights, setSkillWeights] = useState({
    primary: 10,
    secondary: 5,
    tertiary: 1
  });
  const [minSkillScore, setMinSkillScore] = useState(15);
  // Add this after existing skill states
  const [minPrimarySkills, setMinPrimarySkills] = useState(3);

  // Add these after existing filter states
  const [skipLanguageRequirements, setSkipLanguageRequirements] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [localHireOnly, setLocalHireOnly] = useState(false);
  const [skipVisaSponsorship, setSkipVisaSponsorship] = useState(false);

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
    const primaryList = primarySkills.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    const secondaryList = secondarySkills.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    const tertiaryList = tertiarySkills.split(",").map((k) => k.trim()).filter((k) => k.length > 0);

    return {
      keywords: [...primaryList, ...secondaryList, ...tertiaryList],
      // New skill-based structure
      skillLevels: {
        primary: primaryList,
        secondary: secondaryList,
        tertiary: tertiaryList
      },
      skillWeights,
      minSkillScore,
      minPrimarySkills,
      skipLanguageRequirements,
      remoteOnly,
      localHireOnly,
      skipVisaSponsorship,
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
  }, [keywords, primarySkills, secondarySkills, tertiarySkills, skillWeights, minSkillScore, minPrimarySkills, skipLanguageRequirements, remoteOnly, localHireOnly, skipVisaSponsorship, maxApplicants, minApplicants, easyApplyOnly, externalApplyOnly, englishOnly, matchAnyKeyword, caseSensitive, scrapingDelay, maxPages, autoScroll, skipDuplicates, enableAI, resumeText, openRouterAPIKey, minAtsScore, includeKeywordAnalysis]);

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
      // Load skill levels
      if (settings.skillLevels) {
        setPrimarySkills(settings.skillLevels.primary?.join(", ") || "");
        setSecondarySkills(settings.skillLevels.secondary?.join(", ") || "");
        setTertiarySkills(settings.skillLevels.tertiary?.join(", ") || "");
      }
      setSkillWeights(settings.skillWeights || { primary: 10, secondary: 5, tertiary: 1 });
      setMinSkillScore(settings.minSkillScore || 15);
      setMinPrimarySkills(settings.minPrimarySkills || 3);
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
      setSkipLanguageRequirements(settings.skipLanguageRequirements !== false);
      setRemoteOnly(settings.remoteOnly || false);
      setLocalHireOnly(settings.localHireOnly || false);
      setSkipVisaSponsorship(settings.skipVisaSponsorship || false);
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
              <span>Skills & Expertise Levels</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.keywords ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {!collapsedSections.keywords && (
            <div className="p-4 pt-0 space-y-4">
              {/* Primary Skills */}
              <div>
                <label className="block text-sm font-bold mb-2 text-green-700">
                  🟢 Primary Skills (Core Expertise) - Weight: {skillWeights.primary}x
                </label>
                <textarea
                  value={primarySkills}
                  onChange={(e) => setPrimarySkills(e.target.value)}
                  rows={2}
                  className="w-full p-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="JavaScript, React, Node.js, TypeScript..."
                />
                <div className="flex flex-wrap mt-2">
                  {primarySkills.split(",").map((skill, index) =>
                    skill.trim() && (
                      <span key={index} className="inline-block bg-green-500 text-white px-2 py-1 m-1 rounded-full text-xs">
                        {skill.trim()}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Secondary Skills */}
              <div>
                <label className="block text-sm font-bold mb-2 text-blue-700">
                  🔵 Secondary Skills (Strong Knowledge) - Weight: {skillWeights.secondary}x
                </label>
                <textarea
                  value={secondarySkills}
                  onChange={(e) => setSecondarySkills(e.target.value)}
                  rows={2}
                  className="w-full p-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Python, AWS, Docker, MongoDB..."
                />
                <div className="flex flex-wrap mt-2">
                  {secondarySkills.split(",").map((skill, index) =>
                    skill.trim() && (
                      <span key={index} className="inline-block bg-blue-500 text-white px-2 py-1 m-1 rounded-full text-xs">
                        {skill.trim()}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Tertiary Skills */}
              <div>
                <label className="block text-sm font-bold mb-2 text-orange-700">
                  🟠 Tertiary Skills (Familiar/Learning) - Weight: {skillWeights.tertiary}x
                </label>
                <textarea
                  value={tertiarySkills}
                  onChange={(e) => setTertiarySkills(e.target.value)}
                  rows={2}
                  className="w-full p-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Java, Kubernetes, GraphQL..."
                />
                <div className="flex flex-wrap mt-2">
                  {tertiarySkills.split(",").map((skill, index) =>
                    skill.trim() && (
                      <span key={index} className="inline-block bg-orange-500 text-white px-2 py-1 m-1 rounded-full text-xs">
                        {skill.trim()}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Skill Scoring Settings */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">📊 Skill Scoring Configuration</h4>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <label className="text-center">
                    <span className="block text-xs font-medium text-green-700">Primary Weight</span>
                    <input
                      type="number"
                      value={skillWeights.primary}
                      onChange={(e) => setSkillWeights(prev => ({ ...prev, primary: parseInt(e.target.value) || 10 }))}
                      min="1"
                      max="20"
                      className="w-full p-2 border border-gray-300 rounded text-center"
                    />
                  </label>
                  <label className="text-center">
                    <span className="block text-xs font-medium text-blue-700">Secondary Weight</span>
                    <input
                      type="number"
                      value={skillWeights.secondary}
                      onChange={(e) => setSkillWeights(prev => ({ ...prev, secondary: parseInt(e.target.value) || 5 }))}
                      min="1"
                      max="15"
                      className="w-full p-2 border border-gray-300 rounded text-center"
                    />
                  </label>
                  <label className="text-center">
                    <span className="block text-xs font-medium text-orange-700">Tertiary Weight</span>
                    <input
                      type="number"
                      value={skillWeights.tertiary}
                      onChange={(e) => setSkillWeights(prev => ({ ...prev, tertiary: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="10"
                      className="w-full p-2 border border-gray-300 rounded text-center"
                    />
                  </label>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <h5 className="font-semibold text-green-800 mb-2">🎯 Primary Skills Requirement</h5>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">Minimum Primary Skills Required:</span>
                    <input
                      type="number"
                      value={minPrimarySkills}
                      onChange={(e) => setMinPrimarySkills(parseInt(e.target.value) || 3)}
                      min="1"
                      max="10"
                      className="w-16 p-2 border border-green-300 rounded bg-white"
                    />
                  </label>
                  <div className="text-xs text-green-600 mt-1">
                    Jobs must match at least {minPrimarySkills} primary skills to be considered
                  </div>
                </div>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Minimum Total Skill Score:</span>
                  <input
                    type="number"
                    value={minSkillScore}
                    onChange={(e) => setMinSkillScore(parseInt(e.target.value) || 15)}
                    min="0"
                    max="100"
                    className="w-20 p-2 border border-gray-300 rounded"
                  />
                </label>

                <div className="text-xs text-gray-600 mt-2">
                  Jobs will be scored: Primary×{skillWeights.primary} + Secondary×{skillWeights.secondary} + Tertiary×{skillWeights.tertiary}
                  <br />
                  <strong>Must have ≥{minPrimarySkills} primary skills AND ≥{minSkillScore} total score</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language & Location Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('location')}
            className="w-full p-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center space-x-2">
              <span>🌍</span>
              <span>Language & Location Filters</span>
            </span>
            <span className={`transform transition-transform ${collapsedSections.location ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {!collapsedSections.location && (
            <div className="p-4 pt-0 space-y-4">
              {/* Language Requirements */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="font-semibold text-blue-800 mb-2">🗣️ Language Requirements</h5>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={skipLanguageRequirements}
                    onChange={(e) => setSkipLanguageRequirements(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Skip jobs requiring additional languages</span>
                </label>
                <div className="text-xs text-blue-600 mt-1">
                  Will skip jobs mentioning: German, French, Spanish, Italian, Dutch, etc.
                </div>
              </div>

              {/* Work Location Preferences */}
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-semibold text-green-800 mb-2">📍 Work Location Preferences</h5>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={remoteOnly}
                      onChange={(e) => {
                        setRemoteOnly(e.target.checked);
                        if (e.target.checked) setLocalHireOnly(false);
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm">Remote work only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={localHireOnly}
                      onChange={(e) => {
                        setLocalHireOnly(e.target.checked);
                        if (e.target.checked) setRemoteOnly(false);
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm">Local candidates only</span>
                  </label>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Remote: Looks for "remote", "work from home", "distributed team"<br />
                  Local: Looks for "local candidates", "on-site", "office-based"
                </div>
              </div>

              {/* Visa/Sponsorship */}
              <div className="bg-purple-50 p-3 rounded-lg">
                <h5 className="font-semibold text-purple-800 mb-2">🛂 Visa & Sponsorship</h5>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={skipVisaSponsorship}
                    onChange={(e) => setSkipVisaSponsorship(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm">Skip jobs requiring visa sponsorship</span>
                </label>
                <div className="text-xs text-purple-600 mt-1">
                  Will skip jobs mentioning visa sponsorship requirements
                </div>
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
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${isActive || !isLinkedInJobsPage
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
            >
              🚀 Start Smart Scraping
            </button>

            <button
              onClick={handleStopScraping}
              disabled={!isActive}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${!isActive
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
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-white transition-all ${jobsFound === 0
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
            >
              📥 CSV
            </button>
            <button
              onClick={() => handleDownload('excel')}
              disabled={jobsFound === 0}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-white transition-all ${jobsFound === 0
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
          
          {/* Browse Jobs Button */}
          <div className="mt-3">
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              disabled={jobsFound === 0}
              className={`w-full py-2 px-3 rounded-lg font-medium transition-all ${jobsFound === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                }`}
            >
              📋 Browse & Manage Jobs
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
            <button 
              onClick={() => chrome.runtime.openOptionsPage()}
              className="text-blue-600 hover:underline cursor-pointer bg-transparent border-none"
            >
              📋 Browse Jobs
            </button> • Made with ❤️
          </p>
        </div>
      </div>
    </div>
  );
};

export default Popup;
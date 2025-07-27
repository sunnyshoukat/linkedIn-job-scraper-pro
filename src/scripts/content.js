console.log("LinkedIn Job Scraper Pro loaded");
// In your content.js, include the helper
// Either import it or include it via manifest.json

// Usage example:
const { matchKeywords, extractMissingSkills } = window.KeywordHelper || {};

let isScrapingActive = false;
let allJobData = [];
let scrapingSettings = {
  keywords: [
    "JavaScript",
    "TypeScript",
    "NodeJs",
    "ReactJs",
    "VueJs",
    "Redux",
    "Vuex",
    "HTML",
    "CSS",
    "Express",
    "Java",
    "SpringBoot",
    "GraphQL",
    "CI/CD",
    "Event-Driven",
    "BullMQ",
    "GitHub Actions",
    "AWS",
    "EC2",
    "S3",
    "SNS",
    "SQN",
    "Serverless",
    "Redis",
    "Microservices",
    "Docker",
    "Git",
    "SQL/NoSQL",
    "MySQL",
    "MongoDB",
    "PostgreSQL",
    "Socket.IO",
    "playwright",
    "Unit Testing",
    "Agile",
    "FinTech",
  ],
  maxApplicants: 100,
  minApplicants: 0,
  easyApplyOnly: false,
  externalApplyOnly: false,
  englishOnly: true,
  // NEW ATS SETTINGS
  useATS: false,
  resumeText: "",
  openRouterAPIKey: "",
  minATSScore: 70,
};

const englishPatterns = [
  /\b(the|and|or|but|in|on|at|to|for|of|with|by|from|about|into|through|during|before|after|above|below|up|down|out|off|over|under|again|further|then|once)\b/gi,
  /\b(we|you|they|our|your|their|this|that|these|those|here|there|where|when|what|why|how)\b/gi,
  /\b(experience|required|responsibilities|qualifications|skills|years|work|team|company|position|job|role|candidate)\b/gi,
  /\b(will|would|should|could|must|may|can|need|want|looking|seeking|require)\b/gi,
];

// Enhanced message listener - update your existing one
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Add ping handler
  if (request.type === "ping") {
    sendResponse({ status: "pong" });
    return;
  }

  switch (request.type) {
    case "startScraping":
      handleStartScraping(request, sendResponse);
      break;
    case "stopScraping":
      handleStopScraping(sendResponse);
      break;
    case "getStatus":
      sendResponse({
        isActive: isScrapingActive,
        jobsFound: allJobData.length,
        timestamp: new Date().toISOString(),
      });
      break;
    case "downloadJobs":
      handleDownloadJobs(request, sendResponse);
      break;
    case "clearData":
      handleClearData(sendResponse);
      break;
    case "getJobDescriptions":
      handleGetJobDescriptions(sendResponse);
      break;
    case "healthCheck":
      sendResponse({
        status: "healthy",
        isActive: isScrapingActive,
        jobsFound: allJobData.length,
        url: window.location.href,
      });
      break;
    default:
      console.warn("Unknown message type:", request.type);
  }
  return true; // Keep message channel open for async responses
});

// Connection heartbeat - sends periodic status updates
function startConnectionHeartbeat() {
  setInterval(() => {
    if (isScrapingActive) {
      chrome.runtime
        .sendMessage({
          type: "heartbeat",
          isActive: isScrapingActive,
          jobsFound: allJobData.length,
        })
        .catch((error) => {
          console.log("Heartbeat failed:", error);
        });
    }
  }, 5000);
}

// Start heartbeat when content script loads
startConnectionHeartbeat();

function handleStartScraping(request, sendResponse) {
  if (request.settings) {
    scrapingSettings = { ...scrapingSettings, ...request.settings };
    console.log("Updated scraping settings:", scrapingSettings);
  }
  startJobScraping();
  sendResponse({ status: "started" });
}

function handleStopScraping(sendResponse) {
  stopJobScraping();
  sendResponse({ status: "stopped" });
}

function handleDownloadJobs(request, sendResponse) {
  const format = request.format || "csv";
  downloadJobs(format);
  sendResponse({ status: "downloaded", format });
}

function handleClearData(sendResponse) {
  allJobData = [];
  localStorage.removeItem("linkedinJobs");
  sendResponse({ status: "success" });
}

function handleGetJobDescriptions(sendResponse) {
  const jobs = JSON.parse(localStorage.getItem("linkedinJobs") || "[]");
  sendResponse({ jobs: jobs });
}

function startJobScraping() {
  if (isScrapingActive) {
    console.log("Scraping already active");
    return;
  }
  isScrapingActive = true;
  allJobData = [];
  console.log("Starting job scraping with filters:", scrapingSettings);
  chrome.runtime.sendMessage({
    type: "updateBadge",
    text: "ON",
    color: "#4CAF50",
  });
  startFetchingJobs();
}

function stopJobScraping() {
  isScrapingActive = false;
  console.log("Stopping job scraping...");
  chrome.runtime.sendMessage({
    type: "updateBadge",
    text: "",
    color: "#FF5722",
  });
}

async function startFetchingJobs() {
  if (!isScrapingActive) return;
  try {
    const cards = await getJobCards();
    console.log(`Found ${cards.length} job cards`);

    for (let i = 0; i < cards.length && isScrapingActive; i++) {
      const card = cards[i];
      card.style.border = "3px solid #0073b1";
      card.style.backgroundColor = "#f3f6f8";

      const jobLink = card.querySelector(
        ".job-card-container__link, .job-card-list__title, a[data-control-name='job_card_title']"
      );

      if (jobLink) {
        jobLink.click();
        await waitForJobDescriptionReady();
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // ADD ATS processing indicator
        if (scrapingSettings.useATS) {
          card.style.border = "3px solid #FF9800";
          card.style.backgroundColor = "#fff3e0";
          const atsIndicator = document.createElement("div");
          atsIndicator.style.cssText = `
            position: absolute; top: 5px; right: 5px; 
            background: #FF9800; color: white; padding: 2px 6px; 
            border-radius: 4px; font-size: 10px; font-weight: bold;
          `;
          atsIndicator.textContent = "ATS...";
          card.style.position = "relative";
          card.appendChild(atsIndicator);
        }

        const jobData = await extractJobData(card);

        if (jobData && passesFilters(jobData)) {
          allJobData.push(jobData);
          console.log(
            `Job saved: ${jobData.title} at ${jobData.company}${
              jobData.atsScore ? ` (ATS: ${jobData.atsScore}/100)` : ""
            }`
          );
          card.style.border = "3px solid #4CAF50";
          card.style.opacity = "0.7";
        } else {
          const reason = getFilterReason(jobData);
          console.log(
            `Job filtered: ${jobData?.title || "Unknown"} - Reason: ${reason}`
          );
          card.style.border = "3px solid #FF9800";
          card.style.backgroundColor = "#fff3e0";
        }

        // Remove ATS indicator
        const atsIndicator = card.querySelector("div");
        if (atsIndicator && atsIndicator.textContent === "ATS...") {
          atsIndicator.remove();
        }

        if (i < cards.length - 1) {
          cards[i + 1].scrollIntoView({ behavior: "smooth", block: "center" });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    localStorage.setItem("linkedinJobs", JSON.stringify(allJobData));
    console.log(`Saved ${allJobData.length} jobs to localStorage`);

    if (isScrapingActive) {
      clickOnNextButton();
    }
  } catch (error) {
    console.error("Error in startFetchingJobs:", error);
    stopJobScraping();
  }
}

function passesFilters(jobData) {
  if (!jobData) return false;
  if (jobData.totalClick > scrapingSettings.maxApplicants) return false;
  if (jobData.totalClick < scrapingSettings.minApplicants) return false;
  if (scrapingSettings.easyApplyOnly && jobData.jobType !== "Easy Apply")
    return false;
  if (
    scrapingSettings.externalApplyOnly &&
    jobData.jobType !== "External Apply"
  )
    return false;
  if (scrapingSettings.keywords.length > 3 && jobData.keywordCount === 0)
    return false;
  if (scrapingSettings.englishOnly && !jobData.isEnglish) return false;

  // NEW ATS FILTER
  if (scrapingSettings.useATS && jobData.atsScore !== null) {
    if (jobData.atsScore < scrapingSettings.minATSScore) return false;
  }

  return true;
}

function getFilterReason(jobData) {
  if (!jobData) return "No job data";
  if (jobData.totalClick > scrapingSettings.maxApplicants)
    return `Too many applicants (${jobData.totalClick} > ${scrapingSettings.maxApplicants})`;
  if (jobData.totalClick < scrapingSettings.minApplicants)
    return `Too few applicants (${jobData.totalClick} < ${scrapingSettings.minApplicants})`;
  if (scrapingSettings.easyApplyOnly && jobData.jobType !== "Easy Apply")
    return "Not Easy Apply";
  if (
    scrapingSettings.externalApplyOnly &&
    jobData.jobType !== "External Apply"
  )
    return "Not External Apply";
  if (scrapingSettings.keywords.length > 0 && jobData.keywordCount === 0)
    return "No keyword matches";
  if (scrapingSettings.englishOnly && !jobData.isEnglish)
    return "Not in English";

  // NEW ATS FILTER REASON
  if (
    scrapingSettings.useATS &&
    jobData.atsScore !== null &&
    jobData.atsScore < scrapingSettings.minATSScore
  )
    return `ATS Score too low (${jobData.atsScore} < ${scrapingSettings.minATSScore})`;

  return "Unknown filter";
}

function isEnglishText(text) {
  if (!text || text.length < 30) return true;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const sampleSize = Math.min(words.length, 150);
  if (sampleSize === 0) return false;
  let englishScore = 0;
  const testText = words.slice(0, sampleSize).join(" ");
  for (const pattern of englishPatterns) {
    const matches = testText.match(pattern);
    if (matches?.length) englishScore += matches.length;
  }
  const score = englishScore / sampleSize;
  return score > 0.08;
}

async function getJobCards() {
  return new Promise((resolve) => {
    waitForElementReady({
      skeletonSelector: ".jobs-list-skeleton__card-wrapper",
      readySelector:
        ".scaffold-layout__list-item, .job-card-container, .job-card-list",
      onReady: async () => {
        const listContainer =
          document.querySelector(".scaffold-layout__list")?.children[1] ||
          document.querySelector(".jobs-search-results-list");
        if (!listContainer) {
          console.error("Job list container not found");
          resolve([]);
          return;
        }
        let lastCount = 0;
        let stableTries = 0;
        const scrollInterval = setInterval(() => {
          listContainer.scrollTo({
            top: listContainer.scrollHeight,
            behavior: "smooth",
          });
          const currentCount = document.querySelectorAll(
            ".scaffold-layout__list-item"
          ).length;
          if (currentCount === lastCount) {
            stableTries++;
            if (stableTries >= 3) {
              clearInterval(scrollInterval);
              listContainer.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => {
                const finalCards = Array.from(
                  document.querySelectorAll(".scaffold-layout__list-item")
                );
                console.log(`Loaded ${finalCards.length} job cards`);
                resolve(finalCards);
              }, 1000);
            }
          } else {
            stableTries = 0;
            lastCount = currentCount;
          }
        }, 1500);
      },
    });
  });
}

async function extractJobData(card) {
  try {
    await waitForJobDescriptionReady();
    const title = extractTextFromSelectors([
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      "h1.job-title",
    ]);
    const company = extractTextFromSelectors([
      ".job-details-jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name a",
    ]);
    const detailsContainer = document.querySelector(
      ".job-details-jobs-unified-top-card__primary-description-container, " +
        ".jobs-unified-top-card__primary-description"
    );
    let whenPosted = "";
    let applicantsText = "";
    let totalClick = 0;
    if (detailsContainer) {
      const detailsText = detailsContainer.innerText || "";
      const detailsParts = detailsText.split("·").map((part) => part.trim());
      whenPosted = detailsParts[1] || "";
      totalClick = getApplyCount(detailsParts[2]);
    }
    const description = extractTextFromSelectors(
      [
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        ".jobs-description__content",
      ],
      true
    );
    const linkedinJobUrl = getCurrentLinkedInJobUrl();
    const { jobType, jobLink } = await determineJobTypeAndLink(linkedinJobUrl);
    const searchText = `${title} ${description}`;
    const matchedKeywords = window.KeywordHelper.matchKeywords(
      searchText,
      scrapingSettings.keywords
    );

    // NEW ATS SCORING
    let atsData = {
      score: null,
      matches: "",
      missing: "",
      suggestions: "",
    };

    if (
      scrapingSettings.useATS &&
      scrapingSettings.resumeText &&
      scrapingSettings.openRouterAPIKey
    ) {
      try {
        atsData = await getATSScore(scrapingSettings.resumeText, description);
        console.log(`ATS Score for ${title}: ${atsData.score}/100`);
      } catch (error) {
        console.error("Failed to get ATS score:", error);
      }
    }

    return {
      title,
      company,
      whenPosted,
      totalClick,
      jobType,
      jobLink,
      linkedinJobUrl,
      description,
      matchedKeywords: matchedKeywords.join(", "),
      keywordCount: matchedKeywords.length,
      isEnglish: isEnglishText(searchText),
      // NEW ATS FIELDS
      atsScore: atsData.score,
      atsMatches: atsData.matches,
      atsMissing: atsData.missing,
      atsSuggestions: atsData.suggestions,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error extracting job data:", error);
    return null;
  }
}

function extractTextFromSelectors(selectors, returnFullText = false) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return returnFullText
        ? (element.innerText || element.textContent || "").trim()
        : (element.innerText || element.textContent || "")
            .trim()
            .split("\n")[0];
    }
  }
  return "";
}

async function determineJobTypeAndLink(linkedinJobUrl) {
  const applyButton = document.querySelector(
    ".jobs-apply-button, " +
      "[data-control-name='job_apply'], " +
      "#jobs-apply-button-id"
  );
  if (!applyButton) {
    return { jobType: "Easy Apply", jobLink: linkedinJobUrl };
  }
  const buttonText = (applyButton.innerText || "").toLowerCase();
  if (buttonText.includes("easy apply") || buttonText.includes("apply now")) {
    return { jobType: "Easy Apply", jobLink: linkedinJobUrl };
  }
  const externalUrl = await interceptApplyUrl(applyButton);
  return { jobType: "External Apply", jobLink: externalUrl || linkedinJobUrl };
}

// function matchKeywords(text, keywords, options = {}) {
//   // Input validation and normalization
//   if (!text || typeof text !== "string") return [];
//   if (!keywords || !Array.isArray(keywords) || keywords.length === 0) return [];

//   const {
//     caseSensitive = false,
//     exactMatch = false,
//     fuzzyMatch = false,
//     minSimilarity = 0.8,
//     returnDetails = false,
//     customAliases = {},
//     excludeCommon = true,
//   } = options;

//   // Enhanced text normalization
//   const normalizeText = (str) => {
//     if (!caseSensitive) str = str.toLowerCase();

//     // Handle various separators and special characters
//     return str
//       .replace(/[_\-\.]/g, " ") // Convert separators to spaces
//       .replace(/([a-z])([A-Z])/g, "$1 $2") // Handle camelCase
//       .replace(/[^a-z0-9\s+#\/]/gi, " ") // Keep alphanumeric, +, #, /
//       .replace(/\s+/g, " ") // Normalize whitespace
//       .trim();
//   };

//   const normalizedText = normalizeText(text);

//   // Extended keyword mapping with more comprehensive aliases
//   const keywordMap = {
//     // JavaScript ecosystem
//     javascript: [
//       "js",
//       "javascript",
//       "js/ts",
//       "ecmascript",
//       "es6",
//       "es2015",
//       "es2020",
//       "vanilla js",
//     ],
//     typescript: ["ts", "typescript", "js/ts", "tsx"],
//     nodejs: [
//       "nodejs",
//       "node js",
//       "node.js",
//       "node",
//       "server side js",
//       "backend js",
//     ],

//     // Frontend frameworks
//     reactjs: ["react", "reactjs", "react.js", "react native", "jsx"],
//     vuejs: ["vue", "vuejs", "vue.js", "vue3", "vue 3", "nuxt"],
//     angular: ["angular", "angularjs", "ng", "angular2+"],
//     svelte: ["svelte", "sveltekit"],

//     // State management
//     redux: ["redux", "redux toolkit", "rtk"],
//     vuex: ["vuex", "pinia"],

//     // Styling
//     html: ["html", "html5", "markup"],
//     css: ["css", "css3", "cascading style sheets"],
//     sass: ["sass", "scss", "syntactically awesome"],
//     tailwind: ["tailwind", "tailwindcss", "tailwind css"],
//     bootstrap: ["bootstrap", "bs"],

//     // Backend frameworks
//     express: ["express", "express.js", "expressjs"],
//     nestjs: ["nest", "nestjs", "nest.js"],
//     fastify: ["fastify"],
//     koa: ["koa", "koa.js"],

//     // Java ecosystem
//     java: ["java", "jvm"],
//     springboot: ["springboot", "spring boot", "spring framework", "spring"],

//     // Databases
//     mysql: ["mysql", "my sql"],
//     mongodb: ["mongodb", "mongo db", "mongo", "nosql"],
//     postgresql: ["postgresql", "postgres", "pg"],
//     redis: ["redis", "in memory db"],
//     sqlite: ["sqlite", "sqlite3"],

//     // Cloud & DevOps
//     aws: [
//       "aws",
//       "amazon web services",
//       "ec2",
//       "s3",
//       "sns",
//       "sqs",
//       "lambda",
//       "cloudformation",
//       "rds",
//     ],
//     docker: ["docker", "containerization", "containers"],
//     kubernetes: ["kubernetes", "k8s", "orchestration"],

//     // APIs & Protocols
//     graphql: ["graphql", "graph ql", "gql"],
//     restapi: ["rest api", "restful api", "rest", "restful"],
//     websocket: ["websocket", "ws", "realtime"],
//     socketio: ["socket.io", "socketio", "socket io"],

//     // Testing
//     testing: ["unit testing", "testing", "test driven", "tdd", "bdd"],
//     jest: ["jest", "testing framework"],
//     cypress: ["cypress", "e2e testing"],
//     playwright: ["playwright", "browser testing"],

//     // Version control & CI/CD
//     git: ["git", "version control", "github", "gitlab", "bitbucket"],
//     cicd: [
//       "ci/cd",
//       "cicd",
//       "ci cd",
//       "continuous integration",
//       "continuous deployment",
//       "github actions",
//       "jenkins",
//     ],

//     // Architecture
//     microservices: ["microservices", "micro services", "distributed"],
//     serverless: ["serverless", "lambda", "functions as a service", "faas"],

//     // Other tools
//     bullmq: ["bullmq", "bull mq", "job queue"],
//     webpack: ["webpack", "bundler"],
//     vite: ["vite", "build tool"],

//     // Languages
//     python: ["python", "py"],
//     golang: ["go", "golang"],
//     rust: ["rust", "rust lang"],
//     csharp: ["c#", "csharp", "c sharp", ".net"],
//     php: ["php"],
//     ruby: ["ruby", "ruby on rails", "rails"],

//     ...customAliases, // Allow custom aliases to be merged in
//   };

//   // Fuzzy matching helper (simple Levenshtein distance)
//   const fuzzyDistance = (a, b) => {
//     const matrix = Array(b.length + 1)
//       .fill()
//       .map(() => Array(a.length + 1).fill(0));

//     for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
//     for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

//     for (let j = 1; j <= b.length; j++) {
//       for (let i = 1; i <= a.length; i++) {
//         const cost = a[i - 1] === b[j - 1] ? 0 : 1;
//         matrix[j][i] = Math.min(
//           matrix[j - 1][i] + 1,
//           matrix[j][i - 1] + 1,
//           matrix[j - 1][i - 1] + cost
//         );
//       }
//     }

//     return 1 - matrix[b.length][a.length] / Math.max(a.length, b.length);
//   };

//   // Common words to potentially exclude from fuzzy matching
//   const commonWords = excludeCommon
//     ? [
//         "and",
//         "or",
//         "the",
//         "with",
//         "for",
//         "in",
//         "on",
//         "at",
//         "to",
//         "from",
//         "of",
//         "is",
//         "are",
//         "was",
//         "were",
//       ]
//     : [];

//   const result = [];
//   const processedKeywords = new Set(); // Prevent duplicates

//   for (const keyword of keywords) {
//     if (processedKeywords.has(keyword)) continue;

//     const canonical = caseSensitive
//       ? keyword.trim()
//       : keyword.toLowerCase().trim();
//     const aliases = keywordMap[canonical] || [canonical];

//     let matchFound = false;
//     let matchType = "none";
//     let similarity = 0;
//     let matchedAlias = "";

//     // Exact/word boundary matching
//     for (const variant of aliases) {
//       const normalizedVariant = normalizeText(variant);

//       if (exactMatch) {
//         // Exact match only
//         if (normalizedText === normalizedVariant) {
//           matchFound = true;
//           matchType = "exact";
//           similarity = 1;
//           matchedAlias = variant;
//           break;
//         }
//       } else {
//         // Word boundary matching with improved regex
//         const pattern = new RegExp(
//           `\\b${normalizedVariant
//             .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
//             .replace(/\s+/g, "\\s+")}\\b`,
//           caseSensitive ? "g" : "gi"
//         );

//         if (pattern.test(normalizedText)) {
//           matchFound = true;
//           matchType = "boundary";
//           similarity = 1;
//           matchedAlias = variant;
//           break;
//         }
//       }
//     }

//     // Fuzzy matching if enabled and no exact match found
//     if (!matchFound && fuzzyMatch) {
//       for (const variant of aliases) {
//         const normalizedVariant = normalizeText(variant);

//         // Skip very short words for fuzzy matching unless they're technical terms
//         if (
//           normalizedVariant.length < 3 &&
//           !["js", "ts", "go", "c#"].includes(normalizedVariant)
//         )
//           continue;
//         if (commonWords.includes(normalizedVariant)) continue;

//         // Split text into words and check fuzzy match against each
//         const textWords = normalizedText.split(/\s+/);
//         for (const word of textWords) {
//           if (word.length >= 3) {
//             const fuzzySimilarity = fuzzyDistance(normalizedVariant, word);
//             if (
//               fuzzySimilarity >= minSimilarity &&
//               fuzzySimilarity > similarity
//             ) {
//               matchFound = true;
//               matchType = "fuzzy";
//               similarity = fuzzySimilarity;
//               matchedAlias = variant;
//             }
//           }
//         }
//       }
//     }

//     if (matchFound) {
//       processedKeywords.add(keyword);

//       if (returnDetails) {
//         result.push({
//           keyword,
//           matched: true,
//           type: matchType,
//           similarity,
//           matchedAlias,
//           canonical,
//         });
//       } else {
//         result.push(keyword);
//       }
//     } else if (returnDetails) {
//       result.push({
//         keyword,
//         matched: false,
//         type: "none",
//         similarity: 0,
//         matchedAlias: "",
//         canonical,
//       });
//     }
//   }

//   return result;
// }

async function interceptApplyUrl(applyButton) {
  return new Promise(async (resolve) => {
    try {
      const linkElement =
        applyButton.closest("a") || applyButton.querySelector("a");
      if (linkElement?.href && linkElement.href !== window.location.href) {
        resolve(linkElement.href);
        return;
      }
      chrome.runtime.sendMessage({ type: "startTabMonitoring" }, async () => {
        applyButton.click();
        setTimeout(() => {
          chrome.runtime.sendMessage(
            { type: "getMonitoredUrl" },
            (urlResponse) => {
              resolve(urlResponse?.url || "external apply");
            }
          );
        }, 3000);
      });
    } catch (error) {
      console.error("Error intercepting apply URL:", error);
      resolve("external apply");
    }
  });
}

function clickOnNextButton() {
  const nextButton = document.querySelector(
    ".jobs-search-pagination__button--next, .artdeco-pagination__button--next"
  );
  if (nextButton && !nextButton.disabled) {
    nextButton.click();
    setTimeout(() => {
      if (isScrapingActive) startFetchingJobs();
    }, 3000);
  } else {
    console.log(`Scraping completed! Total jobs found: ${allJobData.length}`);
    stopJobScraping();
    showScrapingCompleteNotification(allJobData.length);
  }
}

function showScrapingCompleteNotification(jobCount) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
    color: white; padding: 20px; border-radius: 12px; 
    font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; 
    box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 10000; 
    max-width: 300px; animation: slideIn 0.5s ease-out;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
      <span style="font-size: 24px;">🎉</span>
      <span>Scraping Complete!</span>
    </div>
    <div style="font-size: 12px; opacity: 0.9;">
      Found <strong>${jobCount}</strong> matching jobs<br>
      <em>Click the extension to download</em>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideIn 0.5s ease-out reverse";
    setTimeout(() => notification.parentNode?.removeChild(notification), 500);
  }, 5000);
}

function waitForJobDescriptionReady() {
  return new Promise((resolve) => {
    waitForElementReady({
      skeletonSelector: ".scaffold-skeleton-container",
      readySelector: ".jobs-box__html-content, .jobs-description-content__text",
      onReady: resolve,
    });
  });
}

function waitForElementReady({ skeletonSelector, readySelector, onReady }) {
  const skeletons = document.querySelectorAll(skeletonSelector);
  const readyElements = document.querySelectorAll(readySelector);
  if (skeletons.length === 0 && readyElements.length > 0) {
    onReady();
    return;
  }
  const observer = new MutationObserver(() => {
    const stillLoading = document.querySelectorAll(skeletonSelector).length > 0;
    const loaded = document.querySelectorAll(readySelector).length > 0;
    if (!stillLoading && loaded) {
      observer.disconnect();
      onReady();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function getApplyCount(text) {
  const match = text?.match(/(\d+[\d,]*)/);
  return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
}

function getCurrentLinkedInJobUrl() {
  const jobIdMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
  return jobIdMatch
    ? `https://www.linkedin.com/jobs/view/${jobIdMatch[1]}`
    : window.location.href;
}

function downloadJobs(format = "csv") {
  const jobs = JSON.parse(localStorage.getItem("linkedinJobs") || "[]");
  if (jobs.length === 0) {
    alert("No jobs to download. Please scrape some jobs first!");
    return;
  }
  const headers = [
    "Title",
    "Company",
    "When Posted",
    "Total Applicants",
    "Job Type",
    "Apply Link",
    "LinkedIn Job URL",
    "Matched Keywords",
    "Keyword Count",
    "Is English",
    "Description",
    "Timestamp",
  ];
  if (format === "csv") {
    downloadAsCSV(jobs, headers);
  } else {
    downloadAsExcel(jobs, headers);
  }
}

function downloadAsCSV(jobs, headers) {
  const updatedHeaders = [
    "Title",
    "Company",
    "When Posted",
    "Total Applicants",
    "Job Type",
    "Apply Link",
    "LinkedIn Job URL",
    "Matched Keywords",
    "Keyword Count",
    "Is English",
    "ATS Score",
    "ATS Matches",
    "ATS Missing",
    "ATS Suggestions",
    "Description",
    "Timestamp",
  ];

  const csvContent = [
    updatedHeaders.join(","),
    ...jobs.map((job) =>
      [
        `"${escapeCsv(job.title)}"`,
        `"${escapeCsv(job.company)}"`,
        `"${escapeCsv(job.whenPosted)}"`,
        job.totalClick || 0,
        `"${escapeCsv(job.jobType)}"`,
        `"${escapeCsv(job.jobLink)}"`,
        `"${escapeCsv(job.linkedinJobUrl)}"`,
        `"${escapeCsv(job.matchedKeywords)}"`,
        job.keywordCount || 0,
        job.isEnglish ? "Yes" : "No",
        job.atsScore || "",
        `"${escapeCsv(job.atsMatches)}"`,
        `"${escapeCsv(job.atsMissing)}"`,
        `"${escapeCsv(job.atsSuggestions)}"`,
        `"${escapeCsv(job.description || "")}"`,
        `"${escapeCsv(job.timestamp)}"`,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(
    blob,
    `linkedin_jobs_${new Date().toISOString().split("T")[0]}.csv`
  );
  showDownloadNotification(jobs.length, "CSV");
}

// 8. UPDATE downloadAsExcel function (replace the wsData array and colWidths)
function downloadAsExcel(jobs, headers) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("No jobs to export.");
    return;
  }

  if (typeof XLSX === "undefined") {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => {
      console.log("XLSX library loaded successfully");
      setTimeout(generateExcel, 500);
    };
    script.onerror = (error) => {
      console.error("Failed to load XLSX library:", error);
      alert("Excel export failed. Downloading as CSV instead.");
      downloadAsCSV(jobs, headers);
    };
    document.head.appendChild(script);
    return;
  }

  generateExcel();

  function generateExcel() {
    try {
      console.log("Generating Excel file with", jobs.length, "jobs");

      const wb = XLSX.utils.book_new();

      // UPDATED headers and data mapping
      const updatedHeaders = [
        "Title",
        "Company",
        "When Posted",
        "Total Applicants",
        "Job Type",
        "Apply Link",
        "LinkedIn Job URL",
        "Matched Keywords",
        "Keyword Count",
        "Is English",
        "ATS Score",
        "ATS Matches",
        "ATS Missing",
        "ATS Suggestions",
        "Description",
        "Timestamp",
      ];

      const wsData = [
        updatedHeaders,
        ...jobs.map((job) => [
          job.title || "",
          job.company || "",
          job.whenPosted || "",
          job.totalClick || 0,
          job.jobType || "",
          job.jobLink || "",
          job.linkedinJobUrl || "",
          job.matchedKeywords || "",
          job.keywordCount || 0,
          job.isEnglish ? "Yes" : "No",
          job.atsScore || "",
          job.atsMatches || "",
          job.atsMissing || "",
          job.atsSuggestions || "",
          (job.description || "").substring(0, 500) + "...",
          job.timestamp || "",
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // UPDATED column widths
      const colWidths = [
        { width: 30 }, // Title
        { width: 20 }, // Company
        { width: 15 }, // When Posted
        { width: 12 }, // Total Applicants
        { width: 15 }, // Job Type
        { width: 40 }, // Apply Link
        { width: 40 }, // LinkedIn Job URL
        { width: 25 }, // Matched Keywords
        { width: 12 }, // Keyword Count
        { width: 10 }, // Is English
        { width: 10 }, // ATS Score
        { width: 30 }, // ATS Matches
        { width: 30 }, // ATS Missing
        { width: 40 }, // ATS Suggestions
        { width: 60 }, // Description
        { width: 20 }, // Timestamp
      ];

      ws["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, "LinkedIn Jobs");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const filename = `linkedin_jobs_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      downloadBlob(blob, filename);

      showDownloadNotification(jobs.length, "Excel");
      console.log("Excel file generated successfully");
    } catch (error) {
      console.error("Error generating Excel file:", error);
      alert("Excel export failed. Downloading as CSV instead.");
      downloadAsCSV(jobs, headers);
    }
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function escapeCsv(text) {
  return (text || "")
    .replace(/"/g, '""')
    .replace(/\n/g, " ")
    .replace(/\r/g, " ");
}

function showDownloadNotification(jobCount, format) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; 
    background: linear-gradient(135deg, #4CAF50, #45a049); 
    color: white; padding: 20px; border-radius: 12px; 
    font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; 
    box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3); z-index: 10000; 
    animation: slideIn 0.3s ease-out; max-width: 280px;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
      <span style="font-size: 20px;">📥</span>
      <span>Download Complete!</span>
    </div>
    <div style="font-size: 12px; opacity: 0.95;">
      Exported <strong>${jobCount}</strong> jobs as ${format}<br>
      <em>Check your Downloads folder</em>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => notification.parentNode?.removeChild(notification), 300);
  }, 4000);
}

// 2. ADD new ATS scoring function (add this new function)
async function getATSScore(resumeText, jobDescription) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${scrapingSettings.openRouterAPIKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "LinkedIn Job Scraper",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chats",
          messages: [
            {
              role: "system",
              content:
                "You are an expert ATS (Applicant Tracking System) resume analyzer. Provide a numerical score out of 100 and specific feedback.",
            },
            {
              role: "user",
              content: `Analyze this resume against the job description and provide:
1. ATS Score (0-100)
2. Key matching keywords found (from job description to Resume only matched keywords)
3. Missing important keywords in resume
4. Brief improvement suggestions

Resume:
${resumeText}

Job Description:
${jobDescription}

Format your response as:
Score: [number]/100
Matches: [keywords]
Missing: [keywords]  
Suggestions: [brief tips]`,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();
    return parseATSResponse(result.choices[0].message.content);
  } catch (error) {
    console.error("OpenRouter API Error:", error);
    throw new Error(
      "Failed to get ATS score. Please check your API key and connection."
    );
  }
}

// 3. ADD ATS response parser (add this new function)
function parseATSResponse(response) {
  const scoreMatch = response.match(/Score:\s*(\d+)/i);
  const matchesMatch = response.match(/Matches:\s*([^\n]+)/i);
  const missingMatch = response.match(/Missing:\s*([^\n]+)/i);
  const suggestionsMatch = response.match(/Suggestions:\s*([^\n]+)/i);

  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
    matches: matchesMatch ? matchesMatch[1].trim() : "",
    missing: missingMatch ? missingMatch[1].trim() : "",
    suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : "",
  };
}

if (window.location.href.includes("linkedin.com/jobs")) {
  chrome.runtime.sendMessage({ type: "onLinkedIn", url: window.location.href });
}
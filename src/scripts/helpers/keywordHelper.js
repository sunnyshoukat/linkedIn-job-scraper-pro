// Simplified KeywordHelper.js - Robust Implementation
(function(global) {
  "use strict";

  console.log("🚀 Loading Simplified KeywordHelper...");

  // Basic keyword mapping
  const BASIC_KEYWORDS = {
    javascript: ["js", "javascript", "ecmascript", "es6"],
    typescript: ["ts", "typescript", "tsx"],
    nodejs: ["nodejs", "node.js", "node js", "node"],
    react: ["react", "reactjs", "react.js", "jsx"],
    vue: ["vue", "vuejs", "vue.js"],
    angular: ["angular", "angularjs"],
    html: ["html", "html5"],
    css: ["css", "css3"],
    python: ["python", "py"],
    java: ["java"],
    aws: ["aws", "amazon web services"],
    docker: ["docker"],
    kubernetes: ["kubernetes", "k8s"],
    mysql: ["mysql"],
    mongodb: ["mongodb", "mongo"],
    postgresql: ["postgresql", "postgres"],
    redis: ["redis"],
    git: ["git", "github", "gitlab"]
  };

  // Simple text normalization
  function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Simple keyword matching
  function matchKeywords(text, keywords, options = {}) {
    try {
      if (!text || !keywords || !Array.isArray(keywords)) {
        console.warn('Invalid input for matchKeywords');
        return [];
      }

      const normalizedText = normalizeText(text);
      const matched = [];

      for (const keyword of keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (normalizedText.includes(normalizedKeyword)) {
          matched.push(keyword);
        }
        
        // Also check aliases
        const keywordKey = normalizedKeyword.replace(/\s+/g, '');
        const aliases = BASIC_KEYWORDS[keywordKey] || [];
        
        for (const alias of aliases) {
          if (normalizedText.includes(alias.toLowerCase()) && !matched.includes(keyword)) {
            matched.push(keyword);
            break;
          }
        }
      }

      return matched;
    } catch (error) {
      console.error('Error in matchKeywords:', error);
      return [];
    }
  }

  // Simple skill scoring
  function calculateSkillScore(text, skillLevels = {}, skillWeights = {}) {
    try {
      let totalScore = 0;
      const matchedSkills = {
        primary: [],
        secondary: [],
        tertiary: []
      };

      const normalizedText = normalizeText(text);

      // Process each skill level
      for (const [level, skills] of Object.entries(skillLevels)) {
        if (!Array.isArray(skills)) continue;
        
        const weight = skillWeights[level] || 1;
        
        for (const skill of skills) {
          const normalizedSkill = normalizeText(skill);
          if (normalizedText.includes(normalizedSkill)) {
            matchedSkills[level].push(skill);
            totalScore += weight;
          }
        }
      }

      return {
        totalScore,
        matchedSkills,
        primarySkillCount: matchedSkills.primary.length,
        breakdown: `Primary: ${matchedSkills.primary.join(', ')} | Secondary: ${matchedSkills.secondary.join(', ')} | Tertiary: ${matchedSkills.tertiary.join(', ')}`
      };
    } catch (error) {
      console.error('Error in calculateSkillScore:', error);
      return {
        totalScore: 0,
        matchedSkills: { primary: [], secondary: [], tertiary: [] },
        primarySkillCount: 0,
        breakdown: ''
      };
    }
  }

  // Simple missing skills analysis
  function getMissingSkillsWithDetails(jobDescription, myKeywords = [], options = {}) {
    try {
      // Simple implementation - return empty results for now
      // This can be enhanced later
      return {
        totalFound: 0,
        totalMissing: 0,
        userSkillsCount: myKeywords.length,
        coveragePercentage: 100,
        missingSkills: [],
        learningPlan: { immediate: [], shortTerm: [], longTerm: [], optional: [] },
        timeEstimate: { totalWeeks: 0, totalMonths: 0 },
        strategicInsights: { quickWins: [], careerAdvancement: [], marketTrends: [] }
      };
    } catch (error) {
      console.error('Error in getMissingSkillsWithDetails:', error);
      return {
        missingSkills: [],
        totalFound: 0,
        totalMissing: 0
      };
    }
  }

  // Expose functions to global scope with error handling
  try {
    // Initialize KeywordHelper object if it doesn't exist
    if (!global.KeywordHelper) {
      global.KeywordHelper = {};
    }

    // Expose the functions
    global.KeywordHelper.matchKeywords = matchKeywords;
    global.KeywordHelper.calculateSkillScore = calculateSkillScore;
    global.KeywordHelper.getMissingSkillsWithDetails = getMissingSkillsWithDetails;

    // Add debug info
    global.KeywordHelper._version = "simplified-1.0";
    global.KeywordHelper._loaded = new Date().toISOString();

    console.log("✅ Simplified KeywordHelper loaded successfully!");
    console.log("✅ Functions available:", Object.keys(global.KeywordHelper));
    
    // Test basic functionality
    const testMatch = matchKeywords("JavaScript React developer", ["JavaScript", "React"]);
    console.log("✅ Test result:", testMatch);

    // Verify functions are callable
    console.log("✅ matchKeywords type:", typeof global.KeywordHelper.matchKeywords);
    console.log("✅ calculateSkillScore type:", typeof global.KeywordHelper.calculateSkillScore);
    console.log("✅ getMissingSkillsWithDetails type:", typeof global.KeywordHelper.getMissingSkillsWithDetails);

  } catch (error) {
    console.error("❌ Error exposing KeywordHelper functions:", error);
    
    // Last resort fallback
    try {
      global.KeywordHelper = {
        matchKeywords: function(text, keywords) {
          console.warn('Using fallback matchKeywords');
          if (!text || !keywords) return [];
          return keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
        },
        calculateSkillScore: function() {
          console.warn('Using fallback calculateSkillScore');
          return { totalScore: 0, matchedSkills: { primary: [], secondary: [], tertiary: [] }, primarySkillCount: 0, breakdown: '' };
        },
        getMissingSkillsWithDetails: function() {
          console.warn('Using fallback getMissingSkillsWithDetails');
          return { missingSkills: [], totalFound: 0, totalMissing: 0 };
        }
      };
      console.log("✅ Fallback KeywordHelper created");
    } catch (fallbackError) {
      console.error("❌ Complete KeywordHelper failure:", fallbackError);
    }
  }

})(typeof window !== 'undefined' ? window : this);

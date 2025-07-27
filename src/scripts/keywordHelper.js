// KeywordHelper.js
(function(global) {
  'use strict';
  
  console.log("KeywordHelper IIFE is executing NOW!");
// ===================================================================
// Skill MAPPING DATABASE
// ===================================================================

const SkillUtils = {
  /**
   * Enhanced text normalization for skill matching
   * @param {string} str - Text to normalize
   * @param {boolean} caseSensitive - Whether to preserve case
   * @returns {string} Normalized text
   */
  normalizeText(str, caseSensitive = false) {
    if (!str || typeof str !== 'string') return '';
    
    if (!caseSensitive) str = str.toLowerCase();

    return str
      .replace(/[_\-\.]/g, ' ')  // Convert separators to spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Handle camelCase
      .replace(/[^a-z0-9\s+#\/]/gi, ' ')  // Keep alphanumeric, +, #, /
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
  },

  /**
   * Fuzzy matching using Levenshtein distance
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Similarity score (0-1)
   */
  fuzzyDistance(a, b) {
    if (!a || !b) return 0;
    
    const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return 1 - matrix[b.length][a.length] / Math.max(a.length, b.length);
  },

  /**
   * Common words to exclude from fuzzy matching
   */
  getCommonWords() {
    return [
      'and', 'or', 'the', 'with', 'for', 'in', 'on', 'at', 'to', 'from', 
      'of', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 
      'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
      'this', 'that', 'these', 'those', 'a', 'an', 'be', 'been', 'being'
    ];
  },

  /**
   * Validate input parameters
   * @param {string} text - Text to validate
   * @param {Array} keywords - Keywords array to validate
   * @returns {Object} Validation result
   */
  validateInput(text, keywords) {
    const errors = [];
    
    if (!text || typeof text !== 'string') {
      errors.push('Text must be a non-empty string');
    }
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      errors.push('Keywords must be a non-empty array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Create regex pattern for word boundary matching
   * @param {string} term - Term to create pattern for
   * @param {boolean} caseSensitive - Case sensitivity flag
   * @returns {RegExp} Compiled regex pattern
   */
  createWordBoundaryPattern(term, caseSensitive = false) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`\\b${escapedTerm}\\b`, caseSensitive ? 'g' : 'gi');
  },

  /**
   * Merge custom aliases with default keyword map
   * @param {Object} defaultMap - Default keyword mapping
   * @param {Object} customAliases - Custom aliases to merge
   * @returns {Object} Merged keyword map
   */
  mergeKeywordMaps(defaultMap, customAliases = {}) {
    const merged = { ...defaultMap };
    
    for (const [key, aliases] of Object.entries(customAliases)) {
      if (merged[key]) {
        merged[key] = [...new Set([...merged[key], ...aliases])];
      } else {
        merged[key] = aliases;
      }
    }
    
    return merged;
  }
};


// ===================================================================
// KEYWORD MAPPING DATABASE
// ===================================================================

const KeywordDatabase = {
  // Basic keyword mapping (subset for matchKeywords function)
  basic: {
    // JavaScript ecosystem
    javascript: ['js', 'javascript', 'js/ts', 'ecmascript', 'es6', 'es2015', 'es2020', 'vanilla js'],
    typescript: ['ts', 'typescript', 'js/ts', 'tsx'],
    nodejs: ['nodejs', 'node js', 'node.js', 'node', 'server side js', 'backend js'],

    // Frontend frameworks
    reactjs: ['react', 'reactjs', 'react.js', 'react native', 'jsx'],
    vuejs: ['vue', 'vuejs', 'vue.js', 'vue3', 'vue 3', 'nuxt'],
    angular: ['angular', 'angularjs', 'ng', 'angular2+'],
    svelte: ['svelte', 'sveltekit'],

    // State management
    redux: ['redux', 'redux toolkit', 'rtk'],
    vuex: ['vuex', 'pinia'],

    // Styling
    html: ['html', 'html5', 'markup'],
    css: ['css', 'css3', 'cascading style sheets'],
    sass: ['sass', 'scss', 'syntactically awesome'],
    tailwind: ['tailwind', 'tailwindcss', 'tailwind css'],
    bootstrap: ['bootstrap', 'bs'],

    // Backend frameworks
    express: ['express', 'express.js', 'expressjs'],
    nestjs: ['nest', 'nestjs', 'nest.js'],
    fastify: ['fastify'],
    koa: ['koa', 'koa.js'],

    // Java ecosystem
    java: ['java', 'jvm'],
    springboot: ['springboot', 'spring boot', 'spring framework', 'spring'],

    // Databases
    mysql: ['mysql', 'my sql'],
    mongodb: ['mongodb', 'mongo db', 'mongo', 'nosql'],
    postgresql: ['postgresql', 'postgres', 'pg'],
    redis: ['redis', 'in memory db'],
    sqlite: ['sqlite', 'sqlite3'],

    // Cloud & DevOps
    aws: ['aws', 'amazon web services', 'ec2', 's3', 'sns', 'sqs', 'lambda', 'cloudformation', 'rds'],
    docker: ['docker', 'containerization', 'containers'],
    kubernetes: ['kubernetes', 'k8s', 'orchestration'],

    // APIs & Protocols
    graphql: ['graphql', 'graph ql', 'gql'],
    restapi: ['rest api', 'restful api', 'rest', 'restful'],
    websocket: ['websocket', 'ws', 'realtime'],
    socketio: ['socket.io', 'socketio', 'socket io'],

    // Testing
    testing: ['unit testing', 'testing', 'test driven', 'tdd', 'bdd'],
    jest: ['jest', 'testing framework'],
    cypress: ['cypress', 'e2e testing'],
    playwright: ['playwright', 'browser testing'],

    // Version control & CI/CD
    git: ['git', 'version control', 'github', 'gitlab', 'bitbucket'],
    cicd: ['ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous deployment', 'github actions', 'jenkins'],

    // Architecture
    microservices: ['microservices', 'micro services', 'distributed'],
    serverless: ['serverless', 'lambda', 'functions as a service', 'faas'],

    // Other tools
    bullmq: ['bullmq', 'bull mq', 'job queue'],
    webpack: ['webpack', 'bundler'],
    vite: ['vite', 'build tool'],

    // Languages
    python: ['python', 'py'],
    golang: ['go', 'golang'],
    rust: ['rust', 'rust lang'],
    csharp: ['c#', 'csharp', 'c sharp', '.net'],
    php: ['php'],
    ruby: ['ruby', 'ruby on rails', 'rails']
  },

  // Extended comprehensive database (for missing skills analysis)
  comprehensive: {
    // Programming Languages - Complete Coverage
    'programming': {
      // Web Languages
      javascript: ['javascript', 'js', 'es6', 'es2015+', 'ecmascript', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'vanilla js'],
      typescript: ['typescript', 'ts', 'tsx', 'type script'],
      coffeescript: ['coffeescript', 'coffee script'],
      dart: ['dart'],
      
      // System Languages
      c: ['c programming', 'c language', 'ansi c'],
      cplusplus: ['c++', 'cpp', 'c plus plus', 'cxx'],
      csharp: ['c#', 'csharp', 'c sharp', '.net', 'dotnet', 'dot net'],
      java: ['java', 'jdk', 'jre', 'openjdk'],
      kotlin: ['kotlin'],
      swift: ['swift'],
      objectivec: ['objective-c', 'objective c', 'objc'],
      rust: ['rust', 'rust lang'],
      golang: ['go', 'golang', 'go lang'],
      
      // Scripting Languages
      python: ['python', 'py', 'python3', 'python2', 'cpython', 'pypy'],
      ruby: ['ruby', 'rb'],
      perl: ['perl'],
      php: ['php', 'php7', 'php8'],
      bash: ['bash', 'shell', 'sh', 'zsh', 'fish'],
      powershell: ['powershell', 'pwsh'],
      
      // Functional Languages
      haskell: ['haskell'],
      scala: ['scala'],
      clojure: ['clojure'],
      erlang: ['erlang'],
      elixir: ['elixir'],
      fsharp: ['f#', 'fsharp', 'f sharp'],
      ocaml: ['ocaml'],
      lisp: ['lisp', 'common lisp'],
      scheme: ['scheme'],
      
      // Assembly & Low Level
      assembly: ['assembly', 'asm', 'nasm', 'masm'],
      verilog: ['verilog'],
      vhdl: ['vhdl'],
      
      // Other Languages
      matlab: ['matlab'],
      r: ['r programming', 'r language'],
      julia: ['julia'],
      groovy: ['groovy'],
      lua: ['lua'],
      nim: ['nim'],
      zig: ['zig'],
      crystal: ['crystal'],
      fortran: ['fortran'],
      cobol: ['cobol'],
      pascal: ['pascal'],
      delphi: ['delphi']
    },

    // Frontend Technologies - Exhaustive List
    'frontend': {
      // Core Web Technologies
      html: ['html', 'html5', 'html4', 'markup'],
      css: ['css', 'css3', 'cascading style sheets'],
      
      // CSS Preprocessors & Frameworks
      sass: ['sass', 'scss', 'syntactically awesome'],
      less: ['less css', 'less'],
      stylus: ['stylus'],
      postcss: ['postcss', 'post css'],
      tailwind: ['tailwind', 'tailwindcss', 'tailwind css'],
      bootstrap: ['bootstrap', 'bs', 'bootstrap 4', 'bootstrap 5'],
      bulma: ['bulma'],
      foundation: ['foundation css'],
      materialize: ['materialize css'],
      semantic: ['semantic ui'],
      antdesign: ['ant design', 'antd'],
      materialui: ['material ui', 'mui', 'material-ui'],
      chakraui: ['chakra ui'],
      
      // JavaScript Frameworks & Libraries
      react: ['react', 'reactjs', 'react.js', 'jsx', 'react hooks', 'react 16', 'react 17', 'react 18'],
      vue: ['vue', 'vuejs', 'vue.js', 'vue2', 'vue3', 'composition api'],
      angular: ['angular', 'angularjs', 'angular2+', 'angular 2', 'angular 4', 'angular 6', 'angular 8', 'angular 10', 'angular 12', 'angular 14'],
      svelte: ['svelte', 'sveltekit'],
      ember: ['ember', 'emberjs', 'ember.js'],
      backbone: ['backbone', 'backbonejs', 'backbone.js'],
      knockout: ['knockout', 'knockoutjs'],
      preact: ['preact'],
      lit: ['lit element', 'lit html'],
      stimulus: ['stimulus'],
      alpine: ['alpine js', 'alpinejs'],
      
      // State Management
      redux: ['redux', 'redux toolkit', 'rtk', 'redux saga', 'redux thunk'],
      mobx: ['mobx'],
      vuex: ['vuex'],
      pinia: ['pinia'],
      zustand: ['zustand'],
      recoil: ['recoil'],
      
      // Meta Frameworks
      nextjs: ['next.js', 'nextjs', 'next'],
      nuxt: ['nuxt', 'nuxtjs', 'nuxt.js'],
      gatsby: ['gatsby', 'gatsbyjs'],
      remix: ['remix'],
      
      // Build Tools & Bundlers
      webpack: ['webpack'],
      vite: ['vite'],
      parcel: ['parcel'],
      rollup: ['rollup'],
      esbuild: ['esbuild'],
      snowpack: ['snowpack'],
      
      // Testing & Development Tools
      storybook: ['storybook'],
      chromatic: ['chromatic'],
      
      // Progressive Web Apps
      pwa: ['pwa', 'progressive web app', 'service worker', 'workbox']
    },

    // Backend Technologies - Complete Coverage
    'backend': {
      // Node.js Ecosystem
      nodejs: ['node.js', 'nodejs', 'node js', 'node'],
      express: ['express', 'express.js', 'expressjs'],
      nestjs: ['nest.js', 'nestjs', 'nest js'],
      fastify: ['fastify'],
      koa: ['koa.js', 'koa'],
      hapi: ['hapi', 'hapi.js'],
      adonis: ['adonis', 'adonisjs'],
      meteor: ['meteor', 'meteorjs'],
      
      // Python Frameworks
      django: ['django'],
      flask: ['flask'],
      fastapi: ['fastapi', 'fast api'],
      tornado: ['tornado'],
      pyramid: ['pyramid'],
      bottle: ['bottle'],
      falcon: ['falcon'],
      sanic: ['sanic'],
      quart: ['quart'],
      starlette: ['starlette'],
      
      // Java Ecosystem
      springboot: ['spring boot', 'springboot', 'spring framework', 'spring'],
      hibernate: ['hibernate'],
      struts: ['struts'],
      jersey: ['jersey'],
      dropwizard: ['dropwizard'],
      micronaut: ['micronaut'],
      quarkus: ['quarkus'],
      
      // .NET Ecosystem
      aspnet: ['asp.net', 'aspnet', 'asp net core', 'asp.net core'],
      entityframework: ['entity framework', 'ef core'],
      
      // PHP Frameworks
      laravel: ['laravel'],
      symfony: ['symfony'],
      codeigniter: ['codeigniter'],
      cakephp: ['cakephp', 'cake php'],
      zend: ['zend framework'],
      yii: ['yii framework'],
      phalcon: ['phalcon'],
      
      // Ruby Frameworks
      rails: ['rails', 'ruby on rails', 'ror'],
      sinatra: ['sinatra'],
      
      // Go Frameworks
      gin: ['gin framework'],
      echo: ['echo framework'],
      fiber: ['fiber framework'],
      gorilla: ['gorilla mux'],
      
      // Rust Frameworks
      actix: ['actix web'],
      rocket: ['rocket'],
      warp: ['warp'],
      
      // Other Backend Technologies
      graphql: ['graphql', 'graph ql', 'gql'],
      rest: ['rest api', 'restful api', 'rest', 'restful'],
      soap: ['soap', 'soap api'],
      grpc: ['grpc', 'g rpc'],
      websocket: ['websocket', 'ws', 'realtime'],
      socketio: ['socket.io', 'socketio', 'socket io'],
      
      // Message Queues & Event Streaming
      rabbitmq: ['rabbitmq', 'rabbit mq'],
      apache_kafka: ['apache kafka', 'kafka'],
      redis_pubsub: ['redis pub/sub'],
      amazonsqs: ['amazon sqs', 'sqs'],
      amazonsns: ['amazon sns', 'sns'],
      bullmq: ['bullmq', 'bull mq'],
      sidekiq: ['sidekiq'],
      celery: ['celery']
    },

    // Database Technologies - All Major Databases
    'database': {
      // Relational Databases
      mysql: ['mysql', 'my sql'],
      postgresql: ['postgresql', 'postgres', 'pg'],
      sqlite: ['sqlite', 'sqlite3'],
      mariadb: ['mariadb', 'maria db'],
      oracle: ['oracle database', 'oracle db'],
      sqlserver: ['sql server', 'mssql', 'microsoft sql server'],
      db2: ['db2', 'ibm db2'],
      
      // NoSQL Databases
      mongodb: ['mongodb', 'mongo', 'mongo db'],
      couchdb: ['couchdb', 'couch db'],
      cassandra: ['cassandra', 'apache cassandra'],
      dynamodb: ['dynamodb', 'dynamo db', 'amazon dynamodb'],
      
      // Key-Value Stores
      redis: ['redis'],
      memcached: ['memcached'],
      etcd: ['etcd'],
      
      // Graph Databases
      neo4j: ['neo4j'],
      amazonneptune: ['amazon neptune', 'neptune'],
      arangodb: ['arangodb', 'arango db'],
      
      // Time Series Databases
      influxdb: ['influxdb', 'influx db'],
      prometheus: ['prometheus'],
      timescaledb: ['timescale db', 'timescaledb'],
      
      // Search Engines
      elasticsearch: ['elasticsearch', 'elastic search'],
      solr: ['apache solr', 'solr'],
      algolia: ['algolia'],
      
      // Data Warehouses
      snowflake: ['snowflake'],
      redshift: ['amazon redshift', 'redshift'],
      bigquery: ['google bigquery', 'bigquery'],
      
      // ORMs & Query Builders
      prisma: ['prisma', 'prisma orm'],
      sequelize: ['sequelize'],
      typeorm: ['typeorm'],
      mongoose: ['mongoose'],
      sqlalchemy: ['sqlalchemy'],
      activerecord: ['active record'],
      eloquent: ['eloquent orm'],
      knex: ['knex', 'knex.js'],
      drizzle: ['drizzle orm']
    },

    // Cloud & DevOps - Complete Coverage
    'cloud': {
      // Cloud Providers
      aws: ['aws', 'amazon web services'],
      azure: ['azure', 'microsoft azure'],
      gcp: ['gcp', 'google cloud', 'google cloud platform'],
      digitalocean: ['digital ocean', 'digitalocean'],
      linode: ['linode'],
      vultr: ['vultr'],
      heroku: ['heroku'],
      vercel: ['vercel'],
      netlify: ['netlify'],
      
      // AWS Services
      ec2: ['ec2', 'elastic compute cloud'],
      s3: ['s3', 'simple storage service'],
      lambda: ['aws lambda', 'lambda functions'],
      rds: ['rds', 'relational database service'],
      vpc: ['vpc', 'virtual private cloud'],
      cloudfront: ['cloudfront'],
      route53: ['route 53', 'route53'],
      iam: ['iam', 'identity access management'],
      cloudwatch: ['cloudwatch'],
      ecs: ['ecs', 'elastic container service'],
      eks: ['eks', 'elastic kubernetes service'],
      
      // Containerization
      docker: ['docker', 'containerization', 'containers'],
      podman: ['podman'],
      containerd: ['containerd'],
      
      // Orchestration
      kubernetes: ['kubernetes', 'k8s', 'k8s cluster'],
      docker_swarm: ['docker swarm'],
      nomad: ['nomad'],
      
      // Infrastructure as Code
      terraform: ['terraform', 'infrastructure as code', 'iac'],
      pulumi: ['pulumi'],
      cloudformation: ['cloudformation', 'cloud formation'],
      arm: ['arm templates'],
      
      // CI/CD Tools
      jenkins: ['jenkins'],
      gitlab: ['gitlab ci', 'gitlab cicd'],
      github_actions: ['github actions'],
      circleci: ['circle ci', 'circleci'],
      travis: ['travis ci'],
      azure_devops: ['azure devops'],
      bamboo: ['bamboo'],
      teamcity: ['teamcity'],
      
      // Configuration Management
      ansible: ['ansible'],
      chef: ['chef'],
      puppet: ['puppet'],
      saltstack: ['saltstack', 'salt'],
      
      // Monitoring & Logging
      prometheus: ['prometheus monitoring'],
      grafana: ['grafana'],
      elk: ['elk stack', 'elasticsearch kibana'],
      splunk: ['splunk'],
      datadog: ['datadog'],
      newrelic: ['new relic'],
      
      // Service Mesh
      istio: ['istio'],
      linkerd: ['linkerd'],
      consul: ['consul'],
      
      // Other DevOps Tools
      vagrant: ['vagrant'],
      packer: ['packer'],
      vault: ['hashicorp vault', 'vault']
    },

    // All other categories from the previous comprehensive database...
    // (Testing, Mobile, Data Science, Architecture, etc. - truncated for brevity)
    // The full database would be included in the actual implementation

    // Soft Skills & Methodologies
    'soft': {
      leadership: ['leadership', 'team lead', 'leading', 'management'],
      communication: ['communication', 'presentation', 'public speaking'],
      'problem-solving': ['problem solving', 'analytical', 'critical thinking'],
      mentoring: ['mentoring', 'coaching', 'training'],
      'project-management': ['project management'],
      agile: ['agile', 'scrum', 'kanban', 'sprint'],
      waterfall: ['waterfall methodology'],
      lean: ['lean methodology'],
      'design-thinking': ['design thinking'],
      collaboration: ['collaboration', 'teamwork'],
      adaptability: ['adaptability', 'flexibility'],
      creativity: ['creativity', 'innovation'],
      'time-management': ['time management'],
      'stakeholder-management': ['stakeholder management']
    }
  },

  /**
   * Get keyword map based on type
   * @param {string} type - 'basic' or 'comprehensive'
   * @returns {Object} Keyword mapping
   */
  getKeywordMap(type = 'basic') {
    return type === 'comprehensive' ? this.comprehensive : this.basic;
  },

  /**
   * Get flattened skill list from comprehensive database
   * @returns {Object} Flattened skill mapping
   */
  getFlattenedSkills() {
    const flattened = {};
    for (const [category, skills] of Object.entries(this.comprehensive)) {
      for (const [skillName, aliases] of Object.entries(skills)) {
        flattened[skillName] = { aliases, category };
      }
    }
    return flattened;
  }
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function matchKeywords(text, keywords, options = {}) {
  // Input validation
  const validation = SkillUtils.validateInput(text, keywords);
  if (!validation.isValid) {
    console.warn('matchKeywords validation failed:', validation.errors);
    return [];
  }

  const {
    caseSensitive = false,
    exactMatch = false,
    fuzzyMatch = false,
    minSimilarity = 0.8,
    returnDetails = false,
    customAliases = {},
    excludeCommon = true,
  } = options;

  const normalizedText = SkillUtils.normalizeText(text, caseSensitive);
  
  // Get keyword map and merge with custom aliases
  const baseKeywordMap = KeywordDatabase.getKeywordMap('basic');
  const keywordMap = SkillUtils.mergeKeywordMaps(baseKeywordMap, customAliases);

  const commonWords = excludeCommon ? SkillUtils.getCommonWords() : [];
  const result = [];
  const processedKeywords = new Set();

  for (const keyword of keywords) {
    if (processedKeywords.has(keyword)) continue;

    const canonical = caseSensitive ? keyword.trim() : keyword.toLowerCase().trim();
    const aliases = keywordMap[canonical] || [canonical];

    let matchFound = false;
    let matchType = 'none';
    let similarity = 0;
    let matchedAlias = '';

    // Exact/word boundary matching
    for (const variant of aliases) {
      const normalizedVariant = SkillUtils.normalizeText(variant, caseSensitive);

      if (exactMatch) {
        if (normalizedText === normalizedVariant) {
          matchFound = true;
          matchType = 'exact';
          similarity = 1;
          matchedAlias = variant;
          break;
        }
      } else {
        const pattern = SkillUtils.createWordBoundaryPattern(normalizedVariant, caseSensitive);
        if (pattern.test(normalizedText)) {
          matchFound = true;
          matchType = 'boundary';
          similarity = 1;
          matchedAlias = variant;
          break;
        }
      }
    }

    // Fuzzy matching if enabled and no exact match found
    if (!matchFound && fuzzyMatch) {
      for (const variant of aliases) {
        const normalizedVariant = SkillUtils.normalizeText(variant, caseSensitive);

        // Skip very short words or common words
        if (normalizedVariant.length < 3 && !['js', 'ts', 'go', 'c#'].includes(normalizedVariant)) continue;
        if (commonWords.includes(normalizedVariant)) continue;

        const textWords = normalizedText.split(/\s+/);
        for (const word of textWords) {
          if (word.length >= 3) {
            const fuzzySimilarity = SkillUtils.fuzzyDistance(normalizedVariant, word);
            if (fuzzySimilarity >= minSimilarity && fuzzySimilarity > similarity) {
              matchFound = true;
              matchType = 'fuzzy';
              similarity = fuzzySimilarity;
              matchedAlias = variant;
            }
          }
        }
      }
    }

    if (matchFound) {
      processedKeywords.add(keyword);

      if (returnDetails) {
        result.push({
          keyword,
          matched: true,
          type: matchType,
          similarity,
          matchedAlias,
          canonical,
        });
      } else {
        result.push(keyword);
      }
    } else if (returnDetails) {
      result.push({
        keyword,
        matched: false,
        type: 'none',
        similarity: 0,
        matchedAlias: '',
        canonical,
      });
    }
  }

  return result;
}

// ===================================================================
// EXTRACT MISSING SKILLS FUNCTION
// ===================================================================

function extractMissingSkills(jobDescription, myKeywords, options = {}) {
  // Input validation
  const validation = SkillUtils.validateInput(jobDescription, myKeywords || []);
  if (!validation.isValid) {
    console.warn('extractMissingSkills validation failed:', validation.errors);
    return [];
  }

  if (!myKeywords || !Array.isArray(myKeywords)) myKeywords = [];

  const {
    includeLevel = true,
    includeSoftSkills = false,
    minOccurrence = 1,
    priorityWeighting = true,
    categoryFilter = [],
    returnDetails = false,
    maxResults = 20
  } = options;

  // Priority indicators
  const priorityIndicators = [
    'required', 'must have', 'essential', 'critical', 'mandatory',
    'key', 'important', 'primary', 'core', 'fundamental',
    'strong', 'expert', 'advanced', 'proficient', 'senior'
  ];

  // Level indicators
  const levelIndicators = {
    senior: ['senior', 'lead', 'principal', 'staff', 'architect'],
    mid: ['mid-level', 'intermediate', 'experienced'],
    junior: ['junior', 'entry-level', 'graduate', 'intern']
  };

  const normalizedJob = SkillUtils.normalizeText(jobDescription);
  const normalizedKeywords = myKeywords.map(k => SkillUtils.normalizeText(k));

  // Get comprehensive skill database
  const skillDatabase = KeywordDatabase.getKeywordMap('comprehensive');
  const foundSkills = new Map();
  const skillContext = new Map();

  // Flatten skill database for easier searching
  const allSkills = {};
  for (const [category, skills] of Object.entries(skillDatabase)) {
    if (categoryFilter.length > 0 && !categoryFilter.includes(category)) continue;
    if (category === 'soft' && !includeSoftSkills) continue;

    for (const [skillName, aliases] of Object.entries(skills)) {
      allSkills[skillName] = { aliases, category };
    }
  }

  // Search for skills in job description
  for (const [skillName, { aliases, category }] of Object.entries(allSkills)) {
    let occurrences = 0;
    let contexts = [];
    let priority = 0;
    let level = '';

    for (const alias of aliases) {
      const pattern = SkillUtils.createWordBoundaryPattern(alias);
      const matches = normalizedJob.match(pattern);
      
      if (matches) {
        occurrences += matches.length;
        
        // Extract context around matches
        const sentences = jobDescription.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (new RegExp(`\\b${alias}\\b`, 'i').test(sentence)) {
            contexts.push(sentence.trim());
            
            // Check for priority indicators
            for (const indicator of priorityIndicators) {
              if (new RegExp(`\\b${indicator}\\b`, 'i').test(sentence)) {
                priority += priorityWeighting ? 2 : 1;
              }
            }

            // Check for level indicators
            if (includeLevel) {
              for (const [lvl, indicators] of Object.entries(levelIndicators)) {
                for (const indicator of indicators) {
                  if (new RegExp(`\\b${indicator}\\b`, 'i').test(sentence)) {
                    level = lvl;
                  }
                }
              }
            }
          }
        }
      }
    }

    if (occurrences >= minOccurrence) {
      foundSkills.set(skillName, {
        occurrences,
        priority: priority + occurrences,
        category,
        level,
        aliases: aliases.filter(alias => 
          new RegExp(`\\b${alias}\\b`, 'i').test(normalizedJob)
        )
      });
      skillContext.set(skillName, contexts);
    }
  }

  // Filter out skills that user already has
  const missingSkills = [];
  for (const [skillName, data] of foundSkills.entries()) {
    const isAlreadyKnown = normalizedKeywords.some(userSkill => {
      return data.aliases.some(alias => 
        SkillUtils.normalizeText(alias).includes(userSkill) || 
        userSkill.includes(SkillUtils.normalizeText(alias))
      );
    });

    if (!isAlreadyKnown) {
      missingSkills.push({
        skill: skillName,
        ...data,
        contexts: skillContext.get(skillName) || []
      });
    }
  }

  // Sort by priority/importance
  missingSkills.sort((a, b) => {
    if (priorityWeighting) {
      return b.priority - a.priority;
    }
    return b.occurrences - a.occurrences;
  });

  // Limit results
  const limitedResults = missingSkills.slice(0, maxResults);

  if (returnDetails) {
    return {
      totalFound: foundSkills.size,
      totalMissing: missingSkills.length,
      userSkillsCount: myKeywords.length,
      coveragePercentage: Math.round((myKeywords.length / (myKeywords.length + missingSkills.length)) * 100),
      missingSkills: limitedResults,
      recommendations: generateRecommendations(limitedResults)
    };
  }

  return limitedResults.map(skill => ({
    skill: skill.skill,
    category: skill.category,
    priority: skill.priority,
    level: skill.level || 'any',
    occurrences: skill.occurrences
  }));
}

/**
 * Generate learning recommendations based on missing skills
 * @param {Array} missingSkills - Array of missing skills
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(missingSkills) {
  const recommendations = [];
  const categories = {};

  // Group by category
  missingSkills.forEach(skill => {
    if (!categories[skill.category]) {
      categories[skill.category] = [];
    }
    categories[skill.category].push(skill);
  });

  // Generate category-based recommendations
  for (const [category, skills] of Object.entries(categories)) {
    const topSkills = skills.slice(0, 3).map(s => s.skill);
    
    let recommendation = '';
    switch (category) {
      case 'frontend':
        recommendation = `Consider learning ${topSkills.join(', ')} to strengthen your frontend development skills.`;
        break;
      case 'backend':
        recommendation = `Focus on ${topSkills.join(', ')} to enhance your backend capabilities.`;
        break;
      case 'database':
        recommendation = `Database skills in ${topSkills.join(', ')} would complement your existing knowledge.`;
        break;
      case 'cloud':
        recommendation = `Cloud technologies like ${topSkills.join(', ')} are highly valued in the job market.`;
        break;
      case 'testing':
        recommendation = `Testing skills in ${topSkills.join(', ')} would make you a more well-rounded developer.`;
        break;
      case 'programming':
        recommendation = `Programming languages like ${topSkills.join(', ')} could expand your development options.`;
        break;
      case 'mobile':
        recommendation = `Mobile development skills in ${topSkills.join(', ')} are increasingly in demand.`;
        break;
      case 'data':
        recommendation = `Data science skills in ${topSkills.join(', ')} are valuable across many industries.`;
        break;
      case 'architecture':
        recommendation = `Architectural knowledge in ${topSkills.join(', ')} is crucial for senior roles.`;
        break;
      case 'soft':
        recommendation = `Soft skills like ${topSkills.join(', ')} are essential for career advancement.`;
        break;
      default:
        recommendation = `Consider learning ${topSkills.join(', ')} in the ${category} domain.`;
    }
    
    recommendations.push({
      category,
      skills: topSkills,
      recommendation,
      priority: skills.reduce((sum, skill) => sum + skill.priority, 0) / skills.length
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

/**
 * Analyze skill gaps and provide strategic insights
 * @param {Array} userSkills - User's current skills
 * @param {Array} missingSkills - Missing skills from job analysis
 * @returns {Object} Strategic analysis
 */
function analyzeSkillGaps(userSkills, missingSkills) {
  const categories = {};
  const userCategories = new Set();
  
  // Categorize user skills
  const flattenedSkills = KeywordDatabase.getFlattenedSkills();
  userSkills.forEach(skill => {
    const normalizedSkill = SkillUtils.normalizeText(skill);
    for (const [skillName, data] of Object.entries(flattenedSkills)) {
      if (data.aliases.some(alias => SkillUtils.normalizeText(alias).includes(normalizedSkill))) {
        userCategories.add(data.category);
        break;
      }
    }
  });

  // Categorize missing skills
  missingSkills.forEach(skill => {
    if (!categories[skill.category]) {
      categories[skill.category] = { skills: [], totalPriority: 0, count: 0 };
    }
    categories[skill.category].skills.push(skill);
    categories[skill.category].totalPriority += skill.priority || 0;
    categories[skill.category].count++;
  });

  // Calculate category priorities
  const categoryAnalysis = Object.entries(categories).map(([category, data]) => ({
    category,
    avgPriority: data.totalPriority / data.count,
    skillCount: data.count,
    isNewArea: !userCategories.has(category),
    skills: data.skills.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  })).sort((a, b) => b.avgPriority - a.avgPriority);

  return {
    strongAreas: Array.from(userCategories),
    gapAreas: categoryAnalysis,
    recommendations: {
      immediate: categoryAnalysis.slice(0, 2).map(cat => ({
        category: cat.category,
        reason: `High priority area with ${cat.skillCount} missing skills`,
        topSkills: cat.skills.slice(0, 3).map(s => s.skill)
      })),
      expansion: categoryAnalysis.filter(cat => cat.isNewArea).slice(0, 2).map(cat => ({
        category: cat.category,
        reason: `New skill area to diversify your expertise`,
        topSkills: cat.skills.slice(0, 3).map(s => s.skill)
      }))
    }
  };
}

  // Expose to global scope
  global.KeywordHelper = {
    matchKeywords: matchKeywords,
    extractMissingSkills: extractMissingSkills,
    analyzeSkillGaps: analyzeSkillGaps,
    generateRecommendations: generateRecommendations
  };
  
  console.log("✅ KeywordHelper IIFE loaded successfully");

})(window)
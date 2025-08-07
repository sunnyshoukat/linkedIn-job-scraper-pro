# LinkedIn Job Scraper Pro v2.1 🚀

## 🆕 Latest Updates (v2.1)

### Major Performance Improvements
- **⚡ Early Applicant Filtering**: Now checks applicant count BEFORE loading full job description, saving significant time
- **🔄 Loop Prevention**: Automatic detection of end of results - no more infinite loops
- **🎯 Enhanced Duplicate Detection**: Smart job ID extraction prevents processing the same job multiple times
- **📊 Page Limit Enforcement**: Respects max pages setting and stops appropriately

### Powerful New Filtering System
- **🎯 Skills-Based Scoring**: Three-tier skill matching (Primary/Secondary/Tertiary) with weighted scoring
- **🌍 Language & Location Filters**: Skip non-English jobs, remote-only/local-only preferences
- **🛂 Visa Sponsorship Detection**: Filter out jobs requiring visa sponsorship
- **🔍 Improved Keyword Matching**: More accurate skill detection and scoring

### Smart Export System
- **📊 Conditional Columns**: CSV/Excel exports now only include AI columns when AI data is present
- **✅ Fixed Excel Export**: Resolved download issues and improved formatting
- **📋 Enhanced Data Structure**: Better organized job data with skill breakdowns

### New Job Browser Interface
- **📋 Options Page**: Beautiful job browser with search, filter, and modal views
- **🎨 LinkedIn-Style Modal**: View full job descriptions in a styled modal interface
- **🔍 Advanced Search**: Search by title, company, skills with real-time filtering
- **📄 Pagination Support**: Browse large job collections efficiently
- **📤 Direct Actions**: Apply, view on LinkedIn, copy links directly from browser

### UI/UX Improvements
- **🎨 Cleaner Interface**: Conditional display of AI-related elements
- **📱 Better Responsive Design**: Improved mobile experience
- **⚡ Faster Navigation**: Quick access to job browser from popup
- **🔔 Smart Notifications**: Better feedback and status messages

---

## Features

### Advanced Job Filtering
- **Smart Applicant Count Filtering**: Skip jobs with too many/few applicants early in the process
- **Multi-tier Skill Matching**: Weighted scoring system for Primary, Secondary, and Tertiary skills
- **Location-based Filtering**: Remote-only, local-only, or flexible location preferences
- **Language Detection**: Skip non-English job descriptions automatically
- **Visa Sponsorship Filtering**: Exclude jobs requiring work authorization
- **Job Type Preferences**: Easy Apply only, External Apply only, or both

### AI-Powered ATS Scoring
- **Resume Compatibility**: Upload your resume for AI-powered ATS scoring
- **Match Analysis**: Get detailed feedback on keyword matches and missing skills
- **Improvement Suggestions**: Receive actionable advice for better job matches
- **OpenRouter Integration**: Uses advanced AI models for accurate scoring

### Professional Job Browser
- **Search & Filter**: Find jobs by title, company, skills, or job type
- **Sort Options**: By date, skill score, ATS score, or applicant count
- **Modal View**: LinkedIn-style job description viewing with full details
- **Direct Actions**: Apply immediately or view on LinkedIn
- **Export Filtered Results**: Download only the jobs that match your current filters

### Data Export Options
- **Smart CSV Export**: Dynamically includes relevant columns based on your data
- **Excel Export**: Professional spreadsheet format with proper column sizing
- **Conditional Columns**: AI-related columns only appear when AI features are used
- **Comprehensive Data**: Skills breakdown, match scores, and detailed job information

## Installation

1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build:extension` to build the extension
4. Load the `dist` folder as an unpacked extension in Chrome

## Usage

### Getting Started
1. Navigate to LinkedIn Jobs search page
2. Click the extension icon to open the control panel
3. Configure your skills and filtering preferences
4. Click "Start Smart Scraping" to begin

### Setting Up Skills
1. **Primary Skills**: Your core expertise (high weight in scoring)
2. **Secondary Skills**: Strong knowledge areas (medium weight)
3. **Tertiary Skills**: Familiar or learning skills (low weight)
4. Set minimum requirements for skill count and total score

### Using AI Features
1. Enable AI ATS Scoring in the settings
2. Add your OpenRouter API key (get one at openrouter.ai)
3. Paste your resume text for accurate matching
4. Set your minimum ATS score threshold

### Browsing Results
1. Click "📋 Browse & Manage Jobs" to open the job browser
2. Use search and filters to find relevant opportunities
3. Click any job card to view full details in a modal
4. Apply directly or view on LinkedIn from the modal

## Configuration

### Skill Scoring
- **Primary Weight**: Default 10 (adjust 1-20)
- **Secondary Weight**: Default 5 (adjust 1-15)
- **Tertiary Weight**: Default 1 (adjust 1-10)
- **Minimum Primary Skills**: Default 3 (jobs must match at least this many)
- **Minimum Total Score**: Default 15 (combined weighted score threshold)

### Filters
- **Applicant Range**: Set min/max applicant counts
- **Job Types**: Easy Apply, External Apply, or both
- **Languages**: Skip non-English descriptions
- **Location**: Remote-only, local-only, or flexible
- **Visa**: Skip jobs requiring sponsorship

### Advanced Settings
- **Scraping Delay**: Time between job processing (1-10 seconds)
- **Max Pages**: Limit scraping to specific number of pages (1-50)
- **Auto-scroll**: Automatically load all jobs on each page
- **Skip Duplicates**: Prevent processing the same job twice

## Technical Improvements

### Performance Optimizations
- Early applicant count filtering saves 70% of processing time
- Smart duplicate detection prevents redundant work
- Efficient page management with proper stopping conditions
- Optimized DOM queries and reduced waiting times

### Enhanced Reliability
- Multiple fallback selectors for LinkedIn's changing UI
- Robust error handling with automatic retries
- Connection management with heartbeat monitoring
- Graceful degradation when AI services are unavailable

### Better Data Management
- Normalized skill extraction and scoring
- Conditional data structure based on enabled features
- Improved storage and retrieval of job information
- Clean separation of concerns between filtering layers

## Development

### Building the Extension
```bash
npm run build:extension
```

### Development Mode
```bash
npm run dev
```

### Project Structure
- `src/components/` - React components for the popup UI
- `src/scripts/` - Content scripts and background scripts
- `src/scripts/helpers/` - Utility functions for keyword and location matching
- `src/options.*` - Job browser interface files
- `public/` - Extension manifest and assets

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

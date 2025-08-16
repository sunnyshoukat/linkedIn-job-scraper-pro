class JobBrowser {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 1;
        this.jobsPerPage = 12;
        this.currentJob = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadJobs();
        this.updateStats();
        this.renderJobs();
    }

    bindEvents() {
        // Search and filter events
        document.getElementById('search-input').addEventListener('input', 
            this.debounce(this.handleSearch.bind(this), 300));
        document.getElementById('job-type-filter').addEventListener('change', this.applyFilters.bind(this));
        document.getElementById('sort-filter').addEventListener('change', this.applyFilters.bind(this));
        
        // Button events
        document.getElementById('refresh-btn').addEventListener('click', this.refresh.bind(this));
        document.getElementById('download-all-btn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('clear-all-btn').addEventListener('click', this.clearAll.bind(this));
        
        // Modal events
        document.getElementById('close-modal').addEventListener('click', this.closeModal.bind(this));
        document.getElementById('job-modal').addEventListener('click', this.handleModalBackdropClick.bind(this));
        document.getElementById('modal-apply-btn').addEventListener('click', this.applyToJob.bind(this));
        document.getElementById('modal-linkedin-btn').addEventListener('click', this.viewOnLinkedIn.bind(this));
        document.getElementById('modal-copy-btn').addEventListener('click', this.copyJobLink.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    async loadJobs() {
        try {
            // Get jobs from Chrome storage
            const result = await chrome.storage.local.get(['jobDescriptions']);
            this.jobs = result.jobDescriptions || [];
            
            console.log(`Loaded ${this.jobs.length} jobs from Chrome storage`);
        } catch (error) {
            console.error('Error loading jobs from Chrome storage:', error);
            this.jobs = [];
        }
        
        this.filteredJobs = [...this.jobs];
    }

    async sendMessageToActiveTab(message) {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Message sending failed:', chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            resolve(response);
                        }
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    updateStats() {
        const totalJobs = this.jobs.length;
        const withScores = this.jobs.filter(job => job.skillScore !== null && job.skillScore !== undefined).length;
        const avgScore = totalJobs > 0 ? Math.round(this.jobs.reduce((sum, job) => sum + (job.skillScore || 0), 0) / totalJobs) : 0;
        const easyApply = this.jobs.filter(job => job.jobType === 'Easy Apply').length;
        
        document.getElementById('total-jobs').textContent = totalJobs;
        document.getElementById('with-scores').textContent = withScores;
        document.getElementById('avg-score').textContent = avgScore;
        document.getElementById('easy-apply').textContent = easyApply;
    }

    handleSearch() {
        this.currentPage = 1;
        this.applyFilters();
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const jobTypeFilter = document.getElementById('job-type-filter').value;
        const sortBy = document.getElementById('sort-filter').value;
        
        // Filter jobs
        this.filteredJobs = this.jobs.filter(job => {
            const matchesSearch = !searchTerm || 
                job.title?.toLowerCase().includes(searchTerm) ||
                job.company?.toLowerCase().includes(searchTerm) ||
                job.primarySkills?.toLowerCase().includes(searchTerm) ||
                job.secondarySkills?.toLowerCase().includes(searchTerm) ||
                job.description?.toLowerCase().includes(searchTerm);
                
            const matchesJobType = !jobTypeFilter || job.jobType === jobTypeFilter;
            
            return matchesSearch && matchesJobType;
        });
        
        // Sort jobs
        this.sortJobs(sortBy);
        
        this.renderJobs();
        this.updatePagination();
    }

    sortJobs(sortBy) {
        this.filteredJobs.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                case 'skill-score':
                    return (b.skillScore || 0) - (a.skillScore || 0);
                case 'applicants-asc':
                    return (a.totalClick || 0) - (b.totalClick || 0);
                case 'applicants-desc':
                    return (b.totalClick || 0) - (a.totalClick || 0);
                default:
                    return 0;
            }
        });
    }

    renderJobs() {
        const jobsGrid = document.getElementById('jobs-grid');
        const noJobsDiv = document.getElementById('no-jobs');
        
        if (this.filteredJobs.length === 0) {
            jobsGrid.style.display = 'none';
            noJobsDiv.style.display = 'block';
            document.getElementById('pagination').style.display = 'none';
            return;
        }
        
        jobsGrid.style.display = 'grid';
        noJobsDiv.style.display = 'none';
        document.getElementById('pagination').style.display = 'flex';
        
        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = Math.min(startIndex + this.jobsPerPage, this.filteredJobs.length);
        const pageJobs = this.filteredJobs.slice(startIndex, endIndex);
        
        jobsGrid.innerHTML = pageJobs.map(job => this.createJobCard(job)).join('');
        
        // Add click events to job cards
        jobsGrid.querySelectorAll('.job-card').forEach((card, index) => {
            card.addEventListener('click', () => this.openJobModal(pageJobs[index]));
        });
        
        this.updatePagination();
    }

    createJobCard(job) {
        const primarySkills = job.primarySkills ? job.primarySkills.split(', ').slice(0, 3) : [];
        const postedDate = this.formatDate(job.whenPosted);
        
        return `
            <div class="job-card" data-job-id="${job.linkedinJobUrl}">
                
                <div class="job-title">${this.escapeHtml(job.title || 'Unknown Title')}</div>
                <div class="job-company">${this.escapeHtml(job.company || 'Unknown Company')}</div>
                
                <div class="job-meta">
                    <div class="job-meta-item">
                        <span>📅</span>
                        <span>${postedDate}</span>
                    </div>
                    <div class="job-meta-item">
                        <span>👥</span>
                        <span>${job.totalClick || 0} applicants</span>
                    </div>
                    <div class="job-meta-item">
                        <span>🎯</span>
                        <span>${job.skillScore || 0} pts</span>
                    </div>
                    <div class="job-meta-item">
                        <span>${job.jobType === 'Easy Apply' ? '⚡' : '🔗'}</span>
                        <span>${job.jobType || 'Unknown'}</span>
                    </div>
                </div>
                
                <div class="job-skills">
                    ${primarySkills.map(skill => 
                        `<span class="skill-tag">${this.escapeHtml(skill.trim())}</span>`
                    ).join('')}
                    ${primarySkills.length > 3 ? '<span class="skill-tag">+more</span>' : ''}
                </div>
            </div>
        `;
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="jobBrowser.goToPage(${this.currentPage - 1})">
                ← Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button onclick="jobBrowser.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="${i === this.currentPage ? 'current-page' : ''}" 
                        onclick="jobBrowser.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button onclick="jobBrowser.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="jobBrowser.goToPage(${this.currentPage + 1})">
                Next →
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    goToPage(pageNumber) {
        this.currentPage = pageNumber;
        this.renderJobs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    openJobModal(job) {
        this.currentJob = job;
        
        // Populate modal content
        document.getElementById('modal-title').textContent = job.title || 'Unknown Title';
        document.getElementById('modal-company').textContent = job.company || 'Unknown Company';
        document.getElementById('modal-description').innerHTML = this.formatDescription(job.description);
        document.getElementById('modal-posted').textContent = this.formatDate(job.whenPosted);
        document.getElementById('modal-applicants').textContent = `${job.totalClick || 0} applicants`;
        document.getElementById('modal-job-type').textContent = job.jobType || 'Unknown';
        document.getElementById('modal-skill-score').textContent = `${job.skillScore || 0} points`;
        
        
        // Populate skills
        this.populateSkills(job);
        
        // Show modal
        const modal = document.getElementById('job-modal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    populateSkills(job) {
        const skillsContainer = document.getElementById('modal-skills');
        let skillsHTML = '';
        
        if (job.primarySkills) {
            skillsHTML += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #10b981;">🟢 Primary Skills:</strong>
                    <div style="margin-top: 5px;">
                        ${job.primarySkills.split(', ').map(skill => 
                            `<span class="skill-tag" style="background: #10b981; margin: 2px;">${this.escapeHtml(skill.trim())}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        
        if (job.secondarySkills) {
            skillsHTML += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #3b82f6;">🔵 Secondary Skills:</strong>
                    <div style="margin-top: 5px;">
                        ${job.secondarySkills.split(', ').map(skill => 
                            `<span class="skill-tag" style="background: #3b82f6; margin: 2px;">${this.escapeHtml(skill.trim())}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        
        if (job.tertiarySkills) {
            skillsHTML += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #f59e0b;">🟠 Tertiary Skills:</strong>
                    <div style="margin-top: 5px;">
                        ${job.tertiarySkills.split(', ').map(skill => 
                            `<span class="skill-tag" style="background: #f59e0b; margin: 2px;">${this.escapeHtml(skill.trim())}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        
        if (!skillsHTML) {
            skillsHTML = '<p style="color: #666; font-style: italic;">No skills data available</p>';
        }
        
        skillsContainer.innerHTML = skillsHTML;
    }

    closeModal() {
        const modal = document.getElementById('job-modal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentJob = null;
    }

    handleModalBackdropClick(event) {
        if (event.target.id === 'job-modal') {
            this.closeModal();
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape' && document.getElementById('job-modal').classList.contains('show')) {
            this.closeModal();
        }
    }

    applyToJob() {
        if (this.currentJob && this.currentJob.jobLink) {
            window.open(this.currentJob.jobLink, '_blank');
        }
    }

    viewOnLinkedIn() {
        if (this.currentJob && this.currentJob.linkedinJobUrl) {
            window.open(this.currentJob.linkedinJobUrl, '_blank');
        }
    }

    async copyJobLink() {
        if (this.currentJob && this.currentJob.linkedinJobUrl) {
            try {
                await navigator.clipboard.writeText(this.currentJob.linkedinJobUrl);
                this.showToast('Job link copied to clipboard!', 'success');
            } catch (error) {
                console.error('Failed to copy link:', error);
                this.showToast('Failed to copy link', 'error');
            }
        }
    }

    async refresh() {
        const refreshBtn = document.getElementById('refresh-btn');
        const originalText = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '🔄 Refreshing...';
        refreshBtn.disabled = true;
        
        try {
            await this.loadJobs();
            this.updateStats();
            this.currentPage = 1;
            this.applyFilters();
            this.showToast('Jobs refreshed successfully!', 'success');
        } catch (error) {
            console.error('Error refreshing jobs:', error);
            this.showToast('Failed to refresh jobs', 'error');
        } finally {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }
    }

    downloadAll() {
        if (this.filteredJobs.length === 0) {
            this.showToast('No jobs to download', 'warning');
            return;
        }
        
        // Create CSV content
        const headers = [
            'Title', 'Company', 'When Posted', 'Total Applicants', 'Job Type',
            'Apply Link', 'LinkedIn Job URL', 'Primary Skills', 'Secondary Skills',
            'Tertiary Skills', 'Skill Score', 'Description', 'Timestamp'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredJobs.map(job => [
                this.escapeCsv(job.title || ''),
                this.escapeCsv(job.company || ''),
                this.escapeCsv(job.whenPosted || ''),
                job.totalClick || 0,
                this.escapeCsv(job.jobType || ''),
                this.escapeCsv(job.jobLink || ''),
                this.escapeCsv(job.linkedinJobUrl || ''),
                this.escapeCsv(job.primarySkills || ''),
                this.escapeCsv(job.secondarySkills || ''),
                this.escapeCsv(job.tertiarySkills || ''),
                job.skillScore || 0,
                this.escapeCsv((job.description || '').substring(0, 500) + '...'),
                this.escapeCsv(job.timestamp || '')
            ].join(','))
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `filtered_linkedin_jobs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`Downloaded ${this.filteredJobs.length} jobs as CSV`, 'success');
    }

    // Utility functions
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCsv(text) {
        if (text === null || text === undefined) return '';
        return `"${text.toString().replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ')}"`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        // Handle relative dates like "2 days ago"
        if (dateString.includes('ago') || dateString.includes('day') || dateString.includes('week') || dateString.includes('month')) {
            return dateString;
        }
        
        // Try to parse as date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        return date.toLocaleDateString();
    }

    formatDescription(description) {
        if (!description) return '<p style="color: #666; font-style: italic;">No description available</p>';
        
        // Basic formatting: preserve paragraphs and line breaks
        return description
            .split('\n\n')
            .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
            .join('')
            .replace(/\n/g, '<br>');
    }

    openATSAnalyzer() {
        // Save current jobs to localStorage for the ATS analyzer to access
        try {
            localStorage.setItem('linkedinJobs', JSON.stringify(this.jobs));
            
            // Open ATS analyzer in new tab
            const atsUrl = chrome.runtime.getURL('ats.html');
            chrome.tabs.create({ url: atsUrl });
            
            this.showToast('Opening ATS Resume Analyzer...', 'info');
        } catch (error) {
            console.error('Error opening ATS analyzer:', error);
            this.showToast('Failed to open ATS analyzer', 'error');
        }
    }

    async clearAll() {
        if (this.jobs.length === 0) {
            this.showToast('No jobs to clear', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(
            `Are you sure you want to delete all ${this.jobs.length} scraped jobs?\n\n` +
            'This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        const clearBtn = document.getElementById('clear-all-btn');
        const originalText = clearBtn.innerHTML;
        
        clearBtn.innerHTML = '🗑️ Clearing...';
        clearBtn.disabled = true;

        try {
            // Clear from Chrome storage
            await chrome.storage.local.clear();
            
            // Clear from localStorage as fallback
            localStorage.removeItem('scrapedJobs');
            
            // Reset local data
            this.jobs = [];
            this.filteredJobs = [];
            this.currentPage = 1;
            
            // Update UI
            this.renderJobs();
            this.updateStats();
            
            this.showToast('All jobs successfully deleted', 'success');
        } catch (error) {
            console.error('Error clearing jobs:', error);
            this.showToast('Failed to clear jobs', 'error');
        } finally {
            clearBtn.innerHTML = originalText;
            clearBtn.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the job browser
const jobBrowser = new JobBrowser();

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

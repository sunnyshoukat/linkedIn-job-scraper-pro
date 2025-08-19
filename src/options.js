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
        document.getElementById('status-filter').addEventListener('change', this.applyFilters.bind(this));
        document.getElementById('sort-filter').addEventListener('change', this.applyFilters.bind(this));
        
        // Button events
        document.getElementById('refresh-btn').addEventListener('click', this.refresh.bind(this));
        document.getElementById('download-all-btn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('upload-csv-btn').addEventListener('click', this.triggerCsvUpload.bind(this));
        document.getElementById('csv-upload-input').addEventListener('change', this.handleCsvUpload.bind(this));
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
        const statusFilter = document.getElementById('status-filter').value;
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
            
            const matchesStatus = !statusFilter || 
                (statusFilter === 'applied' && job.status === 'applied') ||
                (statusFilter === 'not-applied' && job.status !== 'applied');
            
            return matchesSearch && matchesJobType && matchesStatus;
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
        
        // Add event listeners for action buttons
        jobsGrid.querySelectorAll('.action-btn[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening modal
                
                // Get the button element (in case user clicked on text content)
                const buttonElement = e.currentTarget;
                const action = buttonElement.getAttribute('data-action');
                const jobId = buttonElement.getAttribute('data-job-id');
                
                if (action === 'mark-applied') {
                    this.markAsApplied(jobId, e);
                } else if (action === 'remove') {
                    this.removeJob(jobId, e);
                }
            });
        });
        
        this.updatePagination();
    }

    createJobCard(job) {
        const primarySkills = job.primarySkills ? job.primarySkills.split(', ').slice(0, 3) : [];
        const postedDate = this.formatDate(job.whenPosted);
        const isApplied = job.status === 'applied';
        const cardId = this.generateJobId(job);
        
        return `
            <div class="job-card ${isApplied ? 'applied' : ''}" data-job-id="${cardId}" data-card-index="${cardId}">
                <div class="job-actions">
                    ${!isApplied ? 
                        `<button class="action-btn btn-apply" data-action="mark-applied" data-job-id="${cardId}" title="Mark as Applied">
                            ✓
                        </button>` : 
                        `<button class="action-btn btn-applied" title="Already Applied">
                            ✓
                        </button>`
                    }
                    <button class="action-btn btn-remove" data-action="remove" data-job-id="${cardId}" title="Remove Job">
                        ×
                    </button>
                </div>
                
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
            <button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
                ← Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="${i === this.currentPage ? 'current-page' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    data-page="${this.currentPage + 1}">
                Next →
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Add event listeners to pagination buttons
        pagination.querySelectorAll('button[data-page]').forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', (e) => {
                    const pageNum = parseInt(e.currentTarget.getAttribute('data-page'));
                    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
                        this.goToPage(pageNum);
                    }
                });
            }
        });
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
                this.escapeCsv((job.description || '')),
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

    // Job management methods
    generateJobId(job) {
        // Generate a unique ID based on job URL or create a hash from job details
        if (job.linkedinJobUrl) {
            return job.linkedinJobUrl.replace(/[^a-zA-Z0-9]/g, '_');
        }
        // Fallback: create hash from title + company
        const uniqueString = `${job.title || ''}_${job.company || ''}_${job.timestamp || Date.now()}`;
        return uniqueString.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    }

    async markAsApplied(jobId, event) {
        event.stopPropagation(); // Prevent opening modal
        
        try {
            // Find the job in our data
            const jobIndex = this.jobs.findIndex(job => this.generateJobId(job) === jobId);
            if (jobIndex === -1) {
                this.showToast('Job not found', 'error');
                return;
            }
            
            // Update job status
            this.jobs[jobIndex].status = 'applied';
            this.jobs[jobIndex].appliedDate = new Date().toISOString();
            
            // Save to storage
            await chrome.storage.local.set({ jobDescriptions: this.jobs });
            
            // Update filtered jobs if needed
            const filteredIndex = this.filteredJobs.findIndex(job => this.generateJobId(job) === jobId);
            if (filteredIndex !== -1) {
                this.filteredJobs[filteredIndex].status = 'applied';
                this.filteredJobs[filteredIndex].appliedDate = new Date().toISOString();
            }
            
            // Re-render to update the UI
            this.renderJobs();
            this.updateStats();
            
            this.showToast('Job marked as applied!', 'success');
        } catch (error) {
            console.error('Error marking job as applied:', error);
            this.showToast('Failed to mark job as applied', 'error');
        }
    }

    async removeJob(jobId, event) {
        event.stopPropagation(); // Prevent opening modal
        
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to remove this job?\n\nThis action cannot be undone.');
        if (!confirmed) {
            return;
        }
        
        try {
            // Find and remove the job from our data
            const jobIndex = this.jobs.findIndex(job => this.generateJobId(job) === jobId);
            if (jobIndex === -1) {
                this.showToast('Job not found', 'error');
                return;
            }
            
            const removedJob = this.jobs[jobIndex];
            this.jobs.splice(jobIndex, 1);
            
            // Update filtered jobs
            const filteredIndex = this.filteredJobs.findIndex(job => this.generateJobId(job) === jobId);
            if (filteredIndex !== -1) {
                this.filteredJobs.splice(filteredIndex, 1);
            }
            
            // Save to storage
            await chrome.storage.local.set({ jobDescriptions: this.jobs });
            
            // Re-render to update the UI
            this.renderJobs();
            this.updateStats();
            
            this.showToast(`Removed job: ${removedJob.title}`, 'success');
        } catch (error) {
            console.error('Error removing job:', error);
            this.showToast('Failed to remove job', 'error');
        }
    }

    // CSV Upload functionality
    triggerCsvUpload() {
        const input = document.getElementById('csv-upload-input');
        input.click();
    }

    async handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('Please select a valid CSV file', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('File size too large. Maximum 10MB allowed.', 'error');
            return;
        }

        const uploadBtn = document.getElementById('upload-csv-btn');
        const originalText = uploadBtn.innerHTML;
        
        uploadBtn.innerHTML = '📤 Uploading...';
        uploadBtn.disabled = true;

        try {
            const csvText = await this.readFileAsText(file);
            const parsedJobs = await this.parseCsvData(csvText);
            
            if (parsedJobs.length === 0) {
                this.showToast('No valid jobs found in CSV file', 'warning');
                return;
            }

            await this.importJobs(parsedJobs);
            
        } catch (error) {
            console.error('Error uploading CSV:', error);
            this.showToast('Failed to upload CSV: ' + error.message, 'error');
        } finally {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
            // Clear the input
            event.target.value = '';
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseCsvData(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            
            if (lines.length < 2) {
                throw new Error('CSV file must contain at least a header and one data row');
            }

            // Parse header row
            const headers = this.parseCsvRow(lines[0]);
            
            // Map common column variations to standard field names
            const fieldMapping = this.createFieldMapping(headers);
            
            if (!fieldMapping.title && !fieldMapping.company) {
                throw new Error('CSV must contain at least Title or Company columns');
            }

            const jobs = [];
            const errors = [];

            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                try {
                    const row = this.parseCsvRow(lines[i]);
                    
                    if (row.length === 0 || row.every(cell => !cell.trim())) {
                        continue; // Skip empty rows
                    }

                    const job = this.mapCsvRowToJob(row, fieldMapping, headers);
                    
                    if (job && (job.title || job.company)) {
                        jobs.push(job);
                    }
                } catch (error) {
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }

            if (errors.length > 0) {
                console.warn('CSV parsing errors:', errors);
            }

            return jobs;
        } catch (error) {
            throw new Error(`CSV parsing failed: ${error.message}`);
        }
    }

    parseCsvRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }

    createFieldMapping(headers) {
        const mapping = {};
        
        const fieldMappings = {
            title: ['title', 'job title', 'position', 'role', 'job_title', 'job name'],
            company: ['company', 'employer', 'organization', 'company name', 'company_name'],
            description: ['description', 'job description', 'details', 'job_description', 'summary'],
            jobType: ['job type', 'type', 'application type', 'job_type', 'apply_type'],
            linkedinJobUrl: ['linkedin url', 'url', 'job url', 'link', 'linkedin_url', 'job_url'],
            jobLink: ['apply link', 'application link', 'job link', 'apply_link', 'application_url'],
            whenPosted: ['posted date', 'date posted', 'when posted', 'posted', 'date', 'posted_date'],
            totalClick: ['applicants', 'total applicants', 'clicks', 'applications', 'total_click'],
            skillScore: ['skill score', 'score', 'match score', 'skills', 'skill_score'],
            primarySkills: ['primary skills', 'skills', 'key skills', 'primary_skills'],
            secondarySkills: ['secondary skills', 'additional skills', 'secondary_skills'],
            tertiarySkills: ['tertiary skills', 'other skills', 'tertiary_skills'],
            status: ['status', 'application status', 'applied', 'job_status']
        };
        
        headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            
            for (const [field, variants] of Object.entries(fieldMappings)) {
                if (variants.includes(normalizedHeader)) {
                    mapping[field] = index;
                    break;
                }
            }
        });
        
        return mapping;
    }

    mapCsvRowToJob(row, fieldMapping, headers) {
        const job = {
            timestamp: new Date().toISOString(),
            uploadedFromCsv: true
        };
        
        // Map known fields
        for (const [field, columnIndex] of Object.entries(fieldMapping)) {
            if (columnIndex !== undefined && row[columnIndex] !== undefined) {
                let value = row[columnIndex].trim();
                
                // Type conversions
                if (field === 'totalClick' || field === 'skillScore') {
                    const numValue = parseInt(value) || 0;
                    job[field] = numValue;
                } else if (field === 'status') {
                    // Normalize status values
                    const normalizedStatus = value.toLowerCase();
                    if (normalizedStatus.includes('applied') || normalizedStatus === 'true' || normalizedStatus === '1') {
                        job.status = 'applied';
                        job.appliedDate = new Date().toISOString();
                    }
                } else if (value) {
                    job[field] = value;
                }
            }
        }
        
        // Ensure required fields have defaults
        if (!job.title) job.title = 'Imported Job';
        if (!job.company) job.company = 'Unknown Company';
        if (!job.jobType) job.jobType = 'External Apply';
        
        return job;
    }

    async importJobs(newJobs) {
        const existingIds = new Set(this.jobs.map(job => this.generateJobId(job)));
        const duplicates = [];
        const imported = [];
        
        newJobs.forEach(job => {
            const jobId = this.generateJobId(job);
            
            if (existingIds.has(jobId)) {
                duplicates.push(job);
            } else {
                imported.push(job);
                existingIds.add(jobId);
            }
        });
        
        if (imported.length > 0) {
            // Add imported jobs to the beginning of the list
            this.jobs.unshift(...imported);
            
            // Save to storage
            await chrome.storage.local.set({ jobDescriptions: this.jobs });
            
            // Update UI
            this.filteredJobs = [...this.jobs];
            this.currentPage = 1;
            this.applyFilters();
            this.updateStats();
        }
        
        // Show results
        let message = `Successfully imported ${imported.length} jobs`;
        if (duplicates.length > 0) {
            message += `. Skipped ${duplicates.length} duplicates`;
        }
        
        this.showToast(message, imported.length > 0 ? 'success' : 'warning');
        
        // Log details for debugging
        console.log('CSV Import Results:', {
            imported: imported.length,
            duplicates: duplicates.length,
            total: this.jobs.length
        });
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

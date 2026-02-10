// Application State
class DevOpsTracker {
    constructor() {
        this.learningPath = [];
        this.progress = {};
        this.theme = localStorage.getItem('theme') || 'light-mode';
        this.topicAccentMap = {};
        this.init();
    }

    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.loadLearningPath();
    }

    // Load default learning path from parent directory
    async loadLearningPath(data = null) {
        try {
            const spinner = document.getElementById('loadingSpinner');
            if (spinner) spinner.style.display = 'flex';

            if (!data) {
                // Load from local file
                const response = await fetch('../devops_learning_path.json');
                if (!response.ok) throw new Error('Failed to load learning path');
                data = await response.json();
            }

            this.learningPath = data.devops_learning_path || {};
            this.topicAccentMap = {};
            this.loadProgress();
            this.renderContent();
            
            if (spinner) spinner.style.display = 'none';
        } catch (error) {
            console.error('Error loading learning path:', error);
            this.showError('Failed to load learning path. Please try importing a JSON file.');
        }
    }

    // Load progress from localStorage
    loadProgress() {
        const saved = localStorage.getItem('learningProgress');
        this.progress = saved ? JSON.parse(saved) : {};
    }

    // Save progress to localStorage
    saveProgress() {
        localStorage.setItem('learningProgress', JSON.stringify(this.progress));
        this.updateProgressOverview();
    }

    // Organize topics with all their subtopics
    organizeTopics() {
        const topicMap = {};

        // New structure: learningPath is object with topic keys mapping to arrays
        Object.entries(this.learningPath).forEach(([topicKey, topicArray]) => {
            if (Array.isArray(topicArray)) {
                topicMap[topicKey] = {
                    name: topicKey.replace(/_/g, ' ').toUpperCase(),
                    subtopics: topicArray
                };
            }
        });

        return topicMap;
    }

    // Render all content
    renderContent() {
        const wrapper = document.getElementById('contentWrapper');
        if (!Object.keys(this.learningPath).length) {
            wrapper.innerHTML = '<div class="empty-state"><h2>No learning path loaded</h2><p>Import a JSON file or load the default path.</p></div>';
            const navList = document.getElementById('topicNav');
            if (navList) navList.innerHTML = '';
            return;
        }

        const topicMap = this.organizeTopics();
        let html = '';

        Object.entries(topicMap).forEach(([topicKey, topicData], index) => {
            const accentColor = this.getTopicAccentColor(topicKey, index);
            html += `
                <div class="topic-card" data-topic-key="${topicKey}" style="--topic-accent: ${accentColor};">
                    <h3 class="topic-title">
                        <span>${topicData.name}</span>
                    </h3>
                    <div class="subtopics-tiles">`;

            topicData.subtopics.forEach((subtopic, index) => {
                const progressKey = `${topicKey}_${index}`;
                const isCompleted = this.progress[progressKey] || false;
                const subtopicNumber = index + 1;

                html += `
                        <div class="subtopic-tile ${isCompleted ? 'completed' : ''}" data-progress-key="${progressKey}" data-subtopic-index="${index}">
                            <div class="subtopic-header">
                                <span class="subtopic-number">${subtopicNumber}</span>
                                <input type="checkbox" class="subtopic-checkbox" ${isCompleted ? 'checked' : ''}>
                            </div>
                            <div class="subtopic-content">
                                <p class="subtopic-text">${subtopic.topic}</p>
                            </div>
                        </div>`;
            });

            html += `
                    </div>
                </div>`;
        });

        wrapper.innerHTML = html;
        this.renderRightSidebar(topicMap);
        this.attachCheckboxListeners();
    }

    // Render right sidebar topic navigation
    renderRightSidebar(topicMap) {
        const navList = document.getElementById('topicNav');
        if (!navList) return;

        navList.innerHTML = '';

        const entries = Object.entries(topicMap || {});
        if (!entries.length) return;

        entries.forEach(([topicKey, topicData], index) => {
            const accentColor = this.getTopicAccentColor(topicKey, index);
            const li = document.createElement('li');
            li.className = 'topic-nav-item';

            const button = document.createElement('button');
            button.className = 'topic-nav-link';
            button.textContent = this.formatTopicName(topicData.name);
            button.setAttribute('data-topic-key', topicKey);
            button.style.setProperty('--topic-accent', accentColor);
            button.addEventListener('click', () => {
                this.scrollToTopic(topicKey);
            });

            li.appendChild(button);
            navList.appendChild(li);
        });
    }

    // Format topic name for sidebar display
    formatTopicName(name) {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    // Get an accent color for a topic, stable per key
    getTopicAccentColor(topicKey, index) {
        if (!this.topicAccentMap) {
            this.topicAccentMap = {};
        }

        if (this.topicAccentMap[topicKey]) {
            return this.topicAccentMap[topicKey];
        }

        const palette = [
            '#2563eb', // blue
            '#16a34a', // green
            '#ea580c', // orange
            '#db2777', // pink
            '#7c3aed', // purple
            '#0891b2', // cyan
            '#b45309', // amber
            '#4b5563'  // slate
        ];

        const color = palette[index % palette.length];
        this.topicAccentMap[topicKey] = color;
        return color;
    }

    // Smooth-scroll to a topic card in the main content
    scrollToTopic(topicKey) {
        const card = document.querySelector(`.topic-card[data-topic-key="${topicKey}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Attach event listeners to checkboxes
    attachCheckboxListeners() {
        document.querySelectorAll('.subtopic-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tile = e.target.closest('.subtopic-tile');
                const progressKey = tile.getAttribute('data-progress-key');

                if (e.target.checked) {
                    this.progress[progressKey] = true;
                    tile.classList.add('completed');
                } else {
                    delete this.progress[progressKey];
                    tile.classList.remove('completed');
                }

                this.saveProgress();
            });
        });

        // Add click listeners to tiles for detail view
        document.querySelectorAll('.subtopic-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                // Don't open modal if clicking the checkbox
                if (e.target.closest('.subtopic-checkbox')) {
                    return;
                }
                const topicKey = tile.closest('.topic-card').getAttribute('data-topic-key');
                const subtopicIndex = parseInt(tile.getAttribute('data-subtopic-index'));
                this.openDetailModal(topicKey, subtopicIndex);
            });
        });
    }

    // Get topic data by key
    getTopicData(topicKey) {
        for (const levelObj of this.learningPath) {
            if (levelObj.topics && levelObj.topics[topicKey]) {
                return {
                    level: levelObj.level,
                    data: levelObj.topics[topicKey]
                };
            }
        }
        return null;
    }

    // Open detail modal
    openDetailModal(topicKey, index) {
        const topicArray = this.learningPath[topicKey];
        if (!topicArray || !Array.isArray(topicArray) || index >= topicArray.length) return;

        const data = topicArray[index];
        const topicName = topicKey.replace(/_/g, ' ').toUpperCase();
        const progressKey = `${topicKey}_${index}`;
        const isCompleted = this.progress[progressKey] || false;

        // Populate modal
        document.getElementById('modalTitle').textContent = topicName;
        document.getElementById('modalLevel').textContent = `Item ${index + 1}`;
        
        // Description
        const description = data.description || data.topic || 'No description available';
        document.getElementById('modalDescription').textContent = description;

        // Subtopics
        const subtopicsList = document.getElementById('modalSubtopics');
        subtopicsList.innerHTML = '';
        if (data.subtopics && Array.isArray(data.subtopics)) {
            data.subtopics.forEach(subtopic => {
                const li = document.createElement('li');
                li.textContent = subtopic;
                subtopicsList.appendChild(li);
            });
        } else if (data.topic) {
            const li = document.createElement('li');
            li.textContent = data.topic;
            subtopicsList.appendChild(li);
        }

        // Dates and time
        document.getElementById('modalStartDate').textContent = data.start_date || '—';
        document.getElementById('modalEndDate').textContent = data.end_date || '—';
        document.getElementById('modalEstimatedTime').textContent = data.estimated_time || '—';
        document.getElementById('modalStatus').textContent = data.status || '—';

        // Checkbox
        const checkbox = document.getElementById('modalCheckbox');
        checkbox.checked = isCompleted;
        checkbox.onchange = (e) => {
            if (e.target.checked) {
                this.progress[progressKey] = true;
                document.querySelector(`[data-progress-key="${progressKey}"]`)?.classList.add('completed');
            } else {
                delete this.progress[progressKey];
                document.querySelector(`[data-progress-key="${progressKey}"]`)?.classList.remove('completed');
            }
            this.saveProgress();
        };

        // Show modal
        const modal = document.getElementById('detailModal');
        modal.classList.add('active');
    }

    // Close detail modal
    closeDetailModal() {
        const modal = document.getElementById('detailModal');
        modal.classList.remove('active');
    }

    // Update progress overview
    updateProgressOverview() {
        // Count total subtopics across all topics
        let totalSubtopics = 0;
        Object.entries(this.learningPath).forEach(([topicKey, topicArray]) => {
            if (Array.isArray(topicArray)) {
                totalSubtopics += topicArray.length;
            }
        });
        
        const completedSubtopics = Object.keys(this.progress).length;

        document.getElementById('completedCount').textContent = completedSubtopics;
        document.getElementById('totalCount').textContent = totalSubtopics;

        const percentage = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    // Setup event listeners
    setupEventListeners() {
        document.getElementById('importBtn').addEventListener('click', () => this.importJSON());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportJSON());
        document.getElementById('themeToggleBtn').addEventListener('click', () => this.toggleTheme());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetProgress());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));

        // Modal event listeners
        document.getElementById('closeModal').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.closeDetailModal();
            }
        });
    }

    // Import JSON
    importJSON() {
        document.getElementById('fileInput').click();
    }

    // Handle file import
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.learningPath = data.devops_learning_path || data;
                this.topicAccentMap = {};
                this.loadProgress();
                this.renderContent();
                this.showSuccess('Learning path imported successfully!');
            } catch (error) {
                this.showError('Invalid JSON file. Please check the file format.');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    // Export JSON
    exportJSON() {
        const exportData = {
            devops_learning_path: this.learningPath,
            progress: this.progress,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `devops_progress_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.showSuccess('Progress exported successfully!');
    }

    // Toggle theme
    toggleTheme() {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            this.theme = 'light-mode';
        } else {
            document.body.classList.add('dark-mode');
            this.theme = 'dark-mode';
        }
        localStorage.setItem('theme', this.theme);
    }

    // Load theme from storage
    loadTheme() {
        if (this.theme === 'dark-mode') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // Reset progress
    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            this.progress = {};
            this.saveProgress();
            this.renderContent();
            this.showSuccess('Progress reset successfully!');
        }
    }

    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'success' ? '#06a77d' : type === 'error' ? '#d62828' : '#0066cc'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            font-size: 0.95rem;
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DevOpsTracker();
});

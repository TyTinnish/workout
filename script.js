// script.js - UPDATED VERSION
console.log('Loading script.js...');

class WorkoutTracker {
    constructor() {
        console.log('WorkoutTracker constructor');
        this.workouts = [];
        this.chart = null;
        this.currentUser = null;
        this.apiUrl = window.APP_CONFIG?.apiUrl || 'http://localhost:3000';
        
        // Initialize immediately
        this.init();
    }
    
    async init() {
        console.log('Initializing workout tracker...');
        
        // Check if user is already logged in
        if (window.supabaseAuth?.isAuthenticated()) {
            this.currentUser = window.supabaseAuth.getCurrentUser();
            console.log('User already logged in:', this.currentUser?.email);
        }
        
        this.setDefaultDate();
        this.setupEventListeners();
        
        // Listen for auth changes
        document.addEventListener('authStateChanged', (e) => {
            console.log('authStateChanged event received:', e.detail?.user?.email);
            this.currentUser = e.detail?.user || null;
            
            if (this.currentUser) {
                console.log('User authenticated, loading workouts...');
                this.loadWorkouts();
            } else {
                console.log('User logged out, clearing workouts');
                this.workouts = [];
                this.displayWorkouts();
                this.updateStats();
            }
        });
        
        // Load workouts if user is logged in
        if (this.currentUser) {
            await this.loadWorkouts();
        }
    }
    
    setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        const dateInput = document.getElementById('workoutDate');
        if (dateInput) {
            dateInput.value = `${year}-${month}-${day}`;
            dateInput.max = `${year}-${month}-${day}`; // Can't select future dates
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Add workout button
        const addBtn = document.getElementById('addWorkoutBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addWorkout());
            console.log('Add workout button listener added');
        }
        
        // Enter key support for exercise input
        const exerciseInput = document.getElementById('exercise');
        if (exerciseInput) {
            exerciseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addWorkout();
                }
            });
        }
        
        // Export data button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Clear all button
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
        
        // Set default values
        const setsInput = document.getElementById('sets');
        const repsInput = document.getElementById('reps');
        const weightInput = document.getElementById('weight');
        
        if (setsInput) setsInput.value = '3';
        if (repsInput) repsInput.value = '10';
        if (weightInput) weightInput.value = '135';
        
        console.log('Event listeners setup complete');
    }
    
    async loadWorkouts() {
        if (!this.currentUser) {
            console.log('Cannot load workouts: no user');
            this.displayWorkouts(); // Show empty state
            return;
        }
        
        console.log('Loading workouts for user:', this.currentUser.email);
        
        try {
            // For now, we'll use local storage as backup
            // In the future, this will call the API
            const storedWorkouts = localStorage.getItem('workoutTracker_workouts');
            if (storedWorkouts) {
                this.workouts = JSON.parse(storedWorkouts);
                console.log('Loaded', this.workouts.length, 'workouts from localStorage');
            } else {
                this.workouts = [];
                console.log('No workouts in localStorage');
            }
            
            this.displayWorkouts();
            this.updateStats();
            this.renderChart();
            
        } catch (error) {
            console.error('Error loading workouts:', error);
            this.showMessage('Failed to load workouts', 'error');
            this.workouts = [];
            this.displayWorkouts();
        }
    }
    
    async addWorkout() {
        console.log('addWorkout called, currentUser:', this.currentUser?.email);
        
        if (!this.currentUser) {
            this.showMessage('Please login first', 'error');
            return;
        }
        
        const exercise = document.getElementById('exercise')?.value.trim();
        const sets = document.getElementById('sets')?.value;
        const reps = document.getElementById('reps')?.value;
        const weight = document.getElementById('weight')?.value;
        const date = document.getElementById('workoutDate')?.value;
        
        console.log('Form values:', { exercise, sets, reps, weight, date });
        
        // Validation
        if (!exercise || !sets || !reps || !weight || !date) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }
        
        const setsNum = parseInt(sets);
        const repsNum = parseInt(reps);
        const weightNum = parseInt(weight);
        
        if (isNaN(setsNum) || isNaN(repsNum) || isNaN(weightNum)) {
            this.showMessage('Please enter valid numbers', 'error');
            return;
        }
        
        if (setsNum <= 0 || repsNum <= 0 || weightNum <= 0) {
            this.showMessage('Values must be greater than 0', 'error');
            return;
        }
        
        try {
            // Create workout object
            const workout = {
                id: Date.now().toString(),
                exercise,
                sets: setsNum,
                reps: repsNum,
                weight: weightNum,
                workout_date: date,
                created_at: new Date().toISOString(),
                user_id: this.currentUser.id
            };
            
            console.log('Adding workout:', workout);
            
            // Add to local array
            this.workouts.unshift(workout);
            
            // Save to localStorage
            localStorage.setItem('workoutTracker_workouts', JSON.stringify(this.workouts));
            
            // Update UI
            this.displayWorkouts();
            this.updateStats();
            this.renderChart();
            
            // Clear form
            document.getElementById('exercise').value = '';
            document.getElementById('exercise').focus();
            
            this.showMessage('Workout added successfully!', 'success');
            
            // Try to save to backend API as well
            await this.saveToBackend(workout);
            
        } catch (error) {
            console.error('Error adding workout:', error);
            this.showMessage('Failed to add workout', 'error');
        }
    }
    
    async saveToBackend(workout) {
        try {
            const session = await window.supabaseAuth.getSession();
            const token = session?.access_token;
            
            if (!token) {
                console.log('No auth token, skipping backend save');
                return;
            }
            
            console.log('Attempting to save to backend...');
            
            const response = await fetch(`${this.apiUrl}/api/workouts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    exercise: workout.exercise,
                    sets: workout.sets,
                    reps: workout.reps,
                    weight: workout.weight,
                    workout_date: workout.workout_date
                })
            });
            
            if (response.ok) {
                console.log('Successfully saved to backend');
            } else {
                const errorText = await response.text();
                console.log('Backend save failed:', response.status, errorText);
            }
            
        } catch (error) {
            console.log('Backend save error (non-critical):', error.message);
            // Non-critical error - workouts are stored locally
        }
    }
    
    displayWorkouts() {
        const list = document.getElementById('workouts');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.workouts.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>No workouts yet. Add your first one!</p>
                    <p class="empty-subtitle">Fill out the form above and click "Add Workout" 💪</p>
                </div>
            `;
            return;
        }
        
        // Filter workouts for current user (if user ID is stored)
        const userWorkouts = this.currentUser ? 
            this.workouts.filter(w => !w.user_id || w.user_id === this.currentUser.id) :
            [];
        
        userWorkouts.forEach(workout => {
            const item = document.createElement('li');
            item.className = 'workout-item';
            
            const totalVolume = workout.sets * workout.reps * workout.weight;
            let dateStr = 'Unknown date';
            
            try {
                const date = new Date(workout.workout_date);
                if (!isNaN(date.getTime())) {
                    dateStr = date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            } catch (e) {
                console.warn('Date formatting error:', e);
            }
            
            item.innerHTML = `
                <div class="workout-header">
                    <strong>${workout.exercise}</strong>
                    <button class="delete-btn" data-id="${workout.id}">×</button>
                </div>
                <div class="workout-details">
                    ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs
                </div>
                <div class="workout-footer">
                    <small>${dateStr}</small>
                    <span class="volume">Total: ${totalVolume.toLocaleString()} lbs</span>
                </div>
            `;
            
            list.appendChild(item);
        });
        
        // Add delete handlers
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.deleteWorkout(id);
            });
        });
    }
    
    deleteWorkout(id) {
        if (!confirm('Delete this workout?')) return;
        
        this.workouts = this.workouts.filter(w => w.id !== id);
        localStorage.setItem('workoutTracker_workouts', JSON.stringify(this.workouts));
        this.displayWorkouts();
        this.updateStats();
        this.showMessage('Workout deleted', 'info');
    }
    
    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const userWorkouts = this.currentUser ? 
            this.workouts.filter(w => !w.user_id || w.user_id === this.currentUser.id) :
            [];
        const todayWorkouts = userWorkouts.filter(w => w.workout_date === today);
        
        let totalVolume = 0;
        let totalWeight = 0;
        
        todayWorkouts.forEach(w => {
            totalVolume += w.sets * w.reps * w.weight;
            totalWeight += w.weight;
        });
        
        const avgWeight = todayWorkouts.length > 0 ? 
            Math.round(totalWeight / todayWorkouts.length) : 0;
        
        document.getElementById('totalWorkouts').textContent = todayWorkouts.length;
        document.getElementById('totalVolume').textContent = totalVolume.toLocaleString();
        document.getElementById('avgWeight').textContent = avgWeight;
    }
    
    renderChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        if (this.workouts.length === 0) {
            // Show empty state
            return;
        }
        
        // Simple chart implementation
        const userWorkouts = this.currentUser ? 
            this.workouts.filter(w => !w.user_id || w.user_id === this.currentUser.id) :
            [];
        
        // Group by date (last 7 days)
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });
        
        const volumesByDate = {};
        last7Days.forEach(date => {
            volumesByDate[date] = 0;
        });
        
        userWorkouts.forEach(w => {
            if (volumesByDate[w.workout_date] !== undefined) {
                volumesByDate[w.workout_date] += w.sets * w.reps * w.weight;
            }
        });
        
        const labels = last7Days.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        
        const data = last7Days.map(date => volumesByDate[date]);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Volume (lbs)',
                    data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    exportData() {
        if (this.workouts.length === 0) {
            this.showMessage('No data to export', 'info');
            return;
        }
        
        const userWorkouts = this.currentUser ? 
            this.workouts.filter(w => !w.user_id || w.user_id === this.currentUser.id) :
            [];
        
        const data = {
            exportDate: new Date().toISOString(),
            user: this.currentUser?.email || 'unknown',
            workouts: userWorkouts
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const fileName = `workouts-${new Date().toISOString().split('T')[0]}.json`;
        
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Data exported!', 'success');
    }
    
    clearAll() {
        const userWorkouts = this.currentUser ? 
            this.workouts.filter(w => !w.user_id || w.user_id === this.currentUser.id) :
            [];
            
        if (userWorkouts.length === 0) {
            this.showMessage('No workouts to clear', 'info');
            return;
        }
        
        if (!confirm('Delete ALL your workouts? This cannot be undone.')) return;
        
        // Remove only current user's workouts
        this.workouts = this.workouts.filter(w => w.user_id !== this.currentUser?.id);
        localStorage.setItem('workoutTracker_workouts', JSON.stringify(this.workouts));
        this.displayWorkouts();
        this.updateStats();
        this.renderChart();
        
        this.showMessage('All workouts cleared', 'info');
    }
    
    showMessage(text, type) {
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Remove existing messages
        const existing = container.querySelectorAll('.app-message');
        existing.forEach(msg => msg.remove());
        
        // Create new message
        const message = document.createElement('div');
        message.className = `message app-message message-${type}`;
        message.textContent = text;
        
        container.prepend(message);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode === container) {
                message.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing WorkoutTracker...');
    window.workoutTracker = new WorkoutTracker();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already ready, initializing WorkoutTracker...');
    window.workoutTracker = new WorkoutTracker();
}
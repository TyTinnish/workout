// Wait for config to load
document.addEventListener('configLoaded', () => {
    const SUPABASE_CONFIG = window.SUPABASE_CONFIG;
    const APP_CONFIG = window.APP_CONFIG;
    
    if (!SUPABASE_CONFIG || !APP_CONFIG) {
        console.error('Configuration not loaded');
        showAppError('Failed to load configuration. Please refresh the page.');
        return;
    }

    class WorkoutTracker {
        constructor() {
            if (!window.supabaseClient) {
                console.error('Supabase client not loaded');
                return;
            }
            
            this.supabase = window.supabaseClient;
            this.apiUrl = APP_CONFIG.apiUrl;
            this.currentUser = null;
            this.workouts = [];
            this.chart = null;
            this.init();
        }
        
        async init() {
            this.setDefaultDate();
            this.setupEventListeners();
            
            // Wait for auth to be ready
            const checkAuth = () => {
                if (window.supabaseAuth?.isAuthenticated()) {
                    this.currentUser = window.supabaseAuth.getCurrentUser();
                    this.loadWorkouts();
                }
            };
            
            // Initial check
            checkAuth();
            
            // Listen for auth changes
            document.addEventListener('authStateChanged', (e) => {
                this.currentUser = e.detail.user;
                this.loadWorkouts();
            });
        }
        
        setDefaultDate() {
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('workoutDate');
            if (dateInput) {
                dateInput.value = today;
                dateInput.max = today; // Can't select future dates
            }
        }
        
        setupEventListeners() {
            // Add workout button
            document.getElementById('addWorkoutBtn')?.addEventListener('click', () => this.addWorkout());
            
            // Enter key support
            document.getElementById('exercise')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addWorkout();
            });
            
            // Clear all workouts button
            document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAllWorkouts());
            
            // Export button
            document.getElementById('exportBtn')?.addEventListener('click', () => this.exportAllData());
            
            // Import button
            document.getElementById('importFile')?.addEventListener('change', (e) => this.importData(e));
            
            // Backup button
            document.getElementById('backupBtn')?.addEventListener('click', () => this.createBackup());
            
            // Timer buttons
            this.setupTimer();
            
            // Set default values for quick input
            document.getElementById('sets')?.addEventListener('focus', (e) => {
                if (!e.target.value) e.target.value = '3';
            });
            
            document.getElementById('reps')?.addEventListener('focus', (e) => {
                if (!e.target.value) e.target.value = '10';
            });
            
            document.getElementById('weight')?.addEventListener('focus', (e) => {
                if (!e.target.value) e.target.value = '135';
            });
        }
        
        async loadWorkouts() {
            if (!this.currentUser) {
                this.displayWorkouts(); // Show empty state
                return;
            }
            
            try {
                const token = window.supabaseAuth.getSession()?.access_token;
                if (!token) throw new Error('No authentication token');
                
                const response = await fetch(`${this.apiUrl}/workouts`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this.workouts = data || [];
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
            if (!this.currentUser) {
                this.showMessage('Please login to add workouts', 'error');
                return;
            }
            
            const exercise = document.getElementById('exercise')?.value.trim();
            const sets = document.getElementById('sets')?.value;
            const reps = document.getElementById('reps')?.value;
            const weight = document.getElementById('weight')?.value;
            const workoutDate = document.getElementById('workoutDate')?.value;

            // Validation
            if (!exercise || !sets || !reps || !weight || !workoutDate) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }

            const dateObj = new Date(workoutDate + 'T00:00:00');
            if (isNaN(dateObj.getTime())) {
                this.showMessage('Invalid date', 'error');
                return;
            }
            
            if (sets <= 0 || reps <= 0 || weight <= 0) {
                this.showMessage('Values must be greater than 0', 'error');
                return;
            }
            
            try {
                const token = window.supabaseAuth.getSession()?.access_token;
                if (!token) throw new Error('No authentication token');
                
                const workoutData = {
                    exercise,
                    sets: parseInt(sets),
                    reps: parseInt(reps),
                    weight: parseInt(weight),
                    workout_date: workoutDate
                };
                
                const response = await fetch(`${this.apiUrl}/workouts`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(workoutData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                
                const newWorkout = await response.json();
                
                // Add to local array and update UI
                this.workouts.unshift(newWorkout);
                this.displayWorkouts();
                this.clearForm();
                this.updateStats();
                this.renderChart();
                
                this.showMessage('Workout added successfully!', 'success');
                
            } catch (error) {
                console.error('Error adding workout:', error);
                this.showMessage(error.message || 'Failed to add workout', 'error');
            }
        }
        
        async deleteWorkout(id) {
            if (!confirm('Delete this workout?')) return;
            
            try {
                const token = window.supabaseAuth.getSession()?.access_token;
                if (!token) throw new Error('No authentication token');
                
                const response = await fetch(`${this.apiUrl}/workouts/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Remove from local array
                this.workouts = this.workouts.filter(w => w.id !== id);
                this.displayWorkouts();
                this.updateStats();
                this.renderChart();
                
                this.showMessage('Workout deleted', 'info');
                
            } catch (error) {
                console.error('Error deleting workout:', error);
                this.showMessage('Failed to delete workout', 'error');
            }
        }
        
        async clearAllWorkouts() {
            if (this.workouts.length === 0) {
                this.showMessage('No workouts to clear', 'info');
                return;
            }
            
            if (!confirm('⚠️ Are you sure? This will delete ALL workouts permanently!')) {
                return;
            }
            
            try {
                const token = window.supabaseAuth.getSession()?.access_token;
                if (!token) throw new Error('No authentication token');
                
                // Delete all workouts one by one
                let deletedCount = 0;
                const workoutIds = [...this.workouts].map(w => w.id);
                
                for (const id of workoutIds) {
                    const response = await fetch(`${this.apiUrl}/workouts/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        deletedCount++;
                    }
                }
                
                this.workouts = [];
                this.displayWorkouts();
                this.updateStats();
                this.renderChart();
                
                this.showMessage(`Cleared ${deletedCount} workouts`, 'info');
                
            } catch (error) {
                console.error('Error clearing workouts:', error);
                this.showMessage('Failed to clear workouts', 'error');
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
                        <p class="empty-subtitle">Click "Add Workout" to get started 💪</p>
                    </div>
                `;
                return;
            }
            
            this.workouts.forEach(workout => {
                const item = document.createElement('li');
                item.className = 'workout-item';
                const oneRM = this.calculateOneRM(workout.weight, workout.reps);
                const totalVolume = workout.sets * workout.reps * workout.weight;
                const date = new Date(workout.workout_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                item.innerHTML = `
                    <div class="workout-header">
                        <strong>${workout.exercise}</strong>
                        <button class="delete-btn" data-id="${workout.id}" title="Delete workout">×</button>
                    </div>
                    <div class="workout-details">
                        ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs
                        ${workout.notes ? `<br><small>Notes: ${workout.notes}</small>` : ''}
                    </div>
                    <div class="workout-details">
                        <small>Estimated 1RM: ${oneRM} lbs</small>
                    </div>
                    <div class="workout-footer">
                        <small>${date}</small>
                        <span class="volume">Total: ${totalVolume.toLocaleString()} lbs</span>
                    </div>
                `;
                list.appendChild(item);
            });
            
            // Add delete functionality
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    this.deleteWorkout(id);
                });
            });
        }
        
        clearForm() {
            document.getElementById('exercise').value = '';
            document.getElementById('sets').value = '3';
            document.getElementById('reps').value = '10';
            document.getElementById('weight').value = '135';
            document.getElementById('exercise').focus();
        }
        
        showMessage(text, type) {
            const existingMessages = document.querySelectorAll('.app-message');
            existingMessages.forEach(msg => msg.remove());
            
            const message = document.createElement('div');
            message.className = `message app-message message-${type}`;
            message.textContent = text;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(message, container.firstChild);
                
                setTimeout(() => {
                    if (message.parentNode === container) {
                        message.remove();
                    }
                }, 5000);
            }
        }
        
        updateStats() {
            const today = new Date().toISOString().split('T')[0];
            
            const todayWorkouts = this.workouts.filter(w => 
                w.workout_date === today
            );
            
            let totalVolume = 0;
            let totalWeight = 0;
            
            todayWorkouts.forEach(workout => {
                totalVolume += workout.sets * workout.reps * workout.weight;
                totalWeight += workout.weight;
            });
            
            const avgWeight = todayWorkouts.length > 0 ? Math.round(totalWeight / todayWorkouts.length) : 0;
            
            const totalWorkoutsEl = document.getElementById('totalWorkouts');
            const totalVolumeEl = document.getElementById('totalVolume');
            const avgWeightEl = document.getElementById('avgWeight');
            
            if (totalWorkoutsEl) totalWorkoutsEl.textContent = todayWorkouts.length;
            if (totalVolumeEl) totalVolumeEl.textContent = totalVolume.toLocaleString();
            if (avgWeightEl) avgWeightEl.textContent = avgWeight;
        }
        
        renderChart() {
            const ctx = document.getElementById('progressChart');
            if (!ctx) return;
            
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            if (this.workouts.length === 0) {
                // Show empty chart message
                const ctx2d = ctx.getContext('2d');
                ctx2d.clearRect(0, 0, ctx.width, ctx.height);
                ctx2d.font = '16px Arial';
                ctx2d.fillStyle = '#999';
                ctx2d.textAlign = 'center';
                ctx2d.fillText('No data to display', ctx.width / 2, ctx.height / 2);
                return;
            }
            
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
            
            this.workouts.forEach(w => {
                if (volumesByDate.hasOwnProperty(w.workout_date)) {
                    volumesByDate[w.workout_date] += w.sets * w.reps * w.weight;
                }
            });
            
            const labels = last7Days.map(date => 
                new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                })
            );
            
            const volumes = last7Days.map(date => volumesByDate[date]);
            
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Daily Volume (lbs)',
                        data: volumes,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        tension: 0.2,
                        fill: true,
                        pointBackgroundColor: '#764ba2',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `Volume: ${context.raw.toLocaleString()} lbs`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.05)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString() + ' lbs';
                                }
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0,0,0,0.05)'
                            }
                        }
                    }
                }
            });
        }
        
        calculateOneRM(weight, reps) {
            // Epley formula: 1RM = weight × (1 + reps/30)
            return Math.round(weight * (1 + reps / 30));
        }
        
        exportAllData() {
            if (this.workouts.length === 0) {
                this.showMessage('No workouts to export', 'info');
                return;
            }
            
            const data = {
                exportDate: new Date().toISOString(),
                exportSource: 'Workout Tracker Pro',
                version: APP_CONFIG.version,
                workoutCount: this.workouts.length,
                workouts: this.workouts.map(w => ({
                    id: w.id,
                    exercise: w.exercise,
                    sets: w.sets,
                    reps: w.reps,
                    weight: w.weight,
                    workout_date: w.workout_date,
                    notes: w.notes,
                    created_at: w.created_at
                }))
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const fileName = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            const link = document.createElement('a');
            link.setAttribute('href', dataUri);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('Backup exported successfully!', 'success');
        }
        
        async importData(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    
                    if (!imported.workouts || !Array.isArray(imported.workouts)) {
                        throw new Error('Invalid backup file format');
                    }
                    
                    if (!this.currentUser) {
                        this.showMessage('Please login to import data', 'error');
                        return;
                    }
                    
                    if (!confirm(`Import ${imported.workouts.length} workouts?`)) {
                        event.target.value = '';
                        return;
                    }
                    
                    const token = window.supabaseAuth.getSession()?.access_token;
                    if (!token) throw new Error('No authentication token');
                    
                    this.showMessage('Importing workouts...', 'info');
                    
                    // Prepare workouts for import
                    const workoutsToImport = imported.workouts.map(workout => ({
                        exercise: workout.exercise,
                        sets: parseInt(workout.sets) || 1,
                        reps: parseInt(workout.reps) || 1,
                        weight: parseInt(workout.weight) || 1,
                        workout_date: workout.workout_date || workout.date || new Date().toISOString().split('T')[0],
                        notes: workout.notes || null
                    }));
                    
                    const response = await fetch(`${this.apiUrl}/workouts/batch`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(workoutsToImport)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Import failed: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    // Reload workouts
                    await this.loadWorkouts();
                    this.showMessage(`Imported ${result.count} workouts successfully!`, 'success');
                    
                } catch (error) {
                    console.error('Import error:', error);
                    this.showMessage(error.message || 'Invalid backup file', 'error');
                } finally {
                    event.target.value = '';
                }
            };
            
            reader.readAsText(file);
        }
        
        createBackup() {
            this.exportAllData();
        }
        
        setupTimer() {
            const startBtn = document.getElementById('startTimer');
            const resetBtn = document.getElementById('resetTimer');
            const display = document.getElementById('timerDisplay');
            
            if (!startBtn || !resetBtn || !display) return;
            
            let timeLeft = 90;
            let timerInterval = null;
            let isRunning = false;
            
            const updateDisplay = () => {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Change color when time is low
                if (timeLeft <= 10) {
                    display.style.color = '#dc3545';
                    display.style.fontWeight = 'bold';
                } else if (timeLeft <= 30) {
                    display.style.color = '#ffc107';
                } else {
                    display.style.color = '#667eea';
                    display.style.fontWeight = 'normal';
                }
            };
            
            const startTimer = () => {
                if (isRunning) return;
                
                isRunning = true;
                startBtn.disabled = true;
                startBtn.innerHTML = '⏸️ Pause';
                
                timerInterval = setInterval(() => {
                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        isRunning = false;
                        startBtn.disabled = false;
                        startBtn.innerHTML = '▶️ Start Timer';
                        display.textContent = "00:00";
                        display.style.color = '#28a745';
                        this.showMessage('Rest timer completed! 💪', 'success');
                        // Play sound notification if available
                        if (typeof Audio !== 'undefined') {
                            try {
                                const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ');
                                audio.play().catch(e => console.log('Audio play failed:', e));
                            } catch (e) {}
                        }
                        return;
                    }
                    timeLeft--;
                    updateDisplay();
                }, 1000);
            };
            
            const pauseTimer = () => {
                if (!isRunning) return;
                
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.disabled = false;
                startBtn.innerHTML = '▶️ Resume';
            };
            
            const resetTimer = () => {
                clearInterval(timerInterval);
                isRunning = false;
                timeLeft = 90;
                updateDisplay();
                startBtn.disabled = false;
                startBtn.innerHTML = '▶️ Start Timer (90s)';
            };
            
            startBtn.addEventListener('click', () => {
                if (isRunning) {
                    pauseTimer();
                } else {
                    startTimer();
                }
            });
            
            resetBtn.addEventListener('click', resetTimer);
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !e.target.matches('input, textarea, button')) {
                    e.preventDefault();
                    if (isRunning) {
                        pauseTimer();
                    } else {
                        startTimer();
                    }
                }
                if (e.code === 'Escape') {
                    resetTimer();
                }
            });
            
            updateDisplay();
        }
    }

    // Initialize workout tracker
    window.workoutTracker = new WorkoutTracker();
});

function showAppError(message) {
    const container = document.querySelector('.container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message message-error';
        errorDiv.innerHTML = `
            <strong>Configuration Error:</strong> ${message}<br>
            <small>Check if the backend server is running at ${window.APP_CONFIG?.apiUrl || 'http://localhost:3000'}</small>
        `;
        container.innerHTML = '';
        container.appendChild(errorDiv);
    }
}
// Enhanced workout tracker with better localStorage handling
class WorkoutTracker {
    constructor() {
        this.workouts = this.loadWorkouts();
        this.chart = null; // Store chart instance
        this.init();
    }
    
    loadWorkouts() {
        try {
            const saved = localStorage.getItem('workoutTracker');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading workouts:', e);
            return [];
        }
    }
    
    saveWorkouts() {
        try {
            localStorage.setItem('workoutTracker', JSON.stringify(this.workouts));
        } catch (e) {
            console.error('Error saving workouts:', e);
        }
    }
    
    init() {
        this.setDefaultDate();
        this.setupEventListeners();
        this.displayWorkouts();
        this.updateStats();
        this.renderChart();
        this.setupTimer();
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('workoutDate');
        if (dateInput) {
            dateInput.value = today;
        }
    }
    
    setupEventListeners() {
        // Add workout button
        const addBtn = document.getElementById('addWorkoutBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addWorkout());
        }
        
        // Enter key support for exercise input
        const exerciseInput = document.getElementById('exercise');
        if (exerciseInput) {
            exerciseInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addWorkout();
            });
        }
        
        // Clear all workouts button
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllWorkouts());
        }
        
        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Import button
        const importInput = document.getElementById('importFile');
        if (importInput) {
            importInput.addEventListener('change', (e) => this.importData(e));
        }
    }
    
    addWorkout() {
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

        const dateObj = new Date(workoutDate + 'T00:00:00'); // Fix for timezone issues
        if (isNaN(dateObj.getTime())) {
            this.showMessage('Invalid date', 'error');
            return;
        }

        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        if (sets <= 0 || reps <= 0 || weight <= 0) {
            this.showMessage('Values must be greater than 0', 'error');
            return;
        }
        
        const workout = {
            id: Date.now(), // Unique ID for each workout
            exercise,
            sets: parseInt(sets),
            reps: parseInt(reps),
            weight: parseInt(weight),
            date: formattedDate,
            timestamp: dateObj.getTime(),
            rawDate: workoutDate
        };
        
        this.workouts.unshift(workout); // Add to beginning
        this.saveWorkouts();
        this.displayWorkouts();
        this.clearForm();
        this.showMessage('Workout added successfully!', 'success');
    }
    
    displayWorkouts() {
        const list = document.getElementById('workouts');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.workouts.length === 0) {
            list.innerHTML = '<p class="empty-state">No workouts yet. Add your first one!</p>';
            this.updateStats();
            this.renderChart();
            return;
        }
        
        // Sort by date (newest first)
        const sortedWorkouts = [...this.workouts].sort((a, b) => b.timestamp - a.timestamp);
        
        sortedWorkouts.forEach(workout => {
            const item = document.createElement('li');
            item.className = 'workout-item';
            const oneRM = this.calculateOneRM(workout.weight, workout.reps);
            item.innerHTML = `
                <div class="workout-header">
                    <strong>${workout.exercise}</strong>
                    <button class="delete-btn" data-id="${workout.id}">×</button>
                </div>
                <div class="workout-details">
                    ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs
                </div>
                <div class="workout-details">
                    <small>Estimated 1RM: ${oneRM} lbs</small>
                </div>
                <div class="workout-footer">
                    <small>${workout.date}</small>
                    <span class="volume">Total: ${workout.sets * workout.reps * workout.weight} lbs</span>
                </div>
            `;
            list.appendChild(item);
        });
        
        // Add delete functionality
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteWorkout(id);
            });
        });

        this.updateStats();
        this.renderChart();
    }
    
    deleteWorkout(id) {
        if (confirm('Delete this workout?')) {
            this.workouts = this.workouts.filter(w => w.id !== id);
            this.saveWorkouts();
            this.displayWorkouts();
            this.showMessage('Workout deleted', 'info');
        }
    }
    
    clearForm() {
        document.getElementById('exercise').value = '';
        document.getElementById('sets').value = '';
        document.getElementById('reps').value = '';
        document.getElementById('weight').value = '';
        document.getElementById('exercise').focus();
    }
    
    showMessage(text, type) {
        // Remove any existing messages first
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create message element
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        // Add to page
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(message, container.firstChild);
            
            // Remove after 3 seconds
            setTimeout(() => {
                if (message.parentNode === container) {
                    message.remove();
                }
            }, 3000);
        }
    }

    updateStats() {
        // Get today's date for filtering
        const today = new Date().toDateString();
        
        // Filter workouts from today
        const todayWorkouts = this.workouts.filter(w => {
            const workoutDate = new Date(w.timestamp).toDateString();
            return workoutDate === today;
        });
        
        // Calculate statistics
        let totalVolume = 0;
        let totalWeight = 0;
        
        todayWorkouts.forEach(workout => {
            totalVolume += workout.sets * workout.reps * workout.weight;
            totalWeight += workout.weight;
        });
        
        const avgWeight = todayWorkouts.length > 0 ? Math.round(totalWeight / todayWorkouts.length) : 0;
        
        // Update the DOM elements
        const totalWorkoutsEl = document.getElementById('totalWorkouts');
        const totalVolumeEl = document.getElementById('totalVolume');
        const avgWeightEl = document.getElementById('avgWeight');
        
        if (totalWorkoutsEl) totalWorkoutsEl.textContent = todayWorkouts.length;
        if (totalVolumeEl) totalVolumeEl.textContent = totalVolume.toLocaleString();
        if (avgWeightEl) avgWeightEl.textContent = avgWeight;
    }

    clearAllWorkouts() {
        if (this.workouts.length === 0) {
            this.showMessage('No workouts to clear', 'info');
            return;
        }
        
        if (confirm('⚠️ Are you sure? This will delete ALL workouts permanently!')) {
            this.workouts = [];
            this.saveWorkouts();
            this.displayWorkouts();
            this.showMessage('All workouts cleared', 'info');
        }
    }

    renderChart() {
        console.log("Rendering chart with", this.workouts.length, "workouts");
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        // Get last 7 days of data
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i)); // Last 7 days including today
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        });
        
        // Initialize volumes for each day to 0
        const volumesByDate = {};
        last7Days.forEach(date => {
            volumesByDate[date] = 0;
        });
        
        // Fill in actual workout volumes
        this.workouts.forEach(w => {
            const workoutDate = new Date(w.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            // Only include if it's in our last 7 days range
            if (volumesByDate.hasOwnProperty(workoutDate)) {
                volumesByDate[workoutDate] += w.sets * w.reps * w.weight;
            }
        });
        
        // Convert to arrays for Chart.js
        const volumes = last7Days.map(date => volumesByDate[date]);
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Daily Volume (lbs)',
                    data: volumes,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // CHANGED THIS LINE
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
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
                            },
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Volume (lbs)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    exportData() {
        const dataStr = JSON.stringify(this.workouts, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `workouts-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showMessage('Data exported successfully!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!Array.isArray(imported)) {
                    throw new Error('Invalid file format');
                }
                
                this.workouts = imported;
                this.saveWorkouts();
                this.displayWorkouts();
                this.showMessage(`Imported ${imported.length} workouts successfully!`, 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.showMessage('Invalid file format. Please import a valid JSON file.', 'error');
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    calculateOneRM(weight, reps) {
        // Epley formula
        return Math.round(weight * (1 + reps / 30));
    }

    setupTimer() {
        const startBtn = document.getElementById('startTimer');
        const resetBtn = document.getElementById('resetTimer');
        const display = document.getElementById('timerDisplay');
        
        if (!startBtn || !resetBtn || !display) return;
        
        let timeLeft = 90; // 90 seconds
        let timerInterval = null;
        
        const updateDisplay = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        startBtn.addEventListener('click', () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            timerInterval = setInterval(() => {
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    display.textContent = "00:00";
                    this.showMessage('Timer finished!', 'success');
                    return;
                }
                timeLeft--;
                updateDisplay();
            }, 1000);
            
            startBtn.disabled = true;
            setTimeout(() => {
                startBtn.disabled = false;
            }, 1000);
        });
        
        resetBtn.addEventListener('click', () => {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            timeLeft = 90;
            updateDisplay();
            startBtn.disabled = false;
        });
        
        updateDisplay();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.workoutTracker = new WorkoutTracker();
});

// Make methods available globally for debugging
window.WorkoutTracker = WorkoutTracker;
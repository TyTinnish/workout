// script.js - SIMPLIFIED VERSION
console.log('Loading script.js...');

class SimpleWorkoutTracker {
    constructor() {
        this.workouts = [];
        this.chart = null;
        this.currentUser = null;
        
        // Wait for auth to be ready
        if (window.supabaseAuth) {
            this.init();
        } else {
            document.addEventListener('authStateChanged', () => this.init());
        }
    }
    
    init() {
        console.log('Initializing workout tracker...');
        
        this.currentUser = window.supabaseAuth?.getCurrentUser();
        this.setDefaultDate();
        this.setupEventListeners();
        
        if (this.currentUser) {
            this.loadWorkouts();
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
        }
    }
    
    setupEventListeners() {
        // Add workout
        const addBtn = document.getElementById('addWorkoutBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addWorkout());
        }
        
        // Export data
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        // Clear all
        const clearBtn = document.getElementById('clearAllBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
        
        // Set default values
        document.getElementById('sets').value = '3';
        document.getElementById('reps').value = '10';
        document.getElementById('weight').value = '135';
    }
    
    async addWorkout() {
        if (!this.currentUser) {
            this.showMessage('Please login first', 'error');
            return;
        }
        
        const exercise = document.getElementById('exercise').value.trim();
        const sets = parseInt(document.getElementById('sets').value);
        const reps = parseInt(document.getElementById('reps').value);
        const weight = parseInt(document.getElementById('weight').value);
        const date = document.getElementById('workoutDate').value;
        
        // Validation
        if (!exercise || !sets || !reps || !weight || !date) {
            this.showMessage('Please fill all fields', 'error');
            return;
        }
        
        if (sets <= 0 || reps <= 0 || weight <= 0) {
            this.showMessage('Values must be positive', 'error');
            return;
        }
        
        try {
            const token = (await window.supabaseAuth.getSession())?.data?.session?.access_token;
            
            if (!token) {
                this.showMessage('Authentication error', 'error');
                return;
            }
            
            const workout = {
                exercise,
                sets,
                reps,
                weight,
                workout_date: date
            };
            
            console.log('Adding workout:', workout);
            
            // For now, just add locally
            const newWorkout = {
                id: Date.now().toString(),
                ...workout,
                created_at: new Date().toISOString()
            };
            
            this.workouts.unshift(newWorkout);
            this.displayWorkouts();
            this.updateStats();
            
            // Clear form
            document.getElementById('exercise').value = '';
            document.getElementById('exercise').focus();
            
            this.showMessage('Workout added!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Failed to add workout', 'error');
        }
    }
    
    displayWorkouts() {
        const list = document.getElementById('workouts');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.workouts.length === 0) {
            list.innerHTML = '<p class="empty-state">No workouts yet. Add your first one!</p>';
            return;
        }
        
        this.workouts.forEach(workout => {
            const item = document.createElement('li');
            item.className = 'workout-item';
            
            const totalVolume = workout.sets * workout.reps * workout.weight;
            const date = new Date(workout.workout_date).toLocaleDateString();
            
            item.innerHTML = `
                <div class="workout-header">
                    <strong>${workout.exercise}</strong>
                    <button class="delete-btn" data-id="${workout.id}">×</button>
                </div>
                <div class="workout-details">
                    ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs
                </div>
                <div class="workout-footer">
                    <small>${date}</small>
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
        this.displayWorkouts();
        this.updateStats();
        this.showMessage('Workout deleted', 'info');
    }
    
    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayWorkouts = this.workouts.filter(w => w.workout_date === today);
        
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
    
    exportData() {
        if (this.workouts.length === 0) {
            this.showMessage('No data to export', 'info');
            return;
        }
        
        const data = {
            exportDate: new Date().toISOString(),
            workouts: this.workouts
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
        if (this.workouts.length === 0) {
            this.showMessage('No workouts to clear', 'info');
            return;
        }
        
        if (!confirm('Delete ALL workouts?')) return;
        
        this.workouts = [];
        this.displayWorkouts();
        this.updateStats();
        this.showMessage('All workouts cleared', 'info');
    }
    
    showMessage(text, type) {
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Remove existing
        const existing = container.querySelectorAll('.app-message');
        existing.forEach(msg => msg.remove());
        
        // Create new
        const message = document.createElement('div');
        message.className = `message app-message message-${type}`;
        message.textContent = text;
        
        container.prepend(message);
        
        // Remove after 5 seconds
        setTimeout(() => message.remove(), 5000);
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.workoutTracker = new SimpleWorkoutTracker();
});
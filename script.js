// Enhanced workout tracker with better localStorage handling
class WorkoutTracker {
    constructor() {
        this.workouts = this.loadWorkouts();
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
        console.log('Clear button exists:', document.getElementById('clearAllBtn'));
        this.setupEventListeners();
        this.displayWorkouts();
        this.updateStats();
    }
    
    setupEventListeners() {
        document.getElementById('addWorkoutBtn').addEventListener('click', () => this.addWorkout());
        
        // Add Enter key support
        document.getElementById('exercise').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWorkout();
        });
        
        // Clear all workouts button
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllWorkouts());
    }
    
    addWorkout() {
        const exercise = document.getElementById('exercise').value.trim();
        const sets = document.getElementById('sets').value;
        const reps = document.getElementById('reps').value;
        const weight = document.getElementById('weight').value;
        
        // Validation
        if (!exercise || !sets || !reps || !weight) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }
        
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
            date: new Date().toLocaleString(),
            timestamp: Date.now()
        };
        
        this.workouts.unshift(workout); // Add to beginning
        this.saveWorkouts();
        this.displayWorkouts();
        this.clearForm();
        this.showMessage('Workout added successfully!', 'success');
        this.updateStats();
    }
    
    displayWorkouts() {
        const list = document.getElementById('workouts');
        list.innerHTML = '';
        
        if (this.workouts.length === 0) {
            list.innerHTML = '<p class="empty-state">No workouts yet. Add your first one!</p>';
            return;
        }
        
        this.workouts.forEach(workout => {
            const item = document.createElement('li');
            item.className = 'workout-item';
            item.innerHTML = `
                <div class="workout-header">
                    <strong>${workout.exercise}</strong>
                    <button class="delete-btn" data-id="${workout.id}">×</button>
                </div>
                <div class="workout-details">
                    ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs
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
    }
    
    deleteWorkout(id) {
        if (confirm('Delete this workout?')) {
            this.workouts = this.workouts.filter(w => w.id !== id);
            this.saveWorkouts();
            this.displayWorkouts();
            this.showMessage('Workout deleted', 'info');
            this.updateStats();
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
        // Create message element
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        // Add to page
        const container = document.querySelector('.container');
        container.insertBefore(message, container.firstChild);
        
        // Remove after 3 seconds
        setTimeout(() => message.remove(), 3000);
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
        document.getElementById('totalWorkouts').textContent = todayWorkouts.length;
        document.getElementById('totalVolume').textContent = totalVolume.toLocaleString();
        document.getElementById('avgWeight').textContent = avgWeight;
    }

    clearAllWorkouts() {
        if (this.workouts.length === 0) {
            this.showMessage('No workouts to clear', 'info');
            return;
        }
        
        if (confirm('Are you sure? This will delete ALL workouts permanently!')) {
            this.workouts = [];
            this.saveWorkouts();
            this.displayWorkouts();
            this.updateStats();
            this.showMessage('All workouts cleared', 'info');
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.workoutTracker = new WorkoutTracker();
});
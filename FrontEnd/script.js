// Simple workout tracker - stores data in browser
let workouts = JSON.parse(localStorage.getItem('workouts')) || [];

function addWorkout() {
    const exercise = document.getElementById('exercise').value;
    const sets = document.getElementById('sets').value;
    const reps = document.getElementById('reps').value;
    const weight = document.getElementById('weight').value;
    
    if (!exercise || !sets || !reps || !weight) {
        alert('Please fill in all fields');
        return;
    }
    
    const workout = {
        exercise,
        sets: parseInt(sets),
        reps: parseInt(reps),
        weight: parseInt(weight),
        date: new Date().toLocaleDateString()
    };
    
    workouts.push(workout);
    localStorage.setItem('workouts', JSON.stringify(workouts));
    
    // Clear inputs
    document.getElementById('exercise').value = '';
    document.getElementById('sets').value = '';
    document.getElementById('reps').value = '';
    document.getElementById('weight').value = '';
    
    // Update display
    displayWorkouts();
}

function displayWorkouts() {
    const list = document.getElementById('workouts');
    list.innerHTML = '';
    
    workouts.forEach(workout => {
        const item = document.createElement('li');
        item.className = 'workout-item';
        item.innerHTML = `
            <strong>${workout.exercise}</strong><br>
            ${workout.sets} sets × ${workout.reps} reps × ${workout.weight} lbs<br>
            <small>${workout.date}</small>
        `;
        list.appendChild(item);
    });
}

// Display workouts on page load
displayWorkouts();
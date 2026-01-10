// server.js - MINIMAL VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Enable CORS
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
}));

app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public config
app.get('/api/public-config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        appName: 'Workout Tracker',
        apiUrl: 'http://localhost:3000'
    });
});

// Workouts endpoint
app.post('/api/workouts', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token' });
        }
        
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        const { exercise, sets, reps, weight, workout_date } = req.body;
        
        if (!exercise || !sets || !reps || !weight || !workout_date) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        
        const workout = {
            user_id: user.id,
            exercise: exercise.trim(),
            sets: parseInt(sets),
            reps: parseInt(reps),
            weight: parseInt(weight),
            workout_date: workout_date,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('workouts')
            .insert([workout])
            .select()
            .single();
            
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                error: 'Database error',
                details: error.message 
            });
        }
        
        res.status(201).json({
            success: true,
            workout: data
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get workouts
app.get('/api/workouts', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token' });
        }
        
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(data || []);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
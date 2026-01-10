require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Validate required environment variables
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

console.log('✅ All required environment variables are present');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com"]
        }
    }
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:8080', 'http://127.0.0.1:8080'];

console.log('🌐 CORS origins:', corsOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (corsOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
    message: {
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Request logger middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// ========== ADD THIS NEW ENDPOINT ==========
// Public config endpoint (safe values only - for frontend)
app.get('/api/public-config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
        appName: 'Workout Tracker Pro',
        version: '2.0.0',
        apiUrl: `http://localhost:${process.env.PORT || 3000}/api`
    });
});
// ===========================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const { data, error } = await supabase
            .from('workouts')
            .select('count', { count: 'exact', head: true })
            .limit(1);
        
        const dbStatus = error ? 'disconnected' : 'connected';
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus,
                rateLimit: 'enabled',
                cors: 'enabled'
            },
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            services: {
                database: 'error'
            }
        });
    }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
    res.json({
        app: 'Workout Tracker API',
        version: '2.0.0',
        features: {
            cors: true,
            rateLimit: true,
            database: 'Supabase'
        },
        limits: {
            rateLimit: process.env.RATE_LIMIT_MAX || 100,
            corsOrigins: corsOrigins.length,
            rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 15
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Version endpoint
app.get('/api/version', (req, res) => {
    res.json({
        app: 'Workout Tracker API',
        version: '2.0.0',
        supabase: 'connected'
    });
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_TOKEN'
            });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ 
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

// Stats endpoint
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's workouts
        const { data: todayWorkouts, error: todayError } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('workout_date', today);

        if (todayError) throw todayError;

        // Get total workouts
        const { count: totalCount, error: countError } = await supabase
            .from('workouts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        if (countError) throw countError;

        // Calculate stats
        let totalVolume = 0;
        let totalWeight = 0;

        todayWorkouts.forEach(workout => {
            totalVolume += workout.sets * workout.reps * workout.weight;
            totalWeight += workout.weight;
        });

        const avgWeight = todayWorkouts.length > 0 
            ? Math.round(totalWeight / todayWorkouts.length)
            : 0;

        res.json({
            today: {
                workouts: todayWorkouts.length,
                totalVolume,
                avgWeight
            },
            overall: {
                totalWorkouts: totalCount || 0
            },
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch statistics',
            code: 'STATS_ERROR'
        });
    }
});

// Profile endpoint
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create one
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                    id: req.user.id,
                    name: req.user.user_metadata?.name || req.user.email.split('@')[0],
                    email: req.user.email,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (createError) throw createError;
            
            console.log(`📝 Created new profile for user: ${newProfile.email}`);
            return res.json(newProfile);
        }
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch profile',
            code: 'PROFILE_ERROR'
        });
    }
});

// Update profile endpoint
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ 
                error: 'Name must be at least 2 characters',
                code: 'INVALID_NAME'
            });
        }

        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                name: name.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            error: 'Failed to update profile',
            code: 'UPDATE_PROFILE_ERROR'
        });
    }
});

// Workouts endpoints
app.get('/api/workouts', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, limit = 50 } = req.query;
        
        let query = supabase
            .from('workouts')
            .select('*')
            .eq('user_id', req.user.id)
            .order('workout_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));
        
        // Add date filters if provided
        if (startDate) {
            query = query.gte('workout_date', startDate);
        }
        if (endDate) {
            query = query.lte('workout_date', endDate);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json(data || []);
    } catch (error) {
        console.error('Get workouts error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch workouts',
            code: 'GET_WORKOUTS_ERROR'
        });
    }
});

app.post('/api/workouts', authenticateToken, async (req, res) => {
    try {
        const { exercise, sets, reps, weight, workout_date, notes } = req.body;
        
        // Validation
        if (!exercise || !sets || !reps || !weight || !workout_date) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                code: 'MISSING_FIELDS'
            });
        }
        
        if (sets <= 0 || reps <= 0 || weight <= 0) {
            return res.status(400).json({ 
                error: 'Values must be greater than 0',
                code: 'INVALID_VALUES'
            });
        }
        
        const workout = {
            user_id: req.user.id,
            exercise: exercise.trim(),
            sets: parseInt(sets),
            reps: parseInt(reps),
            weight: parseInt(weight),
            workout_date,
            notes: notes?.trim() || null,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('workouts')
            .insert([workout])
            .select()
            .single();
        
        if (error) throw error;
        
        // Log milestone
        const { count } = await supabase
            .from('workouts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);
        
        if (count && count % 10 === 0) {
            console.log(`🎉 Milestone: User ${req.user.email} has logged ${count} workouts!`);
        }
        
        res.status(201).json(data);
    } catch (error) {
        console.error('Create workout error:', error);
        res.status(500).json({ 
            error: 'Failed to create workout',
            code: 'CREATE_WORKOUT_ERROR'
        });
    }
});

app.delete('/api/workouts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('workouts')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        
        if (error) throw error;
        
        res.json({ 
            message: 'Workout deleted successfully',
            id 
        });
    } catch (error) {
        console.error('Delete workout error:', error);
        res.status(500).json({ 
            error: 'Failed to delete workout',
            code: 'DELETE_WORKOUT_ERROR'
        });
    }
});

// Batch operations
app.post('/api/workouts/batch', authenticateToken, async (req, res) => {
    try {
        const workouts = req.body;
        
        if (!Array.isArray(workouts) || workouts.length === 0) {
            return res.status(400).json({ 
                error: 'Workouts array required',
                code: 'INVALID_BATCH'
            });
        }
        
        // Add user_id to each workout
        const workoutsWithUserId = workouts.map(workout => ({
            ...workout,
            user_id: req.user.id,
            created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('workouts')
            .insert(workoutsWithUserId)
            .select();
        
        if (error) throw error;
        
        console.log(`📤 User ${req.user.email} imported ${data.length} workouts`);
        
        res.status(201).json({
            message: `Successfully imported ${data.length} workouts`,
            count: data.length,
            workouts: data
        });
    } catch (error) {
        console.error('Batch import error:', error);
        res.status(500).json({ 
            error: 'Failed to import workouts',
            code: 'BATCH_IMPORT_ERROR'
        });
    }
});

// Analytics endpoint
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        
        let days;
        switch (period) {
            case '7days': days = 7; break;
            case '30days': days = 30; break;
            case '90days': days = 90; break;
            default: days = 30;
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Get workouts for period
        const { data: workouts, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('workout_date', startDateStr)
            .order('workout_date', { ascending: true });
        
        if (error) throw error;
        
        // Calculate analytics
        const analytics = {
            period,
            totalWorkouts: workouts.length,
            totalVolume: workouts.reduce((sum, w) => sum + (w.sets * w.reps * w.weight), 0),
            averageWeight: workouts.length > 0 
                ? Math.round(workouts.reduce((sum, w) => sum + w.weight, 0) / workouts.length)
                : 0,
            workoutsByDate: {},
            topExercises: {}
        };
        
        // Group by date
        workouts.forEach(workout => {
            const date = workout.workout_date;
            if (!analytics.workoutsByDate[date]) {
                analytics.workoutsByDate[date] = 0;
            }
            analytics.workoutsByDate[date] += workout.sets * workout.reps * workout.weight;
            
            // Count exercise frequency
            if (!analytics.topExercises[workout.exercise]) {
                analytics.topExercises[workout.exercise] = 0;
            }
            analytics.topExercises[workout.exercise]++;
        });
        
        // Convert to arrays
        analytics.workoutsByDate = Object.entries(analytics.workoutsByDate)
            .map(([date, volume]) => ({ date, volume }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        analytics.topExercises = Object.entries(analytics.topExercises)
            .map(([exercise, count]) => ({ exercise, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ 
            error: 'Failed to generate analytics',
            code: 'ANALYTICS_ERROR'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
            error: 'Cross-origin request blocked',
            code: 'CORS_ERROR',
            allowedOrigins: corsOrigins
        });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
        availableEndpoints: [
            'GET  /api/health',
            'GET  /api/version',
            'GET  /api/config',
            'GET  /api/public-config',
            'GET  /api/stats (auth)',
            'GET  /api/profile (auth)',
            'GET  /api/workouts (auth)',
            'POST /api/workouts (auth)',
            'GET  /api/analytics (auth)',
            'POST /api/workouts/batch (auth)'
        ]
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Workout Tracker API Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`📝 Version: http://localhost:${PORT}/api/version`);
    console.log(`🔧 Config: http://localhost:${PORT}/api/config`);
    console.log(`🌐 Public Config: http://localhost:${PORT}/api/public-config`);
    console.log(`🌐 CORS Origins: ${corsOrigins.join(', ')}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Rate Limit: ${process.env.RATE_LIMIT_MAX || 100} req/${process.env.RATE_LIMIT_WINDOW || 15}min`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
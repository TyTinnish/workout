// scripts/setup-database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function setupDatabase() {
    console.log('🛠️ Setting up Workout Tracker database...');
    
    try {
        // SQL to create tables
        const sqlQueries = `
            -- Create profiles table
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create workouts table
            CREATE TABLE IF NOT EXISTS workouts (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                exercise TEXT NOT NULL,
                sets INTEGER NOT NULL CHECK (sets > 0),
                reps INTEGER NOT NULL CHECK (reps > 0),
                weight INTEGER NOT NULL CHECK (weight > 0),
                notes TEXT,
                workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);
            CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);
            CREATE INDEX IF NOT EXISTS workouts_workout_date_idx ON workouts(workout_date);
            CREATE INDEX IF NOT EXISTS workouts_created_at_idx ON workouts(created_at DESC);
            
            -- Enable RLS
            ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
            ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
            
            -- Drop existing policies if they exist
            DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
            DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
            DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
            DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
            
            DROP POLICY IF EXISTS "Users can view own workouts" ON workouts;
            DROP POLICY IF EXISTS "Users can insert own workouts" ON workouts;
            DROP POLICY IF EXISTS "Users can update own workouts" ON workouts;
            DROP POLICY IF EXISTS "Users can delete own workouts" ON workouts;
            
            -- Create policies for profiles
            CREATE POLICY "Users can view own profile" 
                ON profiles FOR SELECT 
                USING (auth.uid() = id);
            
            CREATE POLICY "Users can update own profile" 
                ON profiles FOR UPDATE 
                USING (auth.uid() = id);
            
            CREATE POLICY "Users can insert own profile" 
                ON profiles FOR INSERT 
                WITH CHECK (auth.uid() = id);
            
            CREATE POLICY "Users can delete own profile" 
                ON profiles FOR DELETE 
                USING (auth.uid() = id);
            
            -- Create policies for workouts
            CREATE POLICY "Users can view own workouts" 
                ON workouts FOR SELECT 
                USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can insert own workouts" 
                ON workouts FOR INSERT 
                WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "Users can update own workouts" 
                ON workouts FOR UPDATE 
                USING (auth.uid() = user_id);
            
            CREATE POLICY "Users can delete own workouts" 
                ON workouts FOR DELETE 
                USING (auth.uid() = user_id);
        `;
        
        // Execute the SQL
        const { error } = await supabase.rpc('exec_sql', { sql: sqlQueries });
        
        if (error) {
            // If the exec_sql function doesn't exist, run queries individually
            console.log('Note: Running SQL directly...');
            
            // You would need to run this in Supabase SQL Editor instead
            console.log('\n⚠️  Please run the SQL above in your Supabase SQL Editor');
            console.log('📋 Go to: Supabase Dashboard -> SQL Editor');
            console.log('📋 Copy and paste the SQL from above');
            
            // Alternative: Provide link to documentation
            console.log('\n🔗 Alternatively, use the web interface:');
            console.log('1. Go to your Supabase project');
            console.log('2. Click "Table Editor"');
            console.log('3. Click "Create a new table"');
            console.log('4. Create tables named "profiles" and "workouts" with the columns above');
        } else {
            console.log('✅ Database setup complete!');
        }
        
        // Test the setup
        console.log('\n🧪 Testing database connection...');
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
        
        if (testError) {
            console.log('❌ Profiles table test failed:', testError.message);
            console.log('\n💡 Please create the tables manually:');
            console.log('1. profiles table with columns: id, name, email, created_at, updated_at');
            console.log('2. workouts table with columns: id, user_id, exercise, sets, reps, weight, notes, workout_date, created_at, updated_at');
        } else {
            console.log('✅ Database connection successful!');
            console.log('✅ Tables are ready for use.');
        }
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        console.log('\n💡 Manual setup required:');
        console.log('1. Go to Supabase Dashboard -> SQL Editor');
        console.log('2. Run the SQL provided in the setup instructions');
    }
}

setupDatabase();
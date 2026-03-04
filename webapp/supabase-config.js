// Supabase Configuration for WebApp
const SUPABASE_URL = 'https://chhnfmdyswmvmkszkvih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaG5mbWR5c3dtdm1rc3prdmloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDE0MjcsImV4cCI6MjA4NTkxNzQyN30.SADbdriXLlmzi5j3PU3Uh7mZBUQ7-m-qeXpZXs3mlUo';

var supabase;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                storage: window.localStorage, // Use localStorage for PWA to persist long-term
                autoRefreshToken: true,
                persistSession: true
            }
        });
        console.log('✅ Reader App Supabase Initialized');

        // ===== REALTIME SUBSCRIPTION MANAGER =====
        window.realtimeChannels = {};

        /**
         * Subscribe to real-time changes on a table
         * @param {string} tableName - Name of the table to subscribe to
         * @param {Function} callback - Function to call when data changes
         * @returns {Object} - The subscription channel
         */
        window.subscribeToTable = function (tableName, callback) {
            // Unsubscribe from existing channel if it exists
            if (window.realtimeChannels[tableName]) {
                supabase.removeChannel(window.realtimeChannels[tableName]);
            }

            const channel = supabase
                .channel(`${tableName}_changes`)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: tableName },
                    (payload) => {
                        console.log(`[Realtime] ${tableName} changed:`, payload.eventType);
                        callback(payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Realtime] Subscribed to ${tableName}`);
                    }
                });

            window.realtimeChannels[tableName] = channel;
            return channel;
        };

        /**
         * Unsubscribe from all realtime channels
         */
        window.unsubscribeAll = function () {
            Object.keys(window.realtimeChannels).forEach(tableName => {
                supabase.removeChannel(window.realtimeChannels[tableName]);
                console.log(`[Realtime] Unsubscribed from ${tableName}`);
            });
            window.realtimeChannels = {};
        };
    }
} catch (error) {
    console.error('❌ Error initializing Supabase:', error);
}
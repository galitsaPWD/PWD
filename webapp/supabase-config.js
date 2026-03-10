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
            // Unsubscribe from existing channel if it's already being used for this table
            if (window.realtimeChannels[tableName]) {
                const existingChannel = window.realtimeChannels[tableName];
                console.log(`[Realtime] 🔄 Re-subscribing to ${tableName}. Existing channel state: ${existingChannel.state}`);
                supabase.removeChannel(existingChannel);
            }

            console.log(`[Realtime] 📡 Connecting to ${tableName}...`);

            const channel = supabase
                .channel(`live-${tableName}-${Math.floor(Math.random() * 10000)}`) // Unique channel name to avoid residue
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: tableName },
                    (payload) => {
                        console.log(`[Realtime] ⚡ ${tableName} event:`, payload.eventType, payload);
                        callback(payload);
                    }
                )
                .subscribe((status, error) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`[Realtime] ✅ Subscribed to ${tableName}`);
                    } else if (status === 'CLOSED') {
                        console.warn(`[Realtime] 🚪 Subscription for ${tableName} was closed. This usually happens if a new subscription overwrites this one.`);
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error(`[Realtime] ❌ Error in ${tableName} subscription:`, error);
                        if (error?.message?.includes('JWT')) {
                            console.error('[Realtime] 🔑 Auth error: JWT might be expired or invalid.');
                        }
                    } else if (status === 'TIMED_OUT') {
                        console.warn(`[Realtime] ⏳ Subscription timed out for ${tableName}. Check internet or Database Publication!`);
                    } else {
                        console.log(`[Realtime] Sub status for ${tableName}:`, status);
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
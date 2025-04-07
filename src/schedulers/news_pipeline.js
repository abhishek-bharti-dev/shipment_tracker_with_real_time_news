const cron = require('node-cron');
const { fetchGoogleNewsRSS } = require('../web_scrapping/scrapper');
// Uncomment the analyzeNewsLinks import since we'll be using it
const { analyzeNewsLinks } = require('../web_scrapping/analyze_news');

class NewsPipelineScheduler {
    static instance = null;
    static isStarted = false;
    static lastStartTime = null;

    constructor() {
        // Prevent multiple instances
        if (NewsPipelineScheduler.instance) {
            console.log('🔄 Reusing existing scheduler instance');
            return NewsPipelineScheduler.instance;
        }
        console.log('📦 Creating new scheduler instance');
        NewsPipelineScheduler.instance = this;

        this.isRunning = false;
        this.lastRunTime = null;
        this.cronJob = null;
    }

    async runPipeline() {
        // Prevent concurrent runs
        if (this.isRunning) {
            console.log('⚠️ Pipeline is already running, skipping this iteration');
            return;
        }

        try {
            this.isRunning = true;
            this.lastRunTime = new Date();

            console.log('\n🔄 Starting scheduled pipeline...');
            console.log('⏰ Current time:', this.lastRunTime.toISOString());
            console.log('📊 Last start time:', NewsPipelineScheduler.lastStartTime ? NewsPipelineScheduler.lastStartTime.toISOString() : 'Never');

            // Step 1: Fetch news links
            console.log('\n📰 Step 1: Fetching news links...');
            const result = await fetchGoogleNewsRSS();
            console.log(`📊 Fetched ${result.totalLinks} links`);

            // Step 2: Analyze news links
            console.log('\n🔍 Step 2: Analyzing news links...');
            await analyzeNewsLinks(result.links);

            console.log('\n✅ Pipeline completed successfully');
        } catch (error) {
            console.error('❌ Pipeline failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    start() {
        // Prevent multiple starts within 5 seconds
        if (NewsPipelineScheduler.isStarted) {
            const timeSinceLastStart = NewsPipelineScheduler.lastStartTime ? 
                (new Date() - NewsPipelineScheduler.lastStartTime) / 1000 : 0;
            
            if (timeSinceLastStart < 5) {
                console.log(`⚠️ Scheduler was started ${timeSinceLastStart.toFixed(1)} seconds ago, skipping...`);
                return;
            }
        }

        console.log('\n🚀 Starting News Pipeline Scheduler...');
        console.log('⏱️ Will run at the start of every hour');
        console.log('📊 Current time:', new Date().toISOString());

        // Stop any existing cron job
        if (this.cronJob) {
            console.log('🔄 Stopping existing cron job...');
            this.cronJob.stop();
        }

        // Run immediately on startup
        this.runPipeline();

        // Schedule regular runs at the start of every hour
        this.cronJob = cron.schedule('0 * * * *', () => {
            console.log('\n⏰ Cron trigger: Starting scheduled run...');
            this.runPipeline();
        });

        NewsPipelineScheduler.isStarted = true;
        NewsPipelineScheduler.lastStartTime = new Date();
    }

    stop() {
        console.log('\n🛑 Stopping News Pipeline Scheduler...');
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('✅ Cron job stopped');
        }
        NewsPipelineScheduler.isStarted = false;
        NewsPipelineScheduler.lastStartTime = null;
    }
}

// Create and export a singleton instance
const scheduler = new NewsPipelineScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Received SIGINT. Shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM. Shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
});

module.exports = scheduler;

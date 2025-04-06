const cron = require('node-cron');
const { fetchGoogleNewsRSS } = require('../web_scrapping/scrapper');
// Uncomment the analyzeNewsLinks import since we'll be using it
const { analyzeNewsLinks } = require('../web_scrapping/analyze_news');

class NewsPipelineScheduler {
    constructor() {
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
        console.log('🚀 Starting News Pipeline Scheduler...');
        console.log('⏱️ Will run at the start of every hour');

        // Run immediately on startup
        this.runPipeline();

        // Schedule regular runs at the start of every hour
        this.cronJob = cron.schedule('0 * * * *', () => {
            this.runPipeline();
        });
    }

    stop() {
        console.log('🛑 Stopping News Pipeline Scheduler...');
        if (this.cronJob) {
            this.cronJob.stop();
        }
    }
}

// Create and export a singleton instance
const scheduler = new NewsPipelineScheduler();
scheduler.start();

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

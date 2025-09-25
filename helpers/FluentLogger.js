const FluentLogger = require('fluent-logger');
class FluentBitLogger {
    constructor() {

        this.isEnabled = process.env.FLUENTBIT_ENABLED === 'true';
        this.client = null;
        
        if (this.isEnabled) {
            try {
                const config = {
                    host: process.env.FLUENTBIT_HOST || 'localhost',
                    port: parseInt(process.env.FLUENTBIT_PORT || '24224', 10),
                    timeout: parseInt(process.env.FLUENTBIT_TIMEOUT || '3000', 10)
                };
                
                this.client = FluentLogger.createFluentSender(process.env.FLUENTBIT_TAG_PREFIX, {
                    ...config,
                    reconnectInterval: 600000, // 10 minutes
                    requireAckResponse: false,
                    ackResponseTimeout: 190000
                });
                
                // Handle connection events
                this.client.on('error', (error) => {
                    console.error('FluentBit connection error:', error.message);
                });
                
            } catch (error) {
                console.error(`Error initializing FluentBit logger: ${error}`);
                this.isEnabled = false;
            }
        } else {
            console.log('FluentBit is disabled');
        }
    }

    async query(document = {}) {
        return this.sendLog(document,process.env.FLUENTBIT_TABLE_NAME);
    }

    async sendLog(data, tag) {
        if (!this.isEnabled || !this.client) {
            console.log('FluentBit disabled or client not initialized');
            return true;
        }

        try {
            const enhancedData = {
                ...data,
                createdat: new Date().toISOString()
            };

            // Use callback to handle connection errors
            return new Promise((resolve) => {
                this.client.emit(tag, enhancedData, (error) => {
                    if (error) {
                        console.error(`FluentBit send error: ${error.message}`);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error(`Error sending log to FluentBit: ${error}`);
            return false;
        }
    }
}

module.exports = FluentBitLogger;
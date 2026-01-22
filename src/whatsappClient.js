const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const config = require('./config');

class WhatsAppClient extends EventEmitter {
  constructor() {
    super();
    // Determine auth path: use env var, or detect Docker vs local dev
    let authPath = process.env.WHATSAPP_AUTH_PATH;
    if (!authPath) {
      // Check if we're in Docker by checking for /data directory (mounted volume)
      // In Docker, auth is mounted to /app/.wwebjs_auth
      // In local dev, use ./.wwebjs_auth
      if (fs.existsSync('/data')) {
        authPath = '/app/.wwebjs_auth';
      } else {
        // Local development - use relative path
        authPath = path.join(process.cwd(), '.wwebjs_auth');
      }
    }
    
    logger.info(`Using WhatsApp auth path: ${authPath}`);
    
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: authPath }),
      puppeteer: {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    });

    this.isReady = false;
    this.isAuthenticated = false;
    this.qrData = null;
    this.setupHandlers();
  }

  setupHandlers() {
    this.client.on('qr', async (qr) => {
      logger.info('QR Code received. Please scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
      
      // Generate QR code as data URL for web UI
      try {
        this.qrData = await QRCode.toDataURL(qr);
        this.emit('qr', this.qrData);
      } catch (err) {
        logger.error('Error generating QR code:', err);
      }
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
      this.qrData = null;
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated successfully');
      this.isAuthenticated = true;
      this.qrData = null;
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
      this.emit('auth_failure', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.isAuthenticated = false;
      this.emit('disconnected', reason);
    });
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isAuthenticated: this.isAuthenticated,
      qrData: this.qrData
    };
  }

  async initialize() {
    // Add loading screen listener for visibility
    this.client.on('loading_screen', (percent, message) => {
      logger.info(`WhatsApp loading: ${percent}% - ${message}`);
    });
    
    await this.client.initialize();
  }

  async sendToGroup(message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const chats = await this.client.getChats();
    const group = chats.find(chat => 
      chat.isGroup && chat.name === config.WHATSAPP_GROUP_NAME
    );

    if (!group) {
      throw new Error(`Group "${config.WHATSAPP_GROUP_NAME}" not found`);
    }

    const sentMessage = await this.client.sendMessage(group.id._serialized, message, { linkPreview: false });
    logger.info('Message sent to WhatsApp group');
    return sentMessage;
  }

  async sendToContact(countryCode, phoneNumber, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    // Format: countryCode (without +) + phoneNumber + @c.us
    // Example: 1234567890@c.us
    const cleanCountryCode = countryCode.replace('+', '');
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    const chatId = `${cleanCountryCode}${cleanPhoneNumber}@c.us`;

    try {
      const sentMessage = await this.client.sendMessage(chatId, message, { linkPreview: false });
      logger.info(`Message sent to WhatsApp contact: ${chatId}`);
      return sentMessage;
    } catch (error) {
      logger.error(`Failed to send message to contact ${chatId}:`, error);
      throw new Error(`Failed to send message to contact +${cleanCountryCode} ${cleanPhoneNumber}: ${error.message}`);
    }
  }

  async sendNotification(message) {
    const notificationType = config.NOTIFICATION_TYPE || 'group';

    if (notificationType === 'contact') {
      const countryCode = config.CONTACT_COUNTRY_CODE;
      const phoneNumber = config.CONTACT_PHONE_NUMBER;

      if (!countryCode || !phoneNumber) {
        throw new Error('Contact notification type selected but country code or phone number not configured');
      }

      return await this.sendToContact(countryCode, phoneNumber, message);
    } else {
      // Default to group
      return await this.sendToGroup(message);
    }
  }

  async deleteMessage(messageId) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    
    try {
      const message = await this.client.getMessageById(messageId);
      if (message) {
        await message.delete(true); // true = delete for everyone
        logger.info(`Deleted message ${messageId}`);
        return true;
      }
      logger.warn(`Message ${messageId} not found`);
      return false;
    } catch (error) {
      logger.warn(`Failed to delete message ${messageId}: ${error.message}`);
      return false;
    }
  }
}

module.exports = new WhatsAppClient();

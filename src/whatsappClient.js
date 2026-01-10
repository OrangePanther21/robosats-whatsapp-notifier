const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./logger');
const config = require('./config');

class WhatsAppClient {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.isReady = false;
    this.setupHandlers();
  }

  setupHandlers() {
    this.client.on('qr', (qr) => {
      logger.info('QR Code received. Please scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });
  }

  async initialize() {
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

    await group.sendMessage(message, { linkPreview: false });
    logger.info('Message sent to WhatsApp group');
  }
}

module.exports = new WhatsAppClient();

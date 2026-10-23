const { Events } = require('discord.js');
const voiceService = require('../services/voiceService');

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState, client) {
    try {
      await voiceService.handleVoiceStateUpdate(oldState, newState, client);
    } catch (err) {
      console.error('[VoiceStateUpdate] Error in voice handler:', err);
    }
  }
};

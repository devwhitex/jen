const { Events } = require('discord.js');
const antiNukeService = require('../services/antiNukeService');

module.exports = {
  name: Events.GuildAuditLogEntryCreate,
  once: false,
  async execute(auditLogEntry, guild) {
    try {
      await antiNukeService.handleAuditLogEntry(auditLogEntry, guild);
    } catch (err) {
      console.error('[Anti-Nuke Event Error]:', err.message);
    }
  }
};

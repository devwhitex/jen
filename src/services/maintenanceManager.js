const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

class MaintenanceManager {
  static isUnderMaintenance(guildId) {
    const settings = db.getSettings(guildId);
    return Boolean(settings && settings.maintenance_mode);
  }

  static getMaintenanceMessage(guildId) {
    const settings = db.getSettings(guildId);
    return settings?.maintenance_message || '🔧 **Server is currently under maintenance.**';
  }

  static async setMaintenance(guild, enabled, customMessage = null) {
    db.updateSetting(guild.id, 'maintenance_mode', enabled ? 1 : 0);
    if (customMessage) {
      db.updateSetting(guild.id, 'maintenance_message', customMessage);
    }
  }

  static async setupServerStats(guild) {
    // Check if category or channels exist
    const category = await guild.channels.create({
      name: '📊 SERVER STATS 📊',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });

    const membersCount = guild.members.cache.filter(m => !m.user.bot).size;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const totalCount = guild.memberCount;

    const totalChannel = await guild.channels.create({
      name: `📊 Total: ${totalCount}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });

    const membersChannel = await guild.channels.create({
      name: `👤 Members: ${membersCount}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });

    const botsChannel = await guild.channels.create({
      name: `🤖 Bots: ${botCount}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });

    db.setServerStats(guild.id, totalChannel.id, membersChannel.id, botsChannel.id);

    return { category, totalChannel, membersChannel, botsChannel };
  }

  static async updateGuildStats(guild) {
    const stats = db.getServerStats(guild.id);
    if (!stats) return;

    try {
      await guild.members.fetch().catch(() => null);
      const membersCount = guild.members.cache.filter(m => !m.user.bot).size;
      const botCount = guild.members.cache.filter(m => m.user.bot).size;
      const totalCount = guild.memberCount;

      if (stats.total_channel_id) {
        const ch = guild.channels.cache.get(stats.total_channel_id);
        if (ch) await ch.setName(`📊 Total: ${totalCount}`).catch(() => null);
      }
      if (stats.members_channel_id) {
        const ch = guild.channels.cache.get(stats.members_channel_id);
        if (ch) await ch.setName(`👤 Members: ${membersCount}`).catch(() => null);
      }
      if (stats.bots_channel_id) {
        const ch = guild.channels.cache.get(stats.bots_channel_id);
        if (ch) await ch.setName(`🤖 Bots: ${botCount}`).catch(() => null);
      }
    } catch (err) {
      console.warn(`Could not update stats for guild ${guild.id}:`, err.message);
    }
  }

  static startStatsLoop(client) {
    // Update every 10 minutes to respect Discord channel rename rate limits
    setInterval(() => {
      client.guilds.cache.forEach(guild => {
        this.updateGuildStats(guild);
      });
    }, 10 * 60 * 1000);
  }
}

module.exports = MaintenanceManager;

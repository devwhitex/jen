const { AuditLogEvent, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

class AntiNukeService {
  constructor() {
    // Map of key `${guildId}:${userId}:${action}` -> Array of timestamps
    this.actionHistory = new Map();
    // Window in milliseconds (10 seconds)
    this.WINDOW_MS = 10000;
  }

  cleanOldHistory() {
    const now = Date.now();
    for (const [key, timestamps] of this.actionHistory.entries()) {
      const valid = timestamps.filter(t => now - t < this.WINDOW_MS);
      if (valid.length === 0) {
        this.actionHistory.delete(key);
      } else {
        this.actionHistory.set(key, valid);
      }
    }
  }

  async handleAuditLogEntry(entry, guild) {
    if (!guild || !entry) return;

    const settings = db.getAntiNukeSettings(guild.id);
    if (!settings || !settings.enabled) return;

    const executor = entry.executor;
    if (!executor) return;

    // 1. Ignore Server Owner and Bot itself
    if (executor.id === guild.ownerId || executor.id === guild.client.user.id) return;

    // 2. Ignore Whitelisted Admins
    if (db.isAntiNukeWhitelisted(guild.id, executor.id)) return;

    let actionType = null;
    let limit = 3;

    switch (entry.action) {
      case AuditLogEvent.ChannelDelete:
        actionType = 'CHANNEL_DELETE';
        limit = settings.max_channel_deletes || 3;
        break;
      case AuditLogEvent.ChannelCreate:
        actionType = 'CHANNEL_CREATE';
        limit = settings.max_channel_creates || 4;
        break;
      case AuditLogEvent.MemberBanAdd:
      case AuditLogEvent.MemberKick:
        actionType = 'BAN_KICK';
        limit = settings.max_ban_kicks || 3;
        break;
      case AuditLogEvent.RoleDelete:
        actionType = 'ROLE_DELETE';
        limit = settings.max_role_deletes || 3;
        break;
      case AuditLogEvent.BotAdd:
        actionType = 'UNAUTHORIZED_BOT_ADD';
        limit = 1; // Instant trigger on rogue bot add
        break;
      default:
        return;
    }

    const key = `${guild.id}:${executor.id}:${actionType}`;
    const now = Date.now();
    const history = (this.actionHistory.get(key) || []).filter(t => now - t < this.WINDOW_MS);
    history.push(now);
    this.actionHistory.set(key, history);

    if (history.length >= limit) {
      // Clear history so we don't double punish on the same burst
      this.actionHistory.delete(key);
      await this.executePunishment(guild, executor, actionType, history.length, limit, settings);
    }
  }

  async executePunishment(guild, executor, actionType, count, limit, settings) {
    const punishment = settings.punishment || 'ban';
    let actionTaken = 'None';
    const reason = `[ANTI-NUKE DEFENDER] Rate limit breached: ${count}/${limit} ${actionType} within 10s`;

    try {
      const member = await guild.members.fetch(executor.id).catch(() => null);

      if (punishment === 'ban') {
        await guild.members.ban(executor.id, { reason }).catch(err => {
          console.error(`[Anti-Nuke] Failed to ban executor ${executor.id}:`, err.message);
        });
        actionTaken = 'Banned from server';
      } else if (punishment === 'kick' && member && member.kickable) {
        await member.kick(reason).catch(() => null);
        actionTaken = 'Kicked from server';
      } else if (punishment === 'strip_roles' && member) {
        const dangerousRoles = member.roles.cache.filter(r => 
          r.id !== guild.id && 
          (r.permissions.has(PermissionFlagsBits.Administrator) ||
           r.permissions.has(PermissionFlagsBits.ManageGuild) ||
           r.permissions.has(PermissionFlagsBits.ManageChannels) ||
           r.permissions.has(PermissionFlagsBits.BanMembers) ||
           r.permissions.has(PermissionFlagsBits.KickMembers))
        );
        if (dangerousRoles.size > 0) {
          await member.roles.remove(dangerousRoles, reason).catch(() => null);
          actionTaken = `Stripped ${dangerousRoles.size} admin roles`;
        }
      }
    } catch (err) {
      console.error('[Anti-Nuke] Punishment error:', err.message);
    }

    // Log incident in SQLite database
    db.logAntiNuke(guild.id, executor.id, actionType, actionTaken, reason);

    // Send Security Alert Embed
    await this.sendSecurityAlert(guild, executor, actionType, count, actionTaken, settings);
  }

  async sendSecurityAlert(guild, executor, actionType, count, actionTaken, settings) {
    const alertEmbed = new EmbedBuilder()
      .setTitle('🚨 EMERGENCY ANTI-NUKE DEFENDER TRIGGERED')
      .setDescription(
        `The Anti-Nuke protection system intercepted and stopped an unauthorized raid or nuke attack on **${guild.name}**!\n\n` +
        `• **Offender:** <@${executor.id}> (\`${executor.tag || executor.id}\`)\n` +
        `• **Action Intercepted:** \`${actionType}\` (${count} times in < 10s)\n` +
        `• **Automated Action Taken:** **${actionTaken}**\n` +
        `• **Protection Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor('#ED4245')
      .setThumbnail(executor.displayAvatarURL?.() || null)
      .setFooter({ text: 'Anti-Nuke Security System • Server Defender' })
      .setTimestamp();

    // 1. Post to Security Log Channel
    const logChannelId = settings.log_channel_id;
    if (logChannelId) {
      const channel = guild.channels.cache.get(logChannelId);
      if (channel) {
        await channel.send({
          content: '@everyone ⚠️ **ANTI-NUKE DEFENDER TRIGGERED!** An unauthorized administrative raid was intercepted.',
          embeds: [alertEmbed]
        }).catch(() => null);
      }
    }

    // 2. Alert Server Owner via DM
    try {
      const owner = await guild.fetchOwner();
      if (owner) {
        await owner.send({
          content: `⚠️ **SECURITY ALERT FOR YOUR SERVER:** Anti-Nuke defender intercepted a suspicious burst on **${guild.name}**!`,
          embeds: [alertEmbed]
        }).catch(() => null);
      }
    } catch (_) {}
  }
}

const antiNukeService = new AntiNukeService();
// Clean history every 30 seconds
setInterval(() => antiNukeService.cleanOldHistory(), 30000);

module.exports = antiNukeService;

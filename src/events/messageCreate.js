const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const embeds = require('../utils/embeds');
const config = require('../config');

// In-memory spam tracking: Map<userId, Array<timestamp>>
const spamTracker = new Map();
// In-memory XP cooldown tracking: Map<userId, timestamp>
const xpCooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const settings = db.getSettings(message.guild.id);
    const isMod = message.member?.permissions.has(PermissionFlagsBits.ManageMessages);

    // ==========================================
    // 1. AUTOMOD CHECKS (Non-staff members)
    // ==========================================
    if (!isMod && message.member) {
      const contentLower = message.content.toLowerCase();

      // A. Anti-Invite & Phishing Links
      if (settings.automod_links) {
        const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/i;
        const phishingKeywords = ['grabify', 'iplogger', 'free-nitro', 'discorcl', 'steam-gift'];
        const isPhish = phishingKeywords.some(k => contentLower.includes(k));

        if (inviteRegex.test(message.content) || isPhish) {
          await message.delete().catch(() => null);

          const warnMsg = await message.channel.send({
            content: `⚠️ <@${message.author.id}>, posting invites or suspicious links is prohibited by automod.`
          }).catch(() => null);

          if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => null), 5000);

          if (settings.mod_log_channel_id) {
            const logCh = message.guild.channels.cache.get(settings.mod_log_channel_id);
            if (logCh) {
              await logCh.send({
                embeds: [
                  embeds.mod(
                    `**User:** <@${message.author.id}> (\`${message.author.id}\`)\n` +
                    `**Channel:** ${message.channel}\n` +
                    `**Violation:** Unauthorized link / invite / phish\n` +
                    `**Message Preview:** \`${message.content.slice(0, 200)}\``,
                    'Automod Blocked Link'
                  )
                ]
              }).catch(() => null);
            }
          }
          return;
        }
      }

      // B. Bad Words Filter
      if (settings.automod_badwords && settings.badwords_list) {
        const badWords = settings.badwords_list.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
        const hasBadWord = badWords.some(w => contentLower.includes(w));

        if (hasBadWord) {
          await message.delete().catch(() => null);

          const warnMsg = await message.channel.send({
            content: `⚠️ <@${message.author.id}>, your message contained a blacklisted word and was removed.`
          }).catch(() => null);

          if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => null), 5000);
          return;
        }
      }

      // C. Anti-Spam Rate Limiter
      if (settings.automod_spam) {
        const now = Date.now();
        const userHistory = spamTracker.get(message.author.id) || [];
        const recentMessages = userHistory.filter(t => now - t < 5000);
        recentMessages.push(now);
        spamTracker.set(message.author.id, recentMessages);

        if (recentMessages.length >= 5) {
          spamTracker.delete(message.author.id);
          await message.delete().catch(() => null);

          try {
            await message.member.timeout(60000, 'Automod: Rapid spamming detected');
            await message.channel.send({
              content: `⚡ <@${message.author.id}> has been timed out for 60 seconds for spamming.`
            });
          } catch (_) {}
          return;
        }
      }
    }

    // ==========================================
    // 2. AUTO-REPLY ENGINE
    // ==========================================
    const autoReplies = db.getAutoReplies(message.guild.id);
    if (autoReplies.length > 0) {
      const lower = message.content.toLowerCase().trim();

      for (const item of autoReplies) {
        const trigger = item.trigger.toLowerCase();
        let matched = false;

        if (item.match_type === 'exact' && lower === trigger) matched = true;
        else if (item.match_type === 'startswith' && lower.startsWith(trigger)) matched = true;
        else if (item.match_type === 'contains' && lower.includes(trigger)) matched = true;

        if (matched) {
          await message.reply({ content: item.reply }).catch(() => null);
          break;
        }
      }
    }

    // ==========================================
    // 3. LEVELING & XP ENGINE
    // ==========================================
    const now = Date.now();
    const lastXp = xpCooldowns.get(message.author.id) || 0;

    if (now - lastXp >= 60000) {
      xpCooldowns.set(message.author.id, now);
      const earnedXp = Math.floor(Math.random() * 11) + 15; // 15 to 25 XP
      const result = db.addXp(message.guild.id, message.author.id, earnedXp);

      if (result.leveledUp) {
        const levelEmbed = new EmbedBuilder()
          .setTitle('🎉 Level Up!')
          .setDescription(`Congratulations <@${message.author.id}>! You have reached **Level ${result.level}**! ⭐`)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setColor('#57F287')
          .setTimestamp();

        await message.channel.send({ embeds: [levelEmbed] }).catch(() => null);
      }
    }

    // ==========================================
    // 4. AUTO-CLEAN CHANNEL ENGINE
    // ==========================================
    const autoCleanConfig = db.getAutoClean(message.channel.id);
    if (autoCleanConfig && autoCleanConfig.delay_minutes > 0) {
      setTimeout(() => {
        message.delete().catch(() => null);
      }, autoCleanConfig.delay_minutes * 60 * 1000);
    }
  }
};

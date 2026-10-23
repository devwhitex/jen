const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');
const MaintenanceManager = require('../services/maintenanceManager');
const MemberCounterService = require('../services/memberCounterService');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const { guild } = member;
    const settings = db.getSettings(guild.id);

    // 1. Send Leave / Goodbye Message
    if (settings.leave_channel_id) {
      const channel = guild.channels.cache.get(settings.leave_channel_id);
      if (channel) {
        const leaveTemplate = settings.leave_message || '{userTag} just left {server}. We are now at {members} members.';
        const formattedMsg = leaveTemplate
          .replace('{userTag}', member.user.tag)
          .replace('{server}', guild.name)
          .replace('{members}', guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setTitle(`👋 Member Left`)
          .setDescription(formattedMsg)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setColor(config.errorColor)
          .setFooter({ text: `Remaining Members: ${guild.memberCount}` })
          .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => null);
      }
    }

    // 2. Update server stats and member counters
    MaintenanceManager.updateGuildStats(guild).catch(() => null);
    MemberCounterService.updateCounters(guild).catch(() => null);
  }
};

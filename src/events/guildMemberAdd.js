const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');
const MaintenanceManager = require('../services/maintenanceManager');
const MemberCounterService = require('../services/memberCounterService');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const { guild } = member;
    const settings = db.getSettings(guild.id);

    // 1. Assign Auto-Role
    if (settings.welcome_role_id) {
      const role = guild.roles.cache.get(settings.welcome_role_id);
      if (role) {
        await member.roles.add(role).catch(err => {
          console.warn(`Could not assign auto-role to ${member.user.tag}:`, err.message);
        });
      }
    }

    // 2. Send Welcome Message
    if (settings.welcome_channel_id) {
      const channel = guild.channels.cache.get(settings.welcome_channel_id);
      if (channel) {
        const welcomeTemplate = settings.welcome_message || 'Welcome to {server}, {user}! We now have {members} members.';
        const formattedMsg = welcomeTemplate
          .replace('{user}', `<@${member.id}>`)
          .replace('{server}', guild.name)
          .replace('{members}', guild.memberCount.toString());

        const embed = new EmbedBuilder()
          .setTitle(`👋 Welcome to ${guild.name}!`)
          .setDescription(formattedMsg)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setColor(config.embedColor)
          .setFooter({ text: `Member #${guild.memberCount}` })
          .setTimestamp();

        await channel.send({
          content: `Welcome <@${member.id}>!`,
          embeds: [embed]
        }).catch(() => null);
      }
    }

    // 3. Update server stats and member counters
    MaintenanceManager.updateGuildStats(guild).catch(() => null);
    MemberCounterService.updateCounters(guild).catch(() => null);
  }
};

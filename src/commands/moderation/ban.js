const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Permanently ban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('delete-days')
        .setDescription('Number of days of message history to delete (0 to 7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete-days') || 0;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [embeds.error('You cannot ban yourself!')],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member) {
      if (!member.bannable) {
        return interaction.reply({
          embeds: [embeds.error('I cannot ban this member (they have equal or higher role than me)!')],
          ephemeral: true
        });
      }

      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          embeds: [embeds.error('You cannot ban someone with a role equal to or higher than yours!')],
          ephemeral: true
        });
      }

      // Try to DM member
      await member.send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => null);
    }

    await interaction.guild.members.ban(targetUser.id, {
      deleteMessageSeconds: deleteDays * 86400,
      reason: `${reason} (by ${interaction.user.tag})`
    });

    // Mod log
    const settings = db.getSettings(interaction.guild.id);
    if (settings.mod_log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(settings.mod_log_channel_id);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            embeds.mod(
              `**Target:** ${targetUser.tag} (\`${targetUser.id}\`)\n` +
              `**Moderator:** <@${interaction.user.id}>\n` +
              `**Purged Messages:** ${deleteDays} day(s)\n` +
              `**Reason:** ${reason}`,
              'User Banned'
            )
          ]
        }).catch(() => null);
      }
    }

    return interaction.reply({
      embeds: [
        embeds.success(`Permanently banned **${targetUser.tag}**.\n• **Reason:** ${reason}`)
      ]
    });
  }
};

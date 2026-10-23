const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to kick')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [embeds.error('You cannot kick yourself!')],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [embeds.error('This user is not currently in the server!')],
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        embeds: [embeds.error('I cannot kick this member (they may have higher permissions than me)!')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [embeds.error('You cannot kick someone with a role equal to or higher than yours!')],
        ephemeral: true
      });
    }

    // Try to DM member
    await member.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => null);

    await member.kick(`${reason} (by ${interaction.user.tag})`);

    // Log to mod channel
    const settings = db.getSettings(interaction.guild.id);
    if (settings.mod_log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(settings.mod_log_channel_id);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            embeds.mod(
              `**Target:** ${targetUser.tag} (\`${targetUser.id}\`)\n` +
              `**Moderator:** <@${interaction.user.id}>\n` +
              `**Reason:** ${reason}`,
              'Member Kicked'
            )
          ]
        }).catch(() => null);
      }
    }

    return interaction.reply({
      embeds: [embeds.success(`Kicked **${targetUser.tag}**.\n• **Reason:** ${reason}`)]
    });
  }
};

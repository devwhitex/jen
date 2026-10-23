const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a formal warning to a server member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [embeds.error('You cannot warn yourself!')],
        ephemeral: true
      });
    }

    if (target.bot) {
      return interaction.reply({
        embeds: [embeds.error('You cannot warn bots!')],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [embeds.error('You cannot warn someone with a role equal to or higher than yours!')],
        ephemeral: true
      });
    }

    db.addWarning(interaction.guild.id, target.id, interaction.user.id, reason);
    const warnings = db.getWarnings(interaction.guild.id, target.id);

    // Send DM to target
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`⚠️ You received a warning in ${interaction.guild.name}`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: interaction.user.tag },
          { name: 'Total Warnings', value: `${warnings.length}` }
        )
        .setColor(config.warningColor)
        .setTimestamp();
      await target.send({ embeds: [dmEmbed] }).catch(() => null);
    } catch (_) {}

    // Send log to mod log channel if configured
    const settings = db.getSettings(interaction.guild.id);
    if (settings.mod_log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(settings.mod_log_channel_id);
      if (logChannel) {
        const logEmbed = embeds.mod(
          `**User:** <@${target.id}> (\`${target.id}\`)\n` +
          `**Moderator:** <@${interaction.user.id}>\n` +
          `**Reason:** ${reason}\n` +
          `**Total Warnings:** ${warnings.length}`,
          'Member Warned'
        );
        await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }
    }

    return interaction.reply({
      embeds: [
        embeds.success(
          `Successfully warned <@${target.id}>.\n` +
          `• **Reason:** ${reason}\n` +
          `• **Total Warnings:** ${warnings.length}`
        )
      ]
    });
  }
};

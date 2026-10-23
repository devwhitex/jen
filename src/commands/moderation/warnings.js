const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View all warnings issued to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The user whose warnings you want to view')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const warnings = db.getWarnings(interaction.guild.id, target.id);

    if (warnings.length === 0) {
      return interaction.reply({
        embeds: [embeds.info(`<@${target.id}> has a clean record with 0 warnings.`)],
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(config.warningColor)
      .setDescription(
        warnings.map((w, i) =>
          `**#${w.id}** • <t:${Math.floor(w.created_at / 1000)}:R>\n` +
          `• **Moderator:** <@${w.moderator_id}>\n` +
          `• **Reason:** ${w.reason}`
        ).join('\n\n')
      )
      .setFooter({ text: `Total Warnings: ${warnings.length}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

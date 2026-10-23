const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all warnings for a user or remove a single warning ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The user whose warnings will be cleared')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('warning-id')
        .setDescription('Specific warning ID to delete (leave blank to clear all)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const warningId = interaction.options.getInteger('warning-id');

    if (warningId) {
      const res = db.deleteWarning(warningId, interaction.guild.id);
      if (res.changes === 0) {
        return interaction.reply({
          embeds: [embeds.error(`Warning #${warningId} was not found.`)],
          ephemeral: true
        });
      }
      return interaction.reply({
        embeds: [embeds.success(`Removed warning #${warningId} from <@${target.id}>.`)]
      });
    }

    db.clearWarnings(interaction.guild.id, target.id);
    return interaction.reply({
      embeds: [embeds.success(`Cleared all warnings for <@${target.id}>.`)]
    });
  }
};

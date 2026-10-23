const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const MaintenanceManager = require('../../services/maintenanceManager');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Automatically set up live server member/bot counter voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Create the live server stats category and counter channels')
    )
    .addSubcommand(sub =>
      sub.setName('update')
        .setDescription('Force an immediate refresh of the stats counter channels')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const result = await MaintenanceManager.setupServerStats(interaction.guild);
        return interaction.editReply({
          embeds: [
            embeds.success(
              `Live Server Stats successfully created!\n\n` +
              `• **Category:** ${result.category.name}\n` +
              `• **Total Counter:** ${result.totalChannel.name}\n` +
              `• **Members Counter:** ${result.membersChannel.name}\n` +
              `• **Bots Counter:** ${result.botsChannel.name}\n\n` +
              `*Channels will automatically update as users join and leave.*`,
              'Server Stats Deployed'
            )
          ]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [embeds.error(`Failed to setup server stats: ${err.message}`)]
        });
      }
    }

    if (sub === 'update') {
      await interaction.deferReply({ ephemeral: true });
      await MaintenanceManager.updateGuildStats(interaction.guild);
      return interaction.editReply({
        embeds: [embeds.success('Server stats counter channels refreshed successfully!')]
      });
    }
  }
};

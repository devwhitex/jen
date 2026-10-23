const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set or disable channel slowmode delay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt =>
      opt.setName('seconds')
        .setDescription('Cooldown duration in seconds (0 to turn off slowmode)')
        .setMinValue(0)
        .setMaxValue(21600) // Max 6 hours
        .setRequired(true)
        .addChoices(
          { name: 'Off (0 seconds)', value: 0 },
          { name: '5 seconds', value: 5 },
          { name: '10 seconds', value: 10 },
          { name: '15 seconds', value: 15 },
          { name: '30 seconds', value: 30 },
          { name: '1 minute', value: 60 },
          { name: '2 minutes', value: 120 },
          { name: '5 minutes', value: 300 },
          { name: '10 minutes', value: 600 },
          { name: '15 minutes', value: 900 },
          { name: '30 minutes', value: 1800 },
          { name: '1 hour', value: 3600 },
          { name: '6 hours', value: 21600 }
        )
    ),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

      if (seconds === 0) {
        return interaction.reply({
          embeds: [embeds.success('⏱️ Slowmode has been **disabled** for this channel.')]
        });
      }

      return interaction.reply({
        embeds: [embeds.success(`⏱️ Slowmode set to **${seconds} second(s)** per user.`)]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [embeds.error(`Failed to set slowmode: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};

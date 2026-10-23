const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust music playback volume')
    .addIntegerOption(opt =>
      opt.setName('percent')
        .setDescription('Volume level (1 - 150%)')
        .setMinValue(1)
        .setMaxValue(150)
        .setRequired(true)
    ),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentSong) {
      return interaction.reply({
        embeds: [embeds.error('There is no music currently playing!')],
        ephemeral: true
      });
    }

    const vol = interaction.options.getInteger('percent');
    queue.setVolume(vol);

    return interaction.reply({
      embeds: [embeds.success(`🔊 Playback volume set to **${vol}%**`)]
    });
  }
};

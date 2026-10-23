const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing song'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentSong) {
      return interaction.reply({
        embeds: [embeds.error('There is no music currently playing to skip!')],
        ephemeral: true
      });
    }

    const currentTitle = queue.currentSong.title;
    queue.skip();

    return interaction.reply({
      embeds: [embeds.success(`⏭️ Skipped **${currentTitle}**`)]
    });
  }
};

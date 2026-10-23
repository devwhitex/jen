const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show details and interactive controls for the currently playing song'),

  async execute(interaction) {
    const queue = musicManager.getQueue(interaction.guild.id);
    if (!queue || !queue.currentSong) {
      return interaction.reply({
        embeds: [embeds.error('There is no music currently playing!')],
        ephemeral: true
      });
    }

    const song = queue.currentSong;

    const embed = new EmbedBuilder()
      .setTitle('🎶 Now Playing')
      .setDescription(`[**${song.title}**](${song.url})`)
      .addFields(
        { name: 'Duration', value: song.duration || 'Live / Unknown', inline: true },
        { name: 'Requested By', value: `<@${song.requester.id}>`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true },
        { name: 'Queue Status', value: `${queue.songs.length} song(s) remaining`, inline: true }
      )
      .setThumbnail(song.thumbnail || null)
      .setColor(config.embedColor)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_toggle')
        .setEmoji('⏯️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [buttons]
    });
  }
};

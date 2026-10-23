const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube/SoundCloud or search query')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song title, artist, or URL')
        .setRequired(true)
    ),

  async execute(interaction) {
    const memberVoice = interaction.member.voice.channel;
    if (!memberVoice) {
      return interaction.reply({
        embeds: [embeds.error('You must be in a voice channel to play music!')],
        ephemeral: true
      });
    }

    const botVoice = interaction.guild.members.me.voice.channel;
    if (botVoice && botVoice.id !== memberVoice.id) {
      return interaction.reply({
        embeds: [embeds.error(`I am already playing in another voice channel: <#${botVoice.id}>`)],
        ephemeral: true
      });
    }

    await interaction.deferReply();
    const query = interaction.options.getString('query');

    const searchResults = await musicManager.search(query);
    if (!searchResults || searchResults.length === 0) {
      return interaction.editReply({
        embeds: [embeds.error(`No tracks found for query: \`${query}\``)]
      });
    }

    const track = searchResults[0];
    track.requester = interaction.user;

    const queue = musicManager.createQueue(interaction.client, interaction.guild.id);
    await queue.connect(memberVoice, interaction.channel);

    if (queue.currentSong) {
      queue.songs.push(track);
      return interaction.editReply({
        embeds: [
          embeds.success(
            `Added to queue: [**${track.title}**](${track.url})\n` +
            `• **Duration:** ${track.duration || 'Unknown'}\n` +
            `• **Position in queue:** #${queue.songs.length}`,
            'Track Queued'
          )
        ]
      });
    } else {
      await interaction.editReply({
        embeds: [embeds.success(`Loading track: [**${track.title}**](${track.url})...`)]
      });
      await queue.playTrack(track);
    }
  }
};

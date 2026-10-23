const { SlashCommandBuilder, ChannelType } = require('discord.js');
const musicManager = require('../../music/player');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Summon the bot to join your current voice channel')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Optional specific voice channel to join')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    ),

  async execute(interaction) {
    const specifiedChannel = interaction.options.getChannel('channel');
    const memberVoice = specifiedChannel || interaction.member.voice.channel;

    if (!memberVoice) {
      return interaction.reply({
        embeds: [embeds.error('You must be in a voice channel or specify one to use this command!')],
        ephemeral: true
      });
    }

    const queue = musicManager.createQueue(interaction.client, interaction.guild.id);
    await queue.connect(memberVoice, interaction.channel);

    return interaction.reply({
      embeds: [embeds.success(`🔊 Successfully joined **${memberVoice.name}**! You can now use \`/play\` to stream music.`)]
    });
  }
};

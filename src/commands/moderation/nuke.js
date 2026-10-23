const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Completely wipe and reset the current channel by cloning it')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(opt =>
      opt.setName('confirm')
        .setDescription('Confirm you want to permanently wipe all messages in this channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const confirm = interaction.options.getBoolean('confirm');
    if (!confirm) {
      return interaction.reply({
        embeds: [embeds.info('Channel nuke was cancelled.')],
        ephemeral: true
      });
    }

    const channel = interaction.channel;
    const position = channel.position;

    await interaction.reply({
      embeds: [embeds.warning('💥 Nuking channel in 3 seconds...', 'Channel Reset')]
    });

    setTimeout(async () => {
      try {
        const clonedChannel = await channel.clone({
          name: channel.name,
          parent: channel.parentId,
          topic: channel.topic,
          nsfw: channel.nsfw,
          rateLimitPerUser: channel.rateLimitPerUser,
          position: position
        });

        await channel.delete(`Nuked by ${interaction.user.tag}`);

        const nukeEmbed = new EmbedBuilder()
          .setTitle('💥 Channel Nuked & Reset!')
          .setDescription(`This channel was completely wiped and reset by <@${interaction.user.id}>.\nAll chat history has been cleanly cleared.`)
          .setImage('https://media.giphy.com/media/oe33xf3B50fsc/giphy.gif')
          .setColor('#ED4245')
          .setFooter({ text: 'Clean Slate Created' })
          .setTimestamp();

        await clonedChannel.send({ embeds: [nukeEmbed] });
      } catch (err) {
        console.error('Failed to nuke channel:', err);
      }
    }, 3000);
  }
};

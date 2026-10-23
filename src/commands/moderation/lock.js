const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Freeze the current channel so regular members cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Optional reason for locking the channel')
        .setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'Channel locked by staff';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      return interaction.reply({
        embeds: [
          embeds.warning(
            `🔒 **Channel Locked**\n\n` +
            `This channel has been locked by <@${interaction.user.id}>.\n` +
            `• **Reason:** ${reason}\n\n` +
            `*Regular members cannot send messages until unlocked.*`,
            'Lockdown Active'
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [embeds.error(`Failed to lock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};

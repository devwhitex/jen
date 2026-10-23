const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unfreeze the channel allowing members to chat again')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      return interaction.reply({
        embeds: [
          embeds.success(
            `🔓 **Channel Unlocked**\n\n` +
            `This channel has been unlocked by <@${interaction.user.id}>.\n` +
            `Members can now chat normally.`,
            'Lockdown Ended'
          )
        ]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [embeds.error(`Failed to unlock channel: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout/mute from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to remove timeout from')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [embeds.error('This user is not in the server!')],
        ephemeral: true
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [embeds.info('This member is not currently timed out.')],
        ephemeral: true
      });
    }

    await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);

    return interaction.reply({
      embeds: [embeds.success(`Removed timeout for <@${member.id}>.`)]
    });
  }
};

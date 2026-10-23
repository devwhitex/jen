const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their user ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt =>
      opt.setName('userid')
        .setDescription('Discord ID of the user to unban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for unbanning')
        .setRequired(false)
    ),

  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild.members.unban(userId, `${reason} (by ${interaction.user.tag})`);
      return interaction.reply({
        embeds: [embeds.success(`Unbanned user \`${userId}\`.\n• **Reason:** ${reason}`)]
      });
    } catch (err) {
      return interaction.reply({
        embeds: [embeds.error(`Could not unban user: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};

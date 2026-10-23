const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display detailed information about a user or member')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to view (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setColor(member?.displayHexColor || config.embedColor)
      .addFields(
        { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
        { name: '🤖 Is Bot?', value: user.bot ? 'Yes' : 'No', inline: true },
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`,
          inline: false
        }
      );

    if (member) {
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .map(r => `<@&${r.id}>`)
        .slice(0, 15)
        .join(', ') || 'No roles';

      embed.addFields(
        {
          name: '📥 Joined Server',
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`,
          inline: false
        },
        {
          name: `🎭 Roles (${member.roles.cache.size - 1})`,
          value: roles.length > 1000 ? `${roles.substring(0, 1000)}...` : roles,
          inline: false
        }
      );
    }

    embed.setFooter({ text: `Requested by ${interaction.user.tag}` }).setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

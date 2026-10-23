const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display detailed information and statistics about this server'),

  async execute(interaction) {
    const { guild } = interaction;
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const humanMembers = guild.members.cache.filter(m => !m.user.bot).size;
    const botMembers = guild.members.cache.filter(m => m.user.bot).size;

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const rolesCount = guild.roles.cache.size;
    const emojisCount = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Server Information: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setColor(config.embedColor)
      .addFields(
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
        { name: '📅 Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: false },
        {
          name: '👥 Members Breakdown',
          value: `• Total: **${totalMembers}**\n• Humans: **${humanMembers}**\n• Bots: **${botMembers}**`,
          inline: true
        },
        {
          name: '💬 Channels',
          value: `• Text: **${textChannels}**\n• Voice: **${voiceChannels}**\n• Categories: **${categories}**`,
          inline: true
        },
        {
          name: '💎 Nitro Boosts',
          value: `• Level: **Tier ${boostLevel}**\n• Total Boosts: **${boostCount}**`,
          inline: true
        },
        {
          name: '🎭 Assets',
          value: `• Roles: **${rolesCount}**\n• Custom Emojis: **${emojisCount}**`,
          inline: true
        }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

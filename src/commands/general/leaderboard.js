const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 highest level members in this server'),

  async execute(interaction) {
    const topMembers = db.getLeaderboard(interaction.guild.id, 10);

    if (topMembers.length === 0) {
      return interaction.reply({
        embeds: [embeds.info('No members have earned XP yet. Start chatting to gain XP and rank up!')],
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const description = topMembers.map((m, index) => {
      const medal = medals[index] || `\`#${index + 1}\``;
      return `${medal} <@${m.user_id}> • **Level ${m.level}** (\`${m.xp.toLocaleString()} XP\`)`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Server XP Leaderboard • Top 10`)
      .setDescription(description)
      .setColor('#FEE75C') // Gold
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: `${interaction.guild.name} Activity Rankings` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

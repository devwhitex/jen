const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');

function getProgressBar(current, target, totalBars = 12) {
  const percent = Math.min(1, Math.max(0, current / target));
  const filledBars = Math.round(totalBars * percent);
  const emptyBars = totalBars - filledBars;
  return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${Math.round(percent * 100)}%`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your current level, XP, and rank progress')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('User to inspect (defaults to yourself)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const userStats = db.getUserLevel(interaction.guild.id, user.id);

    // Calculate XP needed for next level: ( (level + 1) / 0.1 )^2
    const currentLevel = userStats.level;
    const nextLevel = currentLevel + 1;
    const currentLevelBaseXp = Math.round(Math.pow(currentLevel / 0.1, 2));
    const nextLevelTargetXp = Math.round(Math.pow(nextLevel / 0.1, 2));
    const progressXp = userStats.xp - currentLevelBaseXp;
    const neededXp = nextLevelTargetXp - currentLevelBaseXp;

    const bar = getProgressBar(progressXp, neededXp);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${user.tag}'s Server Rank`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(config.embedColor)
      .addFields(
        { name: '⭐ Level', value: `\`Level ${currentLevel}\``, inline: true },
        { name: '✨ Total XP', value: `\`${userStats.xp.toLocaleString()} XP\``, inline: true },
        { name: '🎯 Next Level', value: `\`${userStats.xp.toLocaleString()} / ${nextLevelTargetXp.toLocaleString()} XP\``, inline: true },
        { name: '📈 Progress to Next Level', value: `\`\`\`${bar}\`\`\``, inline: false }
      )
      .setFooter({ text: 'Earn XP by chatting in text channels' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

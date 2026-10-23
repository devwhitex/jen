const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a community poll with live interactive button voting')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('The question or topic of the poll')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('option1')
        .setDescription('First choice')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('option2')
        .setDescription('Second choice')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('option3')
        .setDescription('Third choice (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('option4')
        .setDescription('Fourth choice (optional)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('duration')
        .setDescription('Poll duration (e.g., 30m, 2h, 1d)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const opt1 = interaction.options.getString('option1');
    const opt2 = interaction.options.getString('option2');
    const opt3 = interaction.options.getString('option3');
    const opt4 = interaction.options.getString('option4');
    const durationStr = interaction.options.getString('duration');

    const options = [opt1, opt2];
    if (opt3) options.push(opt3);
    if (opt4) options.push(opt4);

    const durationMs = parseDuration(durationStr);
    const endsAt = durationMs ? Date.now() + durationMs : null;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Community Poll • Hosted by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTitle(`📊 ${question}`)
      .setDescription(
        options.map((opt, i) => `**${i + 1}.** ${opt}\n\`[░░░░░░░░░░]\` 0% (0 votes)`).join('\n\n') +
        `\n\n**Total Votes:** \`0\`` +
        (endsAt ? `\n⏳ **Ends:** <t:${Math.floor(endsAt / 1000)}:R>` : '')
      )
      .setColor(config.embedColor)
      .setFooter({ text: 'Click a button below to cast or change your vote!' })
      .setTimestamp();

    const row = new ActionRowBuilder();
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

    options.forEach((opt, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote_${index}`)
          .setLabel(opt.length > 20 ? opt.slice(0, 17) + '...' : opt)
          .setEmoji(emojis[index])
          .setStyle(ButtonStyle.Primary)
      );
    });

    const msg = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    db.createPoll(msg.id, interaction.channel.id, interaction.guild.id, question, JSON.stringify(options), endsAt);

    return interaction.reply({
      embeds: [embeds.success('Poll published successfully!')],
      ephemeral: true
    });
  }
};

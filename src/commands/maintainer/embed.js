const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a beautiful, fully customized embed post with direct image uploads')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Main body content (supports markdown and \\n)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Embed title')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Theme color preset or custom hex (#5865F2)')
        .addChoices(
          { name: 'Blurple (Default)', value: '#5865F2' },
          { name: 'Emerald Green (Success)', value: '#57F287' },
          { name: 'Crimson Red (Danger)', value: '#ED4245' },
          { name: 'Golden Yellow (Warning)', value: '#FEE75C' },
          { name: 'Royal Purple', value: '#9B59B6' },
          { name: 'Aqua Cyan', value: '#1ABC9C' },
          { name: 'Midnight Dark', value: '#2C2F33' }
        )
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('banner-file')
        .setDescription('Upload a banner image from your device')
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('thumbnail-file')
        .setDescription('Upload a thumbnail logo from your device')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('field1-title')
        .setDescription('Title for field 1')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('field1-value')
        .setDescription('Content for field 1')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('field2-title')
        .setDescription('Title for field 2')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('field2-value')
        .setDescription('Content for field 2')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('footer')
        .setDescription('Custom footer text')
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to send embed to (defaults to current)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const description = interaction.options.getString('description');
    const title = interaction.options.getString('title');
    const colorHex = interaction.options.getString('color') || config.embedColor;
    const bannerFile = interaction.options.getAttachment('banner-file');
    const thumbFile = interaction.options.getAttachment('thumbnail-file');
    const field1Title = interaction.options.getString('field1-title');
    const field1Value = interaction.options.getString('field1-value');
    const field2Title = interaction.options.getString('field2-title');
    const field2Value = interaction.options.getString('field2-value');
    const footer = interaction.options.getString('footer');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const embed = new EmbedBuilder()
      .setDescription(description.replace(/\\n/g, '\n'))
      .setColor(colorHex)
      .setTimestamp();

    if (title) embed.setTitle(title);
    if (bannerFile) embed.setImage(bannerFile.url);
    if (thumbFile) embed.setThumbnail(thumbFile.url);

    if (field1Title && field1Value) {
      embed.addFields({ name: field1Title, value: field1Value.replace(/\\n/g, '\n'), inline: false });
    }

    if (field2Title && field2Value) {
      embed.addFields({ name: field2Title, value: field2Value.replace(/\\n/g, '\n'), inline: false });
    }

    if (footer) {
      embed.setFooter({ text: footer });
    } else {
      embed.setFooter({ text: `${interaction.guild.name}` });
    }

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      embeds: [embeds.success(`Custom styled embed published to ${channel}!`)],
      ephemeral: true
    });
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Deploy interactive ticket and product purchase panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('product-panel')
        .setDescription('Deploy the Hex Corporation product purchase panel with custom dropdown options')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel where the product panel will be deployed')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Panel Title (Default: HEX CORPORATION TICKETS)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('banner-url')
            .setDescription('Direct URL to main GIF or banner image')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('banner-file')
            .setDescription('Upload GIF or image banner directly from device')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('thumbnail-url')
            .setDescription('Direct URL to top-right logo or GIF')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('thumbnail-file')
            .setDescription('Upload top-right logo directly from device')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('rules-note')
            .setDescription('Custom rules text (use \\n for new lines)')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('category')
            .setDescription('Category where new purchase tickets will be opened')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('support-role')
            .setDescription('Role that has access to view and manage tickets')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('log-channel')
            .setDescription('Channel where closed transcripts will be archived')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('support-panel')
        .setDescription('Deploy a general multi-department support panel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel where the support panel will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Custom Title for Support Desk')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('category')
            .setDescription('Category where ticket channels will be placed')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('support-role')
            .setDescription('Staff role for answering tickets')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('log-channel')
            .setDescription('Log channel for transcripts')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === 'product-panel') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'HEX CORPORATION TICKETS';
      const bannerUrl = interaction.options.getString('banner-url');
      const bannerFile = interaction.options.getAttachment('banner-file');
      const thumbUrl = interaction.options.getString('thumbnail-url');
      const thumbFile = interaction.options.getAttachment('thumbnail-file');
      const customRules = interaction.options.getString('rules-note');
      const category = interaction.options.getChannel('category');
      const supportRole = interaction.options.getRole('support-role');
      const logChannel = interaction.options.getChannel('log-channel');

      if (category) db.updateSetting(interaction.guild.id, 'ticket_category_id', category.id);
      if (supportRole) db.updateSetting(interaction.guild.id, 'ticket_support_role_id', supportRole.id);
      if (logChannel) db.updateSetting(interaction.guild.id, 'ticket_log_channel_id', logChannel.id);

      const defaultDescription =
        `PANELS LIST TAP TO VIEW AND BUY\n` +
        `NOTE:\n` +
        `• DON'T OPEN TICKETS WITHOUT REASON.\n` +
        `• ELSE YOU MIGHT FACE BAN\n` +
        `• BE RESPECTED WITH OWNERS\n` +
        `• 🛒`;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(customRules ? customRules.replace(/\\n/g, '\n') : defaultDescription)
        .setColor('#1E1F22'); // Clean dark Discord aesthetic

      const finalBanner = bannerFile ? bannerFile.url : bannerUrl;
      const finalThumb = thumbFile ? thumbFile.url : thumbUrl;

      if (finalBanner) embed.setImage(finalBanner);
      if (finalThumb) embed.setThumbnail(finalThumb);

      // Exact Select Menu from user's screenshot
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_product_select')
        .setPlaceholder('Click Here To Buy A Product...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Internal Ultimate Cheat')
            .setDescription('Advanced performance enhancement suite with optimized gameplay features and stability tools')
            .setValue('prod_ultimate')
            .setEmoji('💎'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Internal Basic Cheat')
            .setDescription('Basic gameplay enhancement pack with smooth performance and essential features')
            .setValue('prod_basic')
            .setEmoji('💎'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Bypass Emulator')
            .setDescription('Bypass Emulator Detection makes games see emulator as a Mobile Device.')
            .setValue('prod_emulator')
            .setEmoji('💎'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Android & Ios Cheats')
            .setDescription('Safe Cheats For Mobile Users')
            .setValue('prod_mobile')
            .setEmoji('💎'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Help & Support')
            .setDescription('Get help with any issue.')
            .setValue('prod_support')
            .setEmoji('🛠️')
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await channel.send({
        embeds: [embed],
        components: [row]
      });

      return interaction.editReply({
        embeds: [
          embeds.success(`Product Purchase Panel successfully deployed to ${channel}!`)
        ]
      });
    }

    if (sub === 'support-panel') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || `${interaction.guild.name} • Support Desk`;
      const category = interaction.options.getChannel('category');
      const supportRole = interaction.options.getRole('support-role');
      const logChannel = interaction.options.getChannel('log-channel');

      if (category) db.updateSetting(interaction.guild.id, 'ticket_category_id', category.id);
      if (supportRole) db.updateSetting(interaction.guild.id, 'ticket_support_role_id', supportRole.id);
      if (logChannel) db.updateSetting(interaction.guild.id, 'ticket_log_channel_id', logChannel.id);

      const panelEmbed = new EmbedBuilder()
        .setTitle(`🎫 ${title}`)
        .setDescription(
          `Welcome to our official support portal! If you need assistance, wish to report a user, or have billing inquiries, our staff team is ready to help.\n\n` +
          `### 📌 Available Support Departments:\n` +
          `• 🛠️ **General Support:** Questions, guidance, and server inquiries\n` +
          `• 🚨 **User Report:** Report rule breakers, harassers, or scammers\n` +
          `• 💼 **Billing & Store:** Payment, roles, or store purchase issues\n` +
          `• 🐛 **Bug & Technical:** Glitches, bot errors, or server bugs\n` +
          `• 🤝 **Partnership:** Sponsorships and server collaborations\n\n` +
          `**To open a ticket:** Select your department from the dropdown menu below!`
        )
        .setColor(config.embedColor)
        .setFooter({ text: `${interaction.guild.name} • Support System` })
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_department_select')
        .setPlaceholder('📂 Choose a Support Department...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('General Support')
            .setDescription('Questions, guidance, and server inquiries')
            .setValue('dept_general')
            .setEmoji('🛠️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Report a Member / Scammer')
            .setDescription('Report rule breakers or scammers with proof')
            .setValue('dept_report')
            .setEmoji('🚨'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Billing & Store Inquiries')
            .setDescription('Payment, roles, or purchase inquiries')
            .setValue('dept_billing')
            .setEmoji('💼'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Bug & Technical Issues')
            .setDescription('Report server glitches or technical issues')
            .setValue('dept_bug')
            .setEmoji('🐛'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Partnership & Collaborations')
            .setDescription('Inquire about partnering with our server')
            .setValue('dept_partner')
            .setEmoji('🤝')
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await channel.send({
        embeds: [panelEmbed],
        components: [row]
      });

      return interaction.editReply({
        embeds: [embeds.success(`Support Panel deployed to ${channel}!`)],
      });
    }
  }
};

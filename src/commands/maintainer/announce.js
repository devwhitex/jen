const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Publish high-impact, professional announcement posts with direct image uploads and buttons')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('feature-post')
        .setDescription('Create a structured product/feature showcase post matching the Legend Wire style')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to post the announcement')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Title (e.g. LEGEND WIRE — FULL FEATURES & LATEST UPDATE)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('features')
            .setDescription('List of features (separate each feature with \\n or comma)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('subtitle')
            .setDescription('Subtitle badge (e.g. 100% WEBSITE-BASED SYSTEM)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('platforms')
            .setDescription('Platforms supported (e.g. Android, iOS)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('game-support')
            .setDescription('Games supported (e.g. Free Fire, Free Fire MAX, All Servers Supported)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('why-choose-us')
            .setDescription('Why choose us points (separated by \\n or comma)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('disclaimer')
            .setDescription('Footer disclaimer notice (e.g. Feature availability may vary)')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('banner-file')
            .setDescription('Attach showcase screenshot or banner image')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('ping')
            .setDescription('Audience ping')
            .addChoices(
              { name: 'None', value: 'none' },
              { name: '@everyone', value: 'everyone' },
              { name: '@here', value: 'here' }
            )
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('style')
            .setDescription('Post format style')
            .addChoices(
              { name: 'Native Clean Text (Exact screenshot style)', value: 'native' },
              { name: 'Rich Embed Card', value: 'embed' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('post')
        .setDescription('Create a customized announcement post')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to post the announcement')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Announcement title')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Body content (supports markdown and \\n for new lines)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Design theme / header badge')
            .addChoices(
              { name: '📢 Official Announcement', value: '📢 Official Announcement' },
              { name: '🚀 Server Update / Changelog', value: '🚀 Server Update' },
              { name: '🎁 Community Event / Giveaway', value: '🎁 Event Announcement' },
              { name: '⚠️ Maintenance / Downtime Alert', value: '⚠️ Maintenance Alert' },
              { name: '📜 Rules & Server Info', value: '📜 Server Information' }
            )
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('image-file')
            .setDescription('Upload a direct image/banner from your device')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('image-url')
            .setDescription('Web link to banner image (if not uploading directly)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('ping')
            .setDescription('Audience ping')
            .addChoices(
              { name: 'None', value: 'none' },
              { name: '@everyone', value: 'everyone' },
              { name: '@here', value: 'here' }
            )
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('ping-role')
            .setDescription('Specific role to ping')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('button-label')
            .setDescription('Label for an interactive link button (e.g. Website, Discord Link)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('button-url')
            .setDescription('Destination URL for the link button (must start with https://)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('changelog')
        .setDescription('Create a structured version release or patch notes changelog')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to post changelog')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('version')
            .setDescription('Release version (e.g. v2.1.0 or Update #5)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('new-features')
            .setDescription('List of newly added features')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('improvements')
            .setDescription('Performance improvements and tweaks')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('bug-fixes')
            .setDescription('Bugs resolved in this patch')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('banner')
            .setDescription('Optional update showcase banner')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'feature-post') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const subtitle = interaction.options.getString('subtitle') || '100% WEBSITE-BASED SYSTEM';
      const featuresRaw = interaction.options.getString('features');
      const platformsRaw = interaction.options.getString('platforms') || 'Android, iOS';
      const gamesRaw = interaction.options.getString('game-support') || 'Free Fire, Free Fire MAX, All Servers Supported';
      const whyUsRaw = interaction.options.getString('why-choose-us') || 'Fully Website-Based Control, No APK Files Required, Easy Access & Simple Setup, Online Updates, Multi-Platform Support';
      const disclaimer = interaction.options.getString('disclaimer') || 'Feature availability and compatibility may vary by device and game version.';
      const bannerFile = interaction.options.getAttachment('banner-file');
      const pingType = interaction.options.getString('ping') || 'none';
      const style = interaction.options.getString('style') || 'native';

      // Parse bullet points
      const parseList = (str) => {
        if (!str) return [];
        if (str.includes('\n')) return str.split('\n').map(s => s.trim()).filter(Boolean);
        if (str.includes('\\n')) return str.split('\\n').map(s => s.trim()).filter(Boolean);
        return str.split(',').map(s => s.trim()).filter(Boolean);
      };

      const featuresList = parseList(featuresRaw);
      const platformsList = parseList(platformsRaw);
      const gamesList = parseList(gamesRaw);
      const whyUsList = parseList(whyUsRaw);

      let pingHeader = '';
      if (pingType === 'everyone') pingHeader = '@everyone\n';
      else if (pingType === 'here') pingHeader = '@here\n';

      const divider = '───────────────────────────';

      if (style === 'native') {
        // Native Clean Text Format (Matches exact screenshot layout)
        let content = `${pingHeader}` +
          `🦁 **${title.toUpperCase()}** 👑\n\n` +
          `🔮 **${subtitle.toUpperCase()}**\n\n` +
          `${divider}\n\n` +
          `❤️ **FEATURES**\n\n` +
          featuresList.map(f => `🗳️ ${f}`).join('\n') + `\n\n` +
          `${divider}\n\n` +
          `📱 **PLATFORM SUPPORT**\n\n` +
          platformsList.map(p => `🛡️ ${p}`).join('\n') + `\n\n` +
          `>> **GAME SUPPORT**\n\n` +
          gamesList.map(g => `🗳️ ${g}`).join('\n') + `\n\n` +
          `${divider}\n\n` +
          `👑 **WHY CHOOSE THIS?**\n\n` +
          whyUsList.map(w => `🪽 ${w}`).join('\n') + `\n\n` +
          `${divider}\n\n` +
          `🦁 **${title.toUpperCase()}!**\n\n` +
          `⚠️ *${disclaimer}*`;

        const sendOptions = { content };
        if (bannerFile) {
          sendOptions.files = [bannerFile];
        }

        await channel.send(sendOptions);

        return interaction.reply({
          embeds: [embeds.success(`Feature showcase announcement published to ${channel}!`)],
          ephemeral: true
        });
      } else {
        // Rich Embed Box Style
        const embed = new EmbedBuilder()
          .setTitle(`🦁 ${title} 👑`)
          .setDescription(`🔮 **${subtitle}**\n\n${divider}`)
          .setColor('#ED4245')
          .addFields(
            {
              name: '❤️ FEATURES',
              value: featuresList.map(f => `🗳️ ${f}`).join('\n'),
              inline: false
            },
            {
              name: '📱 PLATFORM SUPPORT',
              value: platformsList.map(p => `🛡️ ${p}`).join('\n'),
              inline: true
            },
            {
              name: '🎮 GAME SUPPORT',
              value: gamesList.map(g => `🗳️ ${g}`).join('\n'),
              inline: true
            },
            {
              name: '👑 WHY CHOOSE THIS?',
              value: whyUsList.map(w => `🪽 ${w}`).join('\n'),
              inline: false
            }
          )
          .setFooter({ text: disclaimer })
          .setTimestamp();

        if (bannerFile) {
          embed.setImage(bannerFile.url);
        }

        await channel.send({
          content: pingHeader.trim() || undefined,
          embeds: [embed]
        });

        return interaction.reply({
          embeds: [embeds.success(`Feature showcase embed published to ${channel}!`)],
          ephemeral: true
        });
      }
    }

    if (sub === 'post') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const message = interaction.options.getString('message');
      const category = interaction.options.getString('category') || '📢 Official Announcement';
      const imageFile = interaction.options.getAttachment('image-file');
      const imageUrl = interaction.options.getString('image-url');
      const pingType = interaction.options.getString('ping') || 'none';
      const pingRole = interaction.options.getRole('ping-role');
      const buttonLabel = interaction.options.getString('button-label');
      const buttonUrl = interaction.options.getString('button-url');

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.guild.name} • ${category}`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTitle(title)
        .setDescription(message.replace(/\\n/g, '\n'))
        .setColor(config.embedColor)
        .setFooter({
          text: `Published by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      const finalImage = imageFile ? imageFile.url : imageUrl;
      if (finalImage) {
        embed.setImage(finalImage);
      }

      let components = [];
      if (buttonLabel && buttonUrl && buttonUrl.startsWith('http')) {
        const linkBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Link)
            .setURL(buttonUrl)
        );
        components.push(linkBtn);
      }

      let pingText = '';
      if (pingType === 'everyone') pingText = '@everyone';
      else if (pingType === 'here') pingText = '@here';
      if (pingRole) pingText = `${pingText} ${pingRole}`.trim();

      await channel.send({
        content: pingText || undefined,
        embeds: [embed],
        components
      });

      return interaction.reply({
        embeds: [embeds.success(`Announcement successfully published to ${channel}!`)],
        ephemeral: true
      });
    }

    if (sub === 'changelog') {
      const channel = interaction.options.getChannel('channel');
      const version = interaction.options.getString('version');
      const newFeatures = interaction.options.getString('new-features');
      const improvements = interaction.options.getString('improvements');
      const bugFixes = interaction.options.getString('bug-fixes');
      const banner = interaction.options.getAttachment('banner');

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.guild.name} • Patch Notes`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTitle(`🚀 Server Update: ${version}`)
        .setColor('#57F287')
        .addFields({
          name: '✨ What\'s New',
          value: newFeatures.replace(/\\n/g, '\n'),
          inline: false
        });

      if (improvements) {
        embed.addFields({
          name: '⚡ Improvements & Changes',
          value: improvements.replace(/\\n/g, '\n'),
          inline: false
        });
      }

      if (bugFixes) {
        embed.addFields({
          name: '🛠️ Bug Fixes',
          value: bugFixes.replace(/\\n/g, '\n'),
          inline: false
        });
      }

      if (banner) {
        embed.setImage(banner.url);
      }

      embed.setFooter({ text: `Update deployed by ${interaction.user.tag}` }).setTimestamp();

      await channel.send({ embeds: [embed] });

      return interaction.reply({
        embeds: [embeds.success(`Changelog for **${version}** published to ${channel}!`)],
        ephemeral: true
      });
    }
  }
};

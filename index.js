const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const express = require('express');
const ms = require('ms');
const app = express();

// 🌐 تشغيل دائم على Render
app.get('/', (req, res) => res.send('Bot is Alive!'));
app.listen(3000, () => console.log('🌍 Web server running'));

// 🧠 قراءة المتغيرات البيئية
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 🤖 إنشاء البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const BAD_WORDS = ['قذر', 'وسخ', 'كلب', 'حمار', 'ابن الكلب'];
const VIOLATION_LIMIT = 3;
const TIMEOUT_DURATION = 1000 * 60 * 60 * 24 * 2;
const userViolations = new Map();

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// 📛 فلتر السب
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.toLowerCase();
    const member = message.member;
    const userId = member.id;

    if (!BAD_WORDS.some(word => content.includes(word))) return;

    try {
        await message.delete();
        await message.channel.send(`⚠️ ${member.user.username}، كلامك مخالف.`);

        const strikes = userViolations.get(userId) || 0;
        const newCount = strikes + 1;
        userViolations.set(userId, newCount);

        if (newCount >= VIOLATION_LIMIT) {
            await member.timeout(TIMEOUT_DURATION, 'تكرار السب');
            await message.channel.send(`🚫 ${member.user.tag} أخذ تايم آوت يومين.`);
            userViolations.set(userId, 0);
        }
    } catch (err) {
        console.error('❌ خطأ:', err);
    }
});

// 🛠️ أوامر سلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;
    const target = interaction.options.getMember('العضو');

    if (command === 'هوية') {
        const avatar = interaction.user.displayAvatarURL({ extension: 'png' });
        const id = interaction.user.id;
        const name = interaction.user.username;
        const created = interaction.user.createdAt.toDateString();

        const buffer = Buffer.from(`
👤 الاسم: ${name}
🆔 ID: ${id}
📅 انشئ: ${created}
        `);
        const file = new AttachmentBuilder(buffer, { name: 'هوية.txt' });
        await interaction.reply({ content: `🪪 بطاقة هوية ${name}`, files: [file] });
    }

    if (command === 'طرد' && target) {
        await target.kick();
        await interaction.reply(`✅ تم طرد ${target.user.tag}`);
    }

    if (command === 'باند' && target) {
        await target.ban();
        await interaction.reply(`✅ تم حظر ${target.user.tag}`);
    }

    if (command === 'كتم' && target) {
        const time = interaction.options.getString('المدة');
        const duration = ms(time);
        if (!duration) return interaction.reply('❌ مدة غير صحيحة');
        await target.timeout(duration);
        await interaction.reply(`🔇 تم كتم ${target.user.tag} لمدة ${time}`);
    }

    if (command === 'فك_كتم' && target) {
        await target.timeout(null);
        await interaction.reply(`🔊 تم فك الكتم عن ${target.user.tag}`);
    }
});

// تسجيل الأوامر
const commands = [
    new SlashCommandBuilder()
        .setName('هوية')
        .setDescription('🪪 عرض بطاقة الهوية'),

    new SlashCommandBuilder()
        .setName('طرد')
        .setDescription('🚪 طرد عضو')
        .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('باند')
        .setDescription('⛔ حظر عضو')
        .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('كتم')
        .setDescription('🔇 كتم عضو')
        .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو').setRequired(true))
        .addStringOption(opt => opt.setName('المدة').setDescription('مثال: 1h أو 2d').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

    new SlashCommandBuilder()
        .setName('فك_كتم')
        .setDescription('🔊 فك كتم')
        .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        console.log('📡 تسجيل الأوامر...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ تم تسجيل الأوامر!');
    } catch (error) {
        console.error(error);
    }
})();

client.login(TOKEN);

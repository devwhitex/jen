# 🌐 How to Host Your Discord Bot 24/7 for 100% FREE

Your bot now comes equipped with an **automatic 24/7 Keep-Alive HTTP health server** (`src/server.js`) listening on `process.env.PORT || 3000` and pre-configured deployment files (`discloud.config`, `Procfile`).

Here are the **top 3 easiest and 100% free ways** to keep your bot online 24/7 without keeping your computer on.

---

## 🏆 Method 1: Render.com + UptimeRobot (Recommended • Most Popular)

> **Cost:** 100% Free  
> **Credit Card Needed:** No  
> **Uptime:** 24/7 uninterrupted  

### Step 1: Upload your bot code to GitHub
1. Create a free account at [github.com](https://github.com).
2. Create a new repository (set it to **Private** so your tokens remain safe).
3. Push your bot folder to GitHub. *(Make sure `.env` is NOT uploaded; keep your tokens private).*

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and create a free account (Sign in with GitHub).
2. Click **New +** > **Web Service**.
3. Select your bot's GitHub repository.
4. Fill in the deployment details:
   - **Name:** `my-discord-bot`
   - **Language / Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and add:
   - `DISCORD_TOKEN` = *(Your bot token)*
   - `CLIENT_ID` = `1562740863631622174`
   - `GUILD_ID` = *(Optional, leave empty for global)*
6. Click **Deploy Web Service**.
7. Render will build and launch your bot! Copy the URL provided by Render (e.g. `https://my-discord-bot.onrender.com`).

### Step 3: Keep it awake 24/7 with UptimeRobot
Render's free tier sleeps if there is no web traffic. We use a free pinger to prevent it from ever sleeping:
1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up for a free account.
2. Click **+ Add New Monitor**.
3. Set:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Discord Bot`
   - **URL (or IP):** `https://my-discord-bot.onrender.com/health` *(Replace with your Render URL)*
   - **Monitoring Interval:** `5 minutes`
4. Click **Create Monitor**.
5. **Done!** UptimeRobot will ping your bot every 5 minutes. Your bot will remain online 24/7 for free!

---

## 🚀 Method 2: Discloud (Made Specifically for Discord Bots)

> **Cost:** 100% Free  
> **Credit Card Needed:** No  
> **Pinger Needed:** No (Discloud runs Discord bots natively)  

We have already included the required [`discloud.config`](file:///c:/Users/man/Desktop/server%20maintainer%20bot/discloud.config) in your project!

### Steps:
1. Go to [discloud.com](https://discloud.com) and log in with your Discord account.
2. Select your project files and compress them into a `.zip` archive:
   - Include: `index.js`, `package.json`, `discloud.config`, `.env`, and the `src` folder.
   - **Do NOT** include the `node_modules` folder (Discloud installs dependencies automatically).
3. On the Discloud dashboard, click **Add App** (or use their Discord bot in the Discloud Discord server with `.upload`).
4. Upload your `.zip` file.
5. Discloud will start your bot, and it will run 24/7 for free!

---

## ⚡ Method 3: Koyeb (Fast Free Eco Tier)

> **Cost:** 100% Free  
> **Credit Card Needed:** No  

1. Create a free account at [koyeb.com](https://www.koyeb.com).
2. Click **Create Service** > **GitHub** and select your bot repo.
3. Select **Node.js** as the runtime.
4. Set the run command to `node index.js`.
5. Add your environment variables: `DISCORD_TOKEN`, `CLIENT_ID`.
6. Click **Deploy**. Koyeb will run your bot continuously on their free Eco instance.

---

## 💻 Method 4: Run 24/7 Locally on Your PC (Without Any Open Windows)

If you have a PC or laptop that you leave turned on, you can make the bot run silently in the background using **PM2** so it never crashes and restarts automatically on computer startup:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start the bot under PM2 supervision
pm2 start index.js --name "server-bot"

# 3. Check status
pm2 status

# 4. View live logs
pm2 logs
```

To stop or restart:
```bash
pm2 restart server-bot
pm2 stop server-bot
```

# 🚀 Step-by-Step Guide: Host Your Discord Bot on GitHub & Render (100% Free & 24/7)

This guide walks you through pushing your bot code to **GitHub** and deploying it on **Render** (render.com) so it stays online **24/7 for free** with its **Web Control Dashboard** accessible from any phone or PC browser.

---

## 📋 Table of Contents
1. [Prerequisites & Repository Status](#1-prerequisites--repository-status)
2. [Step 1: Push Code to GitHub](#step-1-push-code-to-github)
3. [Step 2: Deploy on Render (Free Web Service)](#step-2-deploy-on-render-free-web-service)
4. [Step 3: Keep Bot Online 24/7 Without Sleeping (UptimeRobot)](#step-3-keep-bot-online-247-without-sleeping-uptimerobot)
5. [Step 4: Access Your Public Web Dashboard](#step-4-access-your-public-web-dashboard)

---

## 1. Prerequisites & Repository Status

Your local Git repository is **already initialized** with branch `main` and all 87 source files committed cleanly.
* Sensitive `.env` and SQLite database files are **automatically excluded via `.gitignore`** to ensure your bot token remains 100% safe and private.
* A `render.yaml` blueprint has been generated for automated cloud detection.

---

## Step 1: Push Code to GitHub

### Option A: Using GitHub Website & Command Line (Fastest)

1. Go to [https://github.com/new](https://github.com/new) and log in.
2. Enter a repository name, for example: `discord-server-maintainer-bot`.
3. Choose **Private** (recommended) or **Public**.
4. **Important**: Leave "Add a README file", ".gitignore template", and "license" **UNCHECKED** (we already created them locally).
5. Click **Create repository**.
6. Copy the two commands under **"…or push an existing repository from the command line"** and run them in your terminal (or run these in your project folder):

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/discord-server-maintainer-bot.git
git push -u origin main
```
*(Replace `YOUR_GITHUB_USERNAME` and `discord-server-maintainer-bot` with your actual GitHub username and repository name).*

---

### Option B: Using GitHub Desktop (Graphical)
1. Open **GitHub Desktop**.
2. Click **File** > **Add Local Repository...**
3. Browse and select your bot folder:
   `C:\Users\man\Desktop\server maintainer bot`
4. Click **Publish repository** to upload it to your GitHub account.

---

## Step 2: Deploy on Render (Free Web Service)

1. Open [https://dashboard.render.com](https://dashboard.render.com) and create a free account (or log in with GitHub).
2. Click the **New +** button in the top right and select **Web Service**.
3. Under **Connect a repository**, find your `discord-server-maintainer-bot` repository and click **Connect**.
4. Fill in the deployment settings:

| Setting | Value to Enter |
| :--- | :--- |
| **Name** | `server-maintainer-bot` *(or any name you like)* |
| **Region** | Choose closest to you (e.g. `Oregon (US West)` or `Frankfurt (EU)`) |
| **Branch** | `main` |
| **Root Directory** | Leave blank |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` ($0/month) |

5. Scroll down to the **Environment Variables** section and click **Add Environment Variable** for each of the following:

| Key | Value |
| :--- | :--- |
| `DISCORD_TOKEN` | `your_bot_token_from_discord_developer_portal` |
| `CLIENT_ID` | `1562740863631622174` |
| `DASHBOARD_PASSCODE` | `admin123` *(or your custom password)* |
| `EMBED_COLOR` | `#5865F2` |
| `DEFAULT_PREFIX` | `!` |
| `NODE_VERSION` | `20` |

> ℹ️ **Note**: Render automatically provides and manages `PORT`. The bot will bind its Keep-Alive HTTP web server to Render's port automatically!

6. Click **Create Web Service**.
7. Render will now download the code, install dependencies (`npm install`), and launch your bot (`npm start`).
8. In the Render deployment logs, you will see:
   ```
   🌐 Web Control Dashboard running at http://localhost:10000
   ==============================================
   🚀 Logged in as: Jen#4058
   🌐 Serving 1 guilds and 1 users
   ⚙️ Loaded 54 application commands
   ==============================================
   ```

---

## Step 3: Keep Bot Online 24/7 Without Sleeping (UptimeRobot)

Render's Free Web Services enter sleep mode after 15 minutes if they receive no web requests. To prevent this and keep your bot online **100% 24/7 for free**, set up an automated ping:

1. Copy your public Render URL from the top of your Render service page:
   (e.g., `https://server-maintainer-bot.onrender.com`)
2. Go to [https://uptimerobot.com](https://uptimerobot.com) and sign up for a free account.
3. Click **Add New Monitor**:
   * **Monitor Type**: `HTTP(s)`
   * **Friendly Name**: `Discord Bot Keep-Alive`
   * **URL (or IP)**: Paste your Render URL (e.g., `https://server-maintainer-bot.onrender.com/`)
   * **Monitoring Interval**: `5 minutes`
4. Click **Create Monitor**.

🎉 **That's it!** UptimeRobot will ping your bot's web server every 5 minutes, ensuring Render never sleeps and your bot stays active 24/7.

---

## Step 4: Access Your Public Web Dashboard

Your bot now has a live, cloud-hosted Web Control Dashboard!
1. Open your Render URL in your web browser:
   `https://server-maintainer-bot.onrender.com`
2. Enter your passcode: `admin123`
3. You can now remotely manage your Discord bot from anywhere:
   * **Anti-Nuke Defender**: Live status, thresholds, and raid logs.
   * **24/7 Voice Stay**: Lock bot into voice channels remotely with 1 click.
   * **Voice Welcome & Goodbye**: Customize VC join/leave alerts and TTS greetings.
   * **Ticket Desk**: Live ticket queue with priority controls and lock/close actions.
   * **Announcement Studio**: Live Discord embed preview with device banner attachments.
   * **Auto-Replies**: Add or delete triggers.
   * **Chat Cleaner**: Bulk purge messages, slowmode, and channel lockdown.

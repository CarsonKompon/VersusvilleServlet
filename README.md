# VersusvilleServlet
A reverse engineered version of the servlet used for Kenny vs Spenny Versusville. This is meant to be used with the [Versusville 202X Patch](https://github.com/carsonkompon/versusville202xpatch). For more information, join the [Kenny Hotz Official Discord](https://discord.gg/7cSJM2xbq7).

It's worth noting that this is a Versusville ***SERVLET*** and NOT a Versusville ***SERVER***. This is merely a database that holds profiles, highscores, and times. It's not required to play the game, and it's not required to connect to servers, but it's used to change your username in game and save/share highscores and view them at [versusville.com](https://versusville.com/scores_new.html)


## Getting Started
It's been a while since I made this so hopefully these instructions are accurate. If not try reaching out to me in the [Kenny Hotz Official Discord](https://discord.gg/7cSJM2xbq7).

**A list of pre-requisites:**
- Install [Node](https://nodejs.org/en/download/) (If using a hosting service such as DigitalOcean this should be setup automatically)
- [certbot](https://certbot.eff.org/) to get a proper HTTPS certificate for your server
- OPTIONAL: [pm2](https://www.npmjs.com/package/pm2) for additional tools to help keep your servlet running 24/7 without issue
I won't explain how to use all of the pre-requisites as you'll have to either already know how to use them or have to research them yourself :)

Once you've cloned the repository, create a new file in the root folder called `.env` which is essentially a text file that will hold your Environment Variables and look something like this:
```
DISCORD_WEBHOOK=<value>
CERT_DIRECTORY=<value>
```
*(If your hosting service has "Environment Variables" in the settings, you can typically enter the values there instead of creating this file)*

First, you'll need to create a [Discord Webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) and set the `DISCORD_WEBHOOK` Environment Variable to the url that it provides you. This webhook will send a message whenever someone gets a new high score or new best time.

Once you've done that, set the `CERT_DIRECTORY` Environment Variable to the directory that contains the following files:
```
privkey.pem
cert.pem
chain.pem
```

The directory should NOT end with a `/`. Here's an example: `/etc/letsencrypt/live/servlet.versusville.com"`

## Hosting the Servlet + Getting Connected

Once you've set everything up, you can start the server with `npm run start`. If you see the following, then you're ready for users to start connecting to the servlet:

```
Started http on PORT 3000
Started https on PORT 3001
```

Now, for clients connecting to the servlet, go in the game files (typically located in `C:\Program Files (x86)\DC Studios\Kenny vs Spenny - Versusville`) and navigate to `media\prod\kvs\scripts\generic\world\` and edit `url.txt` so that its contents look something like this:
```
#The location of the servlet
URL=http://<YOUR_IP_HERE>:3000/servlet
#http://www.cbc.ca/kvs/servlet/KvsServlet
# end of file
```

Then you should be good to set your username and submit highscores to your custom servlet :)




## I'm still having trouble

If you're specifically having trouble with the Environment Variables, you can edit the `index.js` file and hard-code each value as strings. Replace `process.env.DISCORD_WEBHOOK` with `"https://my-webhook-url-here.com/"` and `process.env.CERT_DIRECTORY` with `/etc/my/directory/here`

If you're having any other troubles. File a github issue and I'll get back to you!
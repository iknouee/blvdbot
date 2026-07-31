# Beloved (blvdbot)

A feature-rich Discord bot with economy, casino games, social features, moderation, and multiplayer tournaments.

## Features

### Fun & Social
- `/love`, `/roast`, `/compliment` - Express yourself at others
- `/ship` - Ship two people with a compatibility score
- `/vibe`, `/fortune`, `/mood` - Random fun outputs
- `/ask`, `/8ball` - Ask the bot questions
- `/rate` - Rate someone's coolness, chaos, and Beloved approval
- `/tweet` - Generate a fake tweet from any user
- `/cancel` - Cancel someone for ridiculous reasons
- `/wheel` - Randomly select a server member
- `/beef` - Start an interactive argument with the bot

### Economy
- `/balance` - Check wallet and bank balance
- `/daily` - Claim daily coins (24h cooldown)
- `/work` - Work a questionable job (30min cooldown)
- `/beg` - Beg for spare change (10min cooldown)
- `/pay` - Send coins to another user
- `/coinleaderboard` - Server rich list

### Casino
- `/slots` - Animated slot machine with weighted symbols
- `/coinflip` - Bet on heads or tails
- `/roulette` - Bet on red, black, or green (animated)
- `/blackjack` - Interactive blackjack with hit/stand/double

### Marriage System
- `/marry` - Propose to another user
- `/divorce` - End your marriage
- `/married` - View marriage stats
- `/kiss`, `/hug`, `/date` - Interact with your spouse
- `/gift` - Buy gifts (costs coins)
- `/ring buy` - Buy/upgrade marriage ring

### Multiplayer Games
- `/smashorpass` - Start a smash or pass vote
- `/court` - Put someone on trial, server votes guilty/not guilty
- `/fight` - Turn-based button battle with HP
- `/redlight` - Red Light, Green Light elimination race
- `/countrygame` - Guess the Country flag tournament

### Moderation
- `/blacklist add/remove/list/clear` - Auto-delete messages with banned words
- `/conflict` - Configure the Conflict Guard system (auto-detects arguments)
- `/say` - Make the bot send a message

## Setup

### Prerequisites
- Node.js 18+ 
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
git clone https://github.com/iknouee/blvdbot.git
cd blvdbot
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your application's client ID
- `GUILD_ID` - Server ID for instant command deployment (dev mode)
- `CLIPPING_CHANNEL_ID` - Channel for the "Clip this" context menu feature (optional)
- `PORT` - Web server port (default: 3000)
- `LOG_LEVEL` - Logging verbosity: DEBUG, INFO, WARN, ERROR (default: INFO)

### Deploy Commands

```bash
# Deploy to a specific server (instant, for development)
npm run deploy

# Deploy globally (takes up to 1 hour)
npm run deploy:global
```

### Start the Bot

```bash
npm start
```

## Project Structure

```
src/
├── index.js                 # Entry point, client setup, event loading
├── deploy-commands.js       # Command deployment script
├── commands/
│   ├── fun/                 # Entertainment commands
│   ├── economy/             # Currency system commands
│   ├── games/               # Casino & multiplayer game commands
│   └── moderation/          # Admin/mod commands
├── events/
│   ├── ready.js             # Bot ready event
│   ├── messageCreate.js     # Message handling (blacklist, beef, conflict)
│   ├── interactionCreate.js # Slash command & button routing
│   └── reactionAdd.js       # Country game join via reaction
├── systems/
│   ├── economy.js           # Economy locks & helpers
│   ├── blacklist.js         # Word filtering
│   ├── conflictGuard.js     # Hostility detection & auto-moderation
│   ├── marriage.js          # Marriage system wrapper
│   └── beef.js              # Beef argument session manager
├── utils/
│   ├── database.js          # SQLite database layer
│   ├── commandHandler.js    # Dynamic command loader
│   ├── embeds.js            # Embed builders
│   ├── helpers.js           # Common utilities & cooldown manager
│   └── logger.js            # Structured logging
└── data/
    └── countries.json       # Country quiz question data
```

## Technical Details

- **Database**: SQLite via `better-sqlite3` with WAL mode for performance
- **Command Handler**: Dynamic file-based loading with category detection
- **Error Handling**: Global error handlers with structured logging
- **Cooldowns**: Built-in cooldown manager with automatic cleanup
- **Economy Locks**: Prevents race conditions in casino operations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

# StoneEye
[![CI](https://github.com/Oridevformeridian/StoneEye/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Oridevformeridian/StoneEye/actions/workflows/ci.yml)
[![Lint](https://github.com/Oridevformeridian/StoneEye/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Oridevformeridian/StoneEye/actions/workflows/lint.yml)

Project Gorgon Character Insights and Data Explorer

## Live Demo

https://storage.googleapis.com/pgdata1/index.html *(custom domain coming soon)*

## Features

- **Character Management**: Import and view character data (inventory, skills, quests, currencies)
- **NPC & Vendor Tracking**: Track favor levels, vendor balances, restock timers, and storage vaults
- **Wiki Integration**: Quick links to Project Gorgon Wiki for items, abilities, and NPCs
- **Data Import**: Import game data (items, recipes, NPCs, abilities, etc.) and character JSON exports

## NPC/Vendor Log Import (Experimental)

The vendor tracking feature supports importing player logs to track real-time vendor data. This is currently experimental with some important caveats:

### How It Works

1. **Enable Logging**: Turn on logging in Project Gorgon (in the settings window under VIP)
2. **Visit All Vendors**: On the character you want to track, visit each vendor and open their shop tab
3. **Import Logs**: Without logging in on another character (which would overwrite the logs), go to the NPCs tab in StoneEye and click "Upload Logs"
4. **View Vendor Data**: The app displays:
   - Current favor level with each NPC
   - Vendor balance / max balance
   - Restock timer (countdown + local time)
   - Storage vault usage (if applicable)

### Important Notes

- You must visit each vendor on the specific character you want to track
- Opening a vendor screen on a different character will overwrite the log data
- The app uses the **last recorded interaction** with each vendor
- Favor levels range from Despised (-600) to Soul Mates (3000+)
- Restock timers show both countdown and local date/time

### Why Logs?

This is a proof-of-concept for the UX. Ideally, vendor data would come from the game's API or a better export mechanism, but for now, log parsing allows us to demonstrate the feature's value.



# castle-carnage-cards
A script that generates a nanDECK script to generate cards for Castle Carnage.

# Dungeon Cards
## Prerequisites
* Node >5
* nanDECK ~1.21.3

## Running
* `npm install lodash google-spreadsheet`
* `CastleCarnageService.json` - a service worker email
* Add the service worker email to the google spreadsheet
* `node getsheet`
* Open `cc-gen.txt` in nanDECK
* Validate+Build & export to desired format

# Dungeon Tiles
## Prerequisites
* nanDECK ~1.21.3

## Running
* Open `cc-tiles.txt` in nanDECK
* Validate+Build & export to desired format

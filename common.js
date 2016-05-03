
var _ = require('lodash');

var COLORS = {
    DM:         '#000000',
    Cleric:     '#008080',
    Mage:       '#000099',
    Ranger:     '#AA7243',
    Thief:      '#003C00',
    Warrior:    '#990000',
    Merchant:   '#000000', //TODO
    Alchemist:  '#000000', //TODO
    Monk:       '#000000', //TODO
    Item:       '#CC8400',
    Relic:      '#49311C',
    Trap:       '#49311C'
};

/* // used for sending to TheGameCrafter
var SIZES = {
    WIDTH: 6.35,
    HEIGHT: 8.89
};
*/

var DOWNLOAD = (image) => `http://seiyria.com/gameicons-font/png/${image}.png`;
var DOWNLOAD_PATH = (image) => `./png/${image}.png`

var SIZES = {
    WIDTH: 6.4,
    HEIGHT: 9.0 //should be 8.7, but eh - 9.0 fits better in sleeves (and doesn't cut off)
};

var PROCESS_SHEETS = ['DM', 'Cleric', 'Mage', 'Thief', 'Warrior',/*'Ranger', 'Merchant', 'Monk', 'Alchemist', */ 'Item', 'Relic', 'Trap'];

var outputtedCode = `
PAGE=21.6, 29.7, "PORTRAIT", HV
DPI=300
CARDSIZE=${SIZES.WIDTH}, ${SIZES.HEIGHT}
MARGINS=0.45, 0.45, 0.45, 0.45
GAP=0, 0
BORDER=rectangle,#000000,0.1,MARK

[CardFont] = "Arial"
[CardFlags] = TNF

[TitleFont] = [CardFont], 12.5, [CardFlags], #000000
[TextFont] = [CardFont], 6, [CardFlags], #000000
[SubtitleFont] = [CardFont], 10, [CardFlags], #000000
[SubtextFont] = [CardFont], 6, [CardFlags], #000000
[SubsubtextFont] = [CardFont], 6, [CardFlags], #000000
[ValueFont] = [CardFont], 8, [CardFlags], #ffffff
htmlfont=description, Arial, 8, , #000000
`;

var addLine = (outputtedCode, line) => {
    return `${outputtedCode}${line}\n`;
};

var processRow = (title, rowData, metadata) => {
    var cards = [];
    if(!rowData.quantity) return cards;
    for(var i = 0; i < rowData.quantity; i++) {
        cards.push({
            cardClass: title,
            name: rowData.name,
            subtitle: rowData.subtitle,
            primaryImage: rowData.primaryimage,
            secondaryImage: rowData.secondaryimage,
            value: rowData.value,
            trigger: rowData.trigger,
            target: rowData.target,
            text: rowData.text,
            subtext: rowData.subtext,
            revision: metadata.revision
        });
    }
    return cards;
};

var processData = (sheet, metadata) => {
    return new Promise((resolve, reject) => {
        sheet.getRows({
            offset: 1
        }, (e, rows) => {
            if(e) reject(e);
            const deckCards = _.flattenDeep(_.map(rows, row => processRow(sheet.title, row, metadata)));
            console.info(`Built ${sheet.title} deck (${deckCards.length} cards)`);
            resolve(deckCards);
        });
    });
};

var tplFromCard = (card, index) => {

    const cardSubtitle = (subtitle) => {
        if(subtitle === 'Class Skill') return `${card.cardClass} Skill`;
        return subtitle;
    };

    const textHeight = card.subtext ? 3 : 6;
    const cardTextStart = 3.5;

    var image = `
download="${DOWNLOAD(card.secondaryImage)}","${DOWNLOAD_PATH(card.secondaryImage)}"
image=${index}, "${DOWNLOAD_PATH(card.secondaryImage)}", 0.5, 0.5, 2, 2
`;

    var base = `

font=[TitleFont]
text=${index}, "${card.name}", 0, 0, 6, 1, "right", "center"

font=[SubtitleFont]
text=${index}, "${cardSubtitle(card.subtitle)}", 0, 1, 6, 0.5, "right", "top"

font=[SubsubtextFont]
text=${index}, "${card.trigger}", 4.6, 1.5, 1.4, 0.5, "right", "center"

font=[SubsubtextFont]
text=${index}, "${card.target}", 4.6, 2, 1.4, 0.5, "right", "top"

htmlfont=[TextFont]
htmltext=${index}, "<description>${card.text.split('\n').join('<br>')}</description>", 0.8, ${cardTextStart}, 4.8, ${textHeight}

font=[SubtextFont]
text=${index}, "${card.subtext}", 0.8, 6.5, 4.8, 2.5, "left", "wordwrap"
`;

    const revision = `
font=[SubtextFont]
text=${index}, "Revision ${card.revision}", 0.2, 8.5, 1, 0.5, "center", "center"
`

    const value = `
font=[ValueFont]
ELLIPSE=${index}, 5, 8.25, 1, 0.5, #000000
text=${index}, "${card.value}", 5, 8.25, 1, 0.5, "center", "center"
`;

    if(card.secondaryImage) {
        base = image + base;
    }

    if(card.revision) {
        base = base + revision;
    }

    if(card.value) {
        base = base + value;
    }

    return base;
};

var cardBackingDisplay = (text) => {
    switch(text) {
        case 'Trap':
        case 'Relic': return 'Dungeon';
        default: return text;
    }
}

var backFromCard = (card, index) => {

    if(!card.primaryImage) return '';

    var base = `
download="${DOWNLOAD(card.primaryImage)}","${DOWNLOAD_PATH(card.primaryImage)}"
image=${index}, "${DOWNLOAD_PATH(card.primaryImage)}", 1.2, 2, 4, 5
    `;

    const subClassText = `
font=[TitleFont]
text=${index}, "Class Card", 0, 6.4, 6.4, 2.8, "center", "center"
    `;

    if(card.showClassSubtitle) {
        base = base + subClassText;
    }

    return base;
};

var getMetadata = (spreadsheet) => {
    return new Promise((resolve, reject) => {
        const sheet = _.find(spreadsheet.worksheets, { title: 'Metadata' });
        sheet.getRows({ offset: 1 }, (e, rows) => {
            if(e) return reject(e);
            resolve(rows[0]);
        });
    });
}

module.exports.COLORS = COLORS;
module.exports.PROCESS_SHEETS = PROCESS_SHEETS;
module.exports.backFromCard = backFromCard;
module.exports.tplFromCard = tplFromCard;
module.exports.processData = processData;
module.exports.getMetadata = getMetadata;
module.exports.addLine = addLine;
module.exports.base = () => outputtedCode;


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

var SIZES = {
    WIDTH: 6.4,
    HEIGHT: 9.0 //should be 8.7, but eh - 9.0 fits better in sleeves (and doesn't cut off)
};

var PROCESS_SHEETS = ['DM', 'Cleric', 'Mage', 'Thief', 'Warrior',/*'Ranger', 'Merchant', 'Monk', 'Alchemist', */ 'Item', 'Relic', 'Trap'];

var outputtedCode = `
PAGE=21, 29.7, "PORTRAIT", HV
DPI=300
CARDSIZE=${SIZES.WIDTH}, ${SIZES.HEIGHT}
MARGINS=0.45, 0.45, 0.45, 0.45
GAP=0, 0
BORDER=rectangle,#000000,0.1,MARK

[CardFont] = "Arial"
[CardFlags] = TNF

[TitleFont] = [CardFont], 18, [CardFlags], #000000
[TextFont] = [CardFont], 10, [CardFlags], #000000
[SubtitleFont] = [CardFont], 12, [CardFlags], #000000
[SubtextFont] = [CardFont], 10, [CardFlags], #000000
[SubsubtextFont] = [CardFont], 10, [CardFlags], #000000
[ValueFont] = [CardFont], 10, [CardFlags], #ffffff
`;

var addLine = (outputtedCode, line) => {
    return `${outputtedCode}${line}\n`;
};

var processRow = (title, rowData, metadata) => {
    var cards = [];
    for(var i = 0; i < (rowData.quantity || 0); i++) {
        cards.push({
            cardClass: title,
            name: rowData.name,
            subtitle: rowData.subtitle,
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
    const cardTextStart = card.trigger || card.target ? 3 : 2;

    var base = `
font=[TitleFont]
text=${index}, "${card.name}", 0, 0, 6.4, 1, "center", "center"

font=[SubtitleFont]
text=${index}, "${cardSubtitle(card.subtitle)}", 0, 1, 6.4, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.trigger}", 0, 2, 3.2, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.target}", 3.2, 2, 3.2, 1, "center", "top"

font=[TextFont]
htmltext=${index}, "${card.text.split('\n').join('<br>')}", 0.8, ${cardTextStart}, 4.8, ${textHeight}

font=[SubtextFont]
text=${index}, "${card.subtext}", 0.8, 6, 4.8, 3, "left", "wordwrap"
`;

    const revision = `
font=[SubtextFont]
text=${index}, "Revision ${card.revision}", 0.5, 8.5, 1, 0.5, "center", "center"
`

    const value = `
font=[ValueFont]
ELLIPSE=${index}, 5, 8.5, 1, 0.5, #000000
text=${index}, "${card.value}", 5, 8.5, 1, 0.5, "center", "center"
`;

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
    var base = `
font=[TitleFont]
text=${index}, "${cardBackingDisplay(card.text)}", 0, 0, 6.4, 6.4, "center", "center"
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

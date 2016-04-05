
var _ = require('lodash');
var fs = require('fs');

var GoogleSpreadsheet = require('google-spreadsheet');
var doc = new GoogleSpreadsheet('1JpObTzg2uAwfpbs-UOZ5rehuwX02VoBHLEa6v56ZCAA');

var creds = require('./CastleCarnageService.json');

var COLORS = {
    DM:         '#000000',
    Cleric:     '#008080',
    Mage:       '#000099',
    Ranger:     '#AA7243',
    Thief:      '#003C00',
    Warrior:    '#990000',
    Item:       '#CC8400',
    Relic:      '#49311C',
    Trap:       '#49311C'
};

var SIZES = {
    WIDTH: 6.35,
    HEIGHT: 8.89
};

var PROCESS_SHEETS = ['DM', 'Cleric', 'Mage', 'Ranger', 'Thief', 'Warrior', 'Item', 'Relic', 'Trap'];

var outputtedCode = `
PAGE=21, 29.7, "PORTRAIT", HV
DPI=300
CARDSIZE=${SIZES.WIDTH}, ${SIZES.HEIGHT}
MARGINS=0.45, 0.45, 0.45, 0.45
GAP=0, 0

[CardFont] = "Arial"
[CardFlags] = TNF

[TitleFont] = [CardFont], 18, [CardFlags], #000000
[TextFont] = [CardFont], 10, [CardFlags], #000000
[SubtitleFont] = [CardFont], 12, [CardFlags], #000000
[SubtextFont] = [CardFont], 10, [CardFlags], #000000
[SubsubtextFont] = [CardFont], 10, [CardFlags], #000000
[ValueFont] = [CardFont], 10, [CardFlags], #ffffff
`;

var addLine = (line) => {
    outputtedCode += line + '\n';
};

var processRow = (title, rowData) => {
    var cards = [];
    for(var i = 0; i < rowData.quantity; i++) {
        cards.push({
            cardClass: title,
            name: rowData.name,
            subtitle: rowData.subtitle,
            value: rowData.value,
            trigger: rowData.trigger,
            target: rowData.target,
            text: rowData.text,
            subtext: rowData.subtext
        });
    }
    return cards;
};

var processData = (sheet) => {
    return new Promise((resolve, reject) => {
        sheet.getRows({
            offset: 1
        }, (e, rows) => {
            if(e) reject(e);
            resolve(_.map(rows, row => processRow(sheet.title, row)));
        });
    });
};

var tplFromCard = (card, index) => {

    const cardSubtitle = (subtitle) => {
        if(subtitle === 'Class Skill') return `${card.cardClass} Skill`;
        return subtitle;
    };

    const textHeight = card.subtext ? 3 : 6;

    const base = `
font=[TitleFont]
text=${index}, "${card.name}", 0, 0, ${SIZES.WIDTH}, 1, "center", "center"

font=[SubtitleFont]
text=${index}, "${cardSubtitle(card.subtitle)}", 0, 1, ${SIZES.WIDTH}, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.trigger}", 0, 2, ${SIZES.WIDTH / 2}, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.target}", ${SIZES.WIDTH / 2}, 2, ${SIZES.WIDTH / 2}, 1, "center", "top"

font=[TextFont]
htmltext=${index}, "${card.text.split('\n').join('<br>')}", 0.8, 3, ${SIZES.WIDTH * 0.75}, ${textHeight}

font=[SubtextFont]
text=${index}, "${card.subtext}", 0.8, 6, ${SIZES.WIDTH * 0.75}, 3, "left", "wordwrap"
`;

    const value = `
font=[ValueFont]
ELLIPSE=${index}, 5, 8, 1, 0.5, #000000
text=${index}, "${card.value}", 5, 8, 1, 0.5, "center", "center"
`;

    if(card.value) {
        return base + value;
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
    return `
font=[TitleFont]
text=${index}, "${cardBackingDisplay(card.text)}", 0, 0, ${SIZES.WIDTH}, ${SIZES.HEIGHT}, "center", "center"
    `;
};

var writeCards = (cardHash) => {

    var currentCard = 0;

    _.each(_.keys(cardHash), key => {
        var heldIdx = currentCard+1;
        for(var i = 0; i < cardHash[key].length; i++) {
            addLine((cardHash[key][i].isBack ? backFromCard : tplFromCard)(cardHash[key][i], currentCard+1));
            currentCard++;
        }

        addLine(`DECK="${heldIdx}-${currentCard}", "${key}", ${COLORS[key]}, 50%, N, ${currentCard}`);
    });

    fs.writeFileSync('cc-gen-sorted.txt', outputtedCode);
};

var sortCardsAndGetBacks = (cards) => {
    return _(cards)
        .groupBy('cardClass')
        .each((value, key) => {
            value.push({
                text: key,
                isBack: true
            });
        });
};

doc.useServiceAccountAuth(creds, () => {
    doc.getInfo((err, info) => {
        if(err) {
            console.error(err);
            return;
        }
        Promise.all(_.map(info.worksheets, (sheet) => {
            if(!_.includes(PROCESS_SHEETS, sheet.title)) return;
            return processData(sheet);
        })).then(data => {
            const cards = _(data).compact().flattenDeep().value();
            writeCards(sortCardsAndGetBacks(cards));
        });
    });
});

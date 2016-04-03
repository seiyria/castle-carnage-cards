
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

var PROCESS_SHEETS = ['DM', 'Cleric', 'Mage', 'Ranger', 'Thief', 'Warrior', 'Item', 'Relic', 'Trap'];

var outputtedCode = `
PAGE=21, 29.7, "PORTRAIT", HV
DPI=300
CARDSIZE=6.4, 8.7
MARGINS=0.55, 0.45, 0.45, 0.45
GAP=0, 0
BORDER=rounded,#000000,0.1,MARK

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
text=${index}, "${card.name}", 0, 0, 6.4, 1, "center", "center"

font=[SubtitleFont]
text=${index}, "${cardSubtitle(card.subtitle)}", 0, 1, 6.4, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.trigger}", 0, 2, 3.2, 1, "center", "top"

font=[SubsubtextFont]
text=${index}, "${card.target}", 3.2, 2, 3.2, 1, "center", "top"

font=[TextFont]
htmltext=${index}, "${card.text.split('\n').join('<br>')}", 0.8, 3, 4.8, ${textHeight}

font=[SubtextFont]
text=${index}, "${card.subtext}", 0.8, 6, 4.8, 3, "left", "wordwrap"
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
text=${index}, "${cardBackingDisplay(card.text)}", 0, 0, 6.4, 6.4, "center", "center"
    `;
};

var writeCards = (cards) => {
    for(var i = 0; i < cards.length; i++) {
        addLine((cards[i].isBack ? backFromCard : tplFromCard)(cards[i], i+1));
    }
    fs.writeFileSync('cc-gen.txt', outputtedCode);
};

var splitCardsAndGetBacks = (cards) => {
    return _(cards)
        .chunk(9)
        .map(chunk => {
            const miniChunks = _.chunk(chunk, 3);
            const emptyCard = { name: '', subtitle: '', trigger: '', target: '', text: '', subtext: '',
            value: '', cardClass: '' };

            while(miniChunks.length < 3) miniChunks.push([emptyCard, emptyCard, emptyCard]);

            _.each(miniChunks, miniChunk => {
                while(miniChunk.length < 3) miniChunk.push(emptyCard);
            });

            const miniChunkBacks = _.map(miniChunks, (miniChunk, miniIdx) => {
                return _(miniChunk)
                    .map((tinyChunk, tinyIdx) => {
                        const refChunk = chunk[(miniIdx*3)+tinyIdx];
                        return {
                            isBack: true,
                            text: refChunk ? refChunk.cardClass : ''
                        };
                    })
                    .reverse()
                    .value();
            });

            return [miniChunks, miniChunkBacks];
        })
        .flattenDeep()
        .value();
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
            writeCards(splitCardsAndGetBacks(cards));
        });
    });
});

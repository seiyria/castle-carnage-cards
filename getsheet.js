
var _ = require('lodash');
var fs = require('fs');

var GoogleSpreadsheet = require('google-spreadsheet');
var doc = new GoogleSpreadsheet('1JpObTzg2uAwfpbs-UOZ5rehuwX02VoBHLEa6v56ZCAA');

var creds = require('./CastleCarnageService.json');

var common = require('./common');
var PROCESS_SHEETS = common.PROCESS_SHEETS;
var backFromCard = common.backFromCard;
var tplFromCard = common.tplFromCard;
var processData = common.processData;
var getMetadata = common.getMetadata;
var addLine = common.addLine;
var outputtedCode = common.base();

var writeCards = (cards) => {
    for(var i = 0; i < cards.length; i++) {
        outputtedCode = addLine(outputtedCode, (cards[i].isBack ? backFromCard : tplFromCard)(cards[i], i+1));
    }
    fs.writeFileSync('cc-gen.txt', outputtedCode);
};

var splitCardsAndGetBacks = (cards) => {
    return _(cards)
        .chunk(12)
        .map(chunk => {
            const miniChunks = _.chunk(chunk, 3);
            const emptyCard = { name: '', subtitle: '', trigger: '', target: '', text: '', subtext: '',
            value: '', cardClass: '', primaryImage: '', secondaryImage: '' };

            while(miniChunks.length < 4) miniChunks.push([emptyCard, emptyCard, emptyCard]);

            _.each(miniChunks, miniChunk => {
                while(miniChunk.length < 3) miniChunk.push(emptyCard);
            });

            const miniChunkBacks = _.map(miniChunks, (miniChunk, miniIdx) => {
                return _(miniChunk)
                    .map((tinyChunk, tinyIdx) => {
                        const refChunk = chunk[(miniIdx*3)+tinyIdx];
                        return {
                            isBack: true,
                            primaryImage: refChunk ? refChunk.primaryImage : '',
                            showClassSubtitle: refChunk && refChunk.subtitle === 'Class',
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

        getMetadata(info).then(metadata => {
            const revision = metadata.revision;
            console.info(`Working with revision ${revision}.`);

            Promise.all(_.map(info.worksheets, (sheet) => {
                if(!_.includes(PROCESS_SHEETS, sheet.title)) return;
                return processData(sheet, metadata);
            })).then(data => {
                const cards = _(data).compact().flattenDeep().value();

                console.info(`Total cards: ${cards.length}.`);
                if(cards.length % 12 !== 0) {
                    console.warn(`Warning: card count not divisible by 12.`);
                }

                writeCards(splitCardsAndGetBacks(cards));
                console.info('Done.');

            }).catch(console.error);
        });
    });
});

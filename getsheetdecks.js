
var _ = require('lodash');
var fs = require('fs');

var GoogleSpreadsheet = require('google-spreadsheet');
var doc = new GoogleSpreadsheet('1JpObTzg2uAwfpbs-UOZ5rehuwX02VoBHLEa6v56ZCAA');

var creds = require('./CastleCarnageService.json');

var common = require('./common');
var COLORS = common.COLORS;
var PROCESS_SHEETS = common.PROCESS_SHEETS;
var backFromCard = common.backFromCard;
var tplFromCard = common.tplFromCard;
var processData = common.processData;
var addLine = common.addLine;
var outputtedCode = common.base();

var writeCards = (cardHash) => {

    var currentCard = 0;

    _.each(_.keys(cardHash), key => {
        var heldIdx = currentCard+1;
        for(var i = 0; i < cardHash[key].length; i++) {
            outputtedCode = addLine(outputtedCode, (cardHash[key][i].isBack ? backFromCard : tplFromCard)(cardHash[key][i], currentCard+1));
            currentCard++;
        }

        outputtedCode = addLine(outputtedCode, `DECK="${heldIdx}-${currentCard}", "${key}", ${COLORS[key]}, 50%, N, ${currentCard}`);
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
        }).catch(console.error);;
    });
});

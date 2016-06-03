
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
var addLine = common.addLine;
var outputtedCode = common.base();

var writeCards = (cards) => {
    for(var i = 0; i < cards.length; i++) {
        outputtedCode = addLine(outputtedCode, (cards[i].isBack ? backFromCard : tplFromCard)(cards[i], i+1));
    }
    fs.writeFileSync('cc-gen-unique.txt', outputtedCode);
};

var getUniqueCards = (cards) => {
    return _(cards)
        .uniqBy('name')
        .groupBy('cardClass')
        .mapValues((value, key) => {
            while((value.length % 9) !== 0) value.push({ text: '', isBack: true });
            return value;
        })
        .values()
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
            writeCards(getUniqueCards(cards));
        }).catch(console.error);
    });
});

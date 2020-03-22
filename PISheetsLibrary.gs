function updateIndustryIndicesSheet() {
    let sheetName = 'industryIndices';
    let solarSystemList = ['Kakki', 'Amarr'];
    let targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    Logger.log('Clearing sheet ' + sheetName + ' and creating column headers.');
    targetSheet.clear();
    targetSheet.appendRow(['systemName','Manufacturing', 'Researching Time Efficiency','Researching Material Efficiency', 'Copying', 'Reverse Engineering', 'Invention', 'Reactions']);

    solarSystemList.forEach( element => {
        let industryIndices = getIndustryIndices(element);

        Logger.log('Invoking routine to retrieve industry indices for  ' + element + '.');
        if ((industryIndices.length > 0) && (industryIndices != 1)) {
            targetSheet.appendRow([
                element,
                industryIndices[0][1],
                industryIndices[1][1],
                industryIndices[2][1],
                industryIndices[3][1],
                industryIndices[4][1],
                industryIndices[5][1],
                industryIndices[6][1]
            ]);
        }
    });

    return 0;
}

function updateMarketPricesSheet() {

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let pricesSheet=ss.getSheetByName("marketPrices");
    let typesSheet=ss.getSheetByName("marketTypeIds");
    let systemSheet=ss.getSheetByName("marketSystemIds");
    let typeIds = new Array();
    let sellSystemId, sellSystemName;
    let buySystemId, buySystemName;

    //Get buy and sell solar system ids for target product market to sale merchanise and target market to buy materials.
    let marketSystems = systemSheet.getRange("A2:C" + systemSheet.getLastRow()).getValues();
    if (marketSystems.length == 2) {
        for(let i = 0; i < marketSystems.length; i++) {
            if (marketSystems[i][2] === 'Buy') {
                buySystemId = marketSystems[i][1];
                buySystemName = marketSystems[i][0]
            } else {
                sellSystemId = marketSystems[i][1];
                sellSystemName = marketSystems[i][0]
            }
        }
        Logger.log("Sales Market set to : " + sellSystemName + " and Purchase Market set to : " + buySystemName);
    } else {
        Logger.log(systemSheet.getName() + " should have 1 systemId for purchase and another systemId for sales market.")
    }

    // fill in all the typeids to lookup with typeNames.
    Logger.log("Retrieving type Ids from  : " + typesSheet.getName() + " and removing duplicates.");
    typeIds = typesSheet.getRange("A1:B" + (typesSheet.getLastRow() + 1))
        .removeDuplicates().getValues();

    // Clear sheet and add new header row
    Logger.log("Clearing prices from sheet " + pricesSheet.getName() + " and re-adding column headers.");
    pricesSheet.clear();
    pricesSheet.appendRow(['TypeID','TypeName','minSell', 'maxBuy', 'volume', 'sellSystem', 'buySystem']);

    // Call function getMarketPrices to populate pricing sheet.
    Logger.log("Adding prices to  " + pricesSheet.getName() + ".");
    let prices = new Array();
    prices = getMarketPrices(sellSystemId, buySystemId,typeIds, pricesSheet);
    if (prices.length > 0) {
        prices.forEach(x => {
            x.push(sellSystemName);
            x.push(buySystemName);
        });
        for(let i = 0; i < prices.length; i++){
            pricesSheet.appendRow(prices[i]);
        }
        Logger.log("Prices added/updated in sheet " + pricesSheet.getName() + ".");
    } else {
        Logger.log("Retrieving prices failed for unknown reason.");
    }

    return 0;
}

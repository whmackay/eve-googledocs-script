const eveData = new eveDataServices();

function updateIndustryIndicesSheet(solarSystemList) {
  let sheetName = 'industryIndices';
  let targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  Logger.log('Clearing sheet ' + sheetName + ' and creating column headers.');
  targetSheet.clear();
  targetSheet.appendRow(['systemName','Manufacturing', 'Researching Time Efficiency','Researching Material Efficiency', 'Copying', 'Reverse Engineering', 'Invention', 'Reactions']);

  solarSystemList.forEach( element => { 
    Logger.log('Invoking routine to retrieve industry indices for  ' + element + '.');
    if ((eveData.getIndustryIndices(element) == 0) && (eveData.industryIndices.length > 0)) {
      targetSheet.appendRow([
        element,
        eveData.industryIndices[0][1],
        eveData.industryIndices[1][1],
        eveData.industryIndices[2][1],
        eveData.industryIndices[3][1],
        eveData.industryIndices[4][1],
        eveData.industryIndices[5][1],
        eveData.industryIndices[6][1]        
      ]);
    }
  });

  return (eveData.industryIndices.length > 0) ? 0 : 1;
}

function updateMarketPricesSheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let pricesSheet=ss.getSheetByName("marketPrices");
  let typesSheet=ss.getSheetByName("marketTypeIds");
  let systemSheet=ss.getSheetByName("marketSystemIds");
  let typeIds = [];
  let prices = [];
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

  if(eveData.pullMarketPrices(sellSystemId, buySystemId,typeIds, pricesSheet) == 0){
    prices = eveData.marketPrices;
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
  }
  
  return (eveData.marketPrices.length > 0) ? 0 : 1;
}


function updateIndustryCostsSheet(solarSystemList, targetSolarSystem) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let industryCostsSheet = ss.getSheetByName("industryCosts");
  let typesSheet=ss.getSheetByName("marketTypeIds");
  let typesIndustryJobCosts = {};

  //Get typeIds and typeNames for use in retrieving industrial base costs.
  Logger.log('Getting typeIds and typeNames from ' + typesSheet.getName());
  let types = typesSheet.getRange("A2:B" + typesSheet.getLastRow()).getValues();
  
  //Using typeIds and typeNames invoke routine to retrieve base cost.
  let returnValue = 1;
  if (types.length > 0){
    Logger.log('Invoking routine to get job costs per typeId-typeName pair.');
    let returnValue = eveData.getActivityCostPerTypeId(types, solarSystemList);
    
    if ( (returnValue == 0) && (Object.keys(eveData.typesIndustryJobCosts).length > 0) ) {
      Logger.log('Received Industry cost per job-typeId.');
      let obj = eveData.typesIndustryJobCosts;
      for (const typeId in obj) {         
        for (const solarSystem in obj[typeId]['solarSystems']) {
          if (obj[typeId]['solarSystems'][solarSystem]['solarSystemName'] == targetSolarSystem){
            typeJobCost.push([
              obj[typeId]['typeId'], 
              obj[typeId]['typeName'],
              obj[typeId]['baseCost'],
              'deprecated',
              obj[typeId]['solarSystems'][solarSystem]['Manufacturing'],
              obj[typeId]['solarSystems'][solarSystem]['Invention']
            ]);                
          }
        }
      }
    }
    
    if (typeJobCost.length > 0) {
      industryCostsSheet.clear();
      industryCostsSheet.appendRow(['typeId', 'typeName', 'baseCost', 'N/A', 'manufacturingCost', 'inventionCost']); 
      typeJobCost.forEach( element => industryCostsSheet.appendRow(element)); 
    }
  }
 
  return ( typeJobCost.length > 0) ? 0 : 1;
}
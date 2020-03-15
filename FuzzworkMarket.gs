// This code depends on having three sheets. One called prices, one called typeids, one called systemids
// Do not store _anything_ you care about on prices, as it will be wiped each time the function runs.
// typeids has a two columns with EVE database typeID and typeName, systemids has EVE database systemsId and
// systemsName along with two macro columns for product market and material market.

// This adds a new menu to the sheet, with a single entry to update prices.
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('API')
      .addItem('Update Prices', 'updatePrices')
      .addToUi();
}

function updatePrices(){

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resultsheet=ss.getSheetByName("prices");
  var typessheet=ss.getSheetByName("typeids");
  var systemSheet=ss.getSheetByName("systemids");

  //Get buy and sell solar system ids for target product market to sale merchanise and target market to buy materials.
  var sellSystemId = systemSheet.getRange("B1:B2").getValues()[0,1];
  Logger.log("Sell System : " + sellSystemId);
  var buySystemId = systemSheet.getRange("D1:D2").getValues()[0,1];
  Logger.log("Buy System : " + buySystemId);

  //clear out the old prices
  resultsheet.clear();

  var prices = new Array();
  var TypeIds = new Array();
  var sellUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+sellSystemId+'&typeid=';
  Logger.log("EVEMarketer Sell URI : " + sellUrl);
  var buyUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+buySystemId+'&typeid=';
  Logger.log("EVEMarketer Buy URI : " + buyUrl);

  // fill in all the typeids to lookup with typeNames.
  var len = typessheet.getLastRow();
  for(var i = 2 ; i < len +1  ; i++){
    var typeid = typessheet.getRange("A"+i).getValue();
    var typeName = typessheet.getRange("B"+i).getValue();
    if ((typeof(typeid) === 'number') && (typeof(typeName) === 'string')) {
        TypeIds.push([typeid,typeName]);
    }
  }

  // Deduplicate the list
  TypeIds = TypeIds.filter(function(v,i,a) {
    return a.indexOf(v)===i;
  });

  // add a header row
  resultsheet.appendRow(['TypeID','TypeName','minSell', 'maxBuy', 'volume', 'sellSystem', 'buySystem']);
  var parameters = {method : "get", payload : ""};


  // go through the typeids, 100 at a time.
  var types, typeName, jsonSellFeed, jsonSell, jsonBuyFeed, jsonBuy, o,j,chunk = 100;
  for (o=0,j=TypeIds.length; o < j; o+=chunk) {
    //Slice array into row blocks(chunks) of 100 and extract just the typeIds.
    types = TypeIds.slice(o,o+chunk).map((value,index) => { return value[0]; }).join(",").replace(/,$/,'');
    jsonSellFeed = UrlFetchApp.fetch(sellUrl+types, parameters).getContentText();
    Utilities.sleep(200);
    jsonBuyFeed = UrlFetchApp.fetch(buyUrl+types, parameters).getContentText();
    Utilities.sleep(200);
    jsonSell = JSON.parse(jsonSellFeed);
    jsonBuy = JSON.parse(jsonBuyFeed);

    if(jsonSell) {
      for(indexSell in jsonSell) {
        for(indexBuy in jsonBuy) {
          if(parseInt(jsonBuy[indexBuy].buy.forQuery.types) == parseInt(jsonSell[indexSell].sell.forQuery.types)){
            typeName = TypeIds.find((element) => element[0] == parseInt(jsonSell[indexSell].sell.forQuery.types))[1];
            resultsheet.appendRow([parseInt(jsonSell[indexSell].sell.forQuery.types),
              typeName,
              parseFloat(jsonSell[indexSell].sell.min),
              parseFloat(jsonBuy[indexBuy].buy.max),
              parseInt(jsonSell[indexSell].sell.volume)
            ])
          }
        }
      }
    }
  }
}

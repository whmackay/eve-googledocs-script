function getSolarySystemIndustryIndices(systemName) {
    let uri = 'https://api.eve-industry.org/system-cost-index.xml?name=';
    let industryIndices = new Array();
    const parameters = {method : "get", payload : ""};

    if (typeof systemName == 'string') {
        uri = uri + systemName;
        Logger.log('--Set URI to pull industry index for solar system : ' + systemName);
    }
    else {
        uri = null;
        Logger.log('--Was unable to set URI due to solar system value not passing typeof string test.');
    }

    if (uri != null) {
        Logger.log('--Invoking API call to : ' + uri );
        try {
            let responseXML = UrlFetchApp.fetch(uri, parameters).getContentText();
            Utilities.sleep(200);
            let industryIndicesXML = XmlService.parse(responseXML);
            let industryIndicesRoot = industryIndicesXML.getRootElement();
            let industryIndicesChildren = industryIndicesRoot.getChildren('solarsystem');
            if (industryIndicesChildren != null) {
                let i;
                for (i = 0; i < industryIndicesChildren.length; i++){
                    indicesByActivity = industryIndicesChildren[i].getChildren('activity');
                    if (indicesByActivity != null){
                        let ii;
                        Logger.log('--Number of activities for system : ' + indicesByActivity.length);
                        for (ii = 0; ii < indicesByActivity.length; ii++){
                            Logger.log('----Activity ' + indicesByActivity[ii].getAttribute('name').getValue() + ' : ' + indicesByActivity[ii].getValue());
                            industryIndices.push([indicesByActivity[ii].getAttribute('name').getValue(), parseFloat(indicesByActivity[ii].getValue())])
                        }
                    }
                }
            }
        } catch (error) {
            Logger.log('--Parsing XML response failed due to : ' + error);
        }
    }

    return (industryIndices.length > 0) ? industryIndices : 1;
}


function getIndustryIndices(systemName){
    let industryIndices = new Array();

    Logger.log('Getting industry indices for solar system : ' + systemName);
    industryIndices = getSolarySystemIndustryIndices(systemName);

    if ((industryIndices.length > 0) && (industryIndices != 1)) {
        Logger.log('System industry indices complete.');

    } else{
        Logger.log('Error occured retrieving industry indices; See logs.');
    }

    return (industryIndices.length > 0) ? industryIndices : 1;
}




// This code depends on having three sheets. One called prices, one called typeids, one called systemids
// Do not store _anything_ you care about on prices, as it will be wiped each time the function runs.
// typeids has a two columns with EVE database typeID and typeName, systemids has EVE database systemsId and
// systemsName along with two macro columns for product market and material market.
function getMarketPrices(sellSystemId, buySystemId, typeIds, targetSheet){

    let prices = new Array();
    let sellUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+sellSystemId+'&typeid=';
    Logger.log("EVEMarketer Sell URI : " + sellUrl);
    let buyUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+buySystemId+'&typeid=';
    Logger.log("EVEMarketer Buy URI : " + buyUrl);
    let parameters = {method : "get", payload : ""};


    // go through the typeids, 100 at a time.
    var types, typeName, jsonSellFeed, jsonSell, jsonBuyFeed, jsonBuy, o,j,chunk = 100;
    for (o=0,j=typeIds.length; o < j; o+=chunk) {
        //Slice array into row blocks(chunks) of 100 and extract just the typeIds.
        types = typeIds.slice(o,o+chunk).map((value,index) => { return value[0]; }).join(",").replace(/,$/,'');
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
                        typeName = typeIds.find((element) => element[0] == parseInt(jsonSell[indexSell].sell.forQuery.types))[1];
                        prices.push([
                            parseInt(jsonSell[indexSell].sell.forQuery.types),
                            typeName,
                            parseFloat(jsonSell[indexSell].sell.min),
                            parseFloat(jsonBuy[indexBuy].buy.max),
                            parseInt(jsonSell[indexSell].sell.volume)
                        ]);
                    }
                }
            }
        }
    }

    return (prices.length > 0) ? prices : 1;
}


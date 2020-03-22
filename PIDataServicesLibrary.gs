function getSolarySystemIndustryIndices(systemName) {
    let uri = 'https://api.eve-industry.org/system-cost-index.xml?name=';
    let industryIndices = [];
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
                            industryIndices.push([indicesByActivity[ii].getAttribute('name').getValue(), parseFloat(indicesByActivity[ii].getValue())]);
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
    let industryIndices = [];

    Logger.log('Getting industry indices for solar system : ' + systemName);
    industryIndices = getSolarySystemIndustryIndices(systemName);

    if ((industryIndices.length > 0) && (industryIndices != 1)) {
        Logger.log('System industry indices complete.');

    } else{
        Logger.log('Error occured retrieving industry indices; See logs.');
    }

    return (industryIndices.length > 0) ? industryIndices : 1;
}


// This function recieves TypeIds w/ TypeNames and returns an array of base job cost.
// Debug line - types = [[11535, 'Magnetometric Sensor Cluster'], [11553, 'Oscillator Capacitor Unit']];
function getTypesJobBaseCost(types){
    const parameters = {method : "get", payload : ""};
    const baseURI = 'https://api.eve-industry.org/job-base-cost.xml?names=';
    let typesJobBaseCosts = [];

    //types = [[34, 'Tritanium'], [11553, 'Oscillator Capacitor Unit']];

    for (let i = 0; i < types.length; i=i+50){
        let typesSlice = types.slice(i, i+50);
        let typeNames = typesSlice.map(x => x[1]);
        let typeIds = typesSlice.map(x => x[0]);
        let uri = baseURI;

        if ((typeNames.length > 0) && (typeIds.length > 0)) {
            uri = uri + typeNames + '&ids=' + typeIds;
            Logger.log('--Set URI to pull base job costs : ' + uri);
        }
        else {
            uri = null;
            Logger.log('--Was unable to set URI for unknown reasion.');
        }

        if (uri != null) {
            Logger.log('--Invoking API call to : ' + uri );
            try {
                let responseXML = UrlFetchApp.fetch(uri, parameters).getContentText();
                Utilities.sleep(200);
                let jobBaseCostsXML = XmlService.parse(responseXML);
                let jobBaseCostsRoot = jobBaseCostsXML.getRootElement();
                let jobBaseCostsChildren = jobBaseCostsRoot.getChildren();
                if (jobBaseCostsChildren.length > 0) {
                    for (let ii = 0; ii < jobBaseCostsChildren.length; ii++) {
                        typesJobBaseCosts.push([
                            parseInt(jobBaseCostsChildren[ii].getAttribute('id').getValue()),
                            jobBaseCostsChildren[ii].getAttribute('name').getValue(),
                            parseFloat(jobBaseCostsChildren[ii].getValue())
                        ]);
                    }
                }
            } catch (error) {
                Logger.log('--Parsing XML response failed due to : ' + error);
            }
        }
    }

    if (typesJobBaseCosts.length > 0) {
        for (let i = 0; i < typesJobBaseCosts.length; i++) {
            for (let ii = 0; ii < types.length; ii++){
                if ( typesJobBaseCosts[i][1].includes(types[ii][1])) {
                    typesJobBaseCosts[i].push(typesJobBaseCosts[i][0]);
                    typesJobBaseCosts[i][0] = types[ii][0];
                    typesJobBaseCosts[i][1] = types[ii][1];
                    ii = types.length;
                }
            }
        }
    }

    return (typesJobBaseCosts.length > 0) ? typesJobBaseCosts : 1;
}


// This function uses api.evemarketer.com to pull prices for typeId from both a source/purchase and product/sales solar system using systemId. The purpose
// is to allow the user to see the price delta between the max buy order in the purchase system to the minimum sell order in the product/sales system.
// Function accepts two systemIds and an array of typeIds and returns an array of prices.
function getMarketPrices(sellSystemId, buySystemId, typeIds){

    let prices = [];
    let sellUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+sellSystemId+'&typeid=';
    Logger.log("EVEMarketer Sell URI : " + sellUrl);
    let buyUrl='https://api.evemarketer.com/ec/marketstat/json?usesystem='+buySystemId+'&typeid=';
    Logger.log("EVEMarketer Buy URI : " + buyUrl);
    let parameters = {method : "get", payload : ""};


    // go through the typeids, 100 at a time.
    let types, typeName, jsonSellFeed, jsonSell, jsonBuyFeed, jsonBuy, o,j,chunk = 100;
    for (o=0,j=typeIds.length; o < j; o+=chunk) {
        //Slice array into row blocks(chunks) of 100 and extract just the typeIds.
        types = typeIds.slice(o,o+chunk).map((value) => { return value[0]; }).join(",").replace(/,$/,'');
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
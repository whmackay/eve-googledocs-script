class eveDataServices {
    constructor() {
      this.marketDataBrokerServicesURI = 'https://api.evemarketer.com/ec/marketstat/json?usesystem=';
      this.solarSystemsIndustryIndicesURI = 'https://api.eve-industry.org/system-cost-index.xml?name=';
      this.jobBaseCoseURI = 'https://api.eve-industry.org/job-base-cost.xml?names=';
      this.marketPrices = [];
      this.marketPricesJSON = {};
      this.industryIndices = [];
      this.typesIndustryJobCosts = {};
    }

    // This function uses api.evemarketer.com to pull prices for typeId from both a source/purchase and product/sales solar system using systemId. The purpose
    // is to allow the user to see the price delta between the max buy order in the purchase system to the minimum sell order in the product/sales system.
    // Function accepts two systemIds and an array of typeIds and returns an array of prices.
    pullMarketPrices(sellSystemId, buySystemId, typeIds){
      const parameters = {method : "get", payload : ""};
      let types, typeName, jsonSellFeed, jsonSell, jsonBuyFeed, jsonBuy, o,j,chunk = 100;

      //Clear any pre-existing values.
      this.marketPrices = [];
      this.marketPricesJSON = {};

      // Create URIs for both purchase and product markets.
      let sellUrl=this.marketDataBrokerServicesURI+sellSystemId+'&typeid=';
      Logger.log("EVEMarketer Sell URI : " + sellUrl);
      let buyUrl=this.marketDataBrokerServicesURI+buySystemId+'&typeid=';
      Logger.log("EVEMarketer Buy URI : " + buyUrl);

      // go through the typeids, 100 at a time.
      for (o=0,j=typeIds.length; o < j; o+=chunk) {
        //Slice array into row blocks(chunks) of 100 and extract just the typeIds.
        types = typeIds.slice(o,o+chunk).map((value) => { return value[0]; }).join(",").replace(/,$/,'');
        jsonSellFeed = UrlFetchApp.fetch(sellUrl+types, parameters).getContentText();
        Utilities.sleep(200);
        jsonBuyFeed = UrlFetchApp.fetch(buyUrl+types, parameters).getContentText();
        Utilities.sleep(200);
        jsonSell = JSON.parse(jsonSellFeed);
        jsonBuy = JSON.parse(jsonBuyFeed);

        // Creates an Object from results for easy portability.
        if(jsonSell) {
          for(let indexSell in jsonSell) {
            for(let indexBuy in jsonBuy) {
              if(parseInt(jsonBuy[indexBuy].buy.forQuery.types) == parseInt(jsonSell[indexSell].sell.forQuery.types)){
                typeName = typeIds.find((element) => element[0] == parseInt(jsonSell[indexSell].sell.forQuery.types))[1];
                this.marketPricesJSON[typeName] = {
                  'typeId' : parseInt(jsonSell[indexSell].sell.forQuery.types),
                  'typeName' : typeName,
                  'sellSystemId' : sellSystemId,
                  'minSellPrice' : parseFloat(jsonSell[indexSell].sell.min),
                  'buySystemId' : buySystemId,
                  'buyMaxPrice' : parseFloat(jsonBuy[indexBuy].buy.max),
                  'buyVolume' : parseInt(jsonSell[indexSell].sell.volume)
                };
              }
            }
          }
        }

        // Creates an array from results for easy (appendRow) input into a Sheets' table. Will be deprecated eventually.
        if(jsonSell) {
          for(let indexSell in jsonSell) {
            for(let indexBuy in jsonBuy) {
              if(parseInt(jsonBuy[indexBuy].buy.forQuery.types) == parseInt(jsonSell[indexSell].sell.forQuery.types)){
                typeName = typeIds.find((element) => element[0] == parseInt(jsonSell[indexSell].sell.forQuery.types))[1];
                this.marketPrices.push([
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

      return (Object.keys(this.marketPricesJSON).length > 0) ? 0 : 1;
    }


    // This function uses api.eve-industry.org to retrieve industry activities per solarSystemId.
    getSolarSystemIndustryIndices(systemName) {
      let uri = this.solarSystemsIndustryIndicesURI;
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
          if (industryIndicesChildren.length > 0) {
            let i;
            for (i = 0; i < industryIndicesChildren.length; i++){
              let indicesByActivity = industryIndicesChildren[i].getChildren('activity');
              if (indicesByActivity != null){
                let ii;
                Logger.log('--Number of activities for system : ' + indicesByActivity.length);
                for (ii = 0; ii < indicesByActivity.length; ii++){
                  Logger.log('----Activity ' + indicesByActivity[ii].getAttribute('name').getValue() + ' : ' + indicesByActivity[ii].getValue());
                  this.industryIndices.push([indicesByActivity[ii].getAttribute('name').getValue(), parseFloat(indicesByActivity[ii].getValue())]);
                }
              }
            }
          }
        } catch (error) {
          Logger.log('--Parsing XML response failed due to : ' + error);
        }
      }

      return (this.industryIndices.length > 0) ? 0 : 1;
    }


    // This function is a wrapper for invoking getSolarSystemIndustryIndices() to retrieve industry activities per solarSystemId.
    getIndustryIndices(systemName){

      // Clear previous industryIndices
      this.industryIndices = [];

      Logger.log('Getting industry indices for solar system : ' + systemName);
      let returnValue = this.getSolarSystemIndustryIndices(systemName);

      if ((this.industryIndices.length > 0) && (returnValue == 0)) {
        Logger.log('System industry indices complete.');

      } else{
        Logger.log('Error occured retrieving industry indices; See logs.');
      }

      return (this.industryIndices.length > 0) ? 0 : 1;
    }



    // This function recieves TypeIds w/ TypeNames with solars systemIds and returns an object with activity cost per typeId, activity, and solar system.
    getActivityCostPerTypeId(types, solarSystemList){
      const itemsPerInvoke = 10;
      const parameters = {method : "get", payload : ""};
      const baseURI = this.jobBaseCoseURI
      let typesJobBaseCosts = [];
      let industryIndices = [];

      // Clear any current data in typesIndustryJobCosts
      this.typesIndustryJobCosts = {};

      for (let i = 0; i < types.length; i=i+itemsPerInvoke){
        let typesSlice = types.slice(i, i+itemsPerInvoke);
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

      //EVE-Industry API returns blueprint typeIds, but we called the function with item produced typeName and typeId.
      //Update returned array to have both the blueprint and product typeId.
      if (typesJobBaseCosts.length > 0) {
        for (let i = 0; i < typesJobBaseCosts.length; i++) {
          if (typesJobBaseCosts[i][1].includes('Blueprint')){
              typesJobBaseCosts[i][1] = typesJobBaseCosts[i][1].replace(' Blueprint', '');
          }
          for (let ii = 0; ii < types.length; ii++){
            if ( typesJobBaseCosts[i][1] == types[ii][1]) {
              typesJobBaseCosts[i].push(typesJobBaseCosts[i][0]);
              typesJobBaseCosts[i][0] = types[ii][0];
              typesJobBaseCosts[i][1] = types[ii][1];
              ii = types.length;
            }
          }
        }
      }

      // Get Industry Indices per system.
      if (typesJobBaseCosts.length > 0) {
        Logger.log('Received job base costs for various typeIds.');
        Logger.log('Invoking routine to retrieve Industry indices for solarSystemIds : '+ solarSystemList );
        solarSystemList.forEach( element => {
          this.getIndustryIndices(element);
          industryIndices.push([element, this.industryIndices]);
        });
      }


      //Join job base cost per typeIds with industry indices per system to create objects with basecost per industry actitivy
      if ((typesJobBaseCosts.length > 0) && (industryIndices.length > 0)) {
        Logger.log('Received job base costs for various typeIds.');
        for (let i = 0; i < typesJobBaseCosts.length; i++) {
          this.typesIndustryJobCosts[typesJobBaseCosts[i][0]] = {
            'typeId' : typesJobBaseCosts[i][0],
            'typeName' : typesJobBaseCosts[i][1],
            'bluePrintTypeId' : typesJobBaseCosts[i][3],
            'baseCost' : typesJobBaseCosts[i][2],
            'solarSystems' : []
          };
          for (let ii = 0; ii < industryIndices.length; ii++) {
            this.typesIndustryJobCosts[typesJobBaseCosts[i][0]]['solarSystems']['solarSystem' + ii] = (() => {
              let tempObject = {};
              tempObject.solarSystemName = industryIndices[ii][0];
              for (let iii = 0; iii < industryIndices[ii][1].length; iii++) {
                if ((industryIndices[ii][1][iii][0] === 'Copying') || (industryIndices[ii][1][iii][0] === 'Invention') || (industryIndices[ii][1][iii][0] === 'Researching Time Efficiency') || (industryIndices[ii][1][iii][0] === 'Researching Material Efficiency')){
                  tempObject[industryIndices[ii][1][iii][0]] = industryIndices[ii][1][iii][1]*typesJobBaseCosts[i][2]*0.02;
                }
                else{
                  tempObject[industryIndices[ii][1][iii][0]] = industryIndices[ii][1][iii][1]*typesJobBaseCosts[i][2];
                }
              }
              return tempObject;
            })();
          }
        }
      }

      return (Object.keys(this.typesIndustryJobCosts).length > 0) ? 0 : 1;
    }
}
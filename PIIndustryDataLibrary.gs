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


function updateIndustryIndices(targetSheetName, solarSystemList) {

    let targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    targetSheet.clear();
    targetSheet.appendRow(['systemName','Manufacturing', 'Researching Time Efficiency','Researching Material Efficiency', 'Copying', 'Reverse Engineering', 'Invention', 'Reactions']);

    solarSystemList.forEach( element => {

        let industryIndices = getIndustryIndices(element);
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

function updateIndustryIndicesSheet(){
    let sheetName = 'industryIndices';
    let solarSystemList = ['Kakki', 'Amarr'];

    updateIndustryIndices(sheetName, solarSystemList);

    return 0;
}

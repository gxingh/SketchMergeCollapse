const fs = require('fs');
const jsonfile = require('jsonfile')
const Admzip = require('adm-zip');
const archiver = require('archiver');

var outputPath = '';
var outputPathTemp = '';

module.exports = {
    openFile: function (path) {
        var remote = require('electron').remote;
        app = remote.require('electron').app;
        console.log(app.getAppPath());
        outputPath = app.getAppPath()+'/';
        outputPathTemp = outputPath+'temp/';

        console.log(path);
        var jsonData = [];
        // var outputPath = 'C://temp/';
        if (!fs.existsSync(outputPathTemp)) {
            fs.mkdirSync(outputPathTemp);
        }
        var file = new Admzip(path);
        file.extractAllTo(outputPathTemp, true);
        var metaFile = jsonfile.readFileSync(outputPathTemp+"meta.json");
        var pages = metaFile["pagesAndArtboards"];
        for(var i in pages){
            jsonData.push(pages[i].name);
        }
        console.log(jsonData);
        return jsonData;
    },
    exportSelected: function(unselected){
        console.log(unselected);
        var metaFile = jsonfile.readFileSync(outputPathTemp+"meta.json");
        var pages = metaFile["pagesAndArtboards"];
        for(var i in pages){
            for(var j = 0; j<unselected.length; j++){
                if(pages[i].name===unselected[j]){
                    removeFile(outputPathTemp+'pages/'+i+'.json');
                    delete pages[i];
                    break;
                }
            }
        }
        metaFile["pagesAndArtboards"] = pages;
        createJSON(outputPathTemp, metaFile, 'meta');
        createArchive();

    }
}

function removeFile(path){
    console.log(path);
    fs.unlinkSync(path);
}

function createJSON(dir, data, name) {
    jsonfile.writeFileSync(dir + '/' + name + '.json', data, {
        spaces: 4
    });
    return data.id;
}

function removeTempDirectory(path) {
    fs.readdirSync(path).forEach(function (file) {
        var stat = fs.statSync(path + "/" + file);
        if (stat.isDirectory()) {
            removeTempDirectory(path + "/" + file);
        } else {
            fs.unlinkSync(path + "/" + file);
        }
    });
    fs.rmdirSync(path);
}
function createArchive(){

    var output = fs.createWriteStream(outputPath+'target.sketch');
    var archive = archiver('zip');
    
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        removeTempDirectory(outputPathTemp);
    });
    
    archive.on('error', function(err){
        throw err;
    });
    
    archive = archive.directory(outputPathTemp, '');
    archive.pipe(output);
    archive.finalize();
}
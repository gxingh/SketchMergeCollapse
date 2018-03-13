const fs = require('fs');
const jsonfile = require('jsonfile')
const Admzip = require('adm-zip');
const archiver = require('archiver');

var outputPath = '';
var outputPathTemp = '';
var outputPathChild = '';

module.exports = {
    openFile: function(path) {
        var remote = require('electron').remote;
        app = remote.require('electron').app;
        console.log(app.getAppPath());
        outputPath = app.getAppPath() + '/';
        outputPathTemp = outputPath + 'temp/';

        console.log(path);
        var jsonData = [];
        // var outputPath = 'C://temp/';
        if (!fs.existsSync(outputPathTemp)) {
            fs.mkdirSync(outputPathTemp);
        } else {
            emptyTempDirectory(outputPathTemp);
        }
        var file = new Admzip(path);
        file.extractAllTo(outputPathTemp, true);
        var metaFile = jsonfile.readFileSync(outputPathTemp + "meta.json");
        var pages = metaFile["pagesAndArtboards"];
        for (var i in pages) {
            jsonData.push(pages[i].name);
        }
        console.log(jsonData);
        return jsonData;
    },
    openChildFile: function(path) {
        outputPathChild = outputPath + 'child/';
        if (!fs.existsSync(outputPathChild)) {
            fs.mkdirSync(outputPathChild);
        } else {
            emptyChildDirectory(outputPathChild);
        }
        var jsonData = [];
        var file = new Admzip(path);
        file.extractAllTo(outputPathChild, true);
        var metaFile = jsonfile.readFileSync(outputPathChild + "meta.json");
        var pages = metaFile["pagesAndArtboards"];
        for (var i in pages) {
            jsonData.push(pages[i].name);
        }
        console.log(jsonData);
        return jsonData;
    },
    exportSelected: function(unselected) {
        console.log(unselected);
        var metaFile = jsonfile.readFileSync(outputPathTemp + "meta.json");
        var pages = metaFile["pagesAndArtboards"];
        for (var i in pages) {
            for (var j = 0; j < unselected.length; j++) {
                if (pages[i].name === unselected[j]) {
                    removeFile(outputPathTemp + 'pages/' + i + '.json');
                    delete pages[i];
                    break;
                }
            }
        }
        metaFile["pagesAndArtboards"] = pages;
        createJSON(outputPathTemp, metaFile, 'meta');
        createArchive();
    },
    exportMergedFile: function(selected) {
        console.log(selected);
        var metaFile = jsonfile.readFileSync(outputPathChild + "meta.json");
        var metaFileParent = jsonfile.readFileSync(outputPathTemp + "meta.json");
        var documentFile = jsonfile.readFileSync(outputPathChild + 'document.json');
        var documentFileParent = jsonfile.readFileSync(outputPathTemp + 'document.json');

        var temp = documentFileParent["pages"];
        tempChild = documentFile["pages"];
        temp = temp.concat(tempChild);
        documentFileParent["pages"] = temp;

        var parentPages = metaFileParent["pagesAndArtboards"];
        var pages = metaFile["pagesAndArtboards"];
        for (var j = 0; j < selected.length; j++) {
            for (var i in pages) {
                if (pages[i].name === selected[j]) {
                    var jsonData = jsonfile.readFileSync(outputPathChild + 'pages/' + i + ".json");
                    createJSON(outputPathTemp + 'pages', jsonData, i);
                    parentPages[i] = pages[i];
                    break;
                }
            }
        }

        if(fs.existsSync(outputPathChild+'images/')){
            var images = fs.readdirSync(outputPathChild+'images/');
            console.log(images);
            for(var i in images){
                var read = fs.createReadStream(outputPathChild+'images/'+images[i]);
                if(!fs.existsSync(outputPathTemp+'images/')){
                    fs.mkdirSync(outputPathTemp+'images/');
                }
                var write = fs.createWriteStream(outputPathTemp+'images/'+images[i]);
                read.pipe(write);
            }
        }

        console.log(parentPages);
        metaFileParent["pagesAndArtboards"] = parentPages;
        createJSON(outputPathTemp, metaFileParent, 'meta');
        createJSON(outputPathTemp, documentFileParent, 'document');
        createArchive();
    }
}

function removeFile(path) {
    console.log(path);
    fs.unlinkSync(path);
}

function createJSON(dir, data, name) {
    jsonfile.writeFileSync(dir + '/' + name + '.json', data, {
        spaces: 4
    });
    return data.id;
}

function emptyTempDirectory(path) {
    fs.readdirSync(path).forEach(function(file) {
        var stat = fs.statSync(path + "/" + file);
        if (stat.isDirectory()) {
            removeTempDirectory(path + "/" + file);
        } else {
            fs.unlinkSync(path + "/" + file);
        }
    });
}

function emptyChildDirectory(path) {
    fs.readdirSync(path).forEach(function(file) {
        var stat = fs.statSync(path + "/" + file);
        if (stat.isDirectory()) {
            removeTempDirectory(path + "/" + file);
        } else {
            fs.unlinkSync(path + "/" + file);
        }
    });
}

function removeTempDirectory(path) {
    fs.readdirSync(path).forEach(function(file) {
        var stat = fs.statSync(path + "/" + file);
        if (stat.isDirectory()) {
            removeTempDirectory(path + "/" + file);
        } else {
            fs.unlinkSync(path + "/" + file);
        }
    });
    fs.rmdirSync(path);
}

function createArchive() {

    var output = fs.createWriteStream(outputPath + 'target.sketch');
    var archive = archiver('zip');

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        removeTempDirectory(outputPathTemp);
        removeTempDirectory(outputPathChild);
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive = archive.directory(outputPathTemp, '');
    archive.pipe(output);
    archive.finalize();
}
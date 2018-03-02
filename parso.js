// Load dependencies

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var pug = require('pug');
var async = require('async');
var express = require('express');

// Load config file to load globConfig (controls directory to pull data from)
// and the environment variable "pageEnv" which allows toggling between the use
// of localhost URLs and production URLs for page resources like CSS/JS/Images.

var settings = require('./config.json')

// Create express app for serving pages once generated

var app = express();

// Declare Global Variables

var parseFiles = [];
var pageData = [];

// Setup basic express server template engine settings (using pug in this case)

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Define basic web server routes so that we can access the HTML files
// we generate.

app.use('/public', express.static('public'));

app.get('/', function(req, res, next){
	res.render('layout', { page: pageData[0]})
});

// Using the node library 'Glob', we scan the 'data' folder to obtain all files
// that need to be parsed.
//
// The default configuration I've setup, is to look 3 folders deep within the
// 'data' directory for any txt file as that's how the data came structured in
// this case of our sub-category pages, but the 'globConfig' variable above can
// be adjusted to suit any other folder hierarchy
//
// After collecting the files to parse, it calls the main "parseData" function
//
// On callback, we create a web-server that we'll use later to generate pages
// based on the parsed data and allow us to view the generated html files.

glob(settings.globConfig, (er, files) => {
	parseFiles = files;
	async.series([])
	parseData(parseFiles, () => {
		app.listen(3000, () => console.log('http soivah listening on port 3000'))
	});
})

// This is just a test/development method to create a JSON file that contains
// all of the data that will become part of the pageData file. This just allows
// you to reference the data while you are building your page templates but
// can be commented out for performance or in production.

function jsonLives (){
	fs.writeFile('../pagedata.json', JSON.stringify(pageData, null, 2), (err)=>{
		    		if (err) throw err;
		    		console.log('json file created');
		    		console.log(JSON.stringify(pageData, null, 2));
	});
}

// Now that we have the list of files, we can start parsing them. There are a few
// helper functions that will be factored into a better format in future if we
// do any further work on this project but, for now, I'm leaving things a bit
// messy since this is really just being used as an internal content generation
// tool rather than a production environment.

function parseData (files, callback){
	for(f in files){
		fs.readFile(files[f], (err, data) => {
		    if(err) throw err;
		    var cleanArray = replaceSpecChars(data)
		    var splitArray = splitLines(cleanArray);
		    var validatedArray = removeEmptyLines(splitArray);
		    createPageObject(validatedArray, () => {
		    	
		    });
		});
	}
	return callback();
}

// Using the function below, split up the file into text file rows by removing
// carriage returns and splitting the file by line feeds

function splitLines(data){
	var splitData = data.toString().replace(/[\r]*/g, "").split("\n");
	return splitData;
}

// A little cleanup step to ensure there are no curly quotes, curly apostrophes
// or character code ellipses in the remaining text

function replaceSpecChars(data){
	var cleanData = data.toString()
	.replace(/[\u2018\u2019]/g, "'")
	.replace(/[\u201C\u201D]/g, '"')
	.replace(/\u2026/g, "...");
	return cleanData
}

// Now that the file is in rows, it serves us best to remove any lines that are
// completely blank since they no longer serve a purpose

function removeEmptyLines (data){
	for(i in data) {
		if(data[i] == "" || data[i] == " " || data[i] == "\r"){
		    data.splice(i, 1);
		}
	}
	return data;
}

// The function below creates the main page data object which contains all of
// the data from the text file organized into a JSON object

function createPageObject (data, callback){

// First we instantiate the individual page object

	var page = {}

// Then we split up the URL of the site to parse some data out of it

	splitAddr = data[0].toString().split("/");
	domain = splitAddr[2].toString().replace("www.", "");

	page.domain = domain.toLowerCase();
	if(page.domain == 'adulthookups.com'){
		page.domaindir = 'adult-sex-games';
	} else {
		page.domaindir = splitAddr[3];
	}
	page.category = splitAddr[4].toLowerCase();
	page.categoryClean = toTitleCase(page.category);
	page.name = splitAddr[5] || splitAddr[4];
	nameClean = page.name.toString().replace(/-/g, ' ');
	page.nameClean = toTitleCase(nameClean);
	page.address = data[0].toString();

// Then we assign the principle variables from the heading of the
// text file for each page.

	title = data[1].toString().split(":");
	console.log(page.domain + ' : ' + page.name + ' : ' + title);
	title = title[1].toString().trim();
	page.title = title;

	titleText = title.split(' | ');
	page.titleText = titleText[0].toString();

	desc = data[2].toString().split(":");
	desc = desc[1].toString().trim()
	page.description = desc;

	heading = data[3].toString().replace("<h3>","");
	heading = heading.toString().replace("</h3>","");
	page.heading = heading;
	
// We set the resource address based on the environment variable setup
// at the top of this file in the global variable section.

	if(settings.pageEnv == 'test'){
		page.resourceUrl = 'http://localhost/dstour/img.' + page.domain + '/tour/' + page.domain;
	} else if (pageEnv == 'live'){
		page.resourceUrl = 'http://img.' + page.domain;
	}

// Now we start the big loop to create all of our list items (the pages
// that are showcased on each top10 list page)
//
// We start by creating some data placeholders so that they can be reset
// each time we start on a new sub-category page file.

	var listItems = [];
	var listItem = {};
	var itemIndex = 0;
	listItem.points = []

// Before starting the loop, we want to remove the top level items that
// provide information about the page (title, desc, etc) as these are only
// needed for the page itself, not the top 10 list of sites

	data.splice(0,4);

// Now we can loop over the rest of the file line by line

	for(i in data){

// I found the easiest way of catching each piece of data was to simply
// look at the beginning of each line.
//
// Lines starting with an H1 in our data sets will always be the title
// lines starting with an <a> tag will always be a description, etc.
//
// Since we're iterating over each line of the file one by one, we can
// reset the 'listItem' object each time we hit an H1 tag, since we know
// that is the title section of a new top10 list site.

		if(data[i].toString().startsWith("<h1>")){
			listItem = {};
			
			listItem.points = [];
			title = data[i].toString().replace("<h1>","").replace("</h1>","");
			listItem.title = title;
		}

// In the description, we do a bit of data splicing to get to the URL
// of the site since it's not really listed anywhere else in the file

		if(data[i].toString().startsWith("<a")){
			desc = data[i].toString();
			listItem.desc = desc;
			itemLink = desc.split('://');
			cleanLink = itemLink[1].toString().split('"');
			listItem.url = cleanLink[0].toString();
			baseUrl = cleanLink[0].toString().split('/');
			listItem.baseUrl = baseUrl[0].toString().replace("www.", "");
		}

// Buyline is pretty straightforward

		if(data[i].toString().startsWith("<h2>")){
			buyLine = data[i].toString().replace("<h2>","").replace("</h2>","");
			listItem.buyLine = buyLine;
		}

// Here we're collecting each of the point form 'feature' items into
// an array that will be part of the site 'listItem' object

		if(data[i].toString().startsWith("-")){
			point = data[i].toString().replace("-","");
			listItem.points.push(point);
		}

// Finally we capture the last 'listItem' variable and put the list item
// into our master array of top10 list items

		if(data[i].toString().startsWith("<h3>")){
			button = data[i].toString().replace("<h3>","").replace("</h3>","").replace("<a ", "<a class='btn-default' ");
			listItem.button = button;
			listItem.index = itemIndex;
			listItems.push(listItem);
			itemIndex++;
		}
	}

// In this step we render our pug layout files using the page object we just created
// and save it to a directory based on the page's URL value, serving a dual purpose.
//
// Each page can be accessed by visitng http://localhost:3000/public/domain/category/page
// and the HTML files we've generated can simply be copied over to the production server
// once we've confirmed they're ready to go.

	page.listItems = listItems;
	var pageHtml = pug.renderFile('./views/sex-games.pug', {page: page});
	var targetDir;
	if(page.category != page.name){
		targetDir = './public/' + page.domain + '/' + page.domaindir + '/' + page.category + '/' + page.name + '/index.html';
	} else {
		targetDir = './public/' + page.domain + '/' + page.domaindir + '/' +  page.category + '/index.html';
	}
	ensureDirectoryExistence(targetDir);
	fs.writeFile(targetDir, pageHtml, (err)=>{
		if (err) throw err;
		console.log(page.name + ' written to disk');
	})
	console.log(page.name)

// Now we can push the page data to our array of pages

	pageData.push(page);
	if(typeof callback === "function"){
		callback();
	}
}

// Function borrowed from StackOverflow to guarantee node fs can find
// and write to the directory we need to.

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Another little helper function that allows us to capitalize the first
// letter of each word, useful in cases where we need to clean up the plain
// text we've scraped from the content files.

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
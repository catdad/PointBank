#Point Bank

##Getting Started

The code and all downloads are available from the Point Bank GitHub repository, located at https://github.com/catdad/PointBank. This manual is a living document, and will be updated as the software receives updates. This is the most up-to-date version. Refer to the commit date of this file for a "last updated" date.

###I: Running the application in Windows

There is a Windows specific package for the application. Download the zip from tthis URL (http://goo.gl/xF3O9) and unzip it anywhere on your computer. It is advisable to use an easily accessible location, like C:\Workspace.

When you unzip the archive, you will see a `start.bat` file. Double click this file, and the application will start – it will open two separate command-line windows, although interaction with those windows is not necessary. If you get dependency errors when running Node, use the `install.bat` file in the same folder, although this should not be necessary most of the time.

_Note: before running the application for the first time, you must obtain access tokens from Twitter. This is described in section III of Getting Started._

###II: Running the application in any environment

Although only Windows zip files are available, the application can run on any operating system or environment. However, more steps are required to do so. First, download the plain application zip (http://goo.gl/qxFBg), which only contains the JavaScript files. Next, find a guide online for your operating system. You will need to install two software packages, called NodeJS and MongoDB. This process is further described below.

Google will help with this. Search for guides on setting up and configuring NodeJS and MongoDB, which can be found by searching this phrase: “Install and running [software name] on [operating system name]” replacing the names with the ones you are looking for.

On a Mac, there are pre-built binaries of all of the files that are needed. These will be available at http://nodejs.org/download/ and http://www.mongodb.org/downloads. For Linux distributions, there is a good chance you will have to build these packages from source. Follow the guide that you find online.

The default file for the application is `app.js`. This will  be the file that needs to be used when starting NodeJS. The software is designed to work with the default settings of both NodeJS and MongoDB, but if you need to change anything – such as port numbers – you can do so in the `config.json` file.

###III: Setting up oAuth access

Authentication is required for all calls to the Twitter API. The application is not distributed with access tokens, so each user will have to generate their own. There is a `keys.json` file distributed with the application, where you will need to paste your keys. Getting keys is a straightforward process that is done through the Twitter website.

1. First, you must have a Twitter account. Sign up accordingly at https://twitter.com/
2. Go to https://dev.twitter.com/apps and sign in. This is the developer area of Twitter.
3. Click the “Create a new application” button in the top right.
4. In the form, give your application any name and description. Since this is for private use only, these values are not important.
5. By default, this application will run on personal computers, and not be accessible to the web. Therefore, the Website URL does not matter, and you can use a placeholder, such as `http://www.example.com`.
6. Leave Callback blank. Agree to the terms and submit the form.

Submitting the form will take you to the specific app section. Here, among other things, you will find the fields “Consumer key” and “Consumer secret”. These identify your specific application to Twitter. These need to be included in the `keys.json` file under `consumer_key` and `consumer_secret`, accordingly.

Next, click the “Create my access tokens” at the bottom of the app page. This will generate tokens specific to your user account (rather than specific to the app). Creating these tokens may take a second or two, but after you refresh the page, there will be two tokens available, the “Access token” and the “Access token secret”. These need to be places in the `keys.json` file as `oauth_token` and `oauth_token_secret`.

All four tokens are needed when making requests to Twitter. Make sure to save the file and keep it in its original location.

##Using the Application

###IV: The basics

The default URL is `http://localhost:8888`. If it does not open automatically, you will need to open it in your web browser. _Note: some features may not work in all browsers. Development was done using Google Chrome. Also, if you changed the port number in the setup process, you will need to use that port number in the URL. For example, changing to port 8080 will make the URL `http://localhost:8080`._

This URL will take you to the start page. From there, you can go to Collect to create collection tasks, or go to Data to view the data you have already collected, both available from the top navigation bar. These sections are detailed below.

###V: Collecting tweets

Collecting data is done through specific tasks -- think of a sentence like “search for tweets with the word ‘cheesecake’ in the continental United States that have a location.” All of this can be set up through the form. Here are the basic steps.

1. Pick whether you would like to Search or Stream. Search is most appropriate if you are interested in getting already submitted Tweets. This will take a bit longer, and is not in real time, but is helpful if you just want the Tweets that were submitted yesterday or in the past several hours. If searching, you will need to provide an interval, so that the search is repeated every so often. Stream is most appropriate for real-time tasks and tweets that will be submitted in the future. This is useful if you would like to track an event and you can start the task ahead of time, such as conferences or storms with enough warning.
2. Pick what you would like to search for. This can be any term that you would regularly type into the search box on Twitter. For example, you can search for words, phrases, or hashtags.
3. Select how many tweets you would like to collect. This is done to limit samples to a manageable amount. Note: infinite collections are not yet implemented, but you can pick a large enough number that you are sure will not be exceeded.
4. If you want tweets from anywhere, leave the default location of “Everywhere”. If you would like to add a location, however, you can do so using the map. The map will be used for a bounding box for the data, so make sure your entire area of interest fits in the map area.
5. Check the appropriate boxes for the location attribute of the tweets:
  * Collect coordinates: this will enable the location attribute. It is safe to always check this box.
  * Geocode location names: this will enable geocoding of string locations. This will likely lower the quality of the dataset (from pure coordinates to city-center coordinates). Select this if you would like the most tweets placed on a map.
  * Collect tweets with no location: this will save all of the tweets that are found, regardless of location. The previous two boxes will be honored, so locations will still be collected; however, tweets without a valid location will be saved as well. Check this box if you do not care about location data.

Click Submit. This will take you to the Data page, where you will see a card for every task that you have created. Find the task that you want, and click Details. On the right side column, there are Action buttons, which allow you to start and stop the task, as well as delete it after you are done with the data. Click the start button to begin collecting tweets. Note: if you restart the software, you must start each task again in order to keep collecting tweets.
 
###VI: Getting the data
When you click on Data in the navigation bar, you will see all of the tasks that you have created. Each task will have a Map button that will show you a quick map, and a Details button that will show you more information and options for each task. On the details page, there are two columns. The left column will give you detailed information on the task that was created, as well as statistics on the tweets that were collected. The right column has data and visualizations options. The Action buttons allow you to start and stop collecting, as well as delete all of the data associated with that task. These buttons are further described in section V.

Various visualizations are also available.
- **basic map**: this will open a simple map and display the tweets.
- **ArcGIS Online**: this will open the tweets in ArcGIS Online using Esri’s format of JSON data, where you can save them as a webmap and export to various places. This is external service.
- **Google Maps**: this will open the tweets in Google Maps using the GeoJSON format. This is an external service, and is not yet fully implemented.
- **WebGL globe**: this will open the tweets in a 3D globe. This is an experimental external service.

From the details page, it is also possible to query the data -- this is the way to retrieve JSON out of the database. However, the interface for this has not been fully developed. Currently, it is only possible to query the data using a standard API format through URL GET requests. You can go to `http://localhost:8888/api` in the application to find out more about querying using the URL.

##Developers

The application is written entirely in JavaScript, and has various different modules. Here, I will detail all the files and the gist of what they do:

- `app.js`: this is the main file. It handles routing and some setup.
- `taskr.js`: this file contains task-based code, such as start, stop, and delete actions, as well as finding tasks.
- `searchr.js`: this file handles search tasks. It interfaces with the Search API and retrieves tweets.
- `streamr.js`: this file handles stream tasks. It is a wrapper for the Tuiter (https://github.com/danzajdband/Tuiter) library, and has the same calls as searchr.js.
- `geocoder.js`: this file handles all geocoding, and interfaces with Esri’s geocoder. This file can be replaced with one for another service, although it has to respect all the same calls and provide the same callback options.
- `taskHelper.js`: this file has common code for all tasks. Most notably, this file saves all of the tweets from search and stream tasks.
- `dataStore.js`: this file is used to set up the database. All other files use the database connection set up here.
- `headers.js`: this file handles returning some of the common mime types.
- `keys.json`: this file holds the access tokens for Twitter. Refer to section III.
- `config.json`: this file holds some configurable options for the application. Refer to section II. You will generally not have to change anything in here.
- `package.json`: this is the install file for the application, as necessary for NPM. This file holds some metadata for the application. Most notably, it will have references to all of the dependencies. This file is required in order to run `npm install` on the package.
- **other files**: the rest of the files are old versions for outdated iterations of the application. They are generally unused, but may have helpful code snippets for further features. Most notably, `enrich.js` shows how to add plugins for data processing.
- **/public**: this folder holds files that are used by the website interface. It holds CSS and client-side JavaScript. It may be necessary to edit these for UI tweaks.
- **/views**: this folder holds the individual website pages, written in [JADE](http://jade-lang.com/). Think of these as the HTML files for the website.
- **/unused**: very experimental. This is only for the brave.

This application was written with the [Express library](http://expressjs.com/), and relies heavily on its features. It was written while Express was still in experimental development, and therefore relies on the 2.5.x branch version. It is not compatible with newer versions of Express due to API changes in app creation and the Jade engine. These are the other notable dependencies:

- [MongoJS](https://github.com/gett/mongojs): this is the database driver. It is used to connect to MongoDB, and provides all of the necessary methods to interact with the database. This is usually attached to the app as db.
- [request](https://github.com/mikeal/request): this is the de-facto NodeJS web request library, and is used to interface with the Search API for Twitter, as well as the geocoding service. This can be used anywhere that a web request is needed.
- [Tuiter](https://github.com/danzajdband/Tuiter): this is used to interface with the Stream API for Twitter.
- [GZippo](https://github.com/tomgco/gzippo): this library is used to gzip large datasets. It was chosen due to problems with the Connect package built into the specific version of Express. If the app is updated to a new version of Express, the default gzip options will work just fine.
- [proj4js](https://github.com/temsa/node-proj4js): this package is used in converting coordinate systems when Esri products request projected coordinates.

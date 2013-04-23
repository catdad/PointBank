$(function(){

  /*
   * Render the map
   */
  dojo.require("esri.map");
  dojo.addOnLoad(mapinit);
  

});

 var map, count=0, socket, symbol, infotemplate, counterinfo, heatLayer, points=[];
 var updatecounter = 0, show="points"; 

  var mapinit = function() {
      console.log("inside map init");
      var initExtent = new esri.geometry.Extent({"xmin":-18244638.36888046,"ymin":-9329456.854708344,"xmax":19325689.773839638,"ymax":16500143.743411724,"spatialReference":{"wkid":102100}});
      map = new esri.Map("map",{
            extent:initExtent
      });
       var basemap = new esri.layers.ArcGISTiledMapServiceLayer("http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer");
          map.addLayer(basemap);
           dojo.connect(map, 'onLoad', function(map) { 
            console.log("inside map onload");
            //resize the map when the browser resizes
            //dojo.connect(dijit.byId('map'), 'resize', map,map.resize);
            var ager = new esri.renderer.TimeRampAger([new dojo.Color([0, 1, 1, 0.1]), new dojo.Color([0, 255, 255, 1])], [4, 12]);
            map.graphics.setRenderer(ager);
            symbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([5, 1, 200, 0.6])).setSize(9).setOutline(null);     
            infotemplate = new esri.InfoTemplate("Attributes", "${*}");   
            //heatmap layer
            heatLayer = new modules.HeatLayer(null, {
              //opacity : 0.9,
              dotRadius : 80,
              visible : true,
              globalMax : true
            });
            map.addLayer(heatLayer);

            clusterLayer = new modules.ClusterLayer(null, {
                map : map,
                visible : true,
                size:20,
                intervals : 5,
                pixelsSquare : 128,
                rgb : [26, 26, 26],
                textrgb : [255, 255, 255]
              });            
            
            getTweets();
          });      
  }

  var chooseDisplay = function(val) {
    if( val == "points") {
      show = "points";
      heatLayer.hide();
      clusterLayer.hide();
      map.graphics.show();
    } else if( val == "clusters") {
      show = "cluster";
      heatLayer.hide();
      clusterLayer.show();
      map.graphics.clear();
      map.graphics.hide();
    } else if( val == "heatmap") {
      show = "heatmap";
      heatLayer.show();
      clusterLayer.hide();
      map.graphics.clear();
      map.graphics.hide();
    }
  }

  var getTweets = function() {
     console.log("inside getweets");
     //socket = io.connect();
     socket = io.connect('http://loan133488kv.esri.com:8888');
     count = 0;
     counterinfo = $('#totaldiv')[0];
     points = [];
     updatecounter = 0;     
    /*
       * socket.io
       */
    socket.on('tweet', function(data){
        //var pt_ll = new esri.geometry.Point(data.coordinates[1],data.coordinates[0]);
        console.log(data);
		var pt_ll = new esri.geometry.Point(data.latLon[1],data.latLon[0]);
        var pt = new esri.geometry.geographicToWebMercator(pt_ll);
        points.push({x:pt.x,y:pt.y});
        count++;
        updatecounter++;
            /*
            if(count<2000) {
              var attr = {"pic":data.pic, "by": data.screen_name, "text": data.text};
              map.graphics.add(new esri.Graphic(pt, symbol, attr, infotemplate));
            }
            */
        counterinfo.innerHTML = count;
        if(updatecounter > 0) {
          updatecounter = 0;
          if(show == "cluster")
            clusterLayer.setData(points);
          else if(show == "heatmap")
            heatLayer.setData(points);
          else if (show == "points")
              map.graphics.add(new esri.Graphic(pt, symbol, null, null));
        }
    });
  }
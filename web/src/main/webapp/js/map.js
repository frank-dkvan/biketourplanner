var mainTemplate = require('./main-template.js');
var tileLayers = require('./config/tileLayers.js');

var routingLayer;
var map;
var menuStart;
var menuIntermediate;
var menuEnd;
var elevationControl = null;

// called if window changes or before map is created
function adjustMapSize() {
    var mapDiv = $("#map");
    var width = $(window).width() - 280;
    if (width < 400) {
        width = 400;
        mapDiv.attr("style", "position: relative; float: right;");
    } else {
        mapDiv.attr("style", "position: absolute; right: 0;");
    }
    var height = $(window).height();
    if (height < 500)
        height = 500;

    mapDiv.width(width).height(height);
    $("#input").height(height);

    console.log("adjustMapSize " + height + "x" + width);

    // reduce info size depending on how heigh the input_header is and reserve space for footer
    $(".instructions_info").css("max-height",
            height - 60 -
            $(".route_description").height() - $("#route_result_tabs li").height() -
            $("#input_header").height() - $("#footer").height());

    // reduce info size depending on how high the input_header is and reserve space for footer
//    $("#info").css("max-height", height - $("#input_header").height() - 100);
}

function initMap(bounds, setStartCoord, setIntermediateCoord, setEndCoord, selectLayer) {
    adjustMapSize();
    log("init map at " + JSON.stringify(bounds));

    var defaultLayer = tileLayers.selectLayer(selectLayer);

    // default
    map = L.map('map', {
        layers: [defaultLayer],
        contextmenu: true,
        contextmenuWidth: 145,
        contextmenuItems: [{
                separator: true,
                index: 3,
                state: ['set_default']
            }, {
                text: 'Show coordinates',
                callback: function (e) {
                    alert(e.latlng.lat + "," + e.latlng.lng);
                },
                index: 4,
                state: [1, 2, 3]
            }, {
                text: 'Center map here',
                callback: function (e) {
                    map.panTo(e.latlng);
                },
                index: 5,
                state: [1, 2, 3]
            }],
        zoomControl: false,
        loadingControl: false
    });

    addLayer('Lodging', ['poi_lodging', 'poi_lodging_label']);
    addLayer('Campsite', ['poi_campsites', 'poi_campsites_label']);
    addLayer('Bicycle shop', [ 'poi_bicycle_shops', 'poi_label_bicycle_shops']);
    addLayer('Drinking water', ['poi_drinking_water']);
    
    var _startItem = {
        text: 'Set as start',
        callback: setStartCoord,
        disabled: false,
        index: 0
    };
    var _intItem = {
        text: 'Set intermediate',
        callback: setIntermediateCoord,
        disabled: true,
        index: 1
    };
    var _endItem = {
        text: 'Set as end',
        callback: setEndCoord,
        disabled: false,
        index: 2
    };
    menuStart = map.contextmenu.insertItem(_startItem, _startItem.index);
    menuIntermediate = map.contextmenu.insertItem(_intItem, _intItem.index);
    menuEnd = map.contextmenu.insertItem(_endItem, _endItem.index);

    var zoomControl = new L.Control.Zoom({position: 'topleft'}).addTo(map);

    new L.Control.loading({
        zoomControl: zoomControl
    }).addTo(map);

    map.contextmenu.addSet({
        name: 'markers',
        state: 2
    });

    map.contextmenu.addSet({
        name: 'path',
        state: 3
    });

    L.control.layers(tileLayers.getAvailableTileLayers()/*, overlays*/).addTo(map);
    
    map.on('baselayerchange', function (a) {
        if (a.name) {
            tileLayers.activeLayerName = a.name;
            tileLayers.setActivelayer(a);
            var credits = L.control.attribution().addTo(map);
            credits.addAttribution("© <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>");
            $("#export-link a").attr('href', function (i, v) {
                return v.replace(/(layer=)([\w\s]+)/, '$1' + tileLayers.activeLayerName);
            });
        }
    });

    $('#layerfeatures').hide();
    $("#layerfeatures").css("visibility","hidden");

    map.on('mousemove', function (e) {
       var maplayer = tileLayers.activeLayer;
       var pointarr = [e.containerPoint.x, e.containerPoint.y];
       var features = maplayer._glMap.queryRenderedFeatures(pointarr, {layers: ['poi_lodging', 'poi_lodging_label', 'poi_campsites', 'poi_campsites_label', 'poi_bicycle_shops', 'poi_label_bicycle_shops' ]});

       if ( features.length !==0 )
       {
         $('#layerfeatures').show();
         $('#layerfeatures').css("visibility","visible");
         var properties = features[0].properties;
         delete properties.id;
         var displaytext=JSON.stringify(properties, null, 1).replace(/{/g,'').replace(/}/g,'');
         document.getElementById('layerfeatures').innerHTML = displaytext.replace(/\",/g,'').replace(/\"/g,'');
         var len = 0.5 + 1.5 * displaytext.split('\": \"').length;
         $('#layerfeatures').css('height', len  + 'em');
       }
       else
       {
          $('#layerfeatures').hide();
          $("#layerfeatures").css("visibility","hidden");
       }
    });

/*
if (0 ===1)
{
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    var meta1nJson = require('../geojson/austria.json');
    
    var markerlayershow = false;
    var tempMarker;
    
    map.on('zoomend', function() {
         var currentZoom = map.getZoom();
         if ((currentZoom >= 14) && (markerlayershow === false))
         {
             tempMarker =
             L.geoJson(meta1nJson, {
               pointToLayer: function (feature, latlng) {
               return L.circleMarker(latlng, geojsonMarkerOptions);
              }
             });
             tempMarker.addTo(map);
             markerlayershow = true;
         }
         else
         {
             if ((markerlayershow) && (currentZoom < 14))
             {
                 map.removeLayer(tempMarker);
                 markerlayershow = false;
             }
         }
    });
}
*/
    L.control.scale().addTo(map);

    map.fitBounds(new L.LatLngBounds(new L.LatLng(bounds.minLat, bounds.minLon),
            new L.LatLng(bounds.maxLat, bounds.maxLon)));

    //if (isProduction())
    //    map.setView(new L.LatLng(0, 0), 2);

    map.attributionControl.setPrefix('');

    var myStyle = {
        "color": 'black',
        "weight": 2,
        "opacity": 0.3
    };
    var geoJson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [bounds.minLon, bounds.minLat],
                [bounds.maxLon, bounds.minLat],
                [bounds.maxLon, bounds.maxLat],
                [bounds.minLon, bounds.maxLat],
                [bounds.minLon, bounds.minLat]]
        }
    };

    if (bounds.initialized)
        L.geoJson(geoJson, {
            "style": myStyle
        }).addTo(map);

    routingLayer = L.geoJson().addTo(map);
    routingLayer.options = {
        // use style provided by the 'properties' entry of the geojson added by addDataToRoutingLayer
        style: function (feature) {
            return feature.properties && feature.properties.style;
        },
        contextmenu: true,
        contextmenuItems: [{
                text: 'Route ',
                disabled: true,
                index: 0,
                state: 3
            }, {
                text: 'Set intermediate',
                callback: setIntermediateCoord,
                index: 1,
                state: 3
            }, {
                separator: true,
                index: 2,
                state: 3
            }],
        contextmenuAtiveState: 3
    };
}

function focus(coord, zoom, index) {
    if (coord.lat && coord.lng) {
        if (!zoom)
            zoom = 11;
        routingLayer.clearLayers();
        map.setView(new L.LatLng(coord.lat, coord.lng), zoom);
        mainTemplate.setFlag(coord, index);
    }
}

module.exports.clearLayers = function () {
    routingLayer.clearLayers();
};

module.exports.getRoutingLayer = function () {
    return routingLayer;
};

module.exports.addDataToRoutingLayer = function (geoJsonFeature) {
    routingLayer.addData(geoJsonFeature);
};

module.exports.eachLayer = function (callback) {
    routingLayer.eachLayer(callback);
};

module.exports.setDisabledForMapsContextMenu = function (entry, value) {
    if (entry === 'start')
        map.contextmenu.setDisabled(menuStart, value);
    if (entry === 'end')
        map.contextmenu.setDisabled(menuEnd, value);
    if (entry === 'intermediate')
        map.contextmenu.setDisabled(menuIntermediate, value);
};

module.exports.fitMapToBounds = function (bounds) {
    map.fitBounds(bounds);
};

module.exports.removeLayerFromMap = function (layer) {
    map.removeLayer(layer);
};

module.exports.focus = focus;
module.exports.initMap = initMap;
module.exports.adjustMapSize = adjustMapSize;

module.exports.addElevation = function (geoJsonFeature) {
    if (elevationControl === null) {
        elevationControl = L.control.elevation({
            position: "bottomright",
            theme: "white-theme", //default: lime-theme
            width: 450,
            height: 125,
            margins: {
                top: 10,
                right: 20,
                bottom: 30,
                left: 50
            },
            useHeightIndicator: true, //if false a marker is drawn at map position
            interpolation: "linear", //see https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-area_interpolate
            hoverNumber: {
                decimalsX: 2, //decimals on distance (always in km)
                decimalsY: 0, //decimals on height (always in m)
                formatter: undefined //custom formatter function may be injected
            },
            xTicks: undefined, //number of ticks in x axis, calculated by default according to width
            yTicks: undefined, //number of ticks on y axis, calculated by default according to height
            collapsed: false    //collapsed mode, show chart on click or mouseover
        });
        elevationControl.addTo(map);
    }

    elevationControl.addData(geoJsonFeature);
};

module.exports.clearElevation = function () {
    if (elevationControl)
        elevationControl.clear();
};

module.exports.getMap = function () {
    return map;
};

var FROM = 'from', TO = 'to';
function getToFrom(index, ghRequest) {
    if (index === 0)
        return FROM;
    else if (index === (ghRequest.route.size() - 1))
        return TO;
    return -1;
}

var iconFrom = L.icon({
    iconUrl: './img/marker-icon-green.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

var iconTo = L.icon({
    iconUrl: './img/marker-icon-red.png',
    shadowSize: [50, 64],
    shadowAnchor: [4, 62],
    iconAnchor: [12, 40]
});

module.exports.createMarker = function (index, coord, setToEnd, setToStart, deleteCoord, ghRequest) {
    var toFrom = getToFrom(index, ghRequest);
    return L.marker([coord.lat, coord.lng], {
        icon: ((toFrom === FROM) ? iconFrom : ((toFrom === TO) ? iconTo : new L.NumberedDivIcon({number: index}))),
        draggable: true,
        contextmenu: true,
        contextmenuItems: [{
                text: 'Marker ' + ((toFrom === FROM) ?
                        'Start' : ((toFrom === TO) ? 'End' : 'Intermediate ' + index)),
                disabled: true,
                index: 0,
                state: 2
            }, {
                text: 'Set as ' + ((toFrom !== TO) ? 'End' : 'Start'),
                callback: (toFrom !== TO) ? setToEnd : setToStart,
                index: 2,
                state: 2
            }, {
                text: 'Delete from Route',
                callback: deleteCoord,
                index: 3,
                state: 2,
                disabled: (toFrom !== -1 && ghRequest.route.size() === 2) ? true : false // prevent to and from
            }, {
                separator: true,
                index: 4,
                state: 2
            }],
        contextmenuAtiveState: 2
    }).addTo(routingLayer).bindPopup(((toFrom === FROM) ?
            'Start' : ((toFrom === TO) ? 'End' : 'Intermediate ' + index)));
};

function addLayer(name, id) {
    var link = document.createElement('a');
    link.href = '#';
    link.className = '';
    link.textContent = name;

    link.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        
        for (index = 0; index < id.length; ++index) {
          var maplayer = tileLayers.activeLayer;
          var visibility = maplayer._glMap.getLayoutProperty(id[index], 'visibility');

          if (visibility === 'visible') {
              maplayer._glMap.setLayoutProperty(id[index], 'visibility', 'none');
              this.className = '';
          } else {
              this.className = 'active';
              maplayer._glMap.setLayoutProperty(id[index], 'visibility', 'visible');
          }
        }
    };

    var layers_menu = document.getElementById('layer_menu');
    layers_menu.appendChild(link);
}

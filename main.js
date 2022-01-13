
var map = L.map('botw_map', {
  preferCanvas: true,
  minZoom: -4,
  maxZoom: 4,
  center: [0, 0],
  zoom: -4,
  crs: L.CRS.Simple
});
var southWest = map.unproject([-6000, 5000], 0);
var northEast = map.unproject([6000, -5000], 0);
var bounds = new L.LatLngBounds(southWest, northEast);
L.imageOverlay('BotW-Map-Grid.png', bounds).addTo(map);
map.setMaxBounds(bounds);

var query = window.location.href.search('list=');
var locationfile = 'map_locations.js';
if (query > 0) {
  locationfile = window.location.href.substr(window.location.href.search('list=')+5) + '.js';
}
$.getScript(locationfile, function() {
  
  var internal_names = Object.keys(locations).sort();
  var listHtml = internal_names.map(renderListItem).join("");

  $('#sidebar > ul').append(listHtml);

  var icons = Array.from(Array(12).keys()).map(i => L.divIcon({className: 'div-icon' + i}));
  var markers = {};

  var markerClusterGroupOptions = {
    removeOutsideVisibleBounds: true,
    spiderfyOnMaxZoom: false,
    disableClusteringAtZoom: 0,
    animate: false,
    maxClusterRadius: 20, 
    iconCreateFunction: function(cluster) {
      var childMarkers = cluster.getAllChildMarkers();
      var titleText = '';
      var iconClassName = '';

      if (childMarkers.length > 0) {
        var childOptions = childMarkers[0].options;
        titleText = childOptions.title;

        if (childOptions.icon) {
          iconClassName = childOptions.icon.options.className || '';
        }
      }
      // Set the options and icon based on inherited child values
      cluster.options.title = childMarkers.length + " x " + titleText;
      return L.divIcon({
        html: cluster.getChildCount(),
        className: "big-icon " + iconClassName,
        iconSize: [18, 18]
      });
    }
  };

  // Note: in case we want to load the sidebar items asynchronously, using this style of event
  // handler will apply to both current and future items
  $('#sidebar > ul').on('change', 'input', function () {
    if (!(this.name in markers)) {
      markers[this.name] = L.markerClusterGroup(markerClusterGroupOptions);
    }
    var groupMarker = markers[this.name];

    if ($(this).is(':checked')) {

      var markerOptions = {
        icon: icons[stringToValue(this.name) % icons.length],
        keyboard: false,
        title: getExpandedName(this.name)
      };

      var targetLocations = locations[this.name].locations;
      var newMarkers = targetLocations.map(target => {
        var coords = map.unproject(target, 0);
        return L.marker(coords, markerOptions);
      });
      groupMarker.addLayers(newMarkers);
      map.addLayer(groupMarker);
    } else {
      map.removeLayer(groupMarker);
      groupMarker.clearLayers(); // Get some memory back?
    }
  });

  var sidebarList = new List("sidebar", { valueNames: ['itemName'] });

  // Create preset filters
  var presetOptions = Object.keys(presets).map(presetName => '<option>' + presetName + '</option>');
  $('#filter').append(presetOptions.join(""));
  $("#filter").chosen().change(function(){
    var selectedOptions = $(this).val();
    if (!selectedOptions) {
      sidebarList.filter();
    } else {
      var regexList = $(this).val().map(presetName => new RegExp('.*(' + presets[presetName].join("|") + ').*'));
      sidebarList.filter(item => {
        var itemName = item.values().itemName;
        return regexList.every(regex => regex.test(itemName));
      });
    }
  });

  $('#selectAll').click(function() {
    $('.list input:checkbox:not(:checked)').prop('checked', true).trigger('change');
  });

  $('#selectNone').click(function() {
    $('.list input:checkbox:checked').prop('checked', false).trigger('change');
  });

  sidebarList.on('searchComplete', setSelectAllSafety);
  sidebarList.on('filterComplete', setSelectAllSafety);

  function setSelectAllSafety() {
    $('#selectAll').prop('disabled', sidebarList.matchingItems.length > 1000);
  }
});

// hash the string
function stringToValue(str) {
  var hash = 0;
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};
function getExpandedName(internal_name) {
  return ((locations[internal_name].display_name !== internal_name) ? locations[internal_name].display_name + ' — ': '') + internal_name;
}
function renderListItem(internal_name) {
  var s = '<li><label><input type="checkbox" name="' + internal_name + '">';
  if (locations[internal_name].display_name !== internal_name) {
    s += '<span class="display-name">' + locations[internal_name].display_name + '</span> <span class="name-separator">—</span> ';
  }
  s += '<span class="internal-name">' + internal_name + '</span><span class="itemName">'+getExpandedName(internal_name)+'</span></label></li>';
  return s;
};

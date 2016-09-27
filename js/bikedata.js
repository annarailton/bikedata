// Bike data application code
bikedata = (function ($) {
	
	'use strict';
	
	// Internal class properties
	var _settings = {};
	var _map = null;
	
	// Icons
	var _icons = {
		'slight':  'images/icons/icon_collision_slight.svg',
		'serious': 'images/icons/icon_collision_serious.svg',
		'fatal':   'images/icons/icon_collision_fatal.svg',
	};
	
	
	return {
		
	// Public functions
		
		// Main function
		initialise: function (config)
		{
			// Obtain the configuration and allocate as settings
			_settings = config;
			
			// Create the map
			bikedata.createMap ();
			
			// Load the tabs
			bikedata.loadTabs ();
			
			// Add map interactions from the form
			bikedata.formInteraction ();
		},
		
		
		// Create the map
		createMap: function ()
		{
			// create a map in the "map" div, set the view to a given place and zoom
			_map = L.map('map').setView([51.505, -0.09], 13);
			
			// Add the tile layer
			L.tileLayer(_settings.tileUrl, {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors; <a href="https://www.thunderforest.com/">Thunderforest</a>'
			}).addTo(_map);
			
			// Add geolocation control
			bikedata.geolocation ();
			
			// Add hash support
			new L.Hash (_map);
			
			// Get the data on initial load
			bikedata.getData ();
			
			// Register to refresh data on map move
			_map.on ('moveend', function (e) {
				bikedata.getData ();
			});
		},
		
		
		// Wrapper function to add a geolocation control
		geolocation: function ()
		{
			// Attach the autocomplete library behaviour to the location control
			autocomplete.addTo ("input[name='location']", {
				sourceUrl: _settings.apiBaseUrl + '/v2/geocoder' + '?key=' + _settings.apiKey + '&bounded=1&bbox=' + _settings.autocompleteBbox,
				select: function (event, ui) {
					var result = ui.item;
					var geojsonItemLayer = L.geoJson(result.feature);
					_map.fitBounds(geojsonItemLayer.getBounds ());
					event.preventDefault();
				}
			});
		},
		
		
		// Function to load the tabs
		loadTabs: function ()
		{
			$('nav').tabs();
		},
		
		
		// Function to manipulate the map based on form interactions
		formInteraction: function ()
		{
			// Get the form parameters on load
			var parameters = bikedata.parseFormValues ();
			
			// Fetch the data
			bikedata.getData (parameters);
			
			// Reload the data, using a rescan of the form parameters when any change is made
			$('form :input').change(function() {
				parameters = bikedata.parseFormValues ();
				bikedata.getData (parameters);
			});
		},
		
		
		// Function to parse the form values, returning the minimal required set of key/value pairs
		parseFormValues: function ()
		{
			// Start a list of parameters that have a value
			var parameters = {};
			
			// Define the delimiter used for combining groups
			var delimiter = ',';	// Should match the delimiter defined by the API
			
			// Loop through list of inputs (e.g. checkboxes, select, etc.)
			$(':input').each(function() {
				
				// Determine the input type
				var tagName = this.tagName.toLowerCase();	// Examples: 'input', 'select'
				var type = $(this).prop('type');			// Examples: 'text', 'checkbox', 'select-one'
				
				// Obtain the element name
				var name = $(this).attr('name');
				
				// For checkboxes, degroup them by creating/adding a value that is checked, split by the delimiter
				if (tagName == 'input' && type == 'checkbox') {
					if (this.checked) {
						name = name.replace(/\[\]$/g, ''); // Get name of this checkbox, stripping any trailing grouping indicator '[]' (e.g. values for 'foo[]' are registered to 'foo')
						var value = $(this).val();
						if (parameters[name]) {
							parameters[name] += delimiter + value; // Add value
						} else {
							parameters[name] = value; // Set value
						}
					}
					return;	// Continue to next input
				}
				
				// For all other input types, if there is a value, register it
				var value = $(this).val();
				if (value.length > 0) {
					parameters[name] = value;	// Set value
					return;	// Continue to next input
				}
			});
			
			// Return the parameters
			return parameters;
		},
		

		// Function to manipulate the map based on form interactions
		getData: function (parameters)
		{
			//console.log(parameters);
			
			// Start API data parameters
			var apiData = {};
			
			// Get the bbox
			apiData.bbox = _map.getBounds().toBBoxString();
			
			// Add the key
			apiData.key = _settings.apiKey;
			
			// Fetch data
			$.ajax({
				url: _settings.apiBaseUrl + '/v2/collisions.locations',
				dataType: 'json',
				crossDomain: true,	// Needed for IE<=9; see: http://stackoverflow.com/a/12644252/180733
				data: apiData,
				error: function (jqXHR, error, exception) {
					var data = $.parseJSON(jqXHR.responseText);
					alert('Error: ' + data.error);
				},
				success: function (data, textStatus, jqXHR) {
					return bikedata.showCurrentData(data);
				}
			});
		},
		
		
		// Function to construct the popup content
		popupHtml: function (feature)
		{
			// Construct the HTML
			var html = '<table>';
			for (var key in feature.properties) {
				if (feature.properties[key] === null) {
					feature.properties[key] = '[null]';
				}
				var value = feature.properties[key].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
				html += '<tr><td>' + key + ':</td><td><strong>' + value + '</strong></td></tr>';
			}
			html += '</table>';
			
			// Return the content
			return html;
		},
		
		
		// Function to show the data
		showCurrentData: function (data)
		{
			// Define the data layer
			var dataLayer = L.geoJson(data, {
				
				// Set icon type
				pointToLayer: function (feature, latlng) {
					var icon = L.marker (latlng, {
						// Icon properties as per: http://leafletjs.com/reference.html#icon
						icon: L.icon({
							iconUrl: _icons[feature.properties.severity],
							iconSize: [38, 95],
						})
					});
					return icon;
				},
				
				// Set popup
				onEachFeature: function (feature, layer) {
					var popupContent = bikedata.popupHtml (feature);
					layer.bindPopup(popupContent);
				}
			});
			
			// Add to the map
			dataLayer.addTo(_map);
		}
	}
} (jQuery));

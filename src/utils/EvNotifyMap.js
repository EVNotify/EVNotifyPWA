import {fromLonLat} from 'ol/proj';
import 'ol/ol.css';
import {Map, Overlay, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import {Icon, Style, Stroke} from 'ol/style';
import MomentJS from 'moment';

const DATE_TIME_FORMAT = 'Y/MM/DD HH:mm';

/**
 * @class
 * @constructor
 * @param {Element|string} target the element to display the map within as an element or the ID of an element.
 */
function EvNotifyMap(target) {
    this.popup = new Popup();
    this.map = new Map({
        target: target,
        layers: [
            new TileLayer({
                source: new OSM()
            }),
        ],
        overlays: [this.popup.overlay],
        view: new View()
    });
}

/**
 * Display the supplied drive log on the map.
 *
 * @param {Log} log
 */
EvNotifyMap.prototype.addLog = function (log) {
    const coordinates = log.stats
        .filter(value => value.longitude != null && value.latitude != null)
        .map(value => fromLonLat([value.longitude, value.latitude]));

    const start = createMarker(coordinates[0], require('../assets/marker-start.svg'));
    const end = createMarker(coordinates[coordinates.length - 1], require('../assets/marker-finish.svg'));
    const pathDrivenLineString = new LineString(coordinates);
    const pathDrivenFeature = new Feature({
        geometry: pathDrivenLineString
    });
    pathDrivenFeature.setStyle(new Style({
        stroke: new Stroke({
            color: 'red',
            width: 7
        })
    }));

    this.map.addLayer(new VectorLayer({
        source: new VectorSource({
            features: [pathDrivenFeature, start, end]
        })
    }));
    this.map.getView().fit(pathDrivenLineString.getExtent());
    this.map.on('click', event => {
        this.map.forEachFeatureAtPixel(event.pixel, feature => {

            /**
             * @param {Function} searchFunction
             */
            function findAndFormatSoC(searchFunction) {
                /** @type {LogStatEntry} */
                const candidate = searchFunction.call(log.stats, value => value.soc_display != null);
                if (candidate) {
                    return `<br />SoC (display): ${candidate.soc_display} %`;
                }
                return '';
            }

            /**
             * Finds the last item in an array that matches the given predicate
             *
             * @this {Array}
             * @param {Function} predicate
             */
            function findLast(predicate) {
                for (let i = this.length - 1; i >= 0; i--) {
                    if (predicate(this[i])) {
                        return this[i];
                    }
                }
            }

            if (feature === start) {
                this.popup.show(
                    'Begin of trip',
                    'Time: ' + MomentJS(log.start * 1000).format(DATE_TIME_FORMAT) + findAndFormatSoC(findLast),
                    start
                );
            } else if (feature === end) {
                this.popup.show(
                    'End of trip',
                    'Time: ' + MomentJS(log.end * 1000).format(DATE_TIME_FORMAT) +
                        findAndFormatSoC(Array.prototype.find),
                    end
                );
            }
        });
    });
};


/**
 * Display a marker for the last known location on the map.
 *
 * @param {Array.<number>} location
 * @param {string} timestamp
 */
EvNotifyMap.prototype.addLastLocation = function(location, timestamp) {
    const marker = createMarker(fromLonLat(location), require('../assets/marker-start.svg'));
    this.map.addLayer(new VectorLayer({
        source: new VectorSource({
            features: [marker]
        })
    }));
    this.map.on('click', event => {
        this.map.forEachFeatureAtPixel(event.pixel, feature => {
            if (feature === marker) {
                this.popup.show('Last position report', 'Report time: ' + timestamp, marker);
            }
        });
    });
    this.map.getView().fit(marker.getGeometry(), {maxZoom: 14});
};

function createMarker(coordinates, src) {
    const feature = new Feature({geometry: new Point(coordinates)});
    feature.setStyle(new Style({image: new Icon({src, anchor: [0.5, 1]})}));
    return feature;
}

/**
 * Helper class to show some information as a popup on the map (e.g. metadata when clicking something)
 *
 * @class
 * @constructor
 */
function Popup() {

    function element(parent, type, init) {
        const element = document.createElement(type);
        if (init) {
            init(element);
        }
        if (parent != null) {
            parent.appendChild(element);
        }
        return element;
    }

    this.element = element(null, 'div', root => {
        root.setAttribute('class', 'map-popup');

        element(root, 'div', head => {
            head.setAttribute('class', 'map-popup-head');
            this.headingElement = element(head, 'h1');

            element(head, 'a', closeElement => {
                closeElement.setAttribute('href', 'javascript:void(0)');
                closeElement.addEventListener('click', () => this.hide());
                closeElement.appendChild(document.createTextNode('X'));
            });
        });

        this.bodyElement = element(root, 'div', body => {
            body.setAttribute('class', 'map-popup-body');
        });
    });


    this.overlay = new Overlay({
        element: this.element,
        autoPan: true
    });
}

/**
 * Show the popup with the given attributes
 *
 * @param {string} heading
 * @param {string} contentHtml
 * @param {Feature} feature
 */
Popup.prototype.show = function (heading, contentHtml, feature) {
    this.headingElement.innerText = heading;
    this.bodyElement.innerHTML = contentHtml;
    const extent = feature.getGeometry().getExtent();
    this.overlay.setPosition([extent[0], extent[1]]);
};

Popup.prototype.hide = function () {
    this.overlay.setPosition(undefined);
};

export default EvNotifyMap;

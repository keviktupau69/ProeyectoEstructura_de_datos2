var map;
var busMarker;
var watchId;
var connection;

function initMap() {
    console.log("Inicializando mapa...");

    
    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
        console.error("No se encontró el elemento con ID 'map'");
        return;
    }

    try {
        map = new google.maps.Map(mapDiv, {
            center: { lat: -17.370700, lng: -66.136969 }, 
            zoom: 15,
            mapTypeId: 'roadmap'
        });

        var busIcon = {
            url: "https://maps.google.com/mapfiles/kml/shapes/bus.png",
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 20)
        };

        busMarker = new google.maps.Marker({
            position: { lat: -34.397, lng: 150.644 },
            map: map,
            icon: busIcon,
            title: "Mi Bus"
        });

        initializeSignalR();

        
        startTracking();

        console.log("Mapa inicializado correctamente");
    } catch (error) {
        console.error("Error al inicializar el mapa:", error);
    }
}

function initializeSignalR() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/locationHub")
        .configureLogging(signalR.LogLevel.Information)
        .build();

    connection.start()
        .then(() => console.log("Conexión SignalR establecida"))
        .catch(err => console.error("Error en SignalR:", err.toString()));
}

function startTracking() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            updatePosition,
            handleGeolocationError,
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 27000
            }
        );
    } else {
        console.warn("Geolocalización no soportada por el navegador");
        alert("Tu navegador no soporta geolocalización.");
    }
}

function updatePosition(position) {
    var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    console.log("Nueva posición:", pos);

    if (busMarker) busMarker.setPosition(pos);
    if (map) map.setCenter(pos);

    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("SendLocation", pos.lat, pos.lng)
            .catch(err => console.error("Error enviando ubicación:", err.toString()));
    }
}

function handleGeolocationError(error) {
    console.error('Error en geolocalización:', error.message);
    alert('Error obteniendo tu ubicación: ' + error.message);
}

window.onbeforeunload = function () {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        console.log("Geolocalización detenida");
    }
    if (connection) {
        connection.stop();
        console.log("Conexión SignalR cerrada");
    }
};
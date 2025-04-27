// Variables globales
var map, BusMarker, AquiId, connection;
var marcadores = {};
var direccionServicio, direccionRenderizado;
var semaforo = false;
let positionHistory = [];
const HISTORY_LENGTH = 5;
const MIN_UPDATE_INTERVAL = 100; // ms
const MIN_DISTANCE_CHANGE = 2; // metros
let lastProcessedPosition = null;

// Listado de pasajeros
const pasajeros = [
    { nombre: "Juan Jose", lat: -17.384468, lng: -66.158468 },
    { nombre: "Alex", lat: -17.387168, lng: -66.158606 },
    { nombre: "Jhosep", lat: -17.383494, lng: -66.169425 },
    { nombre: "Miguel", lat: -17.380478, lng: -66.160355 },
    { nombre: "Ivan", lat: -17.378859, lng: -66.165880 },
    { nombre: "Kevin", lat: -17.382397, lng: -66.166199 },
    { nombre: "Jorge", lat: -17.385810, lng: -66.166990 },
    { nombre: "Luis", lat: -17.378676, lng: -66.163721 }
];

function EnviarUbicacion() {
    pasajeros.forEach(p => {
        connection.invoke("AgregarPasajero", p.nombre, { Latitud: p.lat, Longitud: p.lng });
        console.log(`Ubicación de ${p.nombre} enviada`);
    });

    const boton = document.getElementById("EnviarDatos");
    if (boton) boton.remove();
}

// Construcción del mapa
function ConstruirMapa() {
    console.log("Construyendo mapa...");
    const mapDiv = document.getElementById("Map");

    if (!mapDiv) {
        console.error("No se encontró el div 'Map'");
        return;
    }

    try {
        map = new google.maps.Map(mapDiv, {
            center: { lat: -17.370700, lng: -66.136969 },
            zoom: 15,
            mapTypeId: 'roadmap'
        });

        BusMarker = new google.maps.Marker({
            position: { lat: -17.370700, lng: -66.136969 },
            map: map,
            icon: CrearIconoBus(),
            title: "Mi bus",
        });

        direccionServicio = new google.maps.DirectionsService();
        direccionRenderizado = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#FF0000",
                strokeWeight: 5
            }
        });

        IniciarSignalR();
        Buscame();
        console.log("Mapa construido correctamente");
    } catch (error) {
        console.error("Error al construir el Mapa: ", error);
    }
}

function CrearIconoBus() {
    return {
        url: "https://maps.google.com/mapfiles/kml/shapes/bus.png",
        scaledSize: new google.maps.Size(40, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(20, 20),
    };
}

function Buscame() {
    if (navigator.geolocation) {
        AquiId = navigator.geolocation.watchPosition(ActualizarUbicacion, ErrorGeolocalizacion, {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000
        });
    } else {
        console.warn("Geolocalización no soportada");
        alert("Tu navegador no soporta geolocalización");
    }
}

function ActualizarUbicacion(position) {
    const now = Date.now();
    const newPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: now
    };

    if (lastProcessedPosition && (now - lastProcessedPosition.timestamp < MIN_UPDATE_INTERVAL)) return;

    if (lastProcessedPosition) {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(lastProcessedPosition.lat, lastProcessedPosition.lng),
            new google.maps.LatLng(newPos.lat, newPos.lng)
        );
        if (distance < MIN_DISTANCE_CHANGE) return;
    }

    positionHistory.push(newPos);
    if (positionHistory.length > HISTORY_LENGTH) positionHistory.shift();

    const smoothedPos = positionHistory.reduce((acc, pos) => ({
        lat: acc.lat + pos.lat / positionHistory.length,
        lng: acc.lng + pos.lng / positionHistory.length
    }), { lat: 0, lng: 0 });

    if (BusMarker) {
        const currentPos = BusMarker.getPosition() || smoothedPos;
        animateMarker(currentPos, smoothedPos);
    }

    if (map) map.panTo(smoothedPos);

    if (semaforo) checkNearbyPassengers(smoothedPos);

    lastProcessedPosition = newPos;
}

function animateMarker(fromPos, toPos) {
    const duration = 300;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const lat = fromPos.lat + (toPos.lat - fromPos.lat) * progress;
        const lng = fromPos.lng + (toPos.lng - fromPos.lng) * progress;

        BusMarker.setPosition({ lat, lng });

        if (progress < 1) requestAnimationFrame(animate);
    }

    animate();
}

function checkNearbyPassengers(currentPos) {
    for (const nombre in marcadores) {
        const passengerPos = marcadores[nombre].getPosition();
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(currentPos.lat, currentPos.lng),
            passengerPos
        );

        if (distance < 100) {
            MostrarBotonRecoger(nombre, passengerPos);
            semaforo = false;
            break;
        }
    }
}

function MostrarBotonRecoger(nombrePasajero, ubicacion) {
    const boton = document.getElementById("Boton-recoger");
    if (!boton) return console.warn("No se encontró el botón de recoger");

    boton.style.display = "block";
    boton.textContent = `Recoger a ${nombrePasajero}`;
    boton.onclick = () => {
        connection.invoke("RecogerPasajero", nombrePasajero, {
            Latitud: ubicacion.lat(),
            Longitud: ubicacion.lng()
        });
        console.log(`Recogiendo a: ${nombrePasajero}`);
        alert(`Pasajero ${nombrePasajero} recogido`);
        OcultarBotonRecoger();
        semaforo = true;
    };
}

function OcultarBotonRecoger() {
    const boton = document.getElementById("Boton-recoger");
    if (boton) {
        boton.style.display = "none";
        console.log("Botón de recoger ocultado");
    }
}

function ErrorGeolocalizacion(error) {
    console.error("Error en geolocalización: ", error.message);
    alert("Error en tu ubicación: " + error.message);
}

window.onbeforeunload = function () {
    if (AquiId) navigator.geolocation.clearWatch(AquiId);
    if (connection) connection.stop();
    console.log("Conexiones cerradas correctamente");
};

function IniciarSignalR() {
    console.log("Iniciando SignalR...");
    connection = new signalR.HubConnectionBuilder()
        .withUrl("https://localhost:7210/Conexion/SignalR", {
            withCredentials: true,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

    connection.on("RecibirPasajeros", (nombre, ubicacion) => {
        console.log(`Pasajero recibido: ${nombre}`, ubicacion);
        marcadores[nombre] = new google.maps.Marker({
            position: { lat: ubicacion.latitud, lng: ubicacion.longitud },
            map: map,
            title: nombre
        });
    });

    connection.start()
        .then(() => console.log("Conexión SignalR establecida"))
        .catch(err => console.error("Error en SignalR: ", err));
}

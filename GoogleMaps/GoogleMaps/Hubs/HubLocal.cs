using Microsoft.AspNetCore.SignalR;
using GoogleMaps.Models;

namespace GoogleMaps.Hubs
{
    public class HubLocal :Hub
    {
        public async Task EnviarUbicacion(Ubicacion ubicacion)
        {
            await Clients.All.SendAsync("RecibirUbicacion", ubicacion);
        }
    }
}

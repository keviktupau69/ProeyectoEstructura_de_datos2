using GoogleMaps.Models;

namespace GoogleMaps.Data
{
    public class Datos
    {
        private int _idPasajero = 0;
        private int Limite = 30;

        Dictionary<int, Pasajero> Pasajeros = new Dictionary<int, Pasajero>();

        void Agregar(Pasajero pasajero)
        {
            if (_idPasajero <= Limite)
            {
                Pasajeros.Add(_idPasajero, pasajero);
                _idPasajero += 1;
                Console.WriteLine("Pasajero agregado");
            }
            else
            {
                Console.WriteLine("Limite de pasajeros alcanzado");
            }
        }
            
    }
}

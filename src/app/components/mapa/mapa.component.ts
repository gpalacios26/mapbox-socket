import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from 'src/app/services/websocket.service';
import { Lugar } from 'src/app/interfaces/interfaces';

import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environments/environment';

interface RespMarcadores {
  [key: string]: Lugar
}

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {

  public mapa: mapboxgl.Map;
  public lugares: RespMarcadores = {};
  public markersMapbox: { [id: string]: mapboxgl.Marker } = {};

  constructor(
    private http: HttpClient,
    private wsService: WebsocketService
  ) { }

  ngOnInit(): void {
    this.http.get<RespMarcadores>(environment.wsUrl + '/mapa').subscribe(lugares => {
      this.lugares = lugares;
      this.crearMapa();
    });

    this.escucharSockets();
  }

  escucharSockets() {
    // marcador-nuevo
    this.wsService.listen('marcador-nuevo').subscribe((marcador: Lugar) => this.agregarMarcador(marcador));

    // marcador-mover
    this.wsService.listen('marcador-mover').subscribe((marcador: Lugar) => {
      this.markersMapbox[marcador.id].setLngLat([marcador.lng, marcador.lat])
    });

    // marcador-borrar
    this.wsService.listen('marcador-borrar').subscribe((id: string) => {
      this.markersMapbox[id].remove();
      delete this.markersMapbox[id];
    });
  }

  crearMapa() {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoiZ3BhbGFjaW9zMjYiLCJhIjoiY2tuY2owbHVoMjAxaDJvcGh6MzAwb3VqcSJ9.spX2JeIL5FeuL6J8sD60aw';

    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-75.75512993582937, 45.349977429009954],
      zoom: 15.8
    });

    for (const [id, marcador] of Object.entries(this.lugares)) {
      this.agregarMarcador(marcador);
    }
  }

  agregarMarcador(marcador: Lugar) {
    const h2 = document.createElement('h2');
    h2.innerText = marcador.nombre;

    const btnBorrar = document.createElement('button');
    btnBorrar.innerText = 'Borrar';

    const div = document.createElement('div');
    div.append(h2, btnBorrar);

    const customPopup = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false
    }).setDOMContent(div);

    const marker = new mapboxgl.Marker({
      draggable: true,
      color: marcador.color
    })
      .setLngLat([marcador.lng, marcador.lat])
      .setPopup(customPopup)
      .addTo(this.mapa);

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();

      const nuevoMarcador = {
        id: marcador.id,
        ...lngLat
      }

      // Emitir marcador-mover
      this.wsService.emit('marcador-mover', nuevoMarcador);
    });

    btnBorrar.addEventListener('click', () => {
      marker.remove();
      // Emitir marcador-borrar
      this.wsService.emit('marcador-borrar', marcador.id);
    });

    this.markersMapbox[marcador.id] = marker;
  }

  crearMarcador() {
    const customMarker: Lugar = {
      id: new Date().toISOString(),
      lng: -75.75512993582937,
      lat: 45.349977429009954,
      nombre: 'Sin Nombre',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    }

    this.agregarMarcador(customMarker);

    // Emitir marcador-nuevo
    this.wsService.emit('marcador-nuevo', customMarker);
  }

}

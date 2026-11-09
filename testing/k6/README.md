# 🚀 Prueba de Carga K6: Simulación de 100 Usuarios Navegando en Fulbeando

Este módulo contiene la prueba de carga y rendimiento desarrollada con **k6** para simular **100 usuarios concurrentes** navegando activamente por la aplicación **Fulbeando**.

---

## 📋 ¿Qué simula el script?

El script [`navegacion-100-usuarios.js`](file:///c:/Users/Dell%20PC/Desktop/Proyectos%20de%20Programacion/Fulbeando/testing/k6/navegacion-100-usuarios.js) recrea una carga realista mediante:

1. **Escalonamiento de Usuarios (Stages):**
   - **0s - 30s:** Ramp-up inicial a 30 usuarios virtuales (VUs).
   - **30s - 1m 15s:** Subida progresiva hasta alcanzar los **100 usuarios concurrentes**.
   - **1m 15s - 3m 15s:** Meseta de estrés sostenido con **100 usuarios navegando simultáneamente**.
   - **3m 15s - 4m:** Ramp-down gradual para cerrar conexiones de forma ordenada.

2. **Perfiles de Usuario (User Personas):**
   - **70% Jugadores Activos:**
     - Ingreso a Inicio (`/`)
     - Pantalla de Login (`/login`) con opción de autenticación
     - Exploración del Mapa Radar (`/radar`)
     - Consulta de Partidos y Desafíos (`/partidos`)
     - Revisión de Mi Equipo (`/equipo`)
     - Consulta de Turnos y Cartelera (`/turnos`)
     - Visualización del Perfil (`/perfil`) y Ajustes (`/ajustes`)
   - **20% Dueños de Predios:**
     - Login (`/login`)
     - Panel de Administración (`/venue-dashboard`)
     - Gestión de Turnos (`/turnos`) y Ajustes (`/ajustes`)
   - **10% Visitantes / Nuevos Registros:**
     - Landing (`/`), Mapa público (`/radar`), Carta pública (`/carta/:uid`) y Onboarding (`/role-selector`)

3. **Comportamiento Humano:**
   - Cada usuario virtual realiza pausas de lectura aleatorias (*think time* de 1.5 a 4 segundos) entre pantallas para no generar peticiones artificiales irrealistas.

4. **Criterios de Calidad (Thresholds):**
   - **Latencia P95:** El 95% de las solicitudes debe responder en menos de **800ms**.
   - **Latencia P99:** El 99% de las solicitudes debe responder en menos de **1500ms**.
   - **Tasa de Errores HTTP:** Menos del **2%**.
   - **Checks de Navegación:** Tasa de éxito superior al **98%**.

---

## ⚙️ Cómo Ejecutar la Prueba

### 1. Con la aplicación levantada localmente (Vite en puerto 5173):
```bash
npm run test:k6
```
o directamente con k6:
```bash
k6 run testing/k6/navegacion-100-usuarios.js
```

### 2. Probar contra otro entorno o puerto (por ejemplo, Hosting o Staging):
```bash
k6 run -e BASE_URL=http://localhost:5137 testing/k6/navegacion-100-usuarios.js
```

### 3. Ajustar el número de usuarios concurrentes al instante:
```bash
# Probar con 50 usuarios
k6 run -e TARGET_VUS=50 testing/k6/navegacion-100-usuarios.js

# Probar con 100 usuarios de forma directa
npm run test:k6:100
```

### 4. Simulación con Auth activa contra el Emulador de Firebase:
```bash
k6 run -e SIMULAR_AUTH=true -e AUTH_EMULATOR_URL=http://127.0.0.1:9099 testing/k6/navegacion-100-usuarios.js
```

---

## 📊 Reporte Generado

Al finalizar la prueba, se genera automáticamente un reporte visual e interactivo en formato HTML:
- Ubicación: `testing/resultados/k6-reporte.html`
- Muestra el resumen de usuarios concurrentes alcanzados, peticiones totales, tiempos de respuesta P95 y tasa de fallos.

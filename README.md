# Misión Radioterapia

Juego educativo web para una actividad de **Mujeres en la Ciencia**, diseñado para usarse en Safari desde varias iPads.

## Objetivo

Mostrar de forma visual y breve cómo distintas profesiones participan en radioterapia: la oncóloga radioterápica contornea, física médica diseña y evalúa un plan simplificado, y enfermería valora toxicidad durante el seguimiento.

## Estado

**V0.4 Classroom** — caso activo de mama izquierda.

La app incluye:
- CT axial de referencia con orientación radiológica.
- Tumor y cinco órganos a riesgo.
- Contorneo táctil por volumen con guía punteada, pincel y borrador.
- Validación educativa que penaliza tanto omisiones como dibujar fuera del objetivo.
- Planeación simplificada con 3–5 haces.
- Evaluación de toxicidad en el rol de Enfermería.
- Modo profesor con edición de referencias.
- Sesiones compartidas: el alumnado puede usar los contornos stock o conectarse a un código de sesión publicado por el profesor. Las referencias de la sesión se sincronizan automáticamente; el progreso de cada alumna permanece independiente.

## Classroom

1. El profesor abre la app y elige los contornos stock o se conecta a una sesión existente.
2. Entra a **Modo profesor**.
3. Ajusta las referencias y escribe un código, por ejemplo `CARO01`.
4. Pulsa **Publicar a todos**.
5. Las iPads del alumnado eligen **Conectarme a sesión** e introducen el mismo código.
6. Los cambios posteriores del profesor se reflejan automáticamente en las iPads conectadas.

Los datos compartidos de la sesión son únicamente las referencias educativas; dibujos, haces, puntuaciones y respuestas del alumnado permanecen locales a cada dispositivo.

## Alcance educativo

La simulación simplifica deliberadamente conceptos de radioterapia para una audiencia de preparatoria. No reproduce un sistema de planeación de tratamiento clínico y no debe utilizarse para decisiones médicas.

## Licencia

El código de este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE`.

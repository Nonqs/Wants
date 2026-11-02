# Plan de trabajo

La prioridad acordada es revisar primero una interfaz visual ejecutable. El documento
`../../CODEX_GESTOR_FINANCIERO_GO_MYSQL.md` define el alcance final; esta fase no sustituye su MVP.

## Decisión de frontend

Por indicación del usuario, el frontend será **Angular con TypeScript**.
Go conserva la CLI, los servicios de dominio y la futura API; MySQL será la fuente
de verdad. Angular sustituye la preferencia inicial de plantillas Go/HTMX.
El estado de demostración vive temporalmente en `DemoStore`; no es lógica contable
de producción. La API Go validará todas las operaciones al conectar datos reales.

### Adaptación a Angular

- [x] Crear workspace en `frontend/` con Router y componentes standalone.
- [x] Trasladar estilo y pantallas existentes a plantillas Angular.
- [x] Sustituir DOM manual por bindings, signals y formularios reactivos.
- [x] Mantener la ruta `/gasto-rapido` y las interacciones de la demo.
- [x] Preparar servidor Go para servir el build Angular con rutas directas.
- [x] Dependencias instaladas y `package-lock.json` generado en el workspace (pendiente incluir los archivos en el próximo commit).
- [x] Ejecutar `npm run build`: compilación de producción correcta.
- [ ] Verificar navegación, diálogos, formularios y modo oscuro en navegador.
- [ ] Comprobar que navegar entre páginas conserva el estado y recargar lo reinicia.
- [ ] Definir contrato API Go y cliente Angular con errores y estados de carga.
- [ ] Conectar sesión y protección CSRF con API en el mismo origen.

## Fase 0 — Interfaz para analizar

- [x] Inspeccionar CLI, comandos, modelo y almacenamiento.
- [x] Conservar CLI y JSON sin modificaciones.
- [x] Servidor de vista previa Go con recursos locales; ahora sirve el build de Angular.
- [x] Inicio con saldo, cuentas, gastos y progreso de deseos.
- [x] Navegación Inicio / Gastos / Deseos / Cuentas / Más y navegación inferior móvil.
- [x] Formulario de gasto rápido con concepto e importe; opciones plegables.
- [x] Ruta directa `/gasto-rapido`.
- [x] Interacciones temporales: gasto, búsqueda, nuevo deseo y reserva.
- [x] Tarjetas de deseos con ilustraciones locales y enlace opcional validado.
- [x] Tema según el sistema y cambio manual; etiquetas, foco y diálogos nativos.
- [x] Diseño visual aprobado por el usuario; conservar el estilo al añadir funcionalidades.
- [ ] Validar visualmente en navegador a 360/390 px y escritorio.
- [x] Alta visual de cuentas con nombre, tipo, saldo inicial, fecha y cuenta predeterminada.
- [x] Flujo sin cuentas: crear la primera antes de registrar un gasto.
- [x] Recordar última cuenta utilizada y actualizar saldos de la demo al registrar gastos.
- [x] Modo de prueba sin cuentas con confirmación y reservas de deseos reiniciadas.
- [x] Formulario de ingreso con cuenta de destino, fecha y notas.
- [x] Transferencias entre cuentas propias, registradas una sola vez y excluidas de gastos/ingresos.
- [x] Resumen mensual separado de gastos e ingresos y búsqueda por cuenta.
- [ ] Completar diseño de edición y anulación.
- [ ] Diseñar prioridad/necesidad/utilidad/deseo, estados e imagen manual de deseos.
- [ ] Diseñar estados sin datos, carga, errores, sin cuentas y sesión caducada.

Esta demo no tiene persistencia, autenticación, conexión bancaria, inversiones ni PWA.
Todos sus datos son ficticios y se reinician al recargar. Solo escucha en loopback.

## Fase 1 — Núcleo y almacenamiento

- [ ] Extraer dominio y servicios reutilizables por CLI y web.
- [ ] Representar dinero con céntimos enteros y validar límites y redondeos.
- [ ] Mantener el significado del score y el reparto de la CLI.
- [ ] Diseñar cuentas, movimientos, transferencias, categorías, deseos y asignaciones.
- [ ] Configurar MySQL, variables de entorno, migraciones versionadas y compose opcional.
- [ ] Importador JSON conservador: copia previa, simulación, informe y detección de repetición.
- [ ] Sustituir los datos ficticios por repositorios, API Go y cliente Angular.
- [ ] Persistir gastos con idempotencia y transacciones SQL.
- [ ] Alta y selección de cuenta por defecto y zona horaria del usuario.
- [ ] Edición/anulación coherente del saldo, ingresos, transferencias y conciliación trazable.
- [ ] Reservas para deseos sin incrementar patrimonio; verificar fondos disponibles.
- [ ] CRUD de deseos con criterios existentes, URL, notas, estados e imagen manual.

## Fase 2 — MVP seguro y utilizable

- [ ] Contraseña con hash, sesiones seguras, cierre de sesión y CSRF.
- [ ] Validación de servidor, límites HTTP, consultas parametrizadas y errores sin datos sensibles.
- [ ] Historial con filtros por cuenta, tipo, fecha y categoría.
- [ ] Manifest, iconos de instalación y accesos rápidos compatibles; instrucciones Android/iOS.
- [ ] Confirmación del servidor al guardar; no anunciar funcionamiento offline.
- [ ] Pruebas contables: gasto 100 → 97,50 → edición 97 → anulación 100.
- [ ] Pruebas de transferencias, reservas, duplicados, importación y persistencia tras reiniciar.
- [ ] Pruebas de autenticación y CSRF; navegación con teclado y lector de pantalla.
- [ ] Verificación móvil real y flujo de gasto en pocos pasos.
- [ ] Documentar arranque, CLI, migración, backup y restauración verificada.

## Fase 3 — Mejoras posteriores al MVP

- [ ] Metadatos de productos con protección SSRF y alternativa manual.
- [ ] Intereses estimados separados de abonos reales y tasas con vigencia.
- [ ] Inversiones por ISIN/clase, operaciones y valores manuales con fuente y fecha.
- [ ] Exportación CSV/Markdown; importación bancaria con detección de duplicados.
- [ ] Evaluar fuentes autorizadas de precios y automatización de backups.

## Hallazgos iniciales

El módulo Go existente (`github.com/nonqs/expenseTracker`, Go 1.27) es un paquete
`main`, sin dependencias externas ni tests previos. Persiste JSON en
`WANTS_DATA_PATH` o `~/.local/share/wants/items.json`. El modelo actual usa
`float64` para precio y ahorro; su sustitución requiere una migración explícita.
No se ha leído ni modificado el contenido de los datos personales.

## Validación histórica de la primera demo (antes de Angular)

- `go test ./...`: pasa; no hay todavía archivos de tests.
- `go vet ./...`: pasa.
- `go run . help`: pasa, conserva la CLI.
- La versión JavaScript inicial pasó `node --check`; este resultado no valida el nuevo frontend Angular.
- En el entorno restringido se utilizó `GOCACHE=/tmp/wants-go-cache` porque la caché habitual es de solo lectura.
- No fue posible arrancar HTTP: el entorno deniega `listen tcp 127.0.0.1:8080`.
- Firefox headless terminó con código 139. Revisión visual y pruebas de interacción en navegador pendientes; no se presentan como verificadas.


## Validación de la adaptación a Angular

El registro npm no pudo resolverse (`EAI_AGAIN registry.npmjs.org`), por lo que
no se han podido instalar paquetes ni ejecutar el compilador Angular. No hay
lockfile inventado ni build declarado como aprobado. La selección de Angular 22,
Node y TypeScript sigue la tabla oficial: https://angular.dev/reference/versions.
La revisión visual sigue pendiente. Las verificaciones Go se repiten tras adaptar
el servidor de recursos.


Resultado de las verificaciones tras el cambio:
- `go test ./...`: pasa, incluidos tests HTTP sin sockets para las rutas Angular,
  recursos, HEAD, métodos no admitidos y el caso de build ausente.
- `go vet ./...`: pasa.
- `go run . help`: pasa.
- Configuraciones JSON del frontend: sintaxis válida.
- Compilación Angular y comprobaciones de navegador: pendientes por las limitaciones anteriores.


## Próxima entrega — Completar los flujos visuales

La instalación local ya está disponible. `npm run build` pasa (1 de noviembre de
2026): 324,16 kB de recursos iniciales, salida en `frontend/dist/wants/browser`.
Esto resuelve el bloqueo anterior de compilación; no sustituye la revisión visual.

Orden de trabajo:
1. Alta de cuentas y elección de cuenta predeterminada; estado inicial sin cuentas.
2. Registro de ingresos y transferencias entre cuentas propias.
3. Edición y anulación de movimientos con confirmación.
4. Deseos con criterios existentes, estados, notas e imagen manual.
5. Revisión móvil a 360/390 px, escritorio, teclado y estados vacíos/errores.
6. Tras revisar estos flujos, implementar dominio Go, API, MySQL y autenticación
   para la primera entrega persistente. Las validaciones del cliente no serán la
   autoridad contable.

Hasta conectar el backend se mantendrá visible la indicación de datos ficticios.


## Entrega visual — Alta de cuentas

Implementado en Angular: creación de cuentas, saldo inicial (incluye cero y
negativos), fecha no futura, rechazo de nombres repetidos y selección por defecto.
El primer alta se selecciona automáticamente. Los gastos usan la última cuenta
utilizada y rechazan fechas anteriores al saldo inicial. En Más se puede iniciar
una demo vacía, con confirmación, sin tocar los archivos de la CLI. Navegar mantiene
los datos en memoria; recargar vuelve a los ejemplos.

- `npm run build`: pasa.
- `npm test`: comprueba importes exactos, límites y fechas.
- Revisión de interacción y móvil en navegador: pendiente.

Siguiente tarea: ingresos y transferencias, seguidos de edición/anulación de
movimientos. La persistencia, API y autenticación siguen pendientes; este avance
no se marca como entrega MySQL.


## Entrega visual — Ingresos y transferencias

Disponibles desde Gastos y Cuentas. Los ingresos aumentan el saldo de la cuenta
seleccionada. Las transferencias se guardan como un único movimiento con origen
y destino: restan y suman en el mismo cambio de estado, sin modificar el total.
El historial distingue las transferencias, muestra ambas cuentas y permite buscarlas
por nombre de cuenta. El resumen mensual excluye transferencias tanto de gastos
como de ingresos. Se guía al alta de cuentas si faltan las necesarias.

Validaciones: importe positivo en céntimos, cuentas distintas/existentes, fechas
válidas y posteriores o iguales a ambos saldos iniciales, límites de cálculo.
La demo permite saldos negativos para representar cuentas con descubierto.

- `npm test`: pasan ambos archivos (importes/fechas y operaciones de la demo).
- Comprobado con pruebas: transferencia de 20 € conserva el patrimonio; ingreso
  aumenta saldo una sola vez; combinaciones con gastos, transferencia de vuelta,
  errores de cuenta/fecha/importe y desbordamiento no alteran datos.
- `npm run build`: pasa.
- Interacciones de navegador/móvil: pendientes de comprobar; no se declaran probadas.

Siguiente paso: edición y anulación con confirmación y actualización consistente
de saldos. Esta sigue siendo una demo temporal; las reglas definitivas se
implementarán en Go con transacciones MySQL, autenticación e idempotencia.

## Ingresos recurrentes — petición adicional

- [x] Alta mensual con concepto, importe, cuenta, primer ingreso y fin opcional.
- [x] Mostrar siguiente vencimiento y permitir pausar/reanudar.
- [x] Ajustar días inexistentes al último del mes conservando el día original.
- [x] Registrar vencidos explícitamente, uno por fecha; no sumar ingresos futuros.
- [x] Clave por programa/fecha para evitar repetir un vencimiento en memoria.
- [x] Pruebas de fin de mes, bisiesto, cambio de año, pausa, atrasados y duplicados.
- [ ] Editar y cancelar definitivamente programas, conservando movimientos previos.
- [ ] Persistir programas y vencimientos en MySQL con restricción única por programa/fecha.
- [ ] Ejecución periódica Go con zona horaria, transacción SQL, reintentos y recuperación tras reiniciar.
- [ ] Revisar interacción en navegador y móvil.

Disponible en Gastos y Cuentas mediante «Ingreso recurrente». La primera fecha
fija el día mensual. Por ejemplo, 31/01 → 28/02 (29 si bisiesto) → 31/03.
La fecha de fin es inclusiva. Pausar no elimina vencimientos; reanudar permite
registrar los pendientes uno a uno, sin mover su fecha. Programar no suma dinero:
se confirma con «Registrar [fecha]» cuando vence. La demo no ejecuta tareas en
segundo plano ni funciona con la pestaña cerrada y se pierde al recargar.

Validación: `npm test` pasa en los tres archivos de pruebas; `npm run build` pasa.

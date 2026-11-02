# Frontend de wants

## Próximas tareas priorizadas

- [ ] **Comprobar cambios de propósito de cuentas**: efectivo ↔ ahorro ↔ híbrida ↔ inversión. Validar saldos y bolsillos antes/después, clasificación en las secciones, cuenta predeterminada, reservas de deseos, TAE, estrategias y repartos recurrentes existentes. Confirmar que no se dupliquen cuentas, se creen movimientos ni se pierdan importes al reclasificar. Añadir casos de regresión y comprobar los formularios en navegador.
- [ ] **Ganancia/pérdida por fondo en porcentaje**, en una sección claramente separada situada encima o debajo de «Escenario hipotético». Mostrar también importe en EUR, base de cálculo, fondo/ISIN/clase, fuente y fecha del valor liquidativo. Objetivo: actualización automática con una fuente fiable, indicando su frecuencia y retraso; presentar datos como «en tiempo real» únicamente si la fuente realmente lo permite. Mantener entrada manual como alternativa y no confundir rendimiento observado con hipótesis de proyección. Esta tarea queda planificada, no implementada.
- [x] Quitar «Ver proyección» de las tarjetas de remuneradas e inversiones. El escenario permanece visible; si hay varias cuentas, se seleccionan desde el propio escenario.


Angular con datos ficticios en memoria. Desde este directorio:

```bash
npm ci
npm start
```

Abrir http://127.0.0.1:4200. Verificar con `npm test` y `npm run build`.
Los datos se mantienen al navegar y se reinician al recargar. No hay persistencia
ni automatización del lado del servidor en esta fase.

## Fondo común de deseos

La aportación se realiza exclusivamente desde **Deseos → Aportar al fondo**.
No existen aportaciones individuales. El formulario muestra una previsualización
antes de confirmar. La reserva proviene del saldo existente; no crea ingresos,
no transfiere entre bancos ni incrementa el patrimonio.

La simulación frontend sigue las reglas existentes, consultadas sin modificar Go:

- Necesidad 25 %, utilidad 30 %, deseo 20 % y antigüedad 25 %.
- Antigüedad: 0 antes de 7 días, 1 desde 7, 2 desde 30 y 4 desde 90.
- `wish=false` queda fuera del reparto, conservando lo reservado.
- Los objetivos completos dejan de recibir; el sobrante se redistribuye.
- Sin deseos elegibles, el dinero queda pendiente en el fondo, equivalente a `extra`.
- «Repartir pendiente» permite asignarlo después sin realizar una nueva aportación.

El frontend trabaja en céntimos enteros. Calcula proporciones con enteros exactos
(BigInt); los céntimos indivisibles se asignan por mayor resto y, en empate, por
orden de lista. Esta regla de redondeo es explícita para la demo; Go actualmente
utiliza `float64` y no se ha alterado. La antigüedad de los deseos nuevos empieza
en su creación; los ejemplos tienen antigüedad ficticia para demostrar el reparto.
Las prioridades afectan a futuras aportaciones, sin mover reservas previas.

## Seguimiento del frontend

- [x] Diseño visual aprobado: conservar el estilo actual.
- [x] Navegación y gasto rápido.
- [x] Alta de cuentas, predeterminada y flujo sin cuentas.
- [x] Ingresos, transferencias e ingresos mensuales recurrentes de demostración.
- [x] Sustituir aportaciones por deseo por un fondo común.
- [x] Previsualizar el reparto y mostrar reservado, asignado y pendiente.
- [x] Añadir necesidad/utilidad/deseo a nuevos deseos, con validación 0–10.
- [x] Activar/pausar participación y mostrar puntuación actual.
- [x] Probar pesos, umbrales, topes, redistribución y conservación de céntimos.
- [x] Edición de deseos y prioridades existentes, conservando identidad, antigüedad y reservas.
- [x] Cancelación confirmada con opción explícita de redistribuir o liberar la reserva.
- [x] Edición y anulación confirmada de gastos, ingresos y transferencias en la demo.
- [x] Selección, previsualización y eliminación de imágenes manuales locales.
- [x] Vistas de deseos activos, comprados y archivados.
- [x] Compra con gasto nuevo o vinculación a uno existente sin duplicarlo.
- [x] Archivo/restauración con tratamiento explícito de la reserva común.
- [ ] Verificar selección/decodificación de imágenes en navegador real y móvil.
- [ ] Ajustar la CSP del servidor para imágenes locales `data:` cuando se autoricen cambios de backend.
- [ ] Revisar los nuevos flujos en navegador móvil y escritorio.
- [ ] Conectar a API y compartir la autoridad contable cuando se autorice el backend.

Por instrucción del usuario, el trabajo actual queda limitado al frontend.

## Validación del fondo común

`npm test` pasa en los cuatro archivos de pruebas. `npm run build` pasa.
No se ha realizado una nueva revisión visual en navegador ni modificado código Go.


## Editar y cancelar deseos

Cada tarjeta incluye **Editar** y **Cancelar deseo**, también desde Inicio.
Editar permite cambiar nombre, precio objetivo, enlace, notas y prioridades. Se
conservan identidad, fecha original y reserva; las nuevas prioridades afectan
solo a futuras aportaciones. Los nombres repetidos se rechazan sin distinguir
mayúsculas. El precio puede igualar la reserva (completado), pero no ser inferior.
Si se eleva después, el deseo vuelve a ser elegible si participa en el reparto.

Cancelar abre una confirmación que muestra el importe reservado y dos opciones:

- **Devolver al fondo y redistribuir**: aplica el algoritmo a la reserva liberada
  entre los deseos restantes. Lo que no pueda asignarse queda pendiente en el fondo.
  El total reservado se conserva y el pendiente previo no se reparte de nuevo.
- **Liberar la reserva**: reduce lo reservado y aumenta el saldo sin reservar,
  sin modificar saldos de cuentas ni registrar un ingreso. No afecta a las
  reservas de otros deseos ni al pendiente anterior.

Cerrar o elegir **Conservar deseo** no realiza cambios. Confirmar retira el deseo
de la lista temporal. Si se cancela el último, se muestra un estado vacío que
permite crear otro; su dinero sigue el destino elegido. Una segunda cancelación
del mismo identificador no vuelve a repartir dinero.

Validación: `npm test` y `npm run build` pasan. Las pruebas cubren conservación de
identidad/antigüedad/reserva, precios inválidos, topes, enlaces, redistribución,
excedentes, último deseo y liberación sin mover otras reservas. Revisión visual y
de interacción en navegador pendiente. No se ha modificado Go.

La siguiente tarea es revisar todos los flujos del frontend en móvil/escritorio y completar los filtros del historial.


## Editar y anular movimientos

Inicio y Gastos incluyen **Editar** y **Anular** en cada movimiento activo.
Se puede corregir concepto, importe, cuenta, fecha, notas y categoría de gasto;
en transferencias también destino. El tipo de movimiento se conserva. Se valida
la operación completa sustituyendo la anterior, sin sumar de nuevo sus efectos.
Se conservan su identificador y la clave de recurrencia si existe.

Anular requiere confirmación, explica qué saldos cambian y conserva la entrada
con fecha de anulación. Los anulados quedan excluidos de saldos, resúmenes y
últimos movimientos; **Gastos → Mostrar también los anulados** permite consultarlos.
No se pueden editar ni anular de nuevo. Cerrar o cancelar el diálogo no cambia nada.

Un ingreso recurrente editado afecta solo a ese vencimiento; el programa continúa
sin cambios. Anularlo conserva su clave para que no se vuelva a generar al reintentar.
Las reservas de deseos no se alteran al editar/anular movimientos. Si pasan a
superar el saldo total se avisa en el fondo común y se bloquean nuevas aportaciones.

Validación: `npm run build` pasa y `npm test` pasa en los cinco archivos de pruebas.
Se comprueba el gasto 100 → 97,50 → edición 97 → anulación 100; transferencias
corregidas/anuladas conservando patrimonio; ingresos que cambian de mes/cuenta;
claves recurrentes, errores y segundas anulaciones sin modificar datos originales.
La revisión de interacción en navegador sigue pendiente. Solo se ha modificado
el frontend; no se han cambiado archivos Go ni conectado persistencia.


## Imágenes y estados de deseos

**Nuevo deseo / Editar** permite seleccionar y quitar una imagen local JPG, PNG
o WebP de hasta 5 MB. Se decodifica, se limita a 1200 px y se vuelve a codificar
antes de mostrarla; no se contacta con ninguna tienda. No se admiten SVG ni URL
remotas de imágenes. La imagen se conserva solo en memoria y se pierde al recargar.
La preparación completa mediante canvas queda pendiente de verificación real en
navegador; las pruebas unitarias comprueban formatos y límite de archivo.

**Deseos** ofrece las vistas Activos, Comprados y Archivados. Inicio muestra solo
activos. Los comprados/archivados no reciben dinero, incluso si su flag de reparto
se activase accidentalmente.

**He comprado** permite registrar un gasto nuevo (importe pagado, cuenta y fecha)
o vincular un gasto activo ya existente que no esté asociado a otro deseo. El
registro nuevo descuenta el importe una sola vez. Vincular no crea otro gasto.
La reserva utilizada deja de estar asignada y el exceso, si se pagó menos de lo
reservado, vuelve al pendiente del fondo. Si se pagó más, se usa saldo sin reservar;
la demo, como el resto de movimientos manuales, permite saldos negativos.
Se conserva la relación con el gasto, de forma que no se pueda comprar dos veces.
Editar el gasto cambia la información mostrada; no reajusta las reservas pasadas.
Anular el gasto devuelve el deseo a activo y pausado (o lo conserva archivado),
sin restaurar automáticamente el dinero que tenía reservado.

**Archivar** pide confirmación, conserva imagen/notas/antigüedad y pasa toda la
reserva al pendiente del fondo, sin redistribuir ni alterar saldos bancarios.
**Restaurar** vuelve a activo pausado, sin recuperar reservas; si había una compra
vinculada, vuelve a comprado. Archivar un comprado no borra ni repite su gasto.

Comprobaciones: `npm test` pasa en seis archivos; `npm run build` pasa. Nuevas
pruebas cubren precios pagados menores/mayores, exclusión del reparto, archivo,
conservación de metadatos, segundo intento de compra e imágenes inválidas.
La interacción visual de estos flujos sigue pendiente de comprobar.

Para esta fase usa el servidor Angular (`npm start`). Si se sirve desde el servidor
Go antiguo, su cabecera CSP deberá permitir imágenes locales `data:` antes de
habilitarlas allí; esa modificación de backend no se ha realizado porque el
alcance autorizado sigue siendo solo frontend.


## Inicio como resumen

Inicio muestra tarjetas de deseos con progreso y solo la acción rápida de
activar/pausar el reparto. Prioridades detalladas, tienda, edición, compra,
cancelación y archivo quedan en Deseos. Los últimos movimientos de Inicio se
muestran sin acciones de gestión; editar/anular queda en Gastos. Se mantienen
los accesos «Ver deseos», «Ver todos» y el botón de gasto rápido.


La tarjeta principal de Inicio muestra únicamente el nombre y saldo de la cuenta
predeterminada, actualizándose al cambiarla en Cuentas. No utiliza la última cuenta
de gasto como sustituto. Si no hay una predeterminada, invita a configurarla.
El saldo total permanece en Cuentas; las reservas globales no se atribuyen a la
cuenta predeterminada.

## Cuentas remuneradas e inversiones

Accesos desde **Cuentas** y **Más**, o rutas Angular `/remuneradas` e `/inversiones`.
Usar `npm start`; no se han añadido rutas ni servicios al servidor Go.
No se precargan instrumentos ni cotizaciones ficticias como si fueran datos reales.

### Remuneradas

Configura una cuenta existente, TAE (%) y fecha de vigencia. Cada cambio se guarda
como una nueva tasa; una fecha duplicada se rechaza. Se admiten tasas futuras y
0 %, con un límite de demo de 100 %. Antes de la primera tasa no se estima nada.

La estimación mensual usa los cierres diarios desde el día 1 hasta ayer, respeta
la fecha del saldo inicial, transferencias, movimientos anulados y tasas vigentes.
Convención explícita: ACT/365 fijo, incluso en año bisiesto; tipo equivalente diario
`expm1(log1p(TAE / 100) / 365)`. Se suma saldo positivo de cierre por tipo diario,
sin crear ni capitalizar abonos virtuales, y se redondea al final a céntimos.
Es una aproximación, no una liquidación contractual ni una promesa de rentabilidad;
no contempla topes de saldo, fiscalidad, bonificaciones ni condiciones bancarias.
El cálculo utiliza coma flotante solo para la estimación, no para registrar dinero.

TAE y TIN no se sustituyen directamente. Referencia consultada:
[Banco de España: TAE de un depósito](https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/tiposinteres/guia_textual/latae/tae_deposito.html).
La TAE se basa en capitalización compuesta; la suma diaria de esta demo usa el saldo
real, por lo que sin abonos reinvertidos no tiene por qué reproducir una TAE anual.

**Registrar abono real** crea un ingreso por el importe recibido y categoría
`Intereses abonados`. La tarjeta distingue estimado de abonado en el mes. Si el
abono ya existe, cambia su categoría desde Gastos; no lo registres otra vez.
Una estimación jamás aumenta el saldo real.

### Inversiones manuales en EUR

1. Añade instrumento con nombre, ISIN (formato y control Luhn) y clase exacta.
2. Registra compra o venta, participaciones, precio, comisiones, cuenta de efectivo
   y fecha. Participaciones/precio admiten seis decimales; comisiones, dos.
3. Añade valores liquidativos con fecha del dato y fuente; se conserva el historial.

Las participaciones y precios se representan con enteros escalados a 1 000 000.
Se multiplican con BigInt y se redondea el efectivo al céntimo. La compra resta
importe más comisión; la venta suma importe menos comisión. Estos movimientos
son conversiones entre activos, no gastos/ingresos de consumo. Las cuentas deben
reflejar **solo efectivo**, sin incluir por segunda vez el valor de los fondos.
No registres la misma operación también como gasto/ingreso manual.

La posición usa coste medio ponderado para estimar coste restante y resultado
realizado; la diferencia de valoración manual y coste restante es el resultado
no realizado. No calcula impuestos, dividendos, divisas ni rentabilidad anualizada.
No se pueden vender más participaciones de las disponibles en esa fecha.
Los empates de fecha se procesan en el orden de registro.

El valor más reciente conserva fecha/fuente y se avisa si precede a la última
operación. Si faltan precios, el patrimonio se etiqueta parcial; nunca se inventa
una cotización. Las inversiones no se convierten en saldo disponible para deseos:
el fondo común sigue reservando únicamente el efectivo de las cuentas.

Anular una operación exige confirmación y revierte efectivo y participaciones.
Se rechaza anular una compra que deja ventas posteriores sin respaldo. Sus
movimientos no se editan/anulan desde Gastos, sino desde Inversiones, para mantener
los dos lados de la operación unidos. Para corregir, anula y vuelve a registrar.

### Seguimiento y validación

- [x] Tasas de remuneración con vigencia e histórico.
- [x] Separación entre estimación y abono registrado.
- [x] Instrumentos por ISIN/clase, compras y ventas manuales.
- [x] Valores manuales con fuente, fecha e historial.
- [x] Efectivo y participaciones coherentes, sin doble patrimonio.
- [x] Coste medio y resultados simples, anulación validada.
- [ ] Editar/corregir tasas y valores ya introducidos con trazabilidad.
- [ ] Configurar topes de saldo remunerado y condiciones particulares.
- [ ] Importar/exportar CSV y registrar dividendos/traspasos si se necesitan.
- [ ] Revisión visual e interacciones en móvil y escritorio.
- [ ] Persistencia y servicios Go solo cuando se autorice ampliar el alcance.

`npm run build` pasa. `npm test` pasa en siete archivos, con casos de tasas y
cierres diarios, precisión decimal, comisiones, valoración, sobreventa y efectivo
sin doble patrimonio. No se declara verificación de navegador realizada. Todos
los nuevos datos siguen en memoria y se pierden al recargar; no se ha modificado Go.


Los accesos a Remuneradas e Inversiones están visibles en el menú lateral de
escritorio y como tarjetas al inicio de Cuentas y Más en móvil/escritorio.

El botón «Añadir gasto» se muestra únicamente en Inicio y Gastos. La ruta directa
`/gasto-rapido` sigue disponible. No aparece en Cuentas, Más, Remuneradas ni Inversiones.

## Flujo principal actualizado: seguimiento por cuentas y proyecciones

Esta sección sustituye el flujo principal anterior centrado en instrumentos.

### Inversiones por cuenta

En **Inversiones → Añadir cuenta de inversión**:

1. Selecciona una cuenta existente, por ejemplo MyInvestor, o crea una desde el
   mismo diálogo. La creación utiliza el alta de cuentas existente.
2. Indica el **valor que ya tienes invertido**, separado del efectivo, y su fecha.
3. Introduce tu hipótesis de rentabilidad anual, aportación mensual futura y plazo.
4. Guarda para ver la tarjeta de la cuenta y su proyección.

No exige ISIN ni registrar compras. Hay un único registro manual por cuenta;
volver a guardarla actualiza sus datos. El importe invertido es una fotografía
manual: **no crea movimientos, no descuenta efectivo y no se suma a los saldos
reales de Cuentas**. El efectivo que figura en Cuentas debe excluir este importe.
Los registros por instrumentos quedan como detalle opcional plegado, independiente
de estas fotografías; no se suman entre sí para evitar duplicar cartera.

La vista muestra el valor declarado y la fecha, gráfico comparativo de capital
aportado/valor proyectado, valor final, ganancia/pérdida hipotética y evolución
anual. Se puede cambiar cuenta, rentabilidad, aportación mensual y horizonte sin
alterar el capital inicial ni registrar ingresos. Las hipótesis se guardan solo
si se pulsa «Guardar hipótesis en la demo».

Convención: tasa anual efectiva convertida a mensual mediante
`expm1(log1p(tasaAnual) / 12)`, con aportaciones al final de cada mes. Se proyecta
desde la fecha del importe indicado. Capital y aportaciones reales se representan
en céntimos; los resultados de simulación usan coma flotante y se redondean para
mostrar. No incluyen inflación, impuestos, costes futuros ni variaciones de
mercado; no representan rentabilidad histórica ni están garantizados. No se
presupone ninguna rentabilidad positiva: el usuario debe introducir la hipótesis.
Se aceptan escenarios negativos mayores de −100 % y plazos de 1 a 50 años.

### Remuneradas por cuenta

El botón principal ahora es **Añadir cuenta remunerada**. Permite elegir una
existente o crearla allí mismo, y registrar su TAE/fecha. La tarjeta muestra el
saldo real vinculado a Cuentas, estimado mensual y abonos reales. Añade una
proyección de intereses a un año suponiendo saldo/TAE constantes y reinversión;
esa hipótesis no acredita intereses ni asegura un abono contractual concreto.
El historial de tasas y la estimación mensual por cierres reales se conservan.

### Seguimiento

- [x] Flujo principal de inversión por cuenta e importe, sin exigir ISIN.
- [x] Crear o seleccionar cuentas desde Inversiones y Remuneradas.
- [x] Actualizar el importe declarado y las hipótesis por cuenta.
- [x] Proyección interactiva con gráfico, capital/aportaciones, resultado y años.
- [x] Escenarios negativos, tasa cero y límites de cálculo.
- [x] Mantener efectivo, importes declarados y simulaciones separados.
- [ ] Quitar una cuenta del seguimiento sin borrar la cuenta bancaria.
- [ ] Histórico de fotografías de inversión para comparar evolución real.
- [ ] Conectar opcionalmente las fotografías con las posiciones por instrumento.
- [ ] Revisar formularios, gráfico y navegación en navegador móvil/escritorio.

Validación: `npm test` pasa en ocho archivos; se añaden casos de tasa cero,
capitalización anual equivalente, aportaciones al final de mes, escenarios de
pérdida, cuentas independientes y entradas/desbordamientos inválidos.
`npm run build` pasa sin advertencias. Sigue siendo frontend temporal: ningún
archivo Go ha sido modificado y no hay persistencia ni rentabilidades conectadas.


## Navegación unificada de Cuentas

Por preferencia del usuario, Efectivo, Remuneradas e Inversiones se agrupan en la
misma página **Cuentas**, con selector de sección visible al principio. No hay
entradas separadas en el menú lateral ni accesos duplicados en Más.

- Efectivo: `/cuentas`.
- Remuneradas: `/cuentas?seccion=remuneradas`.
- Inversiones: `/cuentas?seccion=inversiones`.

Los enlaces anteriores `/remuneradas` e `/inversiones` redirigen a la sección
correspondiente de Cuentas. El menú Cuentas permanece activo al cambiar sección.
La selección usa la URL, por lo que admite enlaces directos y navegación atrás.
Datos, proyecciones y formularios se conservan en los servicios/componentes
existentes; no se crean copias de cuentas ni se modifica código Go.

## Propósitos, nómina y estrategia indexada

El flujo de esta entrega queda organizado por **efectivo / ahorro / inversión**,
siempre dentro de Cuentas. Nuevas cuentas tienen un selector de propósito;
«Propósito» permite clasificar una existente sin crear movimientos bancarios.

- **Efectivo**: dinero de uso diario.
- **Solo ahorro**: todo el saldo es ahorro; no aparece en Efectivo.
- **Híbrida**: se indica qué parte del saldo actual es ahorro. Ingresos y
  transferencias eligen bolsillo de efectivo o ahorro. La suma de bolsillos
  coincide con el saldo bancario, sin duplicarlo.
- **Solo inversión**: cuenta de efectivo para inversión, fuera del gasto diario.
  El capital invertido declarado se sigue por separado.

Solo el efectivo de cuentas de uso diario o híbridas está disponible para nuevos
gastos rápidos y reservas de deseos. No se permite sacar dinero de un bolsillo
sin saldo. El fondo de deseos sigue siendo común y nunca recibe aportaciones
individuales a tarjetas. Cambiar propósito puede hacer que reservas previas
superen el efectivo disponible; se avisa y se bloquean nuevas reservas.
La clasificación de los datos existentes es una operación de demo; el histórico
preciso de cambios de propósito deberá diseñarse antes de persistirlos.

### Preparar el ejemplo BBVA → Revolut / MyInvestor

1. Crear BBVA como Efectivo, Revolut como Solo ahorro (o Híbrida) y MyInvestor
   como Solo inversión. Al añadir una cuenta de efectivo a Remuneradas se
   clasifica como ahorro; puede cambiarse después a híbrida con «Propósito».
2. En Remuneradas añadir la TAE de Revolut. En Inversiones registrar MyInvestor
   con su capital previo (cero si todavía no se ha invertido) y fecha.
3. En la tarjeta MyInvestor abrir **Configurar fondos**. Indicar nombre/clase,
   ISIN y porcentaje de cada fondo; los pesos deben sumar 100 %. No hay pesos
   recomendados ni datos de mercado precargados.
4. Desde Gastos o Cuentas/Efectivo, crear **Ingreso recurrente** con destino BBVA,
   importe y primer ingreso el día 5. Abrir **Repartir al recibir el ingreso** y
   añadir 20 % → Revolut/Ahorro y 20 % → MyInvestor/Inversión según estrategia.
   El resto permanece en BBVA. Porcentajes con dos decimales; suma máxima 100 %.
5. Al vencer, pulsar **Registrar [fecha]**. En esta demo la confirmación registra
   ingreso, transferencias y asignaciones en un bloque. No se ejecuta en segundo
   plano ni se realizan transferencias bancarias reales.

Ejemplo con 1.000 € y estrategia 70/30: quedan 600 € en BBVA, 200 € en ahorro y
se asignan 140 €/60 € a fondos en MyInvestor. Las transferencias no son ingresos
adicionales y la conversión a inversión no se considera gasto de consumo.
Se usan céntimos exactos con mayor resto en los desempates. Se conserva todo el
importe; los céntimos no distribuidos por porcentajes parciales quedan en origen.

Las asignaciones registran **euros**, no participaciones ni una compra real sin
valor liquidativo. Ya descuentan el efectivo destinado a invertir y aumentan el
capital aportado del seguimiento de MyInvestor. No registres otra compra manual
por esa misma asignación. La valoración de mercado exige datos reales posteriores.
Los cambios de estrategia solo afectan a aportaciones nuevas; las asignaciones
anteriores conservan el nombre, ISIN e importe con que se realizaron.
No se aplica un reparto con fecha anterior al capital de referencia declarado,
para no reinterpretar una fotografía de inversión posterior como capital previo.
Actualizar manualmente el capital incorpora las aportaciones registradas hasta
ese momento; guardar solo hipótesis conserva el capital aportado por los planes.

Se valida el bloque completo antes de cambiar señales: un error no acredita
la nómina, no mueve saldos, no asigna fondos ni avanza el vencimiento. Cada fecha
de nómina mantiene su clave de idempotencia. Sus movimientos quedan vinculados
y **no se pueden editar/anular por separado**. La gestión del bloque completo
está pendiente y se muestra como solo consulta en el historial.

### Proyecciones de ahorro

Remuneradas tiene el mismo gráfico y evolución anual que Inversiones: elegir
cuenta, rentabilidad/TAE supuesta, aportación mensual y plazo. La estimación parte
solo del bolsillo de ahorro y las hipótesis pueden guardarse en memoria. La TAE
real y los abonos no cambian al modificar una proyección.

Se muestra la aportación mensual de los planes activos y el botón **Usar en la
proyección**. Es una hipótesis constante; no es un simulador de calendarios con
fechas de inicio/fin y pausas futuras. En ahorro se prellena ese importe cuando
no hay hipótesis guardadas. Registrar un abono o ingreso real de ahorro es una
acción separada; si proviene de otra cuenta propia se usa Transferir.

### Tareas y verificaciones

- [x] Separar cuentas de efectivo, ahorro, híbridas e inversión.
- [x] Bolsillos en ingresos y transferencias; ahorro excluido de deseos.
- [x] Proyección de ahorro, ingresos y abonos reales separados.
- [x] Reparto porcentual de nóminas recurrentes en su fecha, con resto en origen.
- [x] Estrategias por cuenta/fondo/ISIN y asignación exacta de nuevas aportaciones.
- [x] Aplicación de cada vencimiento en bloque y sin duplicados.
- [x] Enlazar el importe mensual del plan con las hipótesis de proyección.
- [ ] Editar/cancelar planes y anular o corregir un reparto completo con sus fondos.
- [ ] Aportaciones manuales a la estrategia, fuera de una nómina programada.
- [ ] Convertir asignaciones en participaciones reales sin descontar efectivo dos veces.
- [ ] Simulación de calendarios completos, incluyendo futuras pausas y fin de planes.
- [ ] Transferencias entre bolsillos de la misma cuenta híbrida.
- [ ] Histórico trazable de propósitos/bolsillos y conciliación de fotografías.
- [ ] Validar los nuevos formularios e interacciones en navegador móvil/escritorio.

`npm test` pasa en diez archivos. Se prueba el servicio Angular real desde Node:
60/20/20 y 70/30, conservación del patrimonio, idempotencia, error intermedio sin
cambios parciales, bolsillos híbridos y ahorro no disponible para deseos.
`npm run build` pasa. Se corrigieron errores de plantilla encontrados durante
la compilación. No se ha verificado la interacción visual ni modificado Go.
Todos los datos continúan en memoria; recargar reinicia la demo.

## Espaciado de acciones

`ActionGroupComponent` (`app-action-group`) agrupa acciones relacionadas con una
separación uniforme de 12 px y márgenes verticales de 18 px. En móvil estrecho se
apilan a ancho completo. Se aplica a las acciones de remuneradas, inversiones y
las barras de movimientos. El botón compuesto Propósito participa en el grupo
sin añadir márgenes propios. Se conserva una altura táctil mínima de 44 px.
Verificación: compilación Angular correcta; no se cambian reglas de negocio.

## Corrección: el ahorro se financia desde otra cuenta

Se elimina el formulario genérico «Ingreso al ahorro». La acción principal es
ahora **Aportar al ahorro** y usa `SavingsTransferComponent`:

- Requiere una cuenta de origen distinta del destino.
- Muestra el saldo disponible del bolsillo elegido (efectivo/ahorro en híbridas).
- Excluye la cuenta de destino del selector de origen y valida también en el servicio.
- Muestra un error al escribir un importe superior al disponible, inválido o fuera
  del rango de céntimos exactos; el botón permanece deshabilitado.
- Se descuenta del origen y se acredita el bolsillo de ahorro del destino en una
  sola transferencia; no se crea un ingreso ni aumenta el total de dinero.
- La fecha no puede ser futura. El disponible respeta tanto el saldo en esa fecha
  como el saldo actual: retroceder la fecha no permite gastar dinero ya utilizado.

**Registrar intereses abonados** es una acción separada, para un abono real del
banco, no para autofinanciar ahorro. Se mantiene como registro manual, claramente
identificado; la demo no puede verificar el extracto bancario.

Los movimientos manuales con fecha futura no acreditan saldo: se programan como
ingresos recurrentes y se confirman al vencer. Los saldos y bolsillos mostrados
excluyen operaciones futuras preexistentes. También se valida la disponibilidad
al editar movimientos, excluyendo primero la operación anterior.

Pruebas del servicio: misma cuenta bloqueada; importe superior al saldo y cadenas
numéricas enormes rechazadas; híbrida no financia desde ahorro una operación de
efectivo; 25 € restan/suman una vez sin aumentar ingresos ni patrimonio; ingresos
futuros no financian operaciones actuales. `npm test` y `npm run build` pasan.
Revisión visual/interacción real en navegador pendiente. Solo frontend, sin Go.

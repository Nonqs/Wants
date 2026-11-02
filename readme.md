# wants

A small CLI for thinking twice before buying something.

`wants` is a personal project I built mainly to learn Go by creating something I would actually use.

Instead of buying something immediately, you add it to your list of wants. As time passes and you save money, `wants` helps decide how that money should be distributed between the things you want based on their necessity, utility, desire and how long you have wanted them.

## Why?

Mostly: **to learn Go.**

I wanted a project that was small enough to build from scratch, but complex enough to learn real concepts such as:

- CLI applications
- structs and methods
- file persistence
- JSON
- command-line flags
- error handling
- building and installing a Go binary

The idea behind the project also comes from trying to avoid impulsive consumption.

Rather than buying something immediately, I can add it to `wants`, wait, and gradually save towards it.

Sometimes, after waiting for a while, I realise I don't actually want it anymore.

And sometimes I do — in which case finally buying it feels more like a reward than an impulse.

## How it works

Each item has information such as:

- Price
- Necessity
- Utility
- Desire
- Wish (active for saving or not)
- Time since it was added
- Amount already saved

`Wish` is used to separate a "desired" list from an "active buying" list:

- `wish=true`: the item is active, gets a score, and receives deposits.
- `wish=false`: the item stays in your list, but is ignored for score/deposit distribution.

Based on these values, `wants` calculates a score for each item.

When money is deposited, it is distributed between the active items according to their scores.

An item can never receive more money than its price. If an allocation would exceed its price, the remaining money is redistributed among the other items.

## Commands

```bash
wants add
wants list
wants deposit
wants modify
wants cancel
wants help
```

## Installation

### Requirements

For now, `wants` is built from source, so you need:

- Git
- Go

Clone the repository:

```bash
git clone <repository-url>
cd wants
```

Run the installer:

```bash
chmod +x setup/setup.sh
./setup/setup.sh
```

The installer builds the application and installs the binary at:

```text
~/.local/bin/wants
```

Make sure `~/.local/bin` is in your `PATH`.

If you use Fish:

```fish
fish_add_path ~/.local/bin
```

Then open a new terminal and test:

```bash
wants help
```

After that, `wants` can be used from anywhere:

```bash
wants list
wants deposit 100
```

## Data

Currently, `wants` stores its data locally as JSON.

On Linux:

```text
~/.local/share/wants/items.json
```

You can use a custom location with the `WANTS_DATA_PATH` environment variable.

## TODO

- [ ] Replace JSON storage with SQLite
- [ ] Add unit tests
- [ ] Improve error handling
- [ ] Improve command validation
- [ ] Improve money handling and rounding
- [ ] Handle edge cases when every item is fully funded

## Interfaz visual Angular — primera fase

El frontend utiliza Angular 22 con TypeScript, componentes standalone, Router,
formularios reactivos y un servicio de datos ficticios en memoria. El backend y
la CLI siguen en Go; la conexión a MySQL se implementará después de revisar la UI.

Requisitos: Node.js `^22.22.3`, `^24.15.0` o `^26.0.0`, npm y Go 1.27+.

Desarrollo, desde `wants`:

```bash
cd frontend
npm install
npm start
```

Abre **http://127.0.0.1:4200** o directamente **http://127.0.0.1:4200/gasto-rapido**.
El servidor de Angular sirve las rutas de la aplicación durante desarrollo.

Para servir la compilación Angular con Go, desde `wants`:

```bash
cd frontend
npm install
npm run build
cd ..
go run ./cmd/preview
```

Abre **http://127.0.0.1:8080**. Detén el servidor con `Ctrl+C`.
Go busca `frontend/dist/wants/browser`; puedes cambiarlo con `WANTS_FRONTEND_DIR`.
Devuelve un error de preparación si no existe la compilación.

Incluye Inicio, Gastos, Deseos, Cuentas y Más. Permite probar gastos, búsqueda,
creación de deseos, reservas y alta de cuentas con datos ficticios. Los cambios viven en memoria
y **se pierden al recargar**. No lee ni modifica el JSON de la CLI.
No utiliza CDNs, fuentes remotas ni analítica. Los servidores escuchan en loopback.
Autenticación y acceso desde otros dispositivos se abordarán antes de conectar datos personales.

Comprobaciones, desde `wants`:

```bash
go test ./...
go vet ./...
go run . help
cd frontend
npm run build
```

La instalación local ya dispone de `package-lock.json` y `npm run build` se ha
verificado correctamente. Para reproducir la instalación con ese lockfile puedes
usar `npm ci`. La revisión visual en navegador sigue pendiente.

Plan incremental: [docs/roadmap.md](docs/roadmap.md).

### Probar el alta inicial

En **Cuentas → Nueva cuenta**, indica nombre, tipo, saldo inicial y su fecha.
Puedes marcarla como predeterminada; la primera lo será automáticamente.
El gasto rápido recuerda la última cuenta utilizada y muestra de dónde se descontará.
Para probar sin cuentas, abre **Más → Probar sin cuentas** y confirma. Después,
**Añadir gasto** te pedirá crear tu primera cuenta antes de registrar el movimiento.
Recargar recupera los ejemplos. No se borran ni modifican archivos de la CLI.

Pruebas de importes y fechas, desde `frontend`: `npm test`.

### Probar ingresos y transferencias

En **Gastos** o **Cuentas** están los botones **Añadir ingreso** y **Transferir**.
Para un ingreso, selecciona la cuenta que recibe el dinero. Para transferir,
selecciona dos cuentas distintas e indica el importe y la fecha. Si faltan cuentas,
el formulario permite crearlas antes de continuar.

El historial muestra una sola entrada por transferencia con origen y destino;
los saldos de ambas cuentas cambian y el total permanece igual. Los totales del
mes separan gastos e ingresos y excluyen transferencias. La búsqueda admite
concepto, categoría o nombre de cuenta. Todo sigue siendo temporal y ficticio.

`npm test` incluye comprobiciones de saldos, transferencias e importes inválidos.

### Ingresos recurrentes

En **Gastos** o **Cuentas → Ingreso recurrente**, indica concepto, importe mensual,
cuenta y fecha del primer ingreso. Puedes añadir fecha de fin, inclusiva.
Se repetirá el día elegido de cada mes; si falta ese día se usa el último del mes,
sin perder la referencia original para el siguiente. Puedes pausar y reanudar.

La lista muestra el próximo vencimiento. Cuando llega su fecha, **Registrar [fecha]**
lo añade al historial y al saldo una vez. Los atrasados se confirman uno por uno
con su fecha original. Un ingreso futuro o pausado no se añade al saldo.
**Esta demo requiere confirmación manual, no ejecuta cobros automáticamente y no
persiste al recargar.** El plan contempla su futura ejecución en Go/MySQL con una
clave única por programa y fecha para evitar duplicados entre reinicios.
